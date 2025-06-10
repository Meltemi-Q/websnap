// WebSnap Screenshot API - Vercel Hobby Plan Optimized
// 专为 Vercel Hobby 计划优化的截图服务 - 根因修复版本

const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

// 设备配置
const DEVICE_PROFILES = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 }
};

// 质量配置
const QUALITY_SETTINGS = {
  high: 90,
  medium: 70,
  low: 50
};

// Hobby 计划配置
const HOBBY_CONFIG = {
  maxDuration: 55000,        // 55秒总超时
  navigationTimeout: 20000,   // 20秒导航超时
  waitTimeout: 5000,         // 5秒内容等待
  memoryLimit: 1024          // 1024MB 内存限制
};

// 日志函数
function log(requestId, message, data = null) {
  const timestamp = new Date().toISOString();
  if (data) {
    console.log(`[${timestamp}][${requestId}] ${message}:`, data);
  } else {
    console.log(`[${timestamp}][${requestId}] ${message}`);
  }
}

// URL 验证和格式化
function validateAndFormatUrl(inputUrl) {
  if (!inputUrl || typeof inputUrl !== 'string') {
    return { valid: false, error: '请提供有效的URL' };
  }

  let url = inputUrl.trim();
  
  // 添加协议
  if (!url.match(/^https?:\/\//)) {
    url = 'https://' + url;
  }
  
  try {
    const urlObj = new URL(url);
    return { valid: true, url: urlObj.href };
  } catch (error) {
    return { valid: false, error: '无效的URL格式' };
  }
}

// 获取 Chrome 可执行路径
async function getExecutablePath() {
  try {
    // Vercel 环境
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      const path = await chromium.executablePath();
      return path;
    }

    // 本地环境
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

    // 回退到 chromium
    return await chromium.executablePath();
  } catch (error) {
    throw new Error(`无法获取浏览器路径: ${error.message}`);
  }
}

// 获取优化的浏览器参数
function getBrowserArgs() {
  const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-web-security',
    '--disable-extensions',
    '--disable-plugins',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-features=TranslateUI',
    '--disable-ipc-flooding-protection',
    '--memory-pressure-off',
    '--max_old_space_size=512',
    '--js-flags=--max-old-space-size=512'
  ];

  // Vercel 环境特殊配置
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    args.push(...chromium.args);
  }

  return args;
}

// 主要的截图函数
async function takeScreenshot(url, device, quality, requestId) {
  let browser = null;
  
  try {
    log(requestId, '开始截图流程', { url, device, quality });

    // 获取浏览器路径
    const executablePath = await getExecutablePath();
    log(requestId, '浏览器路径', executablePath);

    // 启动浏览器
    const browserArgs = getBrowserArgs();
    log(requestId, '启动浏览器');
    
    browser = await puppeteer.launch({
      args: browserArgs,
      executablePath: executablePath,
      headless: process.env.VERCEL ? chromium.headless : true,
      ignoreHTTPSErrors: true,
      timeout: 30000
    });

    log(requestId, '浏览器启动成功');

    // 创建页面
    const page = await browser.newPage();
    log(requestId, '创建页面成功');

    // 设置用户代理
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // 设置视口
    const viewport = DEVICE_PROFILES[device];
    await page.setViewport({
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1
    });
    log(requestId, '设置视口', viewport);

    // 设置请求拦截 - 简化版本
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      
      // 只阻止明显的资源浪费
      if (resourceType === 'media' || 
          req.url().includes('.mp4') || 
          req.url().includes('.mp3')) {
        req.abort();
      } else {
        req.continue();
      }
    });

    log(requestId, '开始导航到页面');
    
    // 导航到页面
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: HOBBY_CONFIG.navigationTimeout
    });

    log(requestId, '页面导航完成');

    // 等待页面内容
    await page.waitForFunction(() => {
      return document.readyState === 'interactive' || document.readyState === 'complete';
    }, { timeout: HOBBY_CONFIG.waitTimeout }).catch(() => {
      log(requestId, '内容等待超时，继续截图');
    });

    // 短暂等待页面稳定
    await page.waitForTimeout(2000);

    log(requestId, '开始截图');

    // 截图
    const screenshot = await page.screenshot({
      type: 'jpeg',
      quality: QUALITY_SETTINGS[quality],
      fullPage: true,
      optimizeForSpeed: true
    });

    log(requestId, '截图完成', { size: `${Math.round(screenshot.length / 1024)}KB` });

    return {
      success: true,
      screenshot: screenshot,
      metadata: {
        size: screenshot.length,
        device: device,
        quality: quality
      }
    };

  } catch (error) {
    log(requestId, '截图过程出错', error.message);
    throw error;
  } finally {
    if (browser) {
      try {
        await browser.close();
        log(requestId, '浏览器已关闭');
      } catch (closeError) {
        log(requestId, '关闭浏览器失败', closeError.message);
      }
    }
  }
}

