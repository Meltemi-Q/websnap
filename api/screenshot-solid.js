// WebSnap Screenshot API - SolidJS优化版本
// 解决 inpage.js 错误，确保长图截取功能

const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

// 设备配置 - 针对长图优化
const DEVICES = {
  desktop: { 
    width: 1920, 
    height: 1080,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  },
  tablet: { 
    width: 768, 
    height: 1024,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1'
  },
  mobile: { 
    width: 375, 
    height: 812,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1'
  }
};

const QUALITIES = { 
  high: 95, 
  medium: 80, 
  low: 60 
};

// 增强的日志系统
function log(requestId, level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logData = data ? ` | Data: ${JSON.stringify(data)}` : '';
  console.log(`[${timestamp}][${requestId}][${level.toUpperCase()}] ${message}${logData}`);
}

// URL验证和标准化
function validateAndNormalizeUrl(url) {
  if (!url || typeof url !== 'string') {
    return null;
  }
  
  let cleanUrl = url.trim();
  
  // 移除常见的无效字符
  cleanUrl = cleanUrl.replace(/[<>"{}|\\^`\[\]]/g, '');
  
  // 自动添加协议
  if (!cleanUrl.match(/^https?:\/\//i)) {
    cleanUrl = 'https://' + cleanUrl;
  }
  
  try {
    const urlObj = new URL(cleanUrl);
    
    // 验证域名有效性
    if (!urlObj.hostname || urlObj.hostname.length < 3) {
      return null;
    }
    
    return urlObj.href;
  } catch (error) {
    // 尝试http协议
    if (cleanUrl.startsWith('https://')) {
      try {
        const httpUrl = cleanUrl.replace('https://', 'http://');
        const urlObj = new URL(httpUrl);
        return urlObj.href;
      } catch (e) {
        return null;
      }
    }
    return null;
  }
}

// 获取Chrome可执行文件路径
async function getChromiumPath() {
  try {
    // Vercel/Lambda环境
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      return await chromium.executablePath();
    }
    
    // 本地开发环境路径检测
    const fs = require('fs');
    const paths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/snap/bin/chromium'
    ];
    
    for (const path of paths) {
      if (fs.existsSync(path)) {
        return path;
      }
    }
    
    // 回退到chromium
    return await chromium.executablePath();
  } catch (error) {
    throw new Error(`Chrome executable not found: ${error.message}`);
  }
}

// 优化的浏览器启动参数 - 防止inpage.js错误
function getBrowserArgs() {
  const baseArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-web-security',
    '--disable-features=VizDisplayCompositor,TranslateUI',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    '--disable-ipc-flooding-protection',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-default-apps',
    '--disable-plugins',
    '--disable-extensions',
    '--disable-hang-monitor',
    '--disable-popup-blocking',
    '--disable-prompt-on-repost',
    '--disable-sync',
    '--disable-translate',
    '--disable-background-networking',
    '--disable-background-downloads',
    '--disable-add-to-shelf',
    '--disable-client-side-phishing-detection',
    '--disable-datasaver-prompt',
    '--disable-desktop-notifications',
    '--disable-domain-reliability',
    '--disable-features=AudioServiceOutOfProcess',
    '--run-all-compositor-stages-before-draw',
    '--memory-pressure-off',
    '--max_old_space_size=4096',
    '--js-flags=--max-old-space-size=4096'
  ];

  // Vercel/Lambda特定参数
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    baseArgs.push(...chromium.args);
    baseArgs.push('--single-process'); // Lambda环境优化
  }

  return baseArgs;
}

