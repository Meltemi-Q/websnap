// WebSnap Screenshot API - Minimal Working Version
// 专注于基本功能，解决 inpage.js 错误

const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

// 基本配置
const DEVICES = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 }
};

const QUALITIES = { high: 90, medium: 70, low: 50 };

// 日志函数
function log(id, msg, data) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}][${id}] ${msg}`, data ? JSON.stringify(data) : '');
}

// URL 验证
function validateUrl(url) {
  if (!url || typeof url !== 'string') return null;
  
  let cleanUrl = url.trim();
  if (!cleanUrl.match(/^https?:\/\//)) {
    cleanUrl = 'https://' + cleanUrl;
  }
  
  try {
    return new URL(cleanUrl).href;
  } catch {
    return null;
  }
}

// 获取 Chrome 路径 - 简化版本
async function getChromePath() {
  try {
    // 在 Vercel 环境中使用 chromium
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      const path = await chromium.executablePath();
      return path;
    }
    
    // 本地开发环境
    const fs = require('fs');
    const localPaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/usr/bin/google-chrome'
    ];
    
    for (const path of localPaths) {
      if (fs.existsSync(path)) {
        return path;
      }
    }
    
    // 回退到 chromium
    return await chromium.executablePath();
  } catch (error) {
    throw new Error(`Chrome path error: ${error.message}`);
  }
}

// 最小化浏览器参数 - 避免 inpage.js 错误
function getMinimalBrowserArgs() {
  const baseArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-web-security',
    '--disable-features=VizDisplayCompositor',
    '--run-all-compositor-stages-before-draw',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    '--disable-ipc-flooding-protection'
  ];

  // 在 Vercel 环境中添加 chromium 特定参数
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    baseArgs.push(...chromium.args);
  }

  return baseArgs;
}

// 核心截图函数 - 最小化实现
async function takeScreenshot(url, device, quality, requestId) {
  let browser = null;
  
  try {
    log(requestId, 'Starting screenshot process', { url, device, quality });
    
    // 获取 Chrome 路径
    const executablePath = await getChromePath();
    log(requestId, 'Chrome path resolved', executablePath);
    
    // 获取浏览器参数
    const args = getMinimalBrowserArgs();
    log(requestId, 'Browser args prepared', args.length + ' arguments');
    
    // 启动浏览器
    log(requestId, 'Launching browser');
    browser = await puppeteer.launch({
      args: args,
      executablePath: executablePath,
      headless: process.env.VERCEL ? chromium.headless : true,
      ignoreHTTPSErrors: true,
      timeout: 30000,
      // 关键：禁用默认视口以避免 inpage.js 问题
      defaultViewport: null
    });
    
    log(requestId, 'Browser launched successfully');
    
    // 创建页面
    const page = await browser.newPage();
    log(requestId, 'Page created');
    
    // 设置用户代理
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');
    
    // 设置视口
    await page.setViewport({
      width: DEVICES[device].width,
      height: DEVICES[device].height,
      deviceScaleFactor: 1
    });
    log(requestId, 'Viewport set', DEVICES[device]);
    
    // 最小化的请求拦截
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      // 只阻止视频文件
      if (resourceType === 'media') {
        req.abort();
      } else {
        req.continue();
      }
    });
    
    log(requestId, 'Navigating to URL');
    
    // 导航到页面 - 使用最保守的等待策略
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 25000
    });
    
    log(requestId, 'Navigation completed');
    
    // 等待页面稳定
    await page.waitForTimeout(3000);
    log(requestId, 'Page stabilization wait completed');
    
    // 截图
    log(requestId, 'Taking screenshot');
    const screenshot = await page.screenshot({
      type: 'jpeg',
      quality: QUALITIES[quality],
      fullPage: true
    });
    
    log(requestId, 'Screenshot completed', `${Math.round(screenshot.length / 1024)}KB`);
    
    return screenshot;
    
  } catch (error) {
    log(requestId, 'Screenshot error', error.message);
    throw error;
  } finally {
    if (browser) {
      try {
        await browser.close();
        log(requestId, 'Browser closed');
      } catch (closeError) {
        log(requestId, 'Browser close error', closeError.message);
      }
    }
  }
}

// Vercel 函数入口
module.exports = async (req, res) => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 11);
  
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // 处理 OPTIONS 请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // 健康检查
  if (req.method === 'GET') {
    log(requestId, 'Health check request');
    return res.status(200).json({
      status: 'ok',
      version: 'minimal',
      plan: 'hobby',
      timestamp: new Date().toISOString(),
      dependencies: {
        chromium: '123.0.1',
        puppeteerCore: '22.6.4'
      }
    });
  }
  
  // 只处理 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests are supported' });
  }
  
  log(requestId, 'Screenshot request received', req.body);
  
  // 设置 50 秒超时
  const timer = setTimeout(() => {
    log(requestId, 'Request timeout');
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Request timeout',
        tip: 'The request took too long to process',
        requestId,
        duration: Date.now() - startTime
      });
    }
  }, 50000);
  
  try {
    const { url: inputUrl, device = 'desktop', quality = 'medium' } = req.body;
    
    // 参数验证
    if (!DEVICES[device]) {
      clearTimeout(timer);
      return res.status(400).json({ error: 'Invalid device type' });
    }
    
    if (!QUALITIES[quality]) {
      clearTimeout(timer);
      return res.status(400).json({ error: 'Invalid quality setting' });
    }
    
    const url = validateUrl(inputUrl);
    if (!url) {
      clearTimeout(timer);
      return res.status(400).json({ error: 'Invalid URL format' });
    }
    
    log(requestId, 'Parameters validated', { url, device, quality });
    
    // 执行截图
    const screenshot = await takeScreenshot(url, device, quality, requestId);
    
    clearTimeout(timer);
    
    // 转换为 Base64
    const base64 = screenshot.toString('base64');
    const dataURI = `data:image/jpeg;base64,${base64}`;
    const duration = Date.now() - startTime;
    
    log(requestId, 'Request completed successfully', `${duration}ms`);
    
    // 返回成功结果
    res.status(200).json({
      success: true,
      image: dataURI,
      device,
      quality,
      metadata: {
        requestId,
        duration,
        timestamp: new Date().toISOString(),
        version: 'minimal',
        plan: 'hobby',
        screenshotSize: `${Math.round(screenshot.length / 1024)}KB`,
        dependencies: {
          chromium: '123.0.1',
          puppeteerCore: '22.6.4'
        }
      }
    });
    
  } catch (error) {
    clearTimeout(timer);
    
    const duration = Date.now() - startTime;
    log(requestId, 'Request failed', { error: error.message, duration: `${duration}ms` });
    
    // 简化的错误处理
    let errorMessage = 'Screenshot generation failed';
    let tip = 'Please check the URL and try again';
    
    if (error.message.includes('timeout') || error.message.includes('Timeout')) {
      errorMessage = 'Page load timeout';
      tip = 'The page took too long to load. Try a simpler website or upgrade to Pro plan.';
    } else if (error.message.includes('net::ERR_') || error.message.includes('Navigation failed')) {
      errorMessage = 'Cannot access the webpage';
      tip = 'Please check if the URL is correct and accessible.';
    } else if (error.message.includes('Protocol error') || error.message.includes('Target closed')) {
      errorMessage = 'Browser connection error';
      tip = 'This might be due to memory limitations. Consider upgrading to Pro plan.';
    } else if (error.message.includes('Chrome path error')) {
      errorMessage = 'Browser initialization failed';
      tip = 'Server configuration issue. Please contact support.';
    }
    
    if (!res.headersSent) {
      res.status(500).json({
        error: errorMessage,
        details: error.message,
        tip,
        requestId,
        duration,
        version: 'minimal',
        plan: 'hobby'
      });
    }
  }
};
