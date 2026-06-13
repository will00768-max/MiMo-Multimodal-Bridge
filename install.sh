#!/bin/bash
# MiMo-Multimodal-Bridge 安装脚本

set -e

REPO_URL="https://github.com/will00768-max/MiMo-Multimodal-Bridge"

echo "=========================================="
echo "  MiMo-Multimodal-Bridge 安装"
echo "=========================================="
echo ""

# 检测是否通过管道运行 (curl | bash)
SOURCE_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ ! -f "$SOURCE_DIR/index.ts" ]; then
    echo "正在下载插件文件..."
    TMPDIR_INSTALL="$(mktemp -d)"
    if command -v git &>/dev/null; then
        git clone --depth 1 "$REPO_URL" "$TMPDIR_INSTALL/repo" 2>/dev/null
        SOURCE_DIR="$TMPDIR_INSTALL/repo"
    else
        curl -fsSL "$REPO_URL/archive/refs/heads/main.tar.gz" | tar xz -C "$TMPDIR_INSTALL"
        SOURCE_DIR="$TMPDIR_INSTALL/MiMo-Multimodal-Bridge-main"
    fi
    if [ ! -f "$SOURCE_DIR/index.ts" ]; then
        echo "错误: 无法下载插件文件，请手动克隆仓库:"
        echo "  git clone $REPO_URL"
        exit 1
    fi
fi

# 选择平台
echo "请选择安装平台:"
echo "  1) MiMo Code (默认)"
echo "  2) OpenCode"
echo ""
read -p "请输入选项 (1/2，默认 1): " choice

case "$choice" in
    2)
        platform="opencode"
        configFileName="opencode.json"
        ;;
    *)
        platform="mimocode"
        configFileName="mimocode.json"
        ;;
esac

# MiMo Code 和 OpenCode 使用 XDG 标准路径
# Linux/macOS: ~/.config/{platform}
CONFIG_DIR="$HOME/.config/$platform"

PLUGIN_DIR="$CONFIG_DIR/plugins/mimo-multimodal-bridge"

echo ""
echo "目标平台: $platform"
echo "配置目录: $CONFIG_DIR"
echo "插件目录: $PLUGIN_DIR"
echo ""

# 创建插件目录
echo "创建插件目录..."
mkdir -p "$PLUGIN_DIR"

# 复制插件文件
echo "复制插件文件..."
cp "$SOURCE_DIR/index.ts" "$PLUGIN_DIR/"
cp "$SOURCE_DIR/plugin.json" "$PLUGIN_DIR/"

# 检查配置文件
CONFIG_FILE="$CONFIG_DIR/$configFileName"
if [ ! -f "$CONFIG_FILE" ]; then
    echo "创建配置文件..."
    cat > "$CONFIG_FILE" << EOF
{
  "plugin": [
    "$PLUGIN_DIR/index.ts"
  ]
}
EOF
    echo "配置文件已创建: $CONFIG_FILE"
else
    echo ""
    echo "配置文件已存在: $CONFIG_FILE"
    echo ""
    echo "请手动添加以下内容到 plugin 数组:"
    echo "  \"$PLUGIN_DIR/index.ts\""
    echo ""
    echo "示例:"
    echo '  {'
    echo '    "plugin": ['
    echo "      \"$PLUGIN_DIR/index.ts\""
    echo '    ]'
    echo '  }'
fi

echo ""
echo "=========================================="
echo "  安装完成！"
echo "=========================================="
echo ""
echo "请重启 $platform 以加载插件。"
echo ""
echo "使用方法:"
echo "  1. 发送图片/音频/视频给不支持多模态的模型"
echo "  2. 模型会自动调用 understand_media 工具"
echo "  3. 工具会调用 mimo-v2.5 来理解内容"
echo ""
echo "更多信息请参考:"
echo "  $REPO_URL"

# 清理临时目录
if [ -n "$TMPDIR_INSTALL" ] && [ -d "$TMPDIR_INSTALL" ]; then
    rm -rf "$TMPDIR_INSTALL"
fi
