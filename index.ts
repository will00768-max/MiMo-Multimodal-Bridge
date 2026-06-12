import type { Plugin, Hooks } from "@mimo-ai/plugin"
import { tool } from "@mimo-ai/plugin"

/**
 * MiMo-Multimodal-Bridge
 * 
 * 让不支持多模态的模型（如 mimo-v2.5-pro）能够理解图片、音频、视频内容。
 * 通过提供 understand_media 工具，实现跨模型的多模态能力桥接。
 * 
 * 工作原理：
 * 1. 用户发送多模态内容（图片/音频/视频）
 * 2. 主模型发现不支持该模态，调用 understand_media 工具
 * 3. 工具内部调用支持多模态的模型（如 mimo-v2.5）来理解内容
 * 4. 将理解结果返回给主模型
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
  // 精确匹配
  if (MEDIA_TYPES[mime]) return MEDIA_TYPES[mime]
  
  // 前缀匹配
  if (mime.startsWith("image/")) return { name: "图片", modality: "image" }
  if (mime.startsWith("audio/")) return { name: "音频", modality: "audio" }
  if (mime.startsWith("video/")) return { name: "视频", modality: "video" }
  
  return null
}

/**
 * 通过 SDK 调用支持多模态的模型来理解内容
 */
async function callMultimodalModel(
  client: any,
  mediaUrl: string,
  mime: string,
  filename: string | undefined,
  question: string
): Promise<string> {
  try {
    // 创建一个新的 session 来调用多模态模型
    const session = await client.session.create({})
    const sessionId = session.id

    // 构建包含多模态内容的消息
    const parts = [
      {
        type: "file",
        mime: mime,
        url: mediaUrl,
        filename: filename,
      },
      {
        type: "text",
        text: question,
      },
    ]

    // 调用 mimo-v2.5 模型（支持多模态）
    const response = await client.session.prompt({
      path: { id: sessionId },
      body: {
        parts: parts,
        model: {
          providerID: "mimo",  // 或者 "opencode"
          modelID: "mimo-v2.5",
        },
        noReply: false,
      },
    })

    // 提取响应文本
    const textParts = response.parts.filter((p: any) => p.type === "text")
    const description = textParts.map((p: any) => p.text).join("\n")

    return description || "无法理解该内容"
  } catch (error) {
    return `调用多模态模型失败: ${error}`
  }
}

/**
 * 插件主入口
 */
export const server: Plugin = async (input) => {
  const { client } = input

  // 配置选项
  const multimodalModel = {
    providerID: "mimo",
    modelID: "mimo-v2.5",
  }

  const hooks: Hooks = {
    /**
     * 注册自定义工具
     */
    tool: {
      understand_media: tool({
        description: `理解图片、音频、视频或PDF文档的内容。
当用户发送了你不支持的多模态内容时，使用此工具来获取内容描述。
返回详细的文本描述，包括：
- 图片：描述视觉内容、识别文字、提取代码等
- 音频：转录语音内容
- 视频：描述场景、动作和语音
- PDF：提取文本内容

使用场景：
1. 用户发送了图片但当前模型不支持图片输入
2. 需要理解截图中的代码或错误信息
3. 需要分析图表或数据可视化
4. 需要转录音频或视频内容`,
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

          // 检测媒体类型
          const mediaType = getMediaType(mime)
          if (!mediaType) {
            return {
              output: `不支持的文件类型: ${mime}。支持的类型：图片(image/*)、音频(audio/*)、视频(video/*)、PDF(application/pdf)`,
              metadata: { error: "unsupported_type" },
            }
          }

          // 构建默认问题
          const defaultQuestions: Record<string, string> = {
            image: "请详细描述这张图片的内容。如果是代码截图，请完整提取代码并解释。如果是图表，请描述数据和趋势。如果是错误截图，请提取错误信息。",
            audio: "请转录这段音频的内容。如果有多个说话人，请区分。",
            video: "请描述这个视频的主要内容，包括场景、动作和对话。",
            pdf: "请提取这个PDF文档的主要文本内容。",
          }

          const prompt = question || defaultQuestions[mediaType.modality] || 
            `请描述这个${mediaType.name}的内容。`

          // 设置工具元数据
          context.metadata({
            title: `理解${mediaType.name}: ${filename || "未命名文件"}`,
          })

          try {
            // 调用多模态模型
            const description = await callMultimodalModel(
              client,
              url,
              mime,
              filename,
              prompt
            )

            return {
              output: description,
              metadata: {
                mediaType: mediaType.modality,
                filename: filename,
                model: multimodalModel.modelID,
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

      if (mediaParts.length === 0) {
        return
      }

      // 记录日志（可选）
      console.log("[MiMo Multimodal Bridge] 检测到多模态内容:", 
        mediaParts.map(p => p.type === "file" ? `${getMediaType(p.mime)?.name}: ${p.filename || p.mime}` : "").filter(Boolean)
      )
    },
  }

  return hooks
}

export default server
