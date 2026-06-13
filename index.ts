import type { Plugin, Hooks } from "@mimo-ai/plugin"
import { tool } from "@mimo-ai/plugin"
import { readFileSync, existsSync } from "fs"
import { resolve } from "path"
import { pathToFileURL } from "url"

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

const server: Plugin = async ({ client }) => {
  const hooks: Hooks = {
    tool: {
      understand_media: tool({
        description: `理解图片、音频、视频或PDF文档的内容。
当用户发送了图片、音频、视频或PDF时，使用此工具来获取内容描述。

使用场景：
1. 用户发送了图片（截图、照片、图表等）
2. 用户发送了音频文件
3. 用户发送了视频文件
4. 用户发送了PDF文档

返回详细的文本描述，包括：
- 图片：描述视觉内容、识别文字、提取代码等
- 音频：转录语音内容
- 视频：描述场景、动作和对话
- PDF：提取文本内容`,
        args: {
          url: tool.schema.string().describe("文件的 data: URL、http(s) URL 或本地文件路径"),
          mime: tool.schema.string().describe("文件的 MIME 类型，如 image/png, audio/wav 等"),
          filename: tool.schema.string().optional().describe("文件名（可选）"),
          question: tool.schema.string().optional().describe(
            "关于这个文件的具体问题（可选）。例如：'这段代码有什么错误？'、'这个图表显示了什么趋势？'"
          ),
        },
        async execute(args, context) {
          const { url, mime, filename, question } = args

          const mediaType = getMediaType(mime)
          if (!mediaType) {
            return `不支持的文件类型: ${mime}`
          }

          const prompt = question || defaultQuestions[mediaType.modality] || `请描述这个${mediaType.name}的内容。`
          context.metadata({ title: `理解${mediaType.name}: ${filename || "未命名文件"}` })

          try {
            let fileUrl = url

            if (!url.startsWith("data:") && !url.startsWith("http")) {
              const dataUrl = fileToDataUrl(url, mime)
              if (dataUrl) {
                fileUrl = dataUrl
              } else {
                return `无法读取文件: ${url}`
              }
            }

            const response = await client.session.prompt({
              path: { id: context.sessionID },
              body: {
                parts: [
                  { type: "file", mime, url: fileUrl, filename },
                  { type: "text", text: prompt },
                ],
                model: { providerID: "mimo", modelID: "mimo-v2.5" },
                source: "hook",
                noReply: true,
              },
            })

            if (!response) return "API 返回空结果"

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

            return description || "无法理解该内容"
          } catch (error) {
            return `处理${mediaType.name}时出错: ${error}`
          }
        },
      }),
    },

    "chat.message": async (input, output) => {
      const mediaParts = output.parts.filter((part) => {
        if (part.type !== "file") return false
        const mime = (part as any).mime
        return mime ? getMediaType(mime) !== null : false
      })

      if (mediaParts.length === 0) return

      for (const part of mediaParts) {
        const filePart = part as any
        const mediaType = getMediaType(filePart.mime)
        if (!mediaType) continue

        const index = output.parts.indexOf(part)
        if (index === -1) continue

        try {
          let fileUrl = filePart.url || ""

          if (!fileUrl.startsWith("data:") && !fileUrl.startsWith("http")) {
            const dataUrl = fileToDataUrl(fileUrl, filePart.mime)
            if (dataUrl) fileUrl = dataUrl
          }

          const defaultQuestion = defaultQuestions[mediaType.modality] || `请描述这个${mediaType.name}的内容。`

          const response = await client.session.prompt({
            path: { id: input.sessionID },
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

          output.parts[index] = {
            type: "text",
            text: `[${mediaType.name}内容 - 由 mimo-v2.5 理解]\n${description}`,
          } as any
        } catch (error) {
          output.parts[index] = {
            type: "text",
            text: `[${mediaType.name}处理失败: ${error}]`,
          } as any
        }
      }
    },
  }

  return hooks
}

export default {
  id: "mimo-multimodal-bridge",
  server,
}
