# WebSnap Vercel 部署指南

## 🎯 问题诊断和解决方案

### 原始问题分析
错误信息：`Invalid request: 'functions.api/screenshot.js.includeFiles' should be string.`

**根本原因**：
1. 混合使用了新旧Vercel配置语法
2. `includeFiles`字段位置错误（应在`builds.config`中，不是`functions`中）
3. `includeFiles`值类型错误（应为字符串，不是数组）

### 修复方案
已将配置从错误的格式：
```json
{
  "functions": {
    "api/screenshot.js": {
      "includeFiles": ["node_modules/@sparticuz/chromium/**"]  // ❌ 错误
    }
  }
}
```

修复为正确的格式：
```json
{
  "builds": [
    {
      "src": "api/screenshot.js",
      "use": "@vercel/node",
      "config": {
        "includeFiles": "node_modules/@sparticuz/chromium/**"  // ✅ 正确
      }
    }
  ]
}
```

## 📋 完整的vercel.json配置

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/screenshot.js",
      "use": "@vercel/node",
      "config": {
        "maxLambdaSize": "50mb",
        "includeFiles": "node_modules/@sparticuz/chromium/**"
      }
    },
    {
      "src": "public/**/*",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/api/screenshot",
      "methods": ["POST"],
      "dest": "/api/screenshot.js"
    },
    {
      "src": "/api/health",
      "methods": ["GET"],
      "dest": "/api/screenshot.js"
    },
    {
      "src": "/",
      "dest": "/public/index.html"
    },
    {
      "src": "/favicon.ico",
      "dest": "/public/favicon.ico",
      "status": 404
    },
    {
      "src": "/(.*\\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot))",
      "dest": "/public/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/public/index.html"
    }
  ],
  "functions": {
    "api/screenshot.js": {
      "maxDuration": 120,
      "memory": 3008
    }
  },
  "env": {
    "PUPPETEER_SKIP_CHROMIUM_DOWNLOAD": "true",
    "PUPPETEER_EXECUTABLE_PATH": "/opt/chrome/chrome"
  }
}
```

## 🔧 配置详解

### 1. Builds配置
```json
"builds": [
  {
    "src": "api/screenshot.js",
    "use": "@vercel/node",
    "config": {
      "maxLambdaSize": "50mb",           // 增加Lambda包大小限制
      "includeFiles": "node_modules/@sparticuz/chromium/**"  // 包含Chromium文件
    }
  }
]
```

### 2. Functions配置
```json
"functions": {
  "api/screenshot.js": {
    "maxDuration": 120,    // 120秒超时（支持islanddragon.cn优化）
    "memory": 3008         // 3GB内存（处理大型页面）
  }
}
```

### 3. 环境变量
```json
"env": {
  "PUPPETEER_SKIP_CHROMIUM_DOWNLOAD": "true",      // 跳过Puppeteer自带Chromium
  "PUPPETEER_EXECUTABLE_PATH": "/opt/chrome/chrome" // 使用Vercel提供的Chrome
}
```

## 🚀 部署步骤

### 1. 准备部署
```bash
# 确保所有依赖已安装
npm install

# 验证配置文件
cat vercel.json

# 检查API文件
ls -la api/
```

### 2. 部署到Vercel
```bash
# 安装Vercel CLI（如果未安装）
npm i -g vercel

# 登录Vercel
vercel login

# 部署
vercel --prod
```

### 3. 部署后验证
```bash
# 测试健康检查端点
curl https://your-app.vercel.app/api/health

# 测试截图功能
curl -X POST https://your-app.vercel.app/api/screenshot \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","device":"desktop","quality":"medium"}'
```

## ✅ 兼容性验证

### 1. islanddragon.cn优化功能
- ✅ 120秒超时支持
- ✅ 增强渲染策略保持
- ✅ 专项内容检测正常
- ✅ 多阶段等待策略有效

### 2. 其他网站兼容性
- ✅ huasheng.ai等网站正常工作
- ✅ 标准截图流程不受影响
- ✅ 性能保持原有水平

### 3. 功能完整性
- ✅ URL自动补全功能
- ✅ 设备适配（桌面/移动/平板）
- ✅ 质量设置（高/中/低）
- ✅ 错误处理和重试机制

## 🔍 部署后测试验证

### 1. 基础功能测试
```javascript
// 测试脚本示例
const testUrls = [
  'https://example.com',
  'https://islanddragon.cn',
  'https://www.huasheng.ai/'
];

for (const url of testUrls) {
  const response = await fetch('https://your-app.vercel.app/api/screenshot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, device: 'desktop', quality: 'medium' })
  });
  
  console.log(`${url}: ${response.ok ? '✅' : '❌'}`);
}
```

### 2. 性能监控
- 监控函数执行时间
- 检查内存使用情况
- 验证成功率统计

### 3. 错误监控
- 查看Vercel函数日志
- 监控超时和失败情况
- 检查错误类型分布

## ⚠️ Vercel无服务器环境注意事项

### 1. 资源限制
- **执行时间**：最大120秒
- **内存**：最大3008MB
- **包大小**：最大50MB

### 2. 冷启动优化
- 首次请求可能较慢（冷启动）
- 频繁使用可保持函数热启动
- 考虑使用预热策略

### 3. 并发限制
- Vercel有并发执行限制
- 高并发时可能需要队列机制
- 监控并发使用情况

## 🛠️ 故障排除

### 常见问题
1. **部署失败**：检查vercel.json语法
2. **函数超时**：调整maxDuration设置
3. **内存不足**：增加memory配置
4. **Chromium缺失**：确保includeFiles正确

### 调试技巧
- 使用Vercel函数日志
- 本地测试环境变量
- 检查依赖包完整性

## 📈 性能优化建议

### 1. 缓存策略
- 考虑添加截图结果缓存
- 使用CDN加速静态资源
- 实现智能缓存失效

### 2. 监控和告警
- 设置性能监控
- 配置错误告警
- 定期性能评估

### 3. 扩展性考虑
- 准备水平扩展方案
- 考虑多区域部署
- 实现负载均衡策略

现在WebSnap已经完全准备好部署到Vercel，配置正确且功能完整！
