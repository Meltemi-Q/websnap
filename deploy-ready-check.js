#!/usr/bin/env node

/**
 * 部署就绪检查脚本
 * 确保所有配置正确，可以安全部署
 */

const fs = require('fs');

console.log('🔍 WebSnap 部署就绪检查');
console.log(`📅 检查时间: ${new Date().toISOString()}`);

let allChecksPass = true;

// 检查 1: vercel.json 配置
console.log('\n1️⃣ 检查 vercel.json 配置...');
try {
  const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  
  if (vercelConfig.functions && vercelConfig.functions['api/screenshot-minimal.js']) {
    console.log('   ✅ screenshot-minimal.js 函数配置存在');
    
    const funcConfig = vercelConfig.functions['api/screenshot-minimal.js'];
    if (funcConfig.maxDuration === 60) {
      console.log('   ✅ 最大执行时间: 60秒');
    } else {
      console.log('   ❌ 最大执行时间配置错误');
      allChecksPass = false;
    }
    
    if (funcConfig.memory === 1024) {
      console.log('   ✅ 内存限制: 1024MB');
    } else {
      console.log('   ❌ 内存限制配置错误');
      allChecksPass = false;
    }
  } else {
    console.log('   ❌ screenshot-minimal.js 函数配置缺失');
    allChecksPass = false;
  }
  
  // 检查重写规则
  const rewrites = vercelConfig.rewrites || [];
  const screenshotRewrite = rewrites.find(r => r.source === '/api/screenshot');
  if (screenshotRewrite && screenshotRewrite.destination === '/api/screenshot-minimal.js') {
    console.log('   ✅ API 路由重写配置正确');
  } else {
    console.log('   ❌ API 路由重写配置错误');
    allChecksPass = false;
  }
  
} catch (error) {
  console.log('   ❌ vercel.json 读取失败:', error.message);
  allChecksPass = false;
}

// 检查 2: package.json 依赖
console.log('\n2️⃣ 检查 package.json 依赖...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const deps = packageJson.dependencies;
  
  if (deps['@sparticuz/chromium']) {
    console.log(`   ✅ @sparticuz/chromium: ${deps['@sparticuz/chromium']}`);
    if (deps['@sparticuz/chromium'].includes('123.0.1')) {
      console.log('   ✅ Chromium 版本正确 (123.0.1)');
    } else {
      console.log('   ⚠️  Chromium 版本可能不是最新的兼容版本');
    }
  } else {
    console.log('   ❌ 缺少 @sparticuz/chromium 依赖');
    allChecksPass = false;
  }
  
  if (deps['puppeteer-core']) {
    console.log(`   ✅ puppeteer-core: ${deps['puppeteer-core']}`);
    if (deps['puppeteer-core'].includes('22.6.4')) {
      console.log('   ✅ Puppeteer 版本正确 (22.6.4)');
    } else {
      console.log('   ⚠️  Puppeteer 版本可能不是最新的兼容版本');
    }
  } else {
    console.log('   ❌ 缺少 puppeteer-core 依赖');
    allChecksPass = false;
  }
  
  if (deps['express']) {
    console.log(`   ✅ express: ${deps['express']}`);
  } else {
    console.log('   ❌ 缺少 express 依赖');
    allChecksPass = false;
  }
  
} catch (error) {
  console.log('   ❌ package.json 读取失败:', error.message);
  allChecksPass = false;
}

// 检查 3: API 文件存在性
console.log('\n3️⃣ 检查 API 文件...');
const apiFile = 'api/screenshot-minimal.js';
if (fs.existsSync(apiFile)) {
  console.log('   ✅ screenshot-minimal.js 文件存在');
  
  const stats = fs.statSync(apiFile);
  console.log(`   ✅ 文件大小: ${Math.round(stats.size / 1024)}KB`);
  
  // 检查文件内容
  try {
    const content = fs.readFileSync(apiFile, 'utf8');
    if (content.includes('module.exports')) {
      console.log('   ✅ 文件包含正确的导出');
    } else {
      console.log('   ❌ 文件缺少模块导出');
      allChecksPass = false;
    }
    
    if (content.includes('puppeteer-core')) {
      console.log('   ✅ 文件包含 puppeteer-core 导入');
    } else {
      console.log('   ❌ 文件缺少 puppeteer-core 导入');
      allChecksPass = false;
    }
    
    if (content.includes('@sparticuz/chromium')) {
      console.log('   ✅ 文件包含 chromium 导入');
    } else {
      console.log('   ❌ 文件缺少 chromium 导入');
      allChecksPass = false;
    }
    
  } catch (error) {
    console.log('   ❌ 文件内容读取失败:', error.message);
    allChecksPass = false;
  }
} else {
  console.log('   ❌ screenshot-minimal.js 文件不存在');
  allChecksPass = false;
}

// 检查 4: 前端文件
console.log('\n4️⃣ 检查前端文件...');
if (fs.existsSync('public/index.html')) {
  console.log('   ✅ public/index.html 存在');
} else {
  console.log('   ❌ public/index.html 不存在');
  allChecksPass = false;
}

// 检查 5: 语法验证
console.log('\n5️⃣ 检查 API 语法...');
try {
  require('./api/screenshot-minimal.js');
  console.log('   ✅ API 文件语法正确');
} catch (error) {
  console.log('   ❌ API 文件语法错误:', error.message);
  allChecksPass = false;
}

// 输出总结
console.log(`\n${'='.repeat(60)}`);
console.log('📊 检查总结');
console.log(`${'='.repeat(60)}`);

if (allChecksPass) {
  console.log('🎉 所有检查通过！可以安全部署');
  console.log('\n🚀 部署步骤:');
  console.log('1. npm install  # 确保依赖已安装');
  console.log('2. vercel --prod  # 部署到生产环境');
  console.log('\n📋 部署后验证:');
  console.log('1. 访问健康检查: https://websnap-gold.vercel.app/api/health');
  console.log('2. 测试简单截图: https://websnap-gold.vercel.app (使用 example.com)');
  console.log('3. 运行生产测试: node test-production-deployment.js');
  
  console.log('\n🔧 关键修复点:');
  console.log('• 更新依赖版本: @sparticuz/chromium@123.0.1 + puppeteer-core@22.6.4');
  console.log('• 使用最小化 API 实现避免 inpage.js 错误');
  console.log('• 禁用默认视口: defaultViewport: null');
  console.log('• 简化浏览器参数减少兼容性问题');
  
} else {
  console.log('❌ 检查失败！请修复以下问题后再部署');
  console.log('\n🔧 修复建议:');
  console.log('1. 检查 vercel.json 配置是否正确');
  console.log('2. 确保 package.json 依赖版本正确');
  console.log('3. 验证 API 文件存在且语法正确');
  console.log('4. 运行 npm install 更新依赖');
}

console.log('\n✅ 检查完成');

// 退出码
process.exit(allChecksPass ? 0 : 1);
