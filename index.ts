import { tool } from "@mimocode/cli/plugin"
import { readFileSync, existsSync, appendFileSync, mkdirSync } from "fs"
import { join, resolve } from "path"
import { homedir } from "os"

const LOG_DIR = join(homedir(), ".config", "mimocode", "plugins", "mimo-multimodal-bridge", "logs")
const LOG_FILE = join(LOG_DIR, "plugin.log")

try { mkdirSync(LOG_DIR, { recursive: true }) } catch {}

function log(level: string, message: string, data?: any) {
  const timestamp = new Date().toISOString()
  const entry = data
    ? `[${timestamp}] [${level}] ${message} ${JSON.stringify(data)}\n`
    : `[${timestamp}] [${level}] ${message}\n`
  try { appendFileSync(LOG_FILE, entry) } catch {}
}

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

function fileToDataUrl(fileUrl: string, mime: string): string | null {
  try {
    let filePath = fileUrl
    if (filePath.startsWith("file://")) {
      filePath = decodeURIComponent(new URL(filePath).pathname)
    }
    const resolved = resolve(filePath)
    if (!existsSync(resolved)) return null
    const buffer = readFileSync(resolved)
    return `data:${mime};base64,${buffer.toString("base64")}`
  } catch {
    return null
  }
}

const defaultQuestions: Record<string, string> = {
  image: "请详细描述这张图片的内容。如果是代码截图，请完整提取代码并解释。如果是图表，请描述数据和趋势。如果是错误截图，请提取错误信息。",
  audio: "请转录这段音频的内容。如果有多个说话人，请区分。",
  video: "请描述这个视频的主要内容，包括场景、动作和对话。",
  pdf: "请提取这个PDF文档的主要文本内容。",
}

async function callMultimodalModel(client: any, sessionID: string, filePart: any, mediaType: { name: string; modality: string }) {
  let fileUrl = filePart.url || ""
  if (!fileUrl.startsWith("data:") && !fileUrl.startsWith("http")) {
    const dataUrl = fileToDataUrl(fileUrl, filePart.mime)
    if (dataUrl) fileUrl = dataUrl
  }

  const defaultQuestion = defaultQuestions[mediaType.modality] || `请描述这个${mediaType.name}的内容。`

  const response = await client.session.prompt({
    path: { id: sessionID },
    body: {
      parts: [
        { type: "file", mime: filePart.mime, url: fileUrl, filename: filePart.filename },
        { type: "text", text: defaultQuestion },
      ],
      model: { providerID: "mimo", modelID: "mimo-v2.5" },
      source: "hook",
      noReply: true,
    },
  })

  const data = (response as any).data ?? response
  let description = ""

  if (data?.parts) {
    description = data.parts
      .filter((p: any) => p.type === "text")
      .map((p: any) => p.text)
      .join("\n")
  } else if (typeof data === "string") {
    description = data
  } else {
    description = JSON.stringify(data)
  }

  return description
}

const server = async ({ client }: any) => {
  log("INFO", "插件已加载，开始注册钩子")

  const hooks: any = {
    tool: {
      understand_media: tool({
        description: `理解图片、音频、视频或PDF文档的内容。
当用户发送了图片、音频、视频或PDF时，使用此工具来获取内容描述。
返回详细的文本描述。`,
        args: {
          url: tool.schema.string().describe("文件的 data: URL、http(s) URL 或本地文件路径"),
          mime: tool.schema.string().describe("文件的 MIME 类型，如 image/png, audio/wav 等"),
          filename: tool.schema.string().optional().describe("文件名（可选）"),
          question: tool.schema.string().optional().describe("关于这个文件的具体问题（可选）"),
        },
        async execute(args, context) {
          const { url, mime, filename, question } = args
          log("INFO", "understand_media 工具被调用", { url, mime, filename })

          const mediaType = getMediaType(mime)
          if (!mediaType) return `不支持的文件类型: ${mime}`

          context.metadata({ title: `理解${mediaType.name}: ${filename || "未命名文件"}` })

          try {
            const description = await callMultimodalModel(client, context.sessionID, { url, mime, filename }, mediaType)
            return description || "无法理解该内容"
          } catch (error) {
            return `处理${mediaType.name}时出错: ${error}`
          }
        },
      }),
    },

    "chat.message": async (input, output) => {
      log("INFO", "=== chat.message 钩子触发 ===", {
        sessionID: input.sessionID,
        model: input.model,
        partsCount: output.parts.length,
        partTypes: output.parts.map((p: any) => ({ type: p.type, mime: p.mime })),
      })

      const mediaParts = output.parts.filter((part) => {
        if (part.type !== "file") return false
        const mime = (part as any).mime
        return mime ? getMediaType(mime) !== null : false
      })

      if (mediaParts.length === 0) {
        log("INFO", "chat.message: 没有检测到多模态内容")
        return
      }

      log("INFO", "chat.message: 检测到多模态内容，开始处理", {
        count: mediaParts.length,
      })

      for (const part of mediaParts) {
        const filePart = part as any
        const mediaType = getMediaType(filePart.mime)
        if (!mediaType) continue

        const index = output.parts.indexOf(part)
        if (index === -1) continue

        try {
          log("INFO", "chat.message: 开始调用 mimo-v2.5", { mime: filePart.mime, filename: filePart.filename })
          const description = await callMultimodalModel(client, input.sessionID, filePart, mediaType)
          log("INFO", "chat.message: mimo-v2.5 返回结果", { length: description.length })

          output.parts[index] = {
            type: "text",
            text: `[${mediaType.name}内容 - 由 mimo-v2.5 理解]\n${description}`,
          } as any
          log("INFO", "chat.message: 已替换文件部分为文本描述")
        } catch (error) {
          log("ERROR", "chat.message: 处理失败", { error: String(error) })
          output.parts[index] = {
            type: "text",
            text: `[${mediaType.name}处理失败: ${error}]`,
          } as any
        }
      }
    },

    "experimental.chat.messages.transform": async (input, output) => {
      log("INFO", "=== experimental.chat.messages.transform 钩子触发 ===", {
        messagesCount: output.messages.length,
      })

      for (const msg of output.messages) {
        const fileParts = msg.parts.filter((part) => {
          if (part.type !== "file") return false
          const mime = (part as any).mime
          return mime ? getMediaType(mime) !== null : false
        })

        if (fileParts.length === 0) continue

        log("INFO", "transform: 发现文件部分", {
          count: fileParts.length,
          types: fileParts.map((p: any) => p.mime),
        })

        for (const part of fileParts) {
          const filePart = part as any
          const mediaType = getMediaType(filePart.mime)
          if (!mediaType) continue

          const index = msg.parts.indexOf(part)
          if (index === -1) continue

          try {
            log("INFO", "transform: 开始调用 mimo-v2.5", { mime: filePart.mime })
            const description = await callMultimodalModel(client, "", filePart, mediaType)
            log("INFO", "transform: mimo-v2.5 返回结果", { length: description.length })

            msg.parts[index] = {
              type: "text",
              text: `[${mediaType.name}内容 - 由 mimo-v2.5 理解]\n${description}`,
            } as any
          } catch (error) {
            log("ERROR", "transform: 处理失败", { error: String(error) })
            msg.parts[index] = {
              type: "text",
              text: `[${mediaType.name}处理失败: ${error}]`,
            } as any
          }
        }
      }
    },
  }

  log("INFO", "所有钩子注册完成")
  return hooks
}

export default {
  id: "mimo-multimodal-bridge",
  server,
}
