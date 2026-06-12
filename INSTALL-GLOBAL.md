# MiMo-Multimodal-Bridge - 全局安装指南

## 全局安装的 MiMo Code 用户

如果你是通过以下方式安装的 MiMo Code：

```bash
# 一键安装
curl -fsSL https://mimo.xiaomi.com/install | bash

# 或通过 npm 安装
npm install -g @mimo-ai/cli
```

## 配置目录位置

MiMo Code 的全局配置目录取决于你的操作系统：

| 操作系统 | 配置目录 |
|---------|---------|
| Linux | `~/.config/mimocode` |
| macOS | `~/Library/Application Support/mimocode` |
| Windows | `%APPDATA%\mimocode` |

如果设置了 `MIMOCODE_HOME` 环境变量，配置目录为 `$MIMOCODE_HOME/config`。

## 安装步骤

### 方式一：使用安装脚本（推荐）

```bash
# Linux/Mac
curl -fsSL https://raw.githubusercontent.com/will00768-max/MiMo-Multimodal-Bridge/main/install.sh | bash

# Windows (PowerShell)
irm https://raw.githubusercontent.com/will00768-max/MiMo-Multimodal-Bridge/main/install.ps1 | iex
```

### 方式二：手动安装

#### 步骤 1：找到配置目录

```bash
# Linux
echo ~/.config/mimocode

# macOS
echo ~/Library/Application\ Support/mimocode

# Windows (PowerShell)
echo $env:APPDATA\mimocode
```

#### 步骤 2：创建插件目录

```bash
# Linux/Mac
mkdir -p ~/.config/mimocode/plugins/mimo-multimodal-bridge

# Windows (PowerShell)
mkdir -p $env:APPDATA\mimocode\plugins\mimo-multimodal-bridge
```

#### 步骤 3：复制插件文件

将以下文件复制到插件目录：
- `server.ts`
- `plugin.json`

```bash
# Linux/Mac（假设你在插件源码目录）
cp server.ts plugin.json ~/.config/mimocode/plugins/mimo-multimodal-bridge/

# Windows (PowerShell)
Copy-Item server.ts, plugin.json $env:APPDATA\mimocode\plugins\mimo-multimodal-bridge\
```

#### 步骤 4：编辑配置文件

打开或创建全局配置文件：

```bash
# Linux/Mac
nano ~/.config/mimocode/mimocode.json

# Windows
notepad %APPDATA%\mimocode\mimocode.json
```

添加 `plugin` 字段：

```json
{
  "plugin": [
    "~/.config/mimocode/plugins/mimo-multimodal-bridge/server.ts"
  ]
}
```

**Windows 用户**使用：

```json
{
  "plugin": [
    "%APPDATA%\\mimocode\\plugins\\mimo-multimodal-bridge\\server.ts"
  ]
}
```

**注意**：
- 如果配置文件已有其他内容，只需在 `plugin` 数组中添加新条目
- 如果 `plugin` 字段不存在，创建它
- 使用正斜杠 `/` 或双反斜杠 `\\` 作为路径分隔符

#### 步骤 5：重启 MiMo Code

关闭并重新启动 MiMo Code 以加载插件。

## 验证安装

1. 启动 MiMo Code
2. 发送一张图片给 `mimo-v2.5-pro` 模型
3. 如果看到模型调用 `understand_media` 工具，说明安装成功！

## 项目级安装

如果你只想在特定项目中使用插件：

1. 在项目根目录创建插件目录：
   ```bash
   mkdir -p .mimocode/plugins/mimo-multimodal-bridge
   ```

2. 复制插件文件：
   ```bash
   cp server.ts plugin.json .mimocode/plugins/mimo-multimodal-bridge/
   ```

3. 在项目的 `.mimocode/mimocode.json` 中添加：
   ```json
   {
     "plugin": [
       "./plugins/mimo-multimodal-bridge/server.ts"
     ]
   }
   ```

## 故障排除

### 插件未加载

1. **检查配置文件路径**：
   ```bash
   # Linux/Mac
   cat ~/.config/mimocode/mimocode.json
   
   # Windows
   type %APPDATA%\mimocode\mimocode.json
   ```

2. **检查 JSON 格式**：
   - 确保 JSON 格式有效
   - 可以使用在线 JSON 验证工具

3. **检查插件文件**：
   ```bash
   # Linux/Mac
   ls -la ~/.config/mimocode/plugins/mimo-multimodal-bridge/
   
   # Windows
   dir %APPDATA%\mimocode\plugins\mimo-multimodal-bridge\
   ```

4. **重启 MiMo Code**

### 工具未显示

- 确认插件文件已正确复制
- 检查控制台是否有错误信息
- 确认配置文件中的路径正确

### 调用失败

- 确认可以访问 `mimo-v2.5` 模型
- 检查网络连接
- 查看 MiMo Code 的错误日志

## 卸载插件

1. 从配置文件中移除 `plugin` 条目
2. 删除插件目录：
   ```bash
   # Linux/Mac
   rm -rf ~/.config/mimocode/plugins/mimo-multimodal-bridge
   
   # Windows
   rmdir /s /q %APPDATA%\mimocode\plugins\mimo-multimodal-bridge
   ```
3. 重启 MiMo Code
