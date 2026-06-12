import type { Plugin, Hooks } from "@mimo-ai/plugin"
import { tool } from "@mimo-ai/plugin"

/**
 * MiMo-Multimodal-Bridge
 * 
 * 让不支持多模态的模型（如 mimo-v2.5-pro）能够理解图片、音频、视频内容。
 * 通过提供 understand_media 工具，实现跨模型的多模态能力桥接。
 * 
 * GitHub: https://github.com/will00768-max/MiMo-Multimodal-Bridge
 */

// 多模态 MIME 类型检测
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

// 检测消息中是否包含多模态内容
let hasMultimodalContent = false
let multimodalFiles: string[] = []

// 检测当前平台和 provider ID
function detectProviderAndModel(client: any): { providerID: string; modelID: string } {
  // MiMo Code 和 OpenCode 使用不同的 provider ID
  // MiMo Code: "mimo" 或 "xiaomi"
  // OpenCode: "opencode"
  
  // 通过检查环境变量或配置来判断平台
  // 默认尝试 MiMo，如果失败则尝试 OpenCode
  return {
    providerID: "mimo",
    modelID: "mimo-v2.5",
  }
}

// 备用配置：如果 MiMo 失败，尝试 OpenCode
const FALLBACK_CONFIG = {
  providerID: "opencode",
  modelID: "mimo-v2.5",
}

/**
 * 插件主函数
 */
const server: Plugin = async (input) => {
  const { client } = input
  
  // 检测平台
  const modelConfig = detectProviderAndModel(client)

  const hooks: Hooks = {
    /**
     * 注册 understand_media 工具
     */
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

          const mediaType = getMediaType(mime)
          if (!mediaType) {
            return {
              output: `不支持的文件类型: ${mime}`,
              metadata: { error: "unsupported_type" },
            }
          }

          const defaultQuestions: Record<string, string> = {
            image: "请详细描述这张图片的内容。如果是代码截图，请完整提取代码并解释。如果是图表，请描述数据和趋势。如果是错误截图，请提取错误信息。",
            audio: "请转录这段音频的内容。如果有多个说话人，请区分。",
            video: "请描述这个视频的主要内容，包括场景、动作和对话。",
            pdf: "请提取这个PDF文档的主要文本内容。",
          }

          const prompt = question || defaultQuestions[mediaType.modality] || 
            `请描述这个${mediaType.name}的内容。`

          context.metadata({
            title: `理解${mediaType.name}: ${filename || "未命名文件"}`,
          })

          try {
            // 创建新 session 来调用多模态模型
            const session = await client.session.create({})
            const sessionId = session.id

            // 尝试调用模型，如果失败则使用备用配置
            let response
            try {
              response = await client.session.prompt({
                path: { id: sessionId },
                body: {
                  parts: [
                    {
                      type: "file",
                      mime: mime,
                      url: url,
                      filename: filename,
                    },
                    {
                      type: "text",
                      text: prompt,
                    },
                  ],
                  model: modelConfig,
                },
              })
            } catch (firstError) {
              // 如果第一次尝试失败，使用备用配置
              console.log(`[MiMo-Multimodal-Bridge] 第一次调用失败，尝试备用配置...`)
              response = await client.session.prompt({
                path: { id: sessionId },
                body: {
                  parts: [
                    {
                      type: "file",
                      mime: mime,
                      url: url,
                      filename: filename,
                    },
                    {
                      type: "text",
                      text: prompt,
                    },
                  ],
                  model: FALLBACK_CONFIG,
                },
              })
            }

            const textParts = response.parts.filter((p: any) => p.type === "text")
            const description = textParts.map((p: any) => p.text).join("\n")

            return {
              output: description || "无法理解该内容",
              metadata: {
                mediaType: mediaType.modality,
                filename: filename,
                model: modelConfig.modelID,
              },
            }
          } catch (error) {
            return {
              output: `处理${mediaType.name}时出错: ${error}`,
              metadata: { error: String(error) },
            }
          }
        },
      }),
    },

    /**
     * 在消息接收时检测多模态内容
     */
    "chat.message": async (input, output) => {
      const { parts } = output

      // 检测多模态内容
      const mediaParts = parts.filter(
        (part) => part.type === "file" && getMediaType(part.mime)
      )

      hasMultimodalContent = mediaParts.length > 0
      multimodalFiles = mediaParts.map(p => {
        if (p.type === "file") {
          const mediaType = getMediaType(p.mime)
          return `${mediaType?.name || "未知"}: ${p.filename || p.mime}`
        }
        return ""
      }).filter(Boolean)
    },

    /**
     * 在系统提示中添加多模态处理指导
     */
    "experimental.chat.system.transform": async (input, output) => {
      // 只在有多模态内容时添加指导
      if (!hasMultimodalContent || multimodalFiles.length === 0) {
        return
      }

      const multimodalInstruction = `
## 多模态内容处理

检测到用户发送了多模态内容：${multimodalFiles.join("、")}

**重要**：你必须使用 \`understand_media\` 工具来理解这些多模态内容。
不要告诉用户你不支持图片/音频/视频，而是调用工具来获取内容描述。

使用方法：
1. 调用 understand_media 工具，传入文件的 url、mime 类型和 filename
2. 获取工具返回的描述结果
3. 基于描述结果回答用户的问题
`

      output.system.push(multimodalInstruction)
    },
  }

  return hooks
}

// 导出格式必须符合 MiMo Code 插件规范
export default {
  id: "mimo-multimodal-bridge",
  server,
}
