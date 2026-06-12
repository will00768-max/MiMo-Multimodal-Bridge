# MiMo-Multimodal-Bridge

[English](#english) | [中文](#中文)

---

## 中文

MiMo 多模态桥接插件 - 让不支持多模态的模型（如 mimo-v2.5-pro）能够理解图片、音频、视频内容。

### 功能特性

- 🖼️ **图片理解** - 代码截图、图表、错误信息
- 🎵 **音频转录** - 语音内容识别
- 🎬 **视频描述** - 场景和动作理解
- 📄 **PDF 提取** - 文档内容提取

### 工作原理

```
用户发送图片 → mimo-v2.5-pro 不支持 → 调用 understand_media 工具 
→ 工具调用 mimo-v2.5 理解 → 返回结果 → mimo-v2.5-pro 继续处理
```

### 安装

#### 快速安装（推荐）

```bash
# Linux/Mac
curl -fsSL https://raw.githubusercontent.com/will00768-max/MiMo-Multimodal-Bridge/main/install.sh | bash

# Windows (PowerShell)
irm https://raw.githubusercontent.com/will00768-max/MiMo-Multimodal-Bridge/main/install.ps1 | iex
```

#### 手动安装

1. **下载插件**：
   ```bash
   git clone https://github.com/will00768-max/MiMo-Multimodal-Bridge.git
   cd MiMo-Multimodal-Bridge
   ```

2. **复制到插件目录**：
   ```bash
   # Linux/Mac
   mkdir -p ~/.config/mimocode/plugins/mimo-multimodal-bridge
   cp index.ts plugin.json ~/.config/mimocode/plugins/mimo-multimodal-bridge/

   # Windows
   mkdir %APPDATA%\mimocode\plugins\mimo-multimodal-bridge
   copy index.ts plugin.json %APPDATA%\mimocode\plugins\mimo-multimodal-bridge\
   ```

3. **添加配置**：
   
   编辑 `~/.config/mimocode/mimocode.json`（或对应的全局配置文件）：
   ```json
   {
     "plugin": [
       "~/.config/mimocode/plugins/mimo-multimodal-bridge/index.ts"
     ]
   }
   ```

4. **重启 MiMo Code**

详细安装说明请参考 [INSTALL-GLOBAL.md](./INSTALL-GLOBAL.md)

### 使用方法

安装后，当遇到不支持的多模态内容时，模型会自动调用 `understand_media` 工具。

**示例**：
```
用户: [发送代码截图] 这段代码有什么错误？

模型: 我来查看这张图片...
[自动调用 understand_media 工具]

工具返回: 这是一段 Python 代码截图：
```python
def calculate(a, b)
    return a + b
```
函数定义缺少冒号...

模型: 根据图片内容，你的代码在函数定义行缺少冒号，应该是：
```python
def calculate(a, b):
    return a + b
```
```

### 支持的媒体类型

| 类型 | MIME 类型 | 说明 |
|------|-----------|------|
| 图片 | image/* | PNG, JPEG, GIF, WebP 等 |
| 音频 | audio/* | WAV, MP3 等 |
| 视频 | video/* | MP4, WebM 等 |
| PDF | application/pdf | PDF 文档 |

### 配置选项

插件使用以下默认配置：
- **多模态模型**: mimo-v2.5
- **Provider**: mimo

### 升级兼容性

- ✅ 不修改核心代码
- ✅ 官方升级无影响
- ✅ 插件接口向后兼容

### 已知限制

- 需要能够访问支持多模态的模型（如 mimo-v2.5）
- 处理大文件时可能较慢
- 音频/视频理解能力取决于底层模型

### 开发计划

- [ ] 支持自定义多模态模型配置
- [ ] 支持批量处理多个媒体文件
- [ ] 缓存已处理的内容
- [ ] 支持更多模型提供商

### 许可证

MIT

---

## English

MiMo Multimodal Bridge Plugin - Enable text-only models (like mimo-v2.5-pro) to understand images, audio, and video content.

### Features

- 🖼️ **Image Understanding** - Code screenshots, charts, error messages
- 🎵 **Audio Transcription** - Speech content recognition
- 🎬 **Video Description** - Scene and action understanding
- 📄 **PDF Extraction** - Document content extraction

### How It Works

```
User sends image → mimo-v2.5-pro doesn't support → Calls understand_media tool 
→ Tool uses mimo-v2.5 to understand → Returns result → mimo-v2.5-pro continues
```

### Installation

See [INSTALL-GLOBAL.md](./INSTALL-GLOBAL.md) for detailed installation instructions.

### Usage

After installation, when encountering unsupported multimodal content, the model will automatically call the `understand_media` tool.

### Supported Media Types

| Type | MIME Type | Description |
|------|-----------|-------------|
| Image | image/* | PNG, JPEG, GIF, WebP, etc. |
| Audio | audio/* | WAV, MP3, etc. |
| Video | video/* | MP4, WebM, etc. |
| PDF | application/pdf | PDF documents |

### License

MIT
