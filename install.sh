#!/bin/bash
# MiMo-Multimodal-Bridge 安装脚本

set -e

echo "=========================================="
echo "  MiMo-Multimodal-Bridge 安装"
echo "=========================================="
echo ""

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

# 检测操作系统
if [[ "$OSTYPE" == "darwin"* ]]; then
    if [ "$platform" = "opencode" ]; then
        CONFIG_DIR="$HOME/Library/Application Support/opencode"
    else
        CONFIG_DIR="$HOME/Library/Application Support/mimocode"
    fi
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    if [ "$platform" = "opencode" ]; then
        CONFIG_DIR="$HOME/.config/opencode"
    else
        CONFIG_DIR="$HOME/.config/mimocode"
    fi
else
    echo "不支持的操作系统，请手动安装"
    echo "参考: INSTALL-GLOBAL.md"
    exit 1
fi

PLUGIN_DIR="$CONFIG_DIR/plugins/mimo-multimodal-bridge"
SOURCE_DIR="$(cd "$(dirname "$0")" && pwd)"

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
echo "  https://github.com/will00768-max/MiMo-Multimodal-Bridge"
