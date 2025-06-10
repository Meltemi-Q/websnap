#!/usr/bin/env node

/**
 * Vercel 计划配置切换脚本
 * 用于在 Hobby 和 Pro 计划之间切换配置
 */

const fs = require('fs');
const path = require('path');

const CONFIGS = {
  hobby: {
    file: 'vercel-config.json',
    description: 'Hobby Plan (免费)',
    maxDuration: 60,
    memory: 1024,
    features: ['基础网站截图', '60秒执行限制', '1024MB内存限制', '激进内存优化', '快速渲染模式']
  },
  pro: {
    file: 'vercel-pro.json',
    description: 'Pro Plan ($20/月)',
    maxDuration: 120,
    memory: 3008,
    features: ['完整网站截图', '120秒执行限制', '3008MB内存限制', '平衡内存优化', '增强渲染模式', '复杂网站支持']
  }
};

function showUsage() {
  console.log('\n🔧 Vercel 计划配置切换工具\n');
  console.log('用法: node switch-plan.js [hobby|pro|status]\n');
  
  console.log('可用计划:');
  Object.entries(CONFIGS).forEach(([plan, config]) => {
    console.log(`  ${plan.padEnd(8)} - ${config.description}`);
    console.log(`             最大执行时间: ${config.maxDuration}秒`);
    console.log(`             内存限制: ${config.memory}MB`);
    config.features.forEach(feature => {
      console.log(`             • ${feature}`);
    });
    console.log('');
  });
  
  console.log('命令:');
  console.log('  hobby   - 切换到 Hobby 计划配置');
  console.log('  pro     - 切换到 Pro 计划配置');
  console.log('  status  - 显示当前配置状态');
  console.log('');
}

function getCurrentPlan() {
  const vercelJsonPath = path.join(__dirname, 'vercel.json');
  
  if (!fs.existsSync(vercelJsonPath)) {
    return null;
  }
  
  try {
    const config = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));
    const maxDuration = config.functions?.['api/screenshot.js']?.maxDuration;
    const memory = config.functions?.['api/screenshot.js']?.memory;

    if (maxDuration === 60 && memory === 1024) return 'hobby';
    if (maxDuration === 120 && memory === 3008) return 'pro';

    return 'unknown';
  } catch (error) {
    return 'error';
  }
}

function showStatus() {
  console.log('\n📊 当前配置状态\n');
  
  const currentPlan = getCurrentPlan();
  
  if (currentPlan === null) {
    console.log('❌ 未找到 vercel.json 配置文件');
    return;
  }
  
  if (currentPlan === 'error') {
    console.log('❌ vercel.json 配置文件格式错误');
    return;
  }
  
  if (currentPlan === 'unknown') {
    console.log('⚠️  未知的配置');
    return;
  }
  
  const config = CONFIGS[currentPlan];
  console.log(`✅ 当前计划: ${config.description}`);
  console.log(`⏱️  最大执行时间: ${config.maxDuration}秒`);
  console.log(`💾 内存限制: ${config.memory}MB`);
  console.log(`🚀 功能特性:`);
  config.features.forEach(feature => {
    console.log(`   • ${feature}`);
  });
  
  // 检查配置文件是否存在
  console.log('\n📁 配置文件状态:');
  Object.entries(CONFIGS).forEach(([plan, planConfig]) => {
    const exists = fs.existsSync(path.join(__dirname, planConfig.file));
    const status = exists ? '✅' : '❌';
    console.log(`   ${status} ${planConfig.file} (${plan})`);
  });
  
  console.log('');
}

function switchToPlan(targetPlan) {
  if (!CONFIGS[targetPlan]) {
    console.log(`❌ 无效的计划: ${targetPlan}`);
    showUsage();
    return false;
  }
  
  const config = CONFIGS[targetPlan];
  const sourceFile = path.join(__dirname, config.file);
  const targetFile = path.join(__dirname, 'vercel.json');
  
  // 检查源文件是否存在
  if (!fs.existsSync(sourceFile)) {
    console.log(`❌ 配置文件不存在: ${config.file}`);
    return false;
  }
  
  try {
    // 备份当前配置
    if (fs.existsSync(targetFile)) {
      const currentPlan = getCurrentPlan();
      if (currentPlan && currentPlan !== 'error' && currentPlan !== 'unknown') {
        const backupFile = path.join(__dirname, `vercel-${currentPlan}-backup.json`);
        fs.copyFileSync(targetFile, backupFile);
        console.log(`📦 已备份当前配置到: vercel-${currentPlan}-backup.json`);
      }
    }
    
    // 复制新配置
    fs.copyFileSync(sourceFile, targetFile);
    
    console.log(`\n✅ 成功切换到 ${config.description}\n`);
    console.log(`⏱️  最大执行时间: ${config.maxDuration}秒`);
    console.log(`💾 内存限制: ${config.memory}MB`);
    console.log(`🚀 功能特性:`);
    config.features.forEach(feature => {
      console.log(`   • ${feature}`);
    });
    
    console.log('\n📝 下一步操作:');
    if (targetPlan === 'pro') {
      console.log('   1. 确保已升级到 Vercel Pro 计划');
      console.log('   2. 在 Vercel 控制台设置环境变量: VERCEL_PLAN=pro');
      console.log('   3. 重新部署应用');
    } else {
      console.log('   1. 在 Vercel 控制台移除环境变量: VERCEL_PLAN');
      console.log('   2. 重新部署应用');
    }
    
    console.log('\n🔄 部署命令:');
    console.log('   vercel --prod');
    console.log('');
    
    return true;
  } catch (error) {
    console.log(`❌ 切换配置失败: ${error.message}`);
    return false;
  }
}

// 主程序
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    showUsage();
    return;
  }
  
  const command = args[0].toLowerCase();
  
  switch (command) {
    case 'hobby':
    case 'pro':
      switchToPlan(command);
      break;
    case 'status':
      showStatus();
      break;
    case 'help':
    case '--help':
    case '-h':
      showUsage();
      break;
    default:
      console.log(`❌ 未知命令: ${command}`);
      showUsage();
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  switchToPlan,
  getCurrentPlan,
  showStatus,
  CONFIGS
};
