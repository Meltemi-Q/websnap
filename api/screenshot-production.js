// WebSnap Screenshot API - Production Ready for Vercel Hobby Plan
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

// 配置常量
const DEVICES = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 }
};

const QUALITIES = { high: 90, medium: 70, low: 50 };
const TIMEOUT = 55000; // 55秒总超时

// 日志函数
function log(id, msg, data) {
  console.log(`[${new Date().toISOString()}][${id}] ${msg}`, data || '');
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

// 获取 Chrome 路径
async function getChromePath() {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return await chromium.executablePath();
  }
  
  // 本地路径
  const fs = require('fs');
  const paths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome'
  ];
  
  for (const path of paths) {
    if (fs.existsSync(path)) return path;
  }
  
  return await chromium.executablePath();
}

// 浏览器参数
function getBrowserArgs() {
  const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-web-security',
    '--disable-extensions',
    '--disable-plugins',
    '--memory-pressure-off',
    '--max_old_space_size=512'
  ];
  
  if (process.env.VERCEL) {
    args.push(...chromium.args);
  }
  
  return args;
}

// 主截图函数
async function takeScreenshot(url, device, quality, requestId) {
  let browser;
  
  try {
    log(requestId, '开始截图', { url, device, quality });
    
    const executablePath = await getChromePath();
    log(requestId, '浏览器路径', executablePath);
    
    browser = await puppeteer.launch({
      args: getBrowserArgs(),
      executablePath,
      headless: process.env.VERCEL ? chromium.headless : true,
      ignoreHTTPSErrors: true,
      timeout: 30000
    });
    
    const page = await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    await page.setViewport(DEVICES[device]);
    
    // 简单的资源过滤
    await page.setRequestInterception(true);
    page.on('request', req => {
      if (req.resourceType() === 'media' || req.url().includes('.mp4')) {
        req.abort();
      } else {
        req.continue();
      }
    });
    
    log(requestId, '导航到页面');
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 20000
    });
    
    log(requestId, '等待页面内容');
    await page.waitForFunction(() => {
      return document.readyState === 'complete' || document.readyState === 'interactive';
    }, { timeout: 5000 }).catch(() => {});
    
    await page.waitForTimeout(2000);
    
    log(requestId, '开始截图');
    const screenshot = await page.screenshot({
      type: 'jpeg',
      quality: QUALITIES[quality],
      fullPage: true
    });
    
    log(requestId, '截图完成', `${Math.round(screenshot.length / 1024)}KB`);
    
    return screenshot;
    
  } finally {
    if (browser) {
      try {
        await browser.close();
        log(requestId, '浏览器已关闭');
      } catch (e) {
        log(requestId, '关闭浏览器失败', e.message);
      }
    }
  }
}

// Vercel 函数入口
module.exports = async (req, res) => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 11);
  
  // CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      version: 'production',
      plan: 'hobby',
      timestamp: new Date().toISOString()
    });
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只支持 POST 请求' });
  }
  
  log(requestId, '收到请求', req.body);
  
  // 总体超时保护
  const timer = setTimeout(() => {
    res.status(500).json({
      error: '请求超时',
      tip: 'Hobby 计划限制执行时间为 60 秒',
      requestId,
      duration: Date.now() - startTime
    });
  }, TIMEOUT);
  
  try {
    const { url: inputUrl, device = 'desktop', quality = 'medium' } = req.body;
    
    // 参数验证
    if (!DEVICES[device]) {
      clearTimeout(timer);
      return res.status(400).json({ error: '无效的设备类型' });
    }
    
    if (!QUALITIES[quality]) {
      clearTimeout(timer);
      return res.status(400).json({ error: '无效的质量设置' });
    }
    
    const url = validateUrl(inputUrl);
    if (!url) {
      clearTimeout(timer);
      return res.status(400).json({ error: '无效的URL格式' });
    }
    
    // 执行截图
    const screenshot = await takeScreenshot(url, device, quality, requestId);
    
    clearTimeout(timer);
    
    const base64 = screenshot.toString('base64');
    const dataURI = `data:image/jpeg;base64,${base64}`;
    const duration = Date.now() - startTime;
    
    log(requestId, '请求完成', `${duration}ms`);
    
    res.status(200).json({
      success: true,
      image: dataURI,
      device,
      quality,
      metadata: {
        requestId,
        duration,
        timestamp: new Date().toISOString(),
        version: 'production',
        plan: 'hobby',
        screenshotSize: `${Math.round(screenshot.length / 1024)}KB`
      }
    });
    
  } catch (error) {
    clearTimeout(timer);
    
    const duration = Date.now() - startTime;
    log(requestId, '请求失败', error.message);
    
    let errorMessage = '截图生成失败';
    let tip = '请检查网络连接和URL是否正确';
    
    if (error.message.includes('timeout')) {
      errorMessage = '页面加载超时';
      tip = 'Hobby 计划限制执行时间，建议升级到 Pro 计划';
    } else if (error.message.includes('net::ERR_')) {
      errorMessage = '无法访问目标网页';
      tip = '请检查网址是否正确';
    } else if (error.message.includes('Protocol error')) {
      errorMessage = '浏览器连接异常';
      tip = 'Hobby 计划内存限制，建议升级到 Pro 计划';
    }
    
    res.status(500).json({
      error: errorMessage,
      details: error.message,
      tip,
      requestId,
      duration,
      version: 'production',
      plan: 'hobby'
    });
  }
};
