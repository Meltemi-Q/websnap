# WebSnap - 网址转长图工具

[![Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/websnap)

WebSnap 是一个开源的网页截图工具，能够将任何网址转换为高质量的长截图。采用极简苹果风格设计，提供直观的用户体验。

## 功能特点

- 极简苹果风UI
- 支持多种设备类型（桌面/平板/手机）
- 完整页面长截图功能
- 一键部署到Vercel
- 简单易用的下载功能

## 部署指南

1. 点击上方按钮部署到Vercel
2. 或手动部署：
   - 创建Vercel账户
   - 导入GitHub仓库
   - 无需额外配置，直接部署

## 本地开发

```bash
# 克隆仓库
git clone https://github.com/Meltemi-Q/websnap.git

# 安装依赖
cd websnap
npm install

# 启动服务（需要安装Chromium）
CHROMIUM_EXECUTABLE_PATH=/path/to/chromium node api/screenshot.js

# 访问 http://localhost:3000