// 高级页面截图函数 - 确保长图功能
async function captureFullPageScreenshot(url, device, quality, requestId) {
  let browser = null;
  let page = null;
  
  try {
    log(requestId, 'info', 'Starting screenshot capture process', { url, device, quality });
    
    // 获取Chrome路径
    const executablePath = await getChromiumPath();
    log(requestId, 'info', 'Chrome executable path resolved', { path: executablePath });
    
    // 获取启动参数
    const args = getBrowserArgs();
    log(requestId, 'info', 'Browser arguments prepared', { count: args.length });
    
    // 启动浏览器
    browser = await puppeteer.launch({
      args,
      executablePath,
      headless: process.env.VERCEL ? chromium.headless : 'new',
      ignoreHTTPSErrors: true,
      ignoreDefaultArgs: ['--enable-automation', '--enable-blink-features=IdleDetection'],
      timeout: 30000,
      defaultViewport: null
    });
    
    log(requestId, 'info', 'Browser launched successfully');
    
    // 创建新页面
    page = await browser.newPage();
    log(requestId, 'info', 'New page created');
    
    // 设置用户代理
    await page.setUserAgent(DEVICES[device].userAgent);
    
    // 设置视口大小
    await page.setViewport({
      width: DEVICES[device].width,
      height: DEVICES[device].height,
      deviceScaleFactor: 1,
      hasTouch: device === 'mobile'
    });
    
    log(requestId, 'info', 'Viewport configured', DEVICES[device]);
    
    // 设置请求拦截 - 优化性能
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      const url = request.url();
      
      // 阻止不必要的资源
      if (resourceType === 'media' || 
          resourceType === 'font' ||
          url.includes('analytics') ||
          url.includes('tracking') ||
          url.includes('ads') ||
          url.includes('facebook.com') ||
          url.includes('google-analytics') ||
          url.includes('googletagmanager')) {
        request.abort();
      } else {
        request.continue();
      }
    });
    
    // 处理页面错误
    page.on('error', (error) => {
      log(requestId, 'warn', 'Page error detected', { error: error.message });
    });
    
    page.on('pageerror', (error) => {
      log(requestId, 'warn', 'Page script error detected', { error: error.message });
    });
    
    // 注入防止inpage.js错误的脚本
    await page.evaluateOnNewDocument(() => {
      // 防止MetaMask等扩展注入错误
      Object.defineProperty(window, 'ethereum', {
        get: () => undefined,
        set: () => {},
        configurable: false
      });
      
      // 阻止常见的扩展检测
      delete window.chrome;
      delete window.webkitRequestFileSystem;
      delete window.webkitResolveLocalFileSystemURL;
      
      // 防止WebGL指纹检测
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 37445) {
          return 'Intel Inc.';
        }
        if (parameter === 37446) {
          return 'Intel(R) Iris(TM) Graphics 6100';
        }
        return getParameter.call(this, parameter);
      };
    });
    
    log(requestId, 'info', 'Starting page navigation', { url });
    
    // 导航到目标页面
    const response = await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 45000
    });
    
    if (!response) {
      throw new Error('Failed to load page - no response received');
    }
    
    const status = response.status();
    log(requestId, 'info', 'Page navigation completed', { status });
    
    if (status >= 400) {
      throw new Error(`Page returned error status: ${status}`);
    }
    
    // 等待页面完全加载
    await page.waitForTimeout(2000);
    
    // 执行页面滚动以触发懒加载内容
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          
          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            window.scrollTo(0, 0); // 滚动到顶部
            setTimeout(resolve, 1000);
          }
        }, 100);
      });
    });
    
    log(requestId, 'info', 'Page scroll and lazy-load completed');
    
    // 获取页面尺寸信息
    const dimensions = await page.evaluate(() => {
      return {
        documentHeight: Math.max(
          document.documentElement.scrollHeight,
          document.documentElement.offsetHeight,
          document.body.scrollHeight,
          document.body.offsetHeight
        ),
        viewportHeight: window.innerHeight,
        documentWidth: Math.max(
          document.documentElement.scrollWidth,
          document.documentElement.offsetWidth,
          document.body.scrollWidth,
          document.body.offsetWidth
        ),
        viewportWidth: window.innerWidth
      };
    });
    
    log(requestId, 'info', 'Page dimensions calculated', dimensions);
    
    // 执行截图 - 确保全页截图
    log(requestId, 'info', 'Taking full page screenshot');
    const screenshot = await page.screenshot({
      type: 'jpeg',
      quality: QUALITIES[quality],
      fullPage: true,
      optimizeForSpeed: false,
      captureBeyondViewport: true
    });
    
    const sizeKB = Math.round(screenshot.length / 1024);
    log(requestId, 'info', 'Screenshot completed successfully', { 
      sizeKB,
      dimensions: `${dimensions.documentWidth}x${dimensions.documentHeight}`
    });
    
    return {
      screenshot,
      metadata: {
        dimensions,
        sizeKB,
        format: 'jpeg',
        quality: QUALITIES[quality]
      }
    };
    
  } catch (error) {
    log(requestId, 'error', 'Screenshot capture failed', { error: error.message });
    throw error;
  } finally {
    // 清理资源
    if (page) {
      try {
        await page.close();
        log(requestId, 'info', 'Page closed successfully');
      } catch (closeError) {
        log(requestId, 'warn', 'Page close error', { error: closeError.message });
      }
    }
    
    if (browser) {
      try {
        await browser.close();
        log(requestId, 'info', 'Browser closed successfully');
      } catch (closeError) {
        log(requestId, 'warn', 'Browser close error', { error: closeError.message });
      }
    }
  }
}

