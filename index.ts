import type { Plugin, Hooks } from "@mimo-ai/plugin"
import { tool } from "@mimo-ai/plugin"
import { readFileSync, existsSync, appendFileSync, mkdirSync } from "fs"
import { join, resolve } from "path"
import { homedir } from "os"
import { pathToFileURL } from "url"

const LOG_DIR = join(homedir(), ".config", "mimocode", "plugins", "mimo-multimodal-bridge", "logs")
const LOG_FILE = join(LOG_DIR, "plugin.log")

try {
  mkdirSync(LOG_DIR, { recursive: true })
} catch {}

function log(level: string, message: string, data?: any) {
  const timestamp = new Date().toISOString()
  const entry = data
    ? `[${timestamp}] [${level}] ${message} ${JSON.stringify(data)}\n`
    : `[${timestamp}] [${level}] ${message}\n`
  try {
    appendFileSync(LOG_FILE, entry)
  } catch {}
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
    log("INFO", "读取文件", { resolved })

    if (!existsSync(resolved)) {
      log("ERROR", "文件不存在", { resolved })
      return null
    }
    const buffer = readFileSync(resolved)
    log("INFO", "文件读取成功", { size: buffer.length })
    return `data:${mime};base64,${buffer.toString("base64")}`
  } catch (error) {
    log("ERROR", "读取文件失败", { error: String(error) })
    return null
  }
}

const server: Plugin = async ({ client }) => {
  const hooks: Hooks = {
    tool: {
      understand_media: tool({
        description: `理解图片、音频、视频或PDF文档的内容。
当用户发送了不支持的多模态内容（如图片、音频、视频）时，必须使用此工具来获取内容描述。

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
          url: tool.schema.string().describe("文件的 data: URL 或文件路径"),
          mime: tool.schema.string().describe("文件的 MIME 类型，如 image/png, audio/wav 等"),
          filename: tool.schema.string().optional().describe("文件名（可选）"),
          question: tool.schema.string().optional().describe(
            "关于这个文件的具体问题（可选）。例如：'这段代码有什么错误？'、'这个图表显示了什么趋势？'"
          ),
        },
        async execute(args, context) {
          const { url, mime, filename, question } = args

          log("INFO", "understand_media 开始执行", { url, mime, filename })

          const mediaType = getMediaType(mime)
          if (!mediaType) {
            return { output: `不支持的文件类型: ${mime}` }
          }

          const defaultQuestions: Record<string, string> = {
            image: "请详细描述这张图片的内容。如果是代码截图，请完整提取代码并解释。如果是图表，请描述数据和趋势。如果是错误截图，请提取错误信息。",
            audio: "请转录这段音频的内容。如果有多个说话人，请区分。",
            video: "请描述这个视频的主要内容，包括场景、动作和对话。",
            pdf: "请提取这个PDF文档的主要文本内容。",
          }

          const prompt = question || defaultQuestions[mediaType.modality] || `请描述这个${mediaType.name}的内容。`

          context.metadata({ title: `理解${mediaType.name}: ${filename || "未命名文件"}` })

          try {
            let fileUrl = url

            if (!url.startsWith("data:") && !url.startsWith("http")) {
              log("INFO", "本地文件路径，转换为 data URL")
              const dataUrl = fileToDataUrl(url, mime)
              if (dataUrl) {
                fileUrl = dataUrl
              } else {
                return { output: `无法读取文件: ${url}` }
              }
            }

            log("INFO", "调用多模态模型 mimo/mimo-v2.5")
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

            log("INFO", "API 返回结果", { responseType: typeof response })

            if (!response) {
              return { output: "API 返回空结果" }
            }

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

            log("INFO", "描述生成成功", { length: description.length })

            return {
              output: description || "无法理解该内容",
              metadata: {
                mediaType: mediaType.modality,
                filename,
                model: "mimo-v2.5",
              },
            }
          } catch (error) {
            log("ERROR", "执行失败", { error: String(error) })
            return { output: `处理${mediaType.name}时出错: ${error}` }
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

      if (mediaParts.length > 0) {
        log("INFO", "检测到多模态内容", {
          count: mediaParts.length,
          types: mediaParts.map((p) => (p as any).mime),
        })
      }
    },
  }

  return hooks
}

export default {
  id: "mimo-multimodal-bridge",
  server,
}
