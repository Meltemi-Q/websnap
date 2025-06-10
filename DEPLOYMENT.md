# WebSnap 部署指南

## 🚀 Vercel 部署配置

### 当前配置（Hobby/Free Plan）

项目已配置为在 Vercel Hobby 计划下正常运行：

- **最大执行时间**: 60秒
- **内存限制**: 3008MB
- **配置文件**: `vercel-config.json`

### 升级到 Pro 计划

如需支持更复杂网站（如 islanddragon.cn）的完整渲染：

1. **升级 Vercel 计划**
   ```bash
   # 访问 https://vercel.com/pricing
   # 升级到 Pro 计划 ($20/月)
   ```

2. **切换配置文件**
   ```bash
   # 重命名配置文件
   mv vercel-config.json vercel-hobby.json
   mv vercel-pro.json vercel.json
   ```

3. **设置环境变量**
   ```bash
   # 在 Vercel 控制台设置
   VERCEL_PLAN=pro
   ```

## 📊 计划对比

| 功能 | Hobby Plan | Pro Plan |
|------|------------|----------|
| 最大执行时间 | 60秒 | 300秒 |
| 基础网站截图 | ✅ 完美支持 | ✅ 完美支持 |
| 复杂网站截图 | ⚠️ 可能超时 | ✅ 完美支持 |
| islanddragon.cn | ⚠️ 快速模式 | ✅ 完整渲染 |
| 月费用 | 免费 | $20 |

## 🔧 智能超时处理

系统会根据当前计划自动调整：

### Hobby Plan 优化
- 使用快速渲染策略
- 减少等待时间
- 优先加载关键内容
- 智能错误提示

### Pro Plan 增强
- 完整渲染策略
- 更长等待时间
- 完整内容加载
- 最佳质量输出

## 🛠️ 部署步骤

### 1. 准备部署
```bash
# 确保使用正确的配置
cp vercel-config.json vercel.json

# 检查依赖
npm install
```

### 2. 部署到 Vercel
```bash
# 使用 Vercel CLI
vercel --prod

# 或通过 GitHub 自动部署
git push origin main
```

### 3. 验证部署
```bash
# 测试健康检查
curl https://your-domain.vercel.app/api/health

# 测试截图功能
curl -X POST https://your-domain.vercel.app/api/screenshot \
  -H "Content-Type: application/json" \
  -d '{"url": "example.com"}'
```

## 🔍 故障排除

### 超时错误
如果遇到超时错误：

1. **检查当前计划限制**
   - Hobby: 60秒限制
   - Pro: 300秒限制

2. **优化策略**
   - 简单网站：使用标准模式
   - 复杂网站：考虑升级计划

3. **错误信息解读**
   ```json
   {
     "error": "页面加载超时",
     "tip": "当前计划限制执行时间为60秒，该网站需要更长时间渲染。建议升级到Pro计划以获得更长的执行时间。",
     "planInfo": {
       "currentPlan": "hobby",
       "maxExecutionTime": "60s",
       "upgradeUrl": "https://vercel.com/pricing"
     }
   }
   ```

### 内存错误
如果遇到内存不足：

1. **检查配置**
   - 当前内存限制：3008MB
   - 已针对 Chromium 优化

2. **优化建议**
   - 减少并发请求
   - 使用图片压缩
   - 清理浏览器缓存

## 📈 性能监控

### 关键指标
- 执行时间：< 60秒 (Hobby) / < 300秒 (Pro)
- 内存使用：< 3008MB
- 成功率：> 95%

### 监控方法
```javascript
// 检查响应时间
const response = await fetch('/api/screenshot', {
  method: 'POST',
  body: JSON.stringify({ url: 'example.com' })
});

const data = await response.json();
console.log('执行时间:', data.metadata.duration, 'ms');
```

## 🔄 配置切换脚本

创建便捷的配置切换脚本：

```bash
#!/bin/bash
# switch-plan.sh

if [ "$1" = "hobby" ]; then
    echo "切换到 Hobby 计划配置..."
    cp vercel-config.json vercel.json
    echo "VERCEL_PLAN=hobby" > .env.local
elif [ "$1" = "pro" ]; then
    echo "切换到 Pro 计划配置..."
    cp vercel-pro.json vercel.json
    echo "VERCEL_PLAN=pro" > .env.local
else
    echo "用法: ./switch-plan.sh [hobby|pro]"
fi
```

使用方法：
```bash
chmod +x switch-plan.sh
./switch-plan.sh hobby  # 切换到 Hobby 配置
./switch-plan.sh pro    # 切换到 Pro 配置
```

## 📞 支持

如有问题，请检查：
1. [Vercel 文档](https://vercel.com/docs)
2. [项目 Issues](https://github.com/your-repo/issues)
3. [Vercel 定价页面](https://vercel.com/pricing)
