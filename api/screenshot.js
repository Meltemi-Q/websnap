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

// 优化Chromium设置
chromium.setGraphicsMode = false; // 禁用图形模式

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

// 获取Chrome可执行路径
async function getExecutablePath() {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return await chromium.executablePath();
  }
  
  // 本地开发环境的Chrome路径
  const localPaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome'
  ];

  const fs = require('fs');
  for (const chromePath of localPaths) {
    if (fs.existsSync(chromePath)) {
      return chromePath;
    }
  }
  
  return await chromium.executablePath();
}

// URL标准化
function normalizeUrl(inputUrl) {
  if (!inputUrl) return null;
  
  let url = inputUrl.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }
  
  try {
    return new URL(url).href;
  } catch {
    return null;
  }
}

// 主处理函数
module.exports = async (req, res) => {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET' && req.url === '/api/health') {
    return res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只支持POST请求' });
  }

  const requestId = Date.now().toString();
  console.log(`[${requestId}] 开始处理截图请求`);

  let browser = null;

  try {
    const { 
      url, 
      device = 'desktop', 
      quality = 'high',
      fullPage = true 
    } = req.body;

    console.log(`[${requestId}] 请求参数:`, { url, device, quality, fullPage });

    // URL验证
    const targetUrl = normalizeUrl(url);
    if (!targetUrl) {
      return res.status(400).json({ error: 'URL格式无效' });
    }

    // 设备配置
    const deviceConfig = deviceProfiles[device] || deviceProfiles.desktop;
    const qualityValue = qualitySettings[quality] || qualitySettings.high;

    console.log(`[${requestId}] 启动浏览器`);

    // 启动浏览器
    browser = await puppeteer.launch({
      executablePath: await getExecutablePath(),
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ],
      headless: true
    });

    const page = await browser.newPage();

    // 设置视口
    await page.setViewport({
      width: deviceConfig.width,
      height: deviceConfig.height,
      deviceScaleFactor: 1
    });

    console.log(`[${requestId}] 导航到: ${targetUrl}`);

    // 导航到目标URL
    await page.goto(targetUrl, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // 等待页面加载完成
    await page.waitForTimeout(2000);

    // 等待图片加载
    await page.evaluate(() => {
      return Promise.all(
        Array.from(document.images)
          .filter(img => !img.complete)
          .map(img => new Promise(resolve => {
            img.onload = img.onerror = resolve;
          }))
      );
    });

    console.log(`[${requestId}] 开始截图`);

    // 截图
    const screenshot = await page.screenshot({
      type: 'jpeg',
      quality: qualityValue,
      fullPage: fullPage
    });

    console.log(`[${requestId}] 截图完成，大小: ${screenshot.length} bytes`);

    // 返回结果
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({
      success: true,
      image: screenshot.toString('base64'),
      metadata: {
        device,
        quality,
        fullPage,
        size: screenshot.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error(`[${requestId}] 错误:`, error);
    res.status(500).json({
      error: '截图失败',
      message: error.message,
      requestId
    });
  } finally {
    if (browser) {
      console.log(`[${requestId}] 关闭浏览器`);
      await browser.close();
    }
  }
};

// 启动服务器
app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
});

module.exports = app; // 为了Vercel Lambda函数