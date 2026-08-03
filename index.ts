import { tool } from "@@mimocode/cli/plugin"
import { readFileSync, existsSync } from "fs"
import { resolve } from "path"

const MEDIA_TYPES: Record<string, { name: string; modality: string }> = {
  "image/png": { name: "图片", modality: "image" },
  "image/jpeg": { name: "图片", modality: "image" },
  "image/gif": { name: "图片", modality: "image" },
  "image/webp": { name: "图片", modality: "image" },
  "audio/wav": { name: "音频", modality: "audio" },
  "audio/mp3": { name: "音频", modality: "audio" },
  "audio/mpeg": { name: "音频", modality: "audio" },
  "video/mp4": { name: "视频", modality: "video" },
  "video/webm": { name: "视频", modality: "video" },
  "application/pdf": { name: "PDF文档", modality: "pdf" },
}

function getMediaType(mime: string) {
  if (MEDIA_TYPES[mime]) return MEDIA_TYPES[mime]
  if (mime.startsWith("image/")) return { name: "图片", modality: "image" }
  if (mime.startsWith("audio/")) return { name: "音频", modality: "audio" }
  if (mime.startsWith("video/")) return { name: "视频", modality: "video" }
  return null
}

const DEFAULT_REQUEST_TIMEOUT_MS = 120_000

function resolveTimeoutMs(): number {
  const raw = process.env.MIMOCODE_REQUEST_TIMEOUT_MS
  if (!raw) return DEFAULT_REQUEST_TIMEOUT_MS
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`MIMOCODE_REQUEST_TIMEOUT_MS 必须是正整数，当前值: ${raw}`)
  }
  return parsed
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    const cause = error.cause
    const causeText = cause ? ` (原因: ${describeError(cause)})` : ""
    return `${error.name}: ${error.message}${causeText}`
  }
  if (typeof error === "string") return error
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

function fileToDataUrl(fileUrl: string, mime: string): string {
  let filePath = fileUrl
  if (filePath.startsWith("file://")) {
    try {
      filePath = decodeURIComponent(new URL(filePath).pathname)
    } catch (error) {
      throw new Error(`无效的 file:// URL: ${fileUrl}`, { cause: error })
    }
  }
  const resolved = resolve(filePath)
  if (!existsSync(resolved)) {
    throw new Error(`文件不存在: ${resolved}`)
  }
  let buffer: Buffer
  try {
    buffer = readFileSync(resolved)
  } catch (error) {
    throw new Error(`读取文件失败: ${resolved}`, { cause: error })
  }
  return `data:${mime};base64,${buffer.toString("base64")}`
}

type PromptPart = { type?: unknown; text?: unknown }

function extractDescription(data: unknown): string {
  if (typeof data === "string") return data.trim()
  if (data && typeof data === "object" && Array.isArray((data as { parts?: unknown }).parts)) {
    return ((data as { parts: PromptPart[] }).parts)
      .filter((part) => part?.type === "text" && typeof part.text === "string")
      .map((part) => part.text as string)
      .join("\n")
      .trim()
  }
  return ""
}

const defaultQuestions: Record<string, string> = {
  image: "请详细描述这张图片的内容。如果是代码截图，请完整提取代码并解释。如果是图表，请描述数据和趋势。如果是错误截图，请提取错误信息。",
  audio: "请转录这段音频的内容。如果有多个说话人，请区分。",
  video: "请描述这个视频的主要内容，包括场景、动作和对话。",
  pdf: "请提取这个PDF文档的主要文本内容。",
}

export default tool({
  description: `理解图片、音频、视频或PDF文档的内容。
当用户发送了图片、音频、视频或PDF时，使用此工具来获取内容描述。
返回详细的文本描述，包括图片内容、音频转录、视频描述或PDF文本。`,
  args: {
    url: tool.schema.string().describe("文件的 data: URL、http(s) URL 或本地文件路径"),
    mime: tool.schema.string().describe("文件的 MIME 类型，如 image/png, audio/wav 等"),
    filename: tool.schema.string().optional().describe("文件名（可选）"),
    question: tool.schema.string().optional().describe("关于这个文件的具体问题（可选）"),
  },
  async execute(args, context) {
    const { url, mime, filename, question } = args

    const mediaType = getMediaType(mime)
    if (!mediaType) throw new Error(`不支持的文件类型: ${mime}`)

    const timeoutMs = resolveTimeoutMs()

    const prompt = question || defaultQuestions[mediaType.modality] || `请描述这个${mediaType.name}的内容。`
    context.metadata({ title: `理解${mediaType.name}: ${filename || "未命名文件"}` })

    let fileUrl = url

    if (!url.startsWith("data:") && !url.startsWith("http")) {
      fileUrl = fileToDataUrl(url, mime)
    }

    const serverUrl = process.env.MIMOCODE_SERVER_URL || "http://localhost:3000"
    const endpoint = `${serverUrl}/session/${context.sessionID}/prompt`

    let response: Response
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(timeoutMs),
        body: JSON.stringify({
          parts: [
            { type: "file", mime, url: fileUrl, filename },
            { type: "text", text: prompt },
          ],
          model: { providerID: "mimo", modelID: "mimo-v2.5" },
          source: "hook",
          noReply: true,
        }),
      })
    } catch (error) {
      if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
        throw new Error(`请求 ${endpoint} 超时 (${timeoutMs}ms)`, { cause: error })
      }
      throw new Error(`无法连接到 MiMo Code 服务 ${endpoint}`, { cause: error })
    }

    if (!response.ok) {
      let errorText: string
      try {
        errorText = await response.text()
      } catch (error) {
        errorText = `<无法读取响应内容: ${describeError(error)}>`
      }
      throw new Error(`API 调用失败 (${response.status} ${response.statusText}): ${errorText}`)
    }

    let rawBody: string
    try {
      rawBody = await response.text()
    } catch (error) {
      throw new Error(`读取 ${endpoint} 的响应内容失败`, { cause: error })
    }

    let data: unknown
    try {
      data = JSON.parse(rawBody)
    } catch (error) {
      throw new Error(`API 返回了非 JSON 响应: ${rawBody.slice(0, 500)}`, { cause: error })
    }

    const description = extractDescription(data)
    if (!description) {
      throw new Error(`API 响应中没有可用的文本内容: ${rawBody.slice(0, 500)}`)
    }
    return description
  },
})
