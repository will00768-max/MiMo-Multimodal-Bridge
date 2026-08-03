#!/bin/bash
# MiMo-Multimodal-Bridge 安装脚本

set -e

REPO_URL="https://github.com/will00768-max/MiMo-Multimodal-Bridge"

banner() {
    echo "=========================================="
    echo "  $1"
    echo "=========================================="
    echo ""
}

banner "MiMo-Multimodal-Bridge 安装"

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

# MiMo Code 使用 XDG 标准路径
CONFIG_DIR="$HOME/.config/mimocode"
TOOLS_DIR="$CONFIG_DIR/tools"

echo ""
echo "配置目录: $CONFIG_DIR"
echo "工具目录: $TOOLS_DIR"
echo ""

# 创建工具目录
echo "创建工具目录..."
mkdir -p "$TOOLS_DIR"

# 复制工具文件
echo "复制工具文件..."
cp "$SOURCE_DIR/index.ts" "$TOOLS_DIR/understand_media.ts"

echo ""
banner "安装完成！"
echo "请重启 MiMo Code 以加载工具。"
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
