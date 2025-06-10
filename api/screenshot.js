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

app.use(express.json());

// 静态文件服务
app.use(express.static(path.join(__dirname, '../public')));

// 根路径路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 获取Chrome可执行路径的函数
async function getExecutablePath() {
  // 如果是Vercel环境，使用Chromium
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return await chromium.executablePath();
  }
  
  // 本地开发环境，尝试寻找本地Chrome
  const localPaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser'
  ];
  
  const fs = require('fs');
  for (const chromePath of localPaths) {
    if (fs.existsSync(chromePath)) {
      return chromePath;
    }
  }
  
  // 如果找不到本地Chrome，回退到Chromium
  return await chromium.executablePath();
}

app.post('/api/screenshot', async (req, res) => {
  const { url, device = 'desktop', quality = 'medium' } = req.body;
  
  // 验证URL格式
  try {
    new URL(url);
  } catch (e) {
    return res.status(400).json({ error: '无效的URL' });
  }
  
  // 验证设备类型
  if (!deviceProfiles[device]) {
    return res.status(400).json({ error: '无效的设备类型' });
  }
  
  // 验证质量设置
  if (!qualitySettings[quality]) {
    return res.status(400).json({ error: '无效的质量设置' });
  }
  
  let browser;
  
  try {
    const executablePath = await getExecutablePath();
    console.log('使用浏览器路径:', executablePath);
    
    // 启动浏览器配置
    const browserArgs = [
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-dev-shm-usage',
      '--no-sandbox',
      '--disable-web-security',
      '--disable-extensions',
      '--disable-plugins',
      '--disable-images', // 可选：禁用图片加载以提升性能
    ];
    
    // 如果是Vercel环境，添加Chromium特定参数
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      browserArgs.push(...chromium.args);
    }
    
    browser = await puppeteer.launch({
      args: browserArgs,
      executablePath: executablePath,
      headless: process.env.VERCEL ? chromium.headless : true,
      ignoreHTTPSErrors: true
    });
    
    const page = await browser.newPage();
    
    // 设置设备尺寸
    await page.setViewport({
      width: deviceProfiles[device].width,
      height: deviceProfiles[device].height,
      deviceScaleFactor: 1
    });
    
    // 导航到目标URL
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // 获取页面高度
    const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
    
    // 设置全高视口
    await page.setViewport({
      width: deviceProfiles[device].width,
      height: bodyHeight,
      deviceScaleFactor: 1
    });
    
    // 截取整个页面
    const screenshot = await page.screenshot({
      type: 'jpeg',
      quality: qualitySettings[quality],
      fullPage: true
    });
    
    // 将截图转换为Base64
    const base64Image = screenshot.toString('base64');
    const dataURI = `data:image/jpeg;base64,${base64Image}`;
    
    // 返回结果
    res.json({
      success: true,
      image: dataURI,
      device,
      quality,
      dimensions: {
        width: deviceProfiles[device].width,
        height: bodyHeight
      }
    });
    
  } catch (error) {
    console.error('截图生成错误:', error);
    res.status(500).json({ 
      error: '截图生成失败',
      details: error.message,
      tip: '请确保系统已安装Chrome浏览器或网络连接正常'
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

// 启动服务器
app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
});

module.exports = app; // 为了Vercel Lambda函数