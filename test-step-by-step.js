#!/usr/bin/env node

/**
 * 分步验证脚本
 * 逐步测试每个组件以确定问题所在
 */

const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

// 模拟 Vercel 环境
process.env.VERCEL = '1';

// 测试步骤
const TESTS = [
  {
    name: '1. 依赖导入测试',
    test: async () => {
      console.log('   - puppeteer-core version:', require('puppeteer-core/package.json').version);
      console.log('   - @sparticuz/chromium version:', require('@sparticuz/chromium/package.json').version);
      return { success: true, message: '依赖导入成功' };
    }
  },
  
  {
    name: '2. Chromium 路径获取测试',
    test: async () => {
      try {
        const executablePath = await chromium.executablePath();
        console.log('   - Chromium path:', executablePath);
        return { success: true, message: 'Chromium 路径获取成功' };
      } catch (error) {
        return { success: false, message: `Chromium 路径获取失败: ${error.message}` };
      }
    }
  },
  
  {
    name: '3. 浏览器启动测试',
    test: async () => {
      let browser;
      try {
        const executablePath = await chromium.executablePath();
        const args = [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          ...chromium.args
        ];
        
        console.log('   - Browser args count:', args.length);
        
        browser = await puppeteer.launch({
          args: args,
          executablePath: executablePath,
          headless: chromium.headless,
          ignoreHTTPSErrors: true,
          timeout: 30000,
          defaultViewport: null
        });
        
        console.log('   - Browser launched successfully');
        return { success: true, message: '浏览器启动成功' };
      } catch (error) {
        return { success: false, message: `浏览器启动失败: ${error.message}` };
      } finally {
        if (browser) {
          try {
            await browser.close();
            console.log('   - Browser closed');
          } catch (e) {
            console.log('   - Browser close error:', e.message);
          }
        }
      }
    }
  },
  
  {
    name: '4. 页面创建测试',
    test: async () => {
      let browser;
      try {
        const executablePath = await chromium.executablePath();
        const args = [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          ...chromium.args
        ];
        
        browser = await puppeteer.launch({
          args: args,
          executablePath: executablePath,
          headless: chromium.headless,
          ignoreHTTPSErrors: true,
          timeout: 30000,
          defaultViewport: null
        });
        
        const page = await browser.newPage();
        console.log('   - Page created successfully');
        
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        console.log('   - User agent set');
        
        await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
        console.log('   - Viewport set');
        
        return { success: true, message: '页面创建和配置成功' };
      } catch (error) {
        return { success: false, message: `页面创建失败: ${error.message}` };
      } finally {
        if (browser) {
          try {
            await browser.close();
          } catch (e) {
            console.log('   - Browser close error:', e.message);
          }
        }
      }
    }
  },
  
  {
    name: '5. 简单页面导航测试',
    test: async () => {
      let browser;
      try {
        const executablePath = await chromium.executablePath();
        const args = [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          ...chromium.args
        ];
        
        browser = await puppeteer.launch({
          args: args,
          executablePath: executablePath,
          headless: chromium.headless,
          ignoreHTTPSErrors: true,
          timeout: 30000,
          defaultViewport: null
        });
        
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
        
        console.log('   - Navigating to example.com...');
        await page.goto('https://example.com', {
          waitUntil: 'domcontentloaded',
          timeout: 20000
        });
        
        console.log('   - Navigation successful');
        
        const title = await page.title();
        console.log('   - Page title:', title);
        
        return { success: true, message: '页面导航成功' };
      } catch (error) {
        return { success: false, message: `页面导航失败: ${error.message}` };
      } finally {
        if (browser) {
          try {
            await browser.close();
          } catch (e) {
            console.log('   - Browser close error:', e.message);
          }
        }
      }
    }
  },
  
  {
    name: '6. 截图功能测试',
    test: async () => {
      let browser;
      try {
        const executablePath = await chromium.executablePath();
        const args = [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          ...chromium.args
        ];
        
        browser = await puppeteer.launch({
          args: args,
          executablePath: executablePath,
          headless: chromium.headless,
          ignoreHTTPSErrors: true,
          timeout: 30000,
          defaultViewport: null
        });
        
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
        
        await page.goto('https://example.com', {
          waitUntil: 'domcontentloaded',
          timeout: 20000
        });
        
        await page.waitForTimeout(2000);
        
        console.log('   - Taking screenshot...');
        const screenshot = await page.screenshot({
          type: 'jpeg',
          quality: 70,
          fullPage: true
        });
        
        console.log('   - Screenshot size:', Math.round(screenshot.length / 1024) + 'KB');
        
        return { success: true, message: '截图功能正常' };
      } catch (error) {
        return { success: false, message: `截图失败: ${error.message}` };
      } finally {
        if (browser) {
          try {
            await browser.close();
          } catch (e) {
            console.log('   - Browser close error:', e.message);
          }
        }
      }
    }
  },
  
  {
    name: '7. GitHub 页面测试',
    test: async () => {
      let browser;
      try {
        const executablePath = await chromium.executablePath();
        const args = [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          ...chromium.args
        ];
        
        browser = await puppeteer.launch({
          args: args,
          executablePath: executablePath,
          headless: chromium.headless,
          ignoreHTTPSErrors: true,
          timeout: 30000,
          defaultViewport: null
        });
        
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
        
        // 设置请求拦截
        await page.setRequestInterception(true);
        page.on('request', (req) => {
          if (req.resourceType() === 'media') {
            req.abort();
          } else {
            req.continue();
          }
        });
        
        console.log('   - Navigating to GitHub...');
        await page.goto('https://github.com/Meltemi-Q/websnap', {
          waitUntil: 'domcontentloaded',
          timeout: 25000
        });
        
        await page.waitForTimeout(3000);
        
        console.log('   - Taking GitHub screenshot...');
        const screenshot = await page.screenshot({
          type: 'jpeg',
          quality: 70,
          fullPage: true
        });
        
        console.log('   - GitHub screenshot size:', Math.round(screenshot.length / 1024) + 'KB');
        
        return { success: true, message: 'GitHub 页面截图成功' };
      } catch (error) {
        return { success: false, message: `GitHub 页面测试失败: ${error.message}` };
      } finally {
        if (browser) {
          try {
            await browser.close();
          } catch (e) {
            console.log('   - Browser close error:', e.message);
          }
        }
      }
    }
  }
];

