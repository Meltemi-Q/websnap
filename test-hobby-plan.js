#!/usr/bin/env node

/**
 * Hobby 计划专用测试脚本
 * 测试问题网站的截图功能
 */

const express = require('express');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

// 问题网站列表
const PROBLEM_SITES = [
  'https://www.islanddragon.cn/',
  'https://kf.qq.com/faq/180725biaAn2180725VnQjYF.html',
  'https://example.com', // 作为对照组
  'https://github.com'   // 作为对照组
];

// Hobby 计划配置
const HOBBY_CONFIG = {
  maxExecutionTime: 50000,
  navigationTimeout: 15000,
  pageWaitTime: 2000,
  memory: { limit: 1024, optimization: 'aggressive' }
};

// 内存监控
function getMemoryUsage(label = '') {
  const usage = process.memoryUsage();
  const formatMB = (bytes) => Math.round(bytes / 1024 / 1024);
  
  return {
    rss: formatMB(usage.rss),
    heapUsed: formatMB(usage.heapUsed),
    heapTotal: formatMB(usage.heapTotal),
    external: formatMB(usage.external),
    label
  };
}

// 获取浏览器路径
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

// Hobby 计划浏览器参数
function getHobbyBrowserArgs() {
  return [
    '--disable-gpu',
    '--disable-software-rasterizer',
    '--disable-dev-shm-usage',
    '--no-sandbox',
    '--disable-web-security',
    '--disable-extensions',
    '--disable-plugins',
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
    '--disable-features=VizDisplayCompositor,AudioServiceOutOfProcess',
    '--disable-notifications',
    '--disable-speech-api',
    '--disable-file-system',
    '--disable-sensors',
    '--disable-geolocation',
    '--disable-permissions-api',
    '--disable-application-cache',
    '--disable-lcd-text',
    '--disable-accelerated-2d-canvas',
    '--disable-accelerated-jpeg-decoding',
    '--disable-accelerated-mjpeg-decode',
    '--disable-accelerated-video-decode'
  ];
}

// 检测网站复杂度
function detectSiteComplexity(url) {
  const complexPatterns = ['qq.com', 'baidu.com', 'islanddragon.cn'];
  const isComplex = complexPatterns.some(pattern => url.includes(pattern));
  return isComplex ? 'high' : 'low';
}

// 测试单个网站
async function testSingleSite(url) {
  const testId = Math.random().toString(36).substring(2, 8);
  const startTime = Date.now();
  
  console.log(`\n🧪 测试网站: ${url}`);
  console.log(`📊 测试ID: ${testId}`);
  
  let browser;
  let result = {
    url,
    testId,
    success: false,
    error: null,
    duration: 0,
    memoryUsage: [],
    complexity: detectSiteComplexity(url)
  };
  
  try {
    // 初始内存
    result.memoryUsage.push(getMemoryUsage('初始'));
    
    // 获取浏览器路径
    const executablePath = await getExecutablePath();
    console.log(`[${testId}] 浏览器路径: ${executablePath}`);
    
    // 启动浏览器
    const browserArgs = getHobbyBrowserArgs();
    console.log(`[${testId}] 启动浏览器 (Hobby 计划配置)`);
    
    browser = await puppeteer.launch({
      args: browserArgs,
      executablePath: executablePath,
      headless: true,
      ignoreHTTPSErrors: true,
      timeout: 30000
    });
    
    result.memoryUsage.push(getMemoryUsage('浏览器启动'));
    
    // 创建页面
    const page = await browser.newPage();
    
    // 设置视口
    await page.setViewport({
      width: 1440,
      height: 900,
      deviceScaleFactor: 1
    });
    
    // 设置用户代理
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // 设置请求拦截
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      const reqUrl = req.url();

      // 激进资源过滤
      if (result.complexity === 'high') {
        if (resourceType === 'font' || 
            resourceType === 'media' || 
            resourceType === 'other' ||
            reqUrl.includes('.mp4') ||
            reqUrl.includes('.mp3') ||
            reqUrl.includes('analytics') ||
            reqUrl.includes('tracking')) {
          req.abort();
          return;
        }
      }
      
      req.continue();
    });
    
    // 导航到页面
    console.log(`[${testId}] 导航到页面...`);
    await page.goto(url, {
      waitUntil: ['domcontentloaded'],
      timeout: HOBBY_CONFIG.navigationTimeout
    });
    
    result.memoryUsage.push(getMemoryUsage('页面加载'));
    
    // 等待页面内容
    console.log(`[${testId}] 等待页面内容...`);
    await page.waitForFunction(() => {
      return document.readyState === 'interactive' || document.readyState === 'complete';
    }, { timeout: 5000 }).catch(() => {
      console.log(`[${testId}] 页面内容等待超时`);
    });
    
    // 短暂等待
    await page.waitForTimeout(HOBBY_CONFIG.pageWaitTime);
    
    result.memoryUsage.push(getMemoryUsage('内容等待'));
    
    // 截图
    console.log(`[${testId}] 开始截图...`);
    const screenshot = await page.screenshot({
      type: 'jpeg',
      quality: 60,
      fullPage: true,
      optimizeForSpeed: true,
      captureBeyondViewport: false
    });
    
    result.memoryUsage.push(getMemoryUsage('截图完成'));
    
    // 成功
    result.success = true;
    result.screenshotSize = screenshot.length;
    
    console.log(`✅ [${testId}] 测试成功`);
    console.log(`   截图大小: ${Math.round(screenshot.length / 1024)}KB`);
    
  } catch (error) {
    result.error = {
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3)
    };
    
    console.log(`❌ [${testId}] 测试失败: ${error.message}`);
  } finally {
    if (browser) {
      try {
        await browser.close();
        result.memoryUsage.push(getMemoryUsage('浏览器关闭'));
      } catch (closeError) {
        console.log(`[${testId}] 关闭浏览器失败: ${closeError.message}`);
      }
    }
    
    result.duration = Date.now() - startTime;
    console.log(`⏱️  [${testId}] 总耗时: ${result.duration}ms`);
  }
  
  return result;
}

