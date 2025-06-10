# WebSnap 内存优化指南

## 🧠 内存限制概述

### Vercel 计划内存限制
- **Hobby Plan (免费)**: 1024 MB 内存限制
- **Pro Plan ($20/月)**: 3008 MB 内存限制
- **Enterprise Plan**: 自定义内存限制

### 当前优化策略
WebSnap 已实现智能内存管理，根据 Vercel 计划自动调整内存使用策略。

## 🔧 内存优化配置

### Hobby Plan 激进优化
```javascript
// 激进内存优化参数
'--memory-pressure-off',
'--max_old_space_size=512',
'--js-flags=--max-old-space-size=512',
'--single-process',
'--disable-audio-output',
'--disable-audio-input',
'--disk-cache-size=0',
'--media-cache-size=0',
'--aggressive-cache-discard'
```

### Pro Plan 平衡优化
```javascript
// 平衡内存优化参数
'--js-flags=--max-old-space-size=2048',
'--max_old_space_size=2048',
'--enable-features=NetworkService,NetworkServiceLogging'
```

## 📊 内存监控功能

### 实时内存监控
系统会在关键节点监控内存使用：

1. **初始化阶段**: 记录基础内存使用
2. **浏览器启动后**: 监控浏览器内存占用
3. **页面加载后**: 检查页面渲染内存使用
4. **截图前后**: 监控截图操作内存影响

### 内存压力检测
- **阈值**: 80% 内存使用率
- **触发条件**: RSS 内存超过限制的 80%
- **响应措施**: 自动执行垃圾回收

### 内存使用日志示例
```
[abc123] 内存使用: RSS=256MB, Heap=128/256MB, External=64MB
[abc123] ⚠️ 内存压力警告: 820MB/1024MB (80%)
[abc123] 执行垃圾回收
```

## 🚀 优化策略详解

### 1. 浏览器参数优化

#### 激进优化 (Hobby Plan)
- **单进程模式**: 减少进程间通信开销
- **禁用音频**: 移除音频处理模块
- **零缓存**: 禁用磁盘和媒体缓存
- **减少渲染质量**: 禁用硬件加速功能

#### 平衡优化 (Pro Plan)
- **多进程模式**: 保持性能和稳定性
- **适度缓存**: 保留必要的缓存功能
- **完整渲染**: 启用所有渲染特性

### 2. 截图参数优化

#### Hobby Plan 设置
```javascript
{
  optimizeForSpeed: true,        // 启用速度优化
  captureBeyondViewport: false   // 禁用视口外捕获
}
```

#### Pro Plan 设置
```javascript
{
  optimizeForSpeed: false,       // 关闭速度优化确保质量
  captureBeyondViewport: true    // 启用视口外捕获
}
```

### 3. 内存清理机制

#### 自动垃圾回收
- **触发条件**: 内存使用超过 80% 阈值
- **执行时机**: 页面加载后、截图前
- **清理方式**: 调用 `global.gc()` 强制垃圾回收

#### 资源释放
- **浏览器实例**: 确保在 finally 块中关闭
- **页面对象**: 自动随浏览器关闭释放
- **大对象**: 及时清理截图数据

## 📈 性能监控

### 关键指标
- **RSS 内存**: 实际物理内存使用
- **Heap 内存**: JavaScript 堆内存使用
- **External 内存**: 外部资源内存使用
- **内存压力**: 使用率百分比

### 监控阈值
- **正常**: < 70% 内存使用
- **警告**: 70-80% 内存使用
- **危险**: > 80% 内存使用

## 🛠️ 故障排除

### 内存不足错误
如果遇到内存不足错误：

1. **检查当前计划**
   ```bash
   npm run plan:status
   ```

2. **查看内存使用日志**
   - 查找内存压力警告
   - 检查峰值内存使用

3. **优化建议**
   - 简化页面内容
   - 减少图片数量
   - 考虑升级到 Pro 计划

### 常见内存问题

#### 问题 1: 内存泄漏
**症状**: 内存使用持续增长
**解决**: 确保浏览器正确关闭

#### 问题 2: 峰值内存过高
**症状**: 瞬间内存使用超限
**解决**: 启用激进优化模式

#### 问题 3: 垃圾回收失效
**症状**: 内存无法释放
**解决**: 检查 Node.js 启动参数

## 🔄 升级建议

### 何时升级到 Pro 计划
- 经常处理复杂网站
- 需要高质量截图
- 内存限制频繁触发
- 需要更长执行时间

### 升级步骤
```bash
# 1. 升级 Vercel 计划
# 访问 https://vercel.com/pricing

# 2. 切换配置
npm run plan:pro

# 3. 重新部署
npm run deploy
```

## 📋 最佳实践

### 开发建议
1. **本地测试**: 使用 `--max-old-space-size=1024` 模拟 Hobby 环境
2. **内存监控**: 关注内存使用日志
3. **渐进优化**: 从激进优化开始，逐步调整

### 部署建议
1. **配置验证**: 部署前检查内存配置
2. **监控部署**: 观察首次部署的内存使用
3. **性能测试**: 测试不同复杂度的网站

### 维护建议
1. **定期检查**: 监控内存使用趋势
2. **日志分析**: 分析内存压力模式
3. **配置调优**: 根据使用情况调整参数

## 🔗 相关资源

- [Vercel 内存限制文档](https://vercel.com/docs/functions/serverless-functions/runtimes#memory)
- [Node.js 内存管理](https://nodejs.org/api/process.html#process_process_memoryusage)
- [Puppeteer 内存优化](https://pptr.dev/#?product=Puppeteer&version=v21.0.0&show=api-puppeteerlaunchoptions)