// 主处理函数
module.exports = async (req, res) => {
  const startTime = Date.now();
  const requestId = `solid_${Math.random().toString(36).substring(2, 11)}`;
  
  // 设置响应头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  // 处理预检请求
  if (req.method === 'OPTIONS') {
    log(requestId, 'info', 'CORS preflight request handled');
    return res.status(200).end();
  }
  
  // 健康检查
  if (req.method === 'GET') {
    log(requestId, 'info', 'Health check request received');
    return res.status(200).json({
      status: 'healthy',
      version: 'solid-v1.0',
      engine: 'puppeteer-core',
      platform: process.platform,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      capabilities: {
        fullPage: true,
        devices: Object.keys(DEVICES),
        qualities: Object.keys(QUALITIES)
      }
    });
  }
  
  // 只处理POST请求
  if (req.method !== 'POST') {
    log(requestId, 'warn', 'Invalid method', { method: req.method });
    return res.status(405).json({ 
      error: 'Method not allowed',
      allowedMethods: ['GET', 'POST', 'OPTIONS']
    });
  }
  
  log(requestId, 'info', 'Screenshot request initiated', req.body);
  
  // 设置超时保护
  const timeoutId = setTimeout(() => {
    log(requestId, 'error', 'Request timeout exceeded');
    if (!res.headersSent) {
      res.status(408).json({
        error: 'Request timeout',
        message: 'Screenshot generation took too long',
        requestId,
        duration: Date.now() - startTime
      });
    }
  }, 55000); // 55秒超时
  
  try {
    // 解析请求参数
    const { url: rawUrl, device = 'desktop', quality = 'medium' } = req.body;
    
    // 参数验证
    if (!rawUrl) {
      clearTimeout(timeoutId);
      return res.status(400).json({
        error: 'Missing URL parameter',
        message: 'Please provide a valid URL to screenshot'
      });
    }
    
    if (!DEVICES[device]) {
      clearTimeout(timeoutId);
      return res.status(400).json({
        error: 'Invalid device type',
        message: `Supported devices: ${Object.keys(DEVICES).join(', ')}`
      });
    }
    
    if (!QUALITIES[quality]) {
      clearTimeout(timeoutId);
      return res.status(400).json({
        error: 'Invalid quality setting',
        message: `Supported qualities: ${Object.keys(QUALITIES).join(', ')}`
      });
    }
    
    // URL验证和标准化
    const url = validateAndNormalizeUrl(rawUrl);
    if (!url) {
      clearTimeout(timeoutId);
      return res.status(400).json({
        error: 'Invalid URL format',
        message: 'Please provide a valid URL (e.g., https://example.com)'
      });
    }
    
    log(requestId, 'info', 'Parameters validated', { url, device, quality });
    
    // 执行截图
    const result = await captureFullPageScreenshot(url, device, quality, requestId);
    
    clearTimeout(timeoutId);
    
    // 转换为Base64
    const base64Image = result.screenshot.toString('base64');
    const dataURI = `data:image/jpeg;base64,${base64Image}`;
    const duration = Date.now() - startTime;
    
    log(requestId, 'info', 'Screenshot request completed successfully', { 
      duration: `${duration}ms`,
      sizeKB: result.metadata.sizeKB
    });
    
    // 返回成功响应
    res.status(200).json({
      success: true,
      image: dataURI,
      metadata: {
        requestId,
        url,
        device,
        quality,
        duration,
        timestamp: new Date().toISOString(),
        version: 'solid-v1.0',
        ...result.metadata
      }
    });
    
  } catch (error) {
    clearTimeout(timeoutId);
    
    const duration = Date.now() - startTime;
    log(requestId, 'error', 'Screenshot request failed', { 
      error: error.message,
      duration: `${duration}ms`
    });
    
    // 错误分类和用户友好的错误消息
    let errorMessage = 'Screenshot generation failed';
    let userTip = 'Please check the URL and try again';
    let statusCode = 500;
    
    if (error.message.includes('timeout') || error.message.includes('Timeout')) {
      errorMessage = 'Page load timeout';
      userTip = 'The webpage took too long to load. Try again or use a simpler page.';
      statusCode = 408;
    } else if (error.message.includes('net::ERR_') || error.message.includes('Failed to load')) {
      errorMessage = 'Cannot access webpage';
      userTip = 'Please verify the URL is correct and the website is accessible.';
      statusCode = 400;
    } else if (error.message.includes('Chrome executable') || error.message.includes('Browser launch')) {
      errorMessage = 'Browser initialization failed';
      userTip = 'Server configuration issue. Please try again later.';
      statusCode = 503;
    } else if (error.message.includes('Protocol error') || error.message.includes('Target closed')) {
      errorMessage = 'Browser connection lost';
      userTip = 'Server memory issue. Please try again with a simpler page.';
      statusCode = 503;
    }
    
    if (!res.headersSent) {
      res.status(statusCode).json({
        error: errorMessage,
        message: userTip,
        details: error.message,
        requestId,
        duration,
        timestamp: new Date().toISOString(),
        version: 'solid-v1.0'
      });
    }
  }
}; 