// 主测试函数
async function runHobbyPlanTests() {
  console.log('🧠 Hobby 计划网站截图测试\n');
  console.log('📋 测试配置:');
  console.log(`   最大执行时间: ${HOBBY_CONFIG.maxExecutionTime}ms`);
  console.log(`   导航超时: ${HOBBY_CONFIG.navigationTimeout}ms`);
  console.log(`   内存限制: ${HOBBY_CONFIG.memory.limit}MB`);
  console.log(`   优化策略: ${HOBBY_CONFIG.memory.optimization}`);
  
  const results = [];
  
  for (const url of PROBLEM_SITES) {
    const result = await testSingleSite(url);
    results.push(result);
    
    // 等待内存清理
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // 输出测试总结
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 测试总结');
  console.log(`${'='.repeat(60)}`);
  
  let successCount = 0;
  let failureCount = 0;
  
  for (const result of results) {
    const status = result.success ? '✅ 成功' : '❌ 失败';
    const duration = `${result.duration}ms`;
    const complexity = result.complexity;
    
    console.log(`\n${new URL(result.url).hostname}:`);
    console.log(`  状态: ${status}`);
    console.log(`  复杂度: ${complexity}`);
    console.log(`  耗时: ${duration}`);
    
    if (result.success) {
      successCount++;
      console.log(`  截图大小: ${Math.round(result.screenshotSize / 1024)}KB`);
    } else {
      failureCount++;
      console.log(`  错误: ${result.error.message}`);
    }
    
    // 内存使用情况
    console.log(`  内存使用:`);
    result.memoryUsage.forEach(mem => {
      console.log(`    ${mem.label}: ${mem.rss}MB`);
    });
  }
  
  console.log(`\n📈 统计:`);
  console.log(`  成功: ${successCount}/${results.length}`);
  console.log(`  失败: ${failureCount}/${results.length}`);
  console.log(`  成功率: ${Math.round(successCount / results.length * 100)}%`);
  
  // 失败分析
  const failures = results.filter(r => !r.success);
  if (failures.length > 0) {
    console.log(`\n🔍 失败分析:`);
    failures.forEach(failure => {
      console.log(`  ${new URL(failure.url).hostname}: ${failure.error.message}`);
    });
  }
  
  console.log(`\n✅ Hobby 计划测试完成`);
}

// 运行测试
if (require.main === module) {
  runHobbyPlanTests().catch(console.error);
}

module.exports = {
  testSingleSite,
  HOBBY_CONFIG,
  PROBLEM_SITES
};
