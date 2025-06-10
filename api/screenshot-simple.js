const express = require('express');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// 设备配置
const deviceProfiles = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 }
};

// 质量配置
const qualitySettings = {
  high: 100,
  medium: 80,
  low: 60
};

// 增加请求体大小限制
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// 静态文件服务
app.use(express.static(path.join(__dirname, '../public')));

// 根路径路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 健康检查端点
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// URL 格式化函数
function normalizeUrl(inputUrl) {
  if (!inputUrl || typeof inputUrl !== 'string') {
    return null;
  }

  let url = inputUrl.trim();
  
  // 如果没有协议，添加 https://
  if (!url.match(/^https?:\/\//)) {
    url = 'https://' + url;
  }
  
  try {
    const urlObj = new URL(url);
    return urlObj.href;
  } catch (error) {
    return null;
  }
}

// 获取Chrome可执行路径
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

// 极简版截图函数 - 专为 Hobby 计划优化
app.post('/api/screenshot', async (req, res) => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 11);
  
  console.log(`[${requestId}] 开始处理截图请求 (极简版):`, req.body);

  const { url: inputUrl, device = 'desktop', quality = 'medium' } = req.body;

  // URL验证
  if (!inputUrl || typeof inputUrl !== 'string') {
    return res.status(400).json({ error: '请提供有效的URL' });
  }

  const url = normalizeUrl(inputUrl);
  if (!url) {
    return res.status(400).json({
      error: '无效的URL格式',
      tip: '请输入有效的网址，如：example.com 或 https://example.com'
    });
  }

  // 验证设备类型和质量
  if (!deviceProfiles[device]) {
    return res.status(400).json({ error: '无效的设备类型' });
  }
  if (!qualitySettings[quality]) {
    return res.status(400).json({ error: '无效的质量设置' });
  }

  console.log(`[${requestId}] URL: ${url}, 设备: ${device}, 质量: ${quality}`);

  let browser;
  
  // 设置 45 秒的总体超时
  const timeoutTimer = setTimeout(() => {
    console.log(`[${requestId}] 总体超时，强制终止`);
    if (browser) {
      browser.close().catch(() => {});
    }
  }, 45000);

  try {
    // 获取浏览器路径
    const executablePath = await getExecutablePath();
    console.log(`[${requestId}] 浏览器路径: ${executablePath}`);

    // 极简浏览器配置 - 最大化兼容性
    const browserArgs = [
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
      '--single-process', // 单进程模式节省内存
      '--memory-pressure-off',
      '--max_old_space_size=512',
      '--js-flags=--max-old-space-size=512'
    ];

    // Vercel 环境特殊配置
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      browserArgs.push(...chromium.args);
    }

    console.log(`[${requestId}] 启动浏览器 (极简配置)`);
    
    browser = await puppeteer.launch({
      args: browserArgs,
      executablePath: executablePath,
      headless: process.env.VERCEL ? chromium.headless : true,
      ignoreHTTPSErrors: true,
      timeout: 20000 // 20秒启动超时
    });

    console.log(`[${requestId}] 创建页面`);
    const page = await browser.newPage();

    // 设置用户代理
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // 设置视口
    await page.setViewport({
      width: deviceProfiles[device].width,
      height: deviceProfiles[device].height,
      deviceScaleFactor: 1
    });

    // 极简请求拦截 - 只阻止最明显的资源浪费
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      const reqUrl = req.url();

      // 只阻止明显的资源浪费
      if (resourceType === 'media' || 
          reqUrl.includes('.mp4') || 
          reqUrl.includes('.mp3') ||
          reqUrl.includes('analytics.google.com') ||
          reqUrl.includes('googletagmanager.com')) {
        req.abort();
      } else {
        req.continue();
      }
    });

    console.log(`[${requestId}] 导航到页面: ${url}`);
    
    // 极简导航 - 只等待基本加载
    await page.goto(url, {
      waitUntil: 'domcontentloaded', // 只等待DOM加载
      timeout: 15000 // 15秒导航超时
    });

    console.log(`[${requestId}] 页面加载完成，等待内容渲染`);
    
    // 极简等待策略
    await page.waitForFunction(() => {
      return document.readyState === 'interactive' || document.readyState === 'complete';
    }, { timeout: 5000 }).catch(() => {
      console.log(`[${requestId}] 内容等待超时，继续截图`);
    });

    // 短暂等待让页面稳定
    await page.waitForTimeout(2000);

    console.log(`[${requestId}] 开始截图`);
    
    // 极简截图配置
    const screenshot = await page.screenshot({
      type: 'jpeg',
      quality: Math.min(qualitySettings[quality], 70), // 限制最大质量
      fullPage: true,
      optimizeForSpeed: true // 优先速度
    });
    
    console.log(`[${requestId}] 截图完成，大小: ${Math.round(screenshot.length / 1024)}KB`);

    // 转换为Base64
    const base64Image = screenshot.toString('base64');
    const dataURI = `data:image/jpeg;base64,${base64Image}`;

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`[${requestId}] 请求处理完成，耗时: ${duration}ms`);

    // 清除超时定时器
    clearTimeout(timeoutTimer);

    // 返回结果
    res.json({
      success: true,
      image: dataURI,
      device,
      quality,
      metadata: {
        requestId,
        duration,
        timestamp: new Date().toISOString(),
        version: 'simple',
        plan: 'hobby',
        screenshotSize: Math.round(screenshot.length / 1024) + 'KB'
      }
    });

  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    // 清除超时定时器
    clearTimeout(timeoutTimer);

    console.error(`[${requestId}] 截图生成错误 (耗时: ${duration}ms):`, error.message);

    // 简化的错误处理
    let errorMessage = '截图生成失败';
    let errorTip = '请检查网络连接和URL是否正确';

    if (error.message.includes('timeout') || error.message.includes('Timeout')) {
      errorMessage = '页面加载超时';
      errorTip = 'Hobby 计划限制执行时间，该网站可能过于复杂。建议：1) 稍后重试 2) 升级到 Pro 计划';
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
      requestId,
      duration,
      version: 'simple',
      plan: 'hobby'
    });

  } finally {
    if (browser) {
      try {
        console.log(`[${requestId}] 关闭浏览器`);
        await browser.close();
      } catch (closeError) {
        console.error(`[${requestId}] 关闭浏览器失败:`, closeError.message);
      }
    }
  }
});

// 启动服务器
app.listen(port, () => {
  console.log(`极简版 WebSnap 服务器运行在 http://localhost:${port}`);
});

module.exports = app;
