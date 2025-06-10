#!/usr/bin/env node

/**
 * WebSnap 内存优化测试脚本
 * 测试不同内存配置下的性能表现
 */

const express = require('express');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

// 模拟内存配置
const MEMORY_CONFIGS = {
  hobby: {
    limit: 1024,
    optimization: 'aggressive',
    description: 'Hobby Plan (1024MB)'
  },
  pro: {
    limit: 3008,
    optimization: 'balanced',
    description: 'Pro Plan (3008MB)'
  }
};

// 内存监控函数
function getMemoryUsage(label = '') {
  const usage = process.memoryUsage();
  const formatMB = (bytes) => Math.round(bytes / 1024 / 1024);
  
  const memoryInfo = {
    rss: formatMB(usage.rss),
    heapUsed: formatMB(usage.heapUsed),
    heapTotal: formatMB(usage.heapTotal),
    external: formatMB(usage.external)
  };
  
  console.log(`[${label}] 内存使用: RSS=${memoryInfo.rss}MB, Heap=${memoryInfo.heapUsed}/${memoryInfo.heapTotal}MB, External=${memoryInfo.external}MB`);
  
  return memoryInfo;
}

// 内存优化的浏览器配置
function getMemoryOptimizedBrowserArgs(optimization = 'balanced') {
  const baseArgs = [
    '--disable-gpu',
    '--disable-software-rasterizer',
    '--disable-dev-shm-usage',
    '--no-sandbox',
    '--disable-web-security',
    '--disable-extensions',
    '--disable-plugins'
  ];

  if (optimization === 'aggressive') {
    return baseArgs.concat([
      '--memory-pressure-off',
      '--max_old_space_size=512',
      '--js-flags=--max-old-space-size=512',
      '--single-process',
      '--disable-audio-output',
      '--disable-audio-input',
      '--disk-cache-size=0',
      '--media-cache-size=0',
      '--aggressive-cache-discard',
      '--disable-background-mode',
      '--disable-features=VizDisplayCompositor,AudioServiceOutOfProcess'
    ]);
  } else {
    return baseArgs.concat([
      '--js-flags=--max-old-space-size=2048',
      '--max_old_space_size=2048'
    ]);
  }
}

// 获取浏览器执行路径
async function getExecutablePath() {
  try {
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      return await chromium.executablePath();
    }

    const fs = require('fs');
    const localPaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser'
    ];

    for (const chromePath of localPaths) {
      if (fs.existsSync(chromePath)) {
        return chromePath;
      }
    }

    return await chromium.executablePath();
  } catch (error) {
    throw new Error(`无法获取浏览器路径: ${error.message}`);
  }
}