// 运行分步测试
async function runStepByStepTests() {
  console.log('🔧 WebSnap 分步验证测试');
  console.log(`📅 测试时间: ${new Date().toISOString()}`);
  console.log(`🎯 测试环境: ${process.env.VERCEL ? 'Vercel模拟' : '本地'}`);
  
  let passedCount = 0;
  let failedCount = 0;
  
  for (const testCase of TESTS) {
    console.log(`\n🧪 ${testCase.name}`);
    
    try {
      const result = await testCase.test();
      
      if (result.success) {
        console.log(`   ✅ ${result.message}`);
        passedCount++;
      } else {
        console.log(`   ❌ ${result.message}`);
        failedCount++;
        
        // 如果关键步骤失败，停止后续测试
        if (testCase.name.includes('1.') || testCase.name.includes('2.') || testCase.name.includes('3.')) {
          console.log(`\n🛑 关键步骤失败，停止后续测试`);
          break;
        }
      }
    } catch (error) {
      console.log(`   ❌ 测试异常: ${error.message}`);
      failedCount++;
      
      // 如果关键步骤失败，停止后续测试
      if (testCase.name.includes('1.') || testCase.name.includes('2.') || testCase.name.includes('3.')) {
        console.log(`\n🛑 关键步骤失败，停止后续测试`);
        break;
      }
    }
  }
  
  // 输出总结
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 分步测试总结');
  console.log(`${'='.repeat(60)}`);
  console.log(`✅ 通过: ${passedCount}`);
  console.log(`❌ 失败: ${failedCount}`);
  console.log(`📈 成功率: ${Math.round(passedCount / (passedCount + failedCount) * 100)}%`);
  
  if (passedCount >= 6) {
    console.log(`\n🎉 大部分测试通过！可以部署到 Vercel`);
    console.log(`\n🚀 部署命令:`);
    console.log(`   npm install  # 更新依赖`);
    console.log(`   vercel --prod  # 部署到生产环境`);
  } else if (passedCount >= 3) {
    console.log(`\n⚠️  基础功能正常，但需要优化`);
    console.log(`\n🔧 建议:`);
    console.log(`   1. 检查失败的步骤`);
    console.log(`   2. 优化浏览器参数`);
    console.log(`   3. 调整超时设置`);
  } else {
    console.log(`\n❌ 基础功能存在问题，需要修复`);
    console.log(`\n🔧 排查步骤:`);
    console.log(`   1. 检查依赖版本兼容性`);
    console.log(`   2. 验证 Chromium 安装`);
    console.log(`   3. 检查系统环境`);
  }
  
  console.log(`\n✅ 分步测试完成`);
}

// 运行测试
if (require.main === module) {
  runStepByStepTests().catch(console.error);
}

module.exports = {
  runStepByStepTests,
  TESTS
};
