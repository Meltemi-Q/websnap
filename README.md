# WebSnap - 网址转长图工具

[![Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Meltemi-Q/websnap)

WebSnap 是一个开源的网页截图工具，能够将任何网址转换为高质量的长截图。采用极简苹果风格设计，提供直观的用户体验。

## 功能特点

- 极简苹果风UI
- 支持多种设备类型（桌面/平板/手机）
- 完整页面长截图功能
- 一键部署到Vercel
- 简单易用的下载功能

## 🚀 快速部署

### 一键部署到 Vercel
1. 点击上方按钮部署到Vercel
2. 自动使用 Hobby 计划配置（60秒执行限制）

### 手动部署
```bash
# 克隆仓库
git clone https://github.com/Meltemi-Q/websnap.git
cd websnap

# 安装依赖
npm install

# 选择计划配置
npm run plan:hobby    # Hobby 计划 (免费, 60秒限制)
npm run plan:pro      # Pro 计划 ($20/月, 120秒限制)

# 部署到 Vercel
npm run deploy
```

## 📊 计划对比

| 功能 | Hobby Plan (免费) | Pro Plan ($20/月) |
|------|------------------|-------------------|
| 基础网站截图 | ✅ 完美支持 | ✅ 完美支持 |
| 复杂网站截图 | ⚠️ 可能超时/内存限制 | ✅ 完美支持 |
| 最大执行时间 | 60秒 | 120秒 |
| 内存限制 | 1024MB | 3008MB |
| 内存优化策略 | 激进优化 | 平衡优化 |
| islanddragon.cn | ⚠️ 快速模式 | ✅ 完整渲染 |

## 🔧 配置管理

### 查看当前配置
```bash
npm run plan:status
```

### 切换计划配置
```bash
# 切换到 Hobby 计划
npm run plan:hobby

# 切换到 Pro 计划
npm run plan:pro

# 直接部署指定计划
npm run deploy:hobby
npm run deploy:pro

# 测试和诊断
npm run test:hobby      # 测试 Hobby 计划性能
npm run test:problems   # 测试问题网站
node diagnose-500-errors.js  # 诊断 500 错误
```

## 🛠️ 故障排除

### 500 Internal Server Error
如果遇到 500 错误，请按以下步骤排查：

1. **运行诊断工具**
   ```bash
   node diagnose-500-errors.js
   ```

2. **检查网站复杂度**
   - 简单网站 (example.com): 应该正常工作
   - 复杂网站 (qq.com, islanddragon.cn): 可能需要特殊处理

3. **常见错误类型**
   - `timeout`: 页面加载超时，建议升级到 Pro 计划
   - `memory`: 内存不足，Hobby 计划限制 1024MB
   - `browser`: 浏览器异常，通常由内存限制引起
   - `page_error`: 页面脚本错误，复杂网站常见

### Hobby 计划优化策略
- ✅ **激进资源过滤**: 禁用字体、媒体、分析脚本
- ✅ **单进程模式**: 减少内存占用
- ✅ **速度优化**: 优先速度而非质量
- ✅ **降级处理**: 复杂网站自动降低质量

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