#!/bin/bash
# MiMo-Multimodal-Bridge 安装脚本

set -euo pipefail

REPO_URL="https://github.com/will00768-max/MiMo-Multimodal-Bridge"
TMPDIR_INSTALL=""

cleanup() {
    if [ -n "$TMPDIR_INSTALL" ] && [ -d "$TMPDIR_INSTALL" ]; then
        rm -rf "$TMPDIR_INSTALL"
    fi
}
trap cleanup EXIT

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
        if ! git clone --depth 1 "$REPO_URL" "$TMPDIR_INSTALL/repo"; then
            echo "错误: git clone $REPO_URL 失败（错误详情见上方输出）" >&2
            exit 1
        fi
        SOURCE_DIR="$TMPDIR_INSTALL/repo"
    else
        if ! curl -fsSL "$REPO_URL/archive/refs/heads/main.tar.gz" | tar xz -C "$TMPDIR_INSTALL"; then
            echo "错误: 下载或解包 main.tar.gz 失败" >&2
            exit 1
        fi
        SOURCE_DIR="$TMPDIR_INSTALL/MiMo-Multimodal-Bridge-main"
    fi
    if [ ! -f "$SOURCE_DIR/index.ts" ]; then
        echo "错误: 下载的内容中没有 index.ts，请手动克隆仓库:" >&2
        echo "  git clone $REPO_URL" >&2
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
if ! mkdir -p "$TOOLS_DIR"; then
    echo "错误: 无法创建工具目录 $TOOLS_DIR" >&2
    exit 1
fi

# 复制工具文件
echo "复制工具文件..."
if ! cp "$SOURCE_DIR/index.ts" "$TOOLS_DIR/understand_media.ts"; then
    echo "错误: 无法将 index.ts 复制到 $TOOLS_DIR/understand_media.ts" >&2
    exit 1
fi

echo ""
echo "=========================================="
echo "  安装完成！"
echo "=========================================="
echo ""
echo "请重启 MiMo Code 以加载工具。"
echo ""
echo "使用方法:"
echo "  1. 发送图片/音频/视频给不支持多模态的模型"
echo "  2. 模型会自动调用 understand_media 工具"
echo "  3. 工具会调用 mimo-v2.5 来理解内容"
echo ""
echo "更多信息请参考:"
echo "  $REPO_URL"