// Vercel Serverless Function 导出
module.exports = async (req, res) => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 11);
  
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // 处理 OPTIONS 请求
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 健康检查
  if (req.method === 'GET') {
    res.status(200).json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      version: 'fixed',
      plan: 'hobby'
    });
    return;
  }

  // 只处理 POST 请求
  if (req.method !== 'POST') {
    res.status(405).json({ error: '只支持 POST 请求' });
    return;
  }

  log(requestId, '收到截图请求', req.body);

  // 设置总体超时
  const timeoutTimer = setTimeout(() => {
    log(requestId, '请求总体超时');
    res.status(500).json({
      error: '请求超时',
      tip: 'Hobby 计划限制执行时间为 60 秒',
      requestId: requestId,
      duration: Date.now() - startTime
    });
  }, HOBBY_CONFIG.maxDuration);

  try {
    // 解析请求参数
    const { url: inputUrl, device = 'desktop', quality = 'medium' } = req.body;

    // 验证参数
    if (!DEVICE_PROFILES[device]) {
      clearTimeout(timeoutTimer);
      return res.status(400).json({ error: '无效的设备类型' });
    }

    if (!QUALITY_SETTINGS[quality]) {
      clearTimeout(timeoutTimer);
      return res.status(400).json({ error: '无效的质量设置' });
    }

    // 验证和格式化 URL
    const urlResult = validateAndFormatUrl(inputUrl);
    if (!urlResult.valid) {
      clearTimeout(timeoutTimer);
      return res.status(400).json({ error: urlResult.error });
    }

    // 执行截图
    const result = await takeScreenshot(urlResult.url, device, quality, requestId);

    // 清除超时定时器
    clearTimeout(timeoutTimer);

    // 转换为 Base64
    const base64Image = result.screenshot.toString('base64');
    const dataURI = `data:image/jpeg;base64,${base64Image}`;

    const duration = Date.now() - startTime;
    log(requestId, '请求处理完成', { duration: `${duration}ms` });

    // 返回成功结果
    res.status(200).json({
      success: true,
      image: dataURI,
      device: device,
      quality: quality,
      metadata: {
        requestId: requestId,
        duration: duration,
        timestamp: new Date().toISOString(),
        version: 'fixed',
        plan: 'hobby',
        screenshotSize: `${Math.round(result.screenshot.length / 1024)}KB`
      }
    });

  } catch (error) {
    clearTimeout(timeoutTimer);
    
    const duration = Date.now() - startTime;
    log(requestId, '请求处理失败', { error: error.message, duration: `${duration}ms` });

    // 错误分类和处理
    let errorMessage = '截图生成失败';
    let errorTip = '请检查网络连接和URL是否正确';

    if (error.message.includes('timeout') || error.message.includes('Timeout')) {
      errorMessage = '页面加载超时';
      errorTip = 'Hobby 计划限制执行时间，建议：1) 稍后重试 2) 升级到 Pro 计划';
    } else if (error.message.includes('net::ERR_') || error.message.includes('Navigation failed')) {
      errorMessage = '无法访问目标网页';
      errorTip = '请检查网址是否正确，或目标网站是否可访问';
    } else if (error.message.includes('Protocol error') || error.message.includes('Target closed')) {
      errorMessage = '浏览器连接异常';
      errorTip = 'Hobby 计划内存限制可能导致浏览器异常，建议升级到 Pro 计划';
    }

    res.status(500).json({
      error: errorMessage,
      details: error.message,
      tip: errorTip,
      requestId: requestId,
      duration: duration,
      version: 'fixed',
      plan: 'hobby'
    });
  }
};