// 测试内存使用
async function testMemoryUsage(config, testUrl = 'https://example.com') {
  console.log(`\n🧪 测试 ${config.description}`);
  console.log(`📊 内存限制: ${config.limit}MB, 优化策略: ${config.optimization}`);
  
  const testId = Math.random().toString(36).substring(2, 8);
  let browser;
  
  try {
    // 初始内存状态
    console.log(`\n[${testId}] 初始内存状态:`);
    const initialMemory = getMemoryUsage('初始');
    
    // 获取浏览器路径
    const executablePath = await getExecutablePath();
    
    // 获取优化的浏览器参数
    const browserArgs = getMemoryOptimizedBrowserArgs(config.optimization);
    
    console.log(`\n[${testId}] 启动浏览器...`);
    browser = await puppeteer.launch({
      args: browserArgs,
      executablePath: executablePath,
      headless: true,
      ignoreHTTPSErrors: true,
      timeout: 30000
    });
    
    // 浏览器启动后内存状态
    console.log(`[${testId}] 浏览器启动后内存状态:`);
    const browserMemory = getMemoryUsage('浏览器启动');
    
    // 创建页面
    const page = await browser.newPage();
    
    // 设置视口
    await page.setViewport({
      width: 1440,
      height: 900,
      deviceScaleFactor: 1
    });
    
    console.log(`\n[${testId}] 导航到测试页面: ${testUrl}`);
    await page.goto(testUrl, {
      waitUntil: ['networkidle2', 'domcontentloaded'],
      timeout: 30000
    });
    
    // 页面加载后内存状态
    console.log(`[${testId}] 页面加载后内存状态:`);
    const pageMemory = getMemoryUsage('页面加载');
    
    // 等待页面完全渲染
    await page.waitForTimeout(3000);
    
    console.log(`\n[${testId}] 开始截图测试...`);
    
    // 截图参数根据优化策略调整
    const screenshotOptions = {
      type: 'jpeg',
      quality: 80,
      fullPage: true
    };
    
    if (config.optimization === 'aggressive') {
      screenshotOptions.optimizeForSpeed = true;
      screenshotOptions.captureBeyondViewport = false;
    } else {
      screenshotOptions.optimizeForSpeed = false;
      screenshotOptions.captureBeyondViewport = true;
    }
    
    const screenshot = await page.screenshot(screenshotOptions);
    
    // 截图后内存状态
    console.log(`[${testId}] 截图后内存状态:`);
    const screenshotMemory = getMemoryUsage('截图完成');
    
    // 计算内存使用情况
    const memoryIncrease = screenshotMemory.rss - initialMemory.rss;
    const memoryUsagePercent = Math.round((screenshotMemory.rss / config.limit) * 100);
    
    console.log(`\n📈 内存使用分析:`);
    console.log(`   初始内存: ${initialMemory.rss}MB`);
    console.log(`   峰值内存: ${screenshotMemory.rss}MB`);
    console.log(`   内存增长: ${memoryIncrease}MB`);
    console.log(`   使用率: ${memoryUsagePercent}% (${screenshotMemory.rss}/${config.limit}MB)`);
    console.log(`   截图大小: ${Math.round(screenshot.length / 1024)}KB`);
    
    // 内存压力评估
    if (memoryUsagePercent > 90) {
      console.log(`   ❌ 内存压力: 危险 (>90%)`);
    } else if (memoryUsagePercent > 70) {
      console.log(`   ⚠️  内存压力: 警告 (70-90%)`);
    } else {
      console.log(`   ✅ 内存压力: 正常 (<70%)`);
    }
    
    return {
      success: true,
      memoryUsage: screenshotMemory.rss,
      memoryPercent: memoryUsagePercent,
      screenshotSize: screenshot.length,
      memoryIncrease
    };
    
  } catch (error) {
    console.log(`\n❌ 测试失败: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  } finally {
    if (browser) {
      try {
        await browser.close();
        console.log(`[${testId}] 浏览器已关闭`);
        
        // 清理后内存状态
        setTimeout(() => {
          console.log(`[${testId}] 清理后内存状态:`);
          getMemoryUsage('清理完成');
        }, 1000);
      } catch (closeError) {
        console.log(`[${testId}] 关闭浏览器失败: ${closeError.message}`);
      }
    }
  }
}

// 主测试函数
async function runMemoryTests() {
  console.log('🧠 WebSnap 内存优化测试\n');
  
  const testUrls = [
    'https://example.com',
    'https://github.com'
  ];
  
  const results = {};
  
  for (const [planName, config] of Object.entries(MEMORY_CONFIGS)) {
    results[planName] = {};
    
    for (const testUrl of testUrls) {
      console.log(`\n${'='.repeat(60)}`);
      const urlName = new URL(testUrl).hostname;
      const result = await testMemoryUsage(config, testUrl);
      results[planName][urlName] = result;
      
      // 等待内存清理
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // 输出测试总结
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 测试总结');
  console.log(`${'='.repeat(60)}`);
  
  for (const [planName, planResults] of Object.entries(results)) {
    const config = MEMORY_CONFIGS[planName];
    console.log(`\n${config.description}:`);
    
    for (const [urlName, result] of Object.entries(planResults)) {
      if (result.success) {
        console.log(`  ${urlName}: ${result.memoryUsage}MB (${result.memoryPercent}%) - ${Math.round(result.screenshotSize/1024)}KB`);
      } else {
        console.log(`  ${urlName}: 失败 - ${result.error}`);
      }
    }
  }
  
  console.log(`\n✅ 内存优化测试完成`);
}

// 运行测试
if (require.main === module) {
  runMemoryTests().catch(console.error);
}

module.exports = {
  testMemoryUsage,
  getMemoryUsage,
  MEMORY_CONFIGS
};
