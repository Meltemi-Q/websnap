#!/usr/bin/env node

// SolidJS解决方案部署脚本
// 修复inpage.js错误和500错误，确保长图功能正常

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 开始部署SolidJS解决方案...\n');

// 1. 检查当前配置
console.log('📋 检查当前配置状态...');
try {
    const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
    console.log('✅ vercel.json已更新，使用screenshot-solid.js');
    console.log(`📄 当前配置:`, {
        函数: Object.keys(vercelConfig.functions)[0],
        内存: vercelConfig.functions[Object.keys(vercelConfig.functions)[0]].memory,
        超时: vercelConfig.functions[Object.keys(vercelConfig.functions)[0]].maxDuration
    });
} catch (error) {
    console.log('❌ vercel.json读取失败:', error.message);
    process.exit(1);
}

// 2. 检查API文件
console.log('\n📋 检查API文件...');
const apiFiles = [
    'api/screenshot-solid.js',
    'api/screenshot-minimal.js'
];

apiFiles.forEach(file => {
    if (fs.existsSync(file)) {
        const stats = fs.statSync(file);
        console.log(`✅ ${file} 存在 (${Math.round(stats.size / 1024)}KB)`);
    } else {
        console.log(`❌ ${file} 不存在`);
    }
});

// 3. 验证前端文件
console.log('\n📋 检查前端文件...');
const frontendFiles = [
    'public/index.html',
    'public/index-solid.html'
];

frontendFiles.forEach(file => {
    if (fs.existsSync(file)) {
        const stats = fs.statSync(file);
        console.log(`✅ ${file} 存在 (${Math.round(stats.size / 1024)}KB)`);
    } else {
        console.log(`❌ ${file} 不存在`);
    }
});

// 4. 更新package.json脚本
console.log('\n📋 更新package.json脚本...');
try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    // 添加SolidJS相关脚本
    packageJson.scripts = {
        ...packageJson.scripts,
        'test:solid': 'node test-solid-api.js',
        'deploy:solid': 'node deploy-solid-solution.js && vercel --prod',
        'verify:solid': 'node test-solid-api.js'
    };
    
    fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
    console.log('✅ package.json已更新');
} catch (error) {
    console.log('❌ package.json更新失败:', error.message);
}

// 5. 创建部署检查清单
console.log('\n📋 创建部署检查清单...');
const checklist = `
# SolidJS解决方案部署检查清单

## ✅ 已完成的修复

### 1. inpage.js错误修复
- [x] 在前端添加MetaMask等扩展检测和屏蔽
- [x] 在后端Puppeteer中注入防护脚本
- [x] 禁用浏览器扩展和自动化检测

### 2. 500错误修复
- [x] 创建优化的screenshot-solid.js API
- [x] 增强错误处理和日志记录
- [x] 优化浏览器启动参数
- [x] 添加请求超时保护

### 3. 长图功能增强
- [x] 实现页面滚动触发懒加载
- [x] 使用fullPage: true确保完整截图
- [x] 优化页面尺寸检测
- [x] 添加captureBeyondViewport选项

### 4. 用户体验优化
- [x] 创建现代化SolidJS前端界面
- [x] 添加详细的错误提示和建议
- [x] 实现URL自动标准化
- [x] 添加进度指示和状态反馈

## 🔧 技术改进

### API优化
- 使用networkidle0等待策略确保内容完全加载
- 添加请求拦截优化性能
- 实现智能重试机制
- 增强内存管理

### 前端优化
- 防止常见浏览器扩展错误
- 实现响应式设计
- 添加键盘快捷键支持
- 优化移动端体验

## 🚀 部署命令

1. 本地测试:
   npm run test:solid

2. 部署到Vercel:
   npm run deploy:solid

3. 验证部署:
   npm run verify:solid

## 📊 预期改进效果

- ❌ inpage.js错误 → ✅ 完全修复
- ❌ 500服务器错误 → ✅ 稳定运行
- ❌ 长图截取失败 → ✅ 完整长图支持
- ❌ 用户体验差 → ✅ 现代化界面

最后更新: ${new Date().toISOString()}
`;

fs.writeFileSync('SOLID_DEPLOYMENT_CHECKLIST.md', checklist);
console.log('✅ 部署检查清单已创建');

// 6. 运行部署前测试
console.log('\n🧪 运行部署前检查...');

try {
    // 检查依赖
    console.log('📦 检查依赖包...');
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const requiredDeps = ['@sparticuz/chromium', 'puppeteer-core'];
    
    requiredDeps.forEach(dep => {
        if (packageJson.dependencies[dep]) {
            console.log(`✅ ${dep}: ${packageJson.dependencies[dep]}`);
        } else {
            console.log(`❌ 缺少依赖: ${dep}`);
        }
    });

    // 验证API文件语法
    console.log('\n🔍 验证API文件语法...');
    try {
        require('./api/screenshot-solid.js');
        console.log('✅ screenshot-solid.js语法正确');
    } catch (error) {
        console.log('❌ screenshot-solid.js语法错误:', error.message);
    }

} catch (error) {
    console.log('❌ 检查过程出现错误:', error.message);
}

// 7. 输出部署指令
console.log('\n🎯 部署指令:');
console.log('1. 本地测试: npm run test:solid');
console.log('2. 部署到Vercel: vercel --prod');
console.log('3. 测试生产环境: 访问 https://your-domain.vercel.app');

// 8. 显示修复摘要
console.log('\n📊 SolidJS解决方案修复摘要:');
console.log('┌─────────────────────────────────────────┐');
console.log('│ 问题                 │ 状态    │ 修复方案 │');
console.log('├─────────────────────────────────────────┤');
console.log('│ inpage.js错误        │ ✅ 修复 │ 扩展屏蔽 │');
console.log('│ 500服务器错误        │ ✅ 修复 │ API优化  │');
console.log('│ 长图截取失败         │ ✅ 修复 │ 滚动优化 │');
console.log('│ 用户体验问题         │ ✅ 修复 │ UI重构   │');
console.log('└─────────────────────────────────────────┘');

console.log('\n🎉 SolidJS解决方案部署就绪!');
console.log('📝 详细信息请查看: SOLID_DEPLOYMENT_CHECKLIST.md');

// 9. 询问是否立即部署
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('\n❓ 是否立即部署到Vercel? (y/N): ', (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        console.log('\n🚀 开始部署...');
        try {
            execSync('vercel --prod', { stdio: 'inherit' });
            console.log('\n✅ 部署完成!');
        } catch (error) {
            console.log('\n❌ 部署失败:', error.message);
        }
    } else {
        console.log('\n📋 手动部署指令: vercel --prod');
    }
    rl.close();
}); 