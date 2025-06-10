#!/usr/bin/env node

/**
 * 部署前验证脚本
 * 确保所有配置正确，可以安全部署
 */

const fs = require('fs');
const path = require('path');

// 验证项目
const CHECKS = [
  {
    name: '检查 vercel.json 配置',
    check: () => {
      const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
      
      // 检查函数配置
      const functions = vercelConfig.functions;
      if (!functions || !functions['api/screenshot-production.js']) {
        return { success: false, message: 'vercel.json 中缺少 screenshot-production.js 函数配置' };
      }
      
      const funcConfig = functions['api/screenshot-production.js'];
      if (funcConfig.maxDuration !== 60) {
        return { success: false, message: '函数最大执行时间应为 60 秒' };
      }
      
      if (funcConfig.memory !== 1024) {
        return { success: false, message: '函数内存限制应为 1024MB (Hobby 计划)' };
      }
      
      // 检查重写规则
      const rewrites = vercelConfig.rewrites;
      const screenshotRewrite = rewrites.find(r => r.source === '/api/screenshot');
      if (!screenshotRewrite || screenshotRewrite.destination !== '/api/screenshot-production.js') {
        return { success: false, message: '截图 API 重写规则配置错误' };
      }
      
      return { success: true, message: 'vercel.json 配置正确' };
    }
  },
  
  {
    name: '检查 API 文件存在',
    check: () => {
      const apiFile = 'api/screenshot-production.js';
      if (!fs.existsSync(apiFile)) {
        return { success: false, message: `API 文件 ${apiFile} 不存在` };
      }
      
      const stats = fs.statSync(apiFile);
      if (stats.size === 0) {
        return { success: false, message: `API 文件 ${apiFile} 为空` };
      }
      
      return { success: true, message: 'API 文件存在且非空' };
    }
  },
  
  {
    name: '检查 package.json 依赖',
    check: () => {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const deps = packageJson.dependencies;
      
      const requiredDeps = [
        '@sparticuz/chromium',
        'puppeteer-core',
        'express'
      ];
      
      for (const dep of requiredDeps) {
        if (!deps[dep]) {
          return { success: false, message: `缺少必要依赖: ${dep}` };
        }
      }
      
      // 检查 Node.js 版本
      if (!packageJson.engines || !packageJson.engines.node) {
        return { success: false, message: '缺少 Node.js 版本配置' };
      }
      
      return { success: true, message: '依赖配置正确' };
    }
  },
  
  {
    name: '检查 API 语法',
    check: () => {
      try {
        require('./api/screenshot-production.js');
        return { success: true, message: 'API 文件语法正确' };
      } catch (error) {
        return { success: false, message: `API 文件语法错误: ${error.message}` };
      }
    }
  },
  
  {
    name: '检查环境变量配置',
    check: () => {
      const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
      
      if (!vercelConfig.env || !vercelConfig.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD) {
        return { success: false, message: '缺少 PUPPETEER_SKIP_CHROMIUM_DOWNLOAD 环境变量' };
      }
      
      return { success: true, message: '环境变量配置正确' };
    }
  },
  
  {
    name: '检查文件结构',
    check: () => {
      const requiredFiles = [
        'vercel.json',
        'package.json',
        'api/screenshot-production.js',
        'public/index.html'
      ];
      
      for (const file of requiredFiles) {
        if (!fs.existsSync(file)) {
          return { success: false, message: `缺少必要文件: ${file}` };
        }
      }
      
      return { success: true, message: '文件结构完整' };
    }
  }
];

// 运行验证
async function runVerification() {
  console.log('🔍 WebSnap 部署前验证');
  console.log(`📅 验证时间: ${new Date().toISOString()}`);
  console.log(`📁 项目目录: ${process.cwd()}`);
  
  let allPassed = true;
  const results = [];
  
  for (const check of CHECKS) {
    console.log(`\n🧪 ${check.name}...`);
    
    try {
      const result = check.check();
      results.push({ name: check.name, ...result });
      
      if (result.success) {
        console.log(`   ✅ ${result.message}`);
      } else {
        console.log(`   ❌ ${result.message}`);
        allPassed = false;
      }
    } catch (error) {
      console.log(`   ❌ 验证失败: ${error.message}`);
      results.push({ name: check.name, success: false, message: error.message });
      allPassed = false;
    }
  }
  
  // 输出总结
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 验证总结');
  console.log(`${'='.repeat(60)}`);
  
  const passedCount = results.filter(r => r.success).length;
  const failedCount = results.filter(r => !r.success).length;
  
  console.log(`✅ 通过: ${passedCount}/${results.length}`);
  console.log(`❌ 失败: ${failedCount}/${results.length}`);
  
  if (allPassed) {
    console.log(`\n🎉 所有验证通过！可以安全部署到 Vercel`);
    console.log(`\n🚀 部署命令:`);
    console.log(`   vercel --prod`);
    console.log(`\n📋 部署后测试:`);
    console.log(`   curl -X GET https://your-domain.vercel.app/api/health`);
    console.log(`   curl -X POST https://your-domain.vercel.app/api/screenshot \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -d '{"url":"https://example.com","device":"desktop","quality":"medium"}'`);
  } else {
    console.log(`\n❌ 验证失败！请修复以下问题后再部署:`);
    results.filter(r => !r.success).forEach(result => {
      console.log(`   • ${result.name}: ${result.message}`);
    });
  }
  
  return allPassed;
}

// 额外的配置检查
function checkConfiguration() {
  console.log(`\n🔧 配置详情:`);
  
  try {
    const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    console.log(`   📦 项目名称: ${packageJson.name}`);
    console.log(`   🏷️  版本: ${packageJson.version}`);
    console.log(`   🔧 Node.js: ${packageJson.engines?.node || '未指定'}`);
    console.log(`   ⏱️  最大执行时间: ${vercelConfig.functions['api/screenshot-production.js'].maxDuration}秒`);
    console.log(`   💾 内存限制: ${vercelConfig.functions['api/screenshot-production.js'].memory}MB`);
    console.log(`   🎯 目标计划: Hobby (免费)`);
    
    // 检查依赖版本
    const deps = packageJson.dependencies;
    console.log(`\n📚 关键依赖:`);
    console.log(`   @sparticuz/chromium: ${deps['@sparticuz/chromium']}`);
    console.log(`   puppeteer-core: ${deps['puppeteer-core']}`);
    console.log(`   express: ${deps['express']}`);
    
  } catch (error) {
    console.log(`   ❌ 无法读取配置: ${error.message}`);
  }
}

// 主函数
async function main() {
  const passed = await runVerification();
  checkConfiguration();
  
  process.exit(passed ? 0 : 1);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  runVerification,
  checkConfiguration,
  CHECKS
};
