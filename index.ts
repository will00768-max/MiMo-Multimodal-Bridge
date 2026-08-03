import { tool } from "@@mimocode/cli/plugin"
import { readFileSync, existsSync, statSync } from "fs"
import { extname, resolve } from "path"

// Only media files are legitimate inputs for this tool. Restricting reads to
// these extensions prevents the tool from being coerced into reading and
// exfiltrating arbitrary local files (e.g. ~/.ssh/id_rsa, .env, credentials).
const ALLOWED_EXTENSIONS: Record<string, string[]> = {
  image: [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg", ".tif", ".tiff", ".heic", ".heif"],
  audio: [".wav", ".mp3", ".m4a", ".aac", ".ogg", ".oga", ".opus", ".flac", ".weba"],
  video: [".mp4", ".webm", ".mov", ".mkv", ".avi", ".m4v"],
  pdf: [".pdf"],
}

// Guard against reading very large files into memory and inflating requests.
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB

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

function fileToDataUrl(fileUrl: string, mime: string, modality: string): string | null {
  try {
    let filePath = fileUrl
    if (filePath.startsWith("file://")) {
      filePath = decodeURIComponent(new URL(filePath).pathname)
    }
    const resolved = resolve(filePath)

    const allowed = ALLOWED_EXTENSIONS[modality]
    if (!allowed || !allowed.includes(extname(resolved).toLowerCase())) return null

    if (!existsSync(resolved)) return null

    const stats = statSync(resolved)
    if (!stats.isFile() || stats.size > MAX_FILE_SIZE) return null

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
    if (!mediaType) return `不支持的文件类型: ${mime}`

    const prompt = question || defaultQuestions[mediaType.modality] || `请描述这个${mediaType.name}的内容。`
    context.metadata({ title: `理解${mediaType.name}: ${filename || "未命名文件"}` })

    try {
      let fileUrl = url

      if (!url.startsWith("data:") && !url.startsWith("http://") && !url.startsWith("https://")) {
        const dataUrl = fileToDataUrl(url, mime, mediaType.modality)
        if (dataUrl) {
          fileUrl = dataUrl
        } else {
          return `无法读取文件: ${url}`
        }
      }

      const serverUrl = process.env.MIMOCODE_SERVER_URL || "http://localhost:3000"

      const response = await fetch(`${serverUrl}/session/${context.sessionID}/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

      if (!response.ok) {
        const errorText = await response.text()
        return `API 调用失败 (${response.status}): ${errorText}`
      }

      const data = await response.json()
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

      return description || "无法理解该内容"
    } catch (error) {
      return `处理${mediaType.name}时出错: ${error}`
    }
  },
})
