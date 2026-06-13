# MiMo-Multimodal-Bridge - 全局安装指南

## 配置目录位置

MiMo Code 和 OpenCode 使用 XDG 标准路径：

| 平台 | 操作系统 | 配置目录 |
|------|---------|---------|
| MiMo Code | Linux | `~/.config/mimocode` |
| MiMo Code | macOS | `~/.config/mimocode` |
| MiMo Code | Windows | `%USERPROFILE%\.config\mimocode` |
| OpenCode | Linux | `~/.config/opencode` |
| OpenCode | macOS | `~/.config/opencode` |
| OpenCode | Windows | `%USERPROFILE%\.config\opencode` |

**注意**：即使在 Windows 上，MiMo Code 也使用 `.config` 目录，而不是 `%APPDATA%`。

如果设置了 `MIMOCODE_HOME` 环境变量，配置目录为 `$MIMOCODE_HOME/config`。

## 安装步骤

### 方式一：使用安装脚本（推荐）

```bash
# Linux/Mac
curl -fsSL https://raw.githubusercontent.com/will00768-max/MiMo-Multimodal-Bridge/main/install.sh | bash

# Windows PowerShell
irm https://raw.githubusercontent.com/will00768-max/MiMo-Multimodal-Bridge/main/install.ps1 | iex
```

### 方式二：手动安装

#### 步骤 1：找到配置目录

```bash
# Linux/Mac
~/.config/mimocode    # MiMo Code
~/.config/opencode    # OpenCode

# Windows
%USERPROFILE%\.config\mimocode    # MiMo Code
%USERPROFILE%\.config\opencode    # OpenCode
```

#### 步骤 2：创建插件目录

```bash
# Linux/Mac
mkdir -p ~/.config/mimocode/plugins/mimo-multimodal-bridge

# Windows PowerShell
mkdir -p $env:USERPROFILE\.config\mimocode\plugins\mimo-multimodal-bridge
```

#### 步骤 3：复制插件文件

将 `index.ts` 和 `plugin.json` 复制到插件目录。

#### 步骤 4：编辑配置文件

配置文件位置：
- MiMo Code: `~/.config/mimocode/mimocode.json`
- OpenCode: `~/.config/opencode/opencode.json`

添加 `plugin` 字段：

```json
{
  "plugin": [
    "~/.config/mimocode/plugins/mimo-multimodal-bridge/index.ts"
  ]
}
```

#### 步骤 5：重启 MiMo Code / OpenCode

## 验证安装

1. 启动 MiMo Code 或 OpenCode
2. 发送一张图片给不支持多模态的模型
3. 如果看到模型调用 `understand_media` 工具，说明安装成功！

## 项目级安装

在项目根目录创建 `.mimocode/` 或 `.opencode/` 目录：

```
your-project/
├── .mimocode/
│   ├── mimocode.json
│   └── plugins/
│       └── mimo-multimodal-bridge/
│           ├── index.ts
│           └── plugin.json
└── ...
```

配置文件 `.mimocode/mimocode.json`：

```json
{
  "plugin": [
    "./plugins/mimo-multimodal-bridge/index.ts"
  ]
}
```

## 故障排除

### 插件未加载

1. 检查配置文件路径是否正确
2. 检查 JSON 格式是否有效
3. 重启 MiMo Code / OpenCode

### 找不到配置目录

```bash
# Linux/Mac
ls -la ~/.config/mimocode

# Windows PowerShell
dir $env:USERPROFILE\.config\mimocode
```

## 卸载插件

1. 从配置文件中移除 `plugin` 条目
2. 删除插件目录
3. 重启 MiMo Code / OpenCode
