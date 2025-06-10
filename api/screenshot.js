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

// Hobby 计划专用配置系统 - 专注于可靠性
function getHobbyPlanConfig(url) {
  const isVercel = process.env.VERCEL === '1';
  const isComplexSite = url.includes('islanddragon.cn') ||
                       url.includes('qq.com') ||
                       url.includes('baidu.com') ||
                       url.includes('taobao.com');

  // Hobby 计划的保守配置 - 优先可靠性
  const config = {
    // 执行时间限制（留10秒缓冲）
    maxExecutionTime: isVercel ? 50000 : 120000,
    // 导航超时 - 保守设置
    navigationTimeout: isComplexSite ? 20000 : 15000,
    // 页面等待时间 - 激进优化
    pageWaitTime: isComplexSite ? 3000 : 2000,
    // 重试次数 - 减少重试以节省时间
    retries: 1,
    // 内存配置
    memory: {
      limit: 1024,
      optimization: 'aggressive'
    },
    // 降级策略
    fallbackStrategy: isComplexSite ? 'minimal' : 'standard'
  };

  return config;
}

// 检测网站复杂度
function detectSiteComplexity(url) {
  const complexPatterns = [
    'qq.com',
    'baidu.com',
    'taobao.com',
    'tmall.com',
    'jd.com',
    'weibo.com',
    'zhihu.com',
    'bilibili.com',
    'islanddragon.cn'
  ];

  const isComplex = complexPatterns.some(pattern => url.includes(pattern));
  const hasQuery = url.includes('?') && url.split('?')[1].length > 50;
  const hasFragment = url.includes('#');

  return {
    isComplex,
    hasQuery,
    hasFragment,
    complexity: isComplex ? 'high' : (hasQuery || hasFragment) ? 'medium' : 'low'
  };
}

// 内存优化的浏览器配置
function getMemoryOptimizedBrowserArgs(memoryOptimization = 'balanced') {
  const baseArgs = [
    // 基础稳定性配置
    '--disable-gpu',
    '--disable-software-rasterizer',
    '--disable-dev-shm-usage',
    '--no-sandbox',
    '--disable-web-security',
    '--disable-extensions',
    '--disable-plugins',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-background-networking',
    '--disable-features=TranslateUI,BlinkGenPropertyTrees',
    '--disable-ipc-flooding-protection',
    '--disable-hang-monitor',
    '--disable-client-side-phishing-detection',
    '--disable-component-update',
    '--disable-domain-reliability'
  ];

  if (memoryOptimization === 'aggressive') {
    // Hobby计划的激进内存优化
    return baseArgs.concat([
      // 内存限制
      '--memory-pressure-off',
      '--max_old_space_size=512',
      '--js-flags=--max-old-space-size=512',

      // 禁用更多功能以节省内存
      '--disable-background-mode',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
      '--disable-features=VizDisplayCompositor,AudioServiceOutOfProcess',
      '--disable-audio-output',
      '--disable-audio-input',
      '--disable-notifications',
      '--disable-speech-api',
      '--disable-file-system',
      '--disable-sensors',
      '--disable-geolocation',
      '--disable-permissions-api',

      // 减少缓存和历史记录
      '--disk-cache-size=0',
      '--media-cache-size=0',
      '--aggressive-cache-discard',
      '--disable-application-cache',

      // 单进程模式（节省内存但可能影响性能）
      '--single-process',

      // 减少渲染质量以节省内存
      '--disable-lcd-text',
      '--disable-accelerated-2d-canvas',
      '--disable-accelerated-jpeg-decoding',
      '--disable-accelerated-mjpeg-decode',
      '--disable-accelerated-video-decode'
    ]);
  } else {
    // Pro计划的平衡配置
    return baseArgs.concat([
      '--js-flags=--max-old-space-size=2048',
      '--max_old_space_size=2048',
      '--enable-features=NetworkService,NetworkServiceLogging',
      '--disable-features=VizDisplayCompositor',
      '--force-color-profile=srgb'
    ]);
  }
}

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

// 获取Chrome可执行路径的函数
async function getExecutablePath() {
  try {
    // 如果是Vercel环境，使用Chromium
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      console.log('检测到云环境，使用Chromium');
      const execPath = await chromium.executablePath();
      console.log('Chromium路径:', execPath);
      return execPath;
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
        console.log('找到本地Chrome:', chromePath);
        return chromePath;
      }
    }

    // 如果找不到本地Chrome，回退到Chromium
    console.log('未找到本地Chrome，使用Chromium');
    const execPath = await chromium.executablePath();
    console.log('Chromium路径:', execPath);
    return execPath;
  } catch (error) {
    console.error('获取浏览器路径失败:', error);
    throw new Error(`无法获取浏览器路径: ${error.message}`);
  }
}

// 内存监控函数
function getMemoryUsage(requestId) {
  const usage = process.memoryUsage();
  const formatMB = (bytes) => Math.round(bytes / 1024 / 1024);

  const memoryInfo = {
    rss: formatMB(usage.rss),
    heapUsed: formatMB(usage.heapUsed),
    heapTotal: formatMB(usage.heapTotal),
    external: formatMB(usage.external)
  };

  console.log(`[${requestId}] 内存使用: RSS=${memoryInfo.rss}MB, Heap=${memoryInfo.heapUsed}/${memoryInfo.heapTotal}MB, External=${memoryInfo.external}MB`);

  return memoryInfo;
}

// 内存清理函数
async function forceGarbageCollection(requestId) {
  if (global.gc) {
    console.log(`[${requestId}] 执行垃圾回收`);
    global.gc();
  } else {
    console.log(`[${requestId}] 垃圾回收不可用`);
  }
}

// 内存压力检测
function checkMemoryPressure(requestId, memoryLimit = 1024) {
  const usage = getMemoryUsage(requestId);
  const pressureThreshold = memoryLimit * 0.8; // 80% 阈值

  if (usage.rss > pressureThreshold) {
    console.log(`[${requestId}] ⚠️ 内存压力警告: ${usage.rss}MB/${memoryLimit}MB (${Math.round(usage.rss/memoryLimit*100)}%)`);
    return true;
  }

  return false;
}

// 重试函数
async function retryOperation(operation, maxRetries = 3, delay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      console.log(`操作失败，第 ${i + 1} 次重试:`, error.message);
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
}

// Hobby 计划专用：极简页面等待策略
async function waitForPageHobbyPlan(page, requestId, config, siteComplexity) {
  console.log(`[${requestId}] 开始 Hobby 计划页面等待策略`);

  try {
    // 根据网站复杂度调整等待策略
    if (siteComplexity.complexity === 'high') {
      console.log(`[${requestId}] 高复杂度网站，使用最小等待策略`);
      await waitForMinimalContent(page, requestId);
    } else if (siteComplexity.complexity === 'medium') {
      console.log(`[${requestId}] 中等复杂度网站，使用标准等待策略`);
      await waitForStandardContent(page, requestId);
    } else {
      console.log(`[${requestId}] 简单网站，使用完整等待策略`);
      await waitForFullContent(page, requestId);
    }

    return true;
  } catch (error) {
    console.log(`[${requestId}] 页面等待策略失败，继续执行: ${error.message}`);
    return false;
  }
}

// 最小内容等待（高复杂度网站）
async function waitForMinimalContent(page, requestId) {
  console.log(`[${requestId}] 最小内容等待策略`);

  // 只等待基本DOM加载
  await page.waitForFunction(() => {
    return document.readyState === 'interactive' || document.readyState === 'complete';
  }, { timeout: 5000 }).catch(() => {
    console.log(`[${requestId}] 基本DOM等待超时`);
  });

  // 短暂等待让页面稳定
  await page.waitForTimeout(1000);
}

// 标准内容等待（中等复杂度网站）
async function waitForStandardContent(page, requestId) {
  console.log(`[${requestId}] 标准内容等待策略`);

  // 等待DOM完全加载
  await page.waitForFunction(() => {
    return document.readyState === 'complete';
  }, { timeout: 8000 }).catch(() => {
    console.log(`[${requestId}] DOM完全加载等待超时`);
  });

  // 等待关键图片加载
  await page.waitForFunction(() => {
    const images = Array.from(document.images);
    const criticalImages = images.slice(0, 3); // 只等待前3张图片
    return criticalImages.length === 0 || criticalImages.every(img => img.complete);
  }, { timeout: 5000 }).catch(() => {
    console.log(`[${requestId}] 关键图片加载等待超时`);
  });

  // 适度等待时间
  await page.waitForTimeout(2000);
}

// 完整内容等待（简单网站）
async function waitForFullContent(page, requestId) {
  console.log(`[${requestId}] 完整内容等待策略`);

  // 等待DOM完全加载
  await page.waitForFunction(() => {
    return document.readyState === 'complete';
  }, { timeout: 10000 }).catch(() => {
    console.log(`[${requestId}] DOM完全加载等待超时`);
  });

  // 等待所有图片加载
  await page.waitForFunction(() => {
    const images = Array.from(document.images);
    return images.every(img => img.complete && img.naturalHeight !== 0);
  }, { timeout: 8000 }).catch(() => {
    console.log(`[${requestId}] 图片加载等待超时`);
  });

  // 完整等待时间
  await page.waitForTimeout(3000);
}

// 快速现代前端框架等待策略（60秒限制优化版本）
async function waitForModernFrameworkFast(page, requestId) {
  console.log(`[${requestId}] 开始快速现代前端框架检测`);

  // 检测框架类型
  const frameworkInfo = await page.evaluate(() => {
    const frameworks = {
      nextjs: !!(window.__NEXT_DATA__ || window.next || document.querySelector('#__next')),
      react: !!(window.React || document.querySelector('[data-reactroot]') || document.querySelector('#__next')),
      vue: !!(window.Vue || document.querySelector('[data-v-]')),
      angular: !!(window.ng || document.querySelector('[ng-version]'))
    };

    return {
      frameworks,
      hasFramework: Object.values(frameworks).some(Boolean),
      isNextJS: frameworks.nextjs,
      isReact: frameworks.react
    };
  });

  console.log(`[${requestId}] 快速框架检测结果:`, frameworkInfo);

  if (frameworkInfo.hasFramework) {
    console.log(`[${requestId}] 检测到现代前端框架，使用快速等待策略`);

    // 针对Next.js的快速处理
    if (frameworkInfo.isNextJS) {
      console.log(`[${requestId}] 检测到Next.js应用，使用快速等待策略`);
      await waitForNextJSHydrationFast(page, requestId);
    } else {
      console.log(`[${requestId}] 等待其他框架快速水合`);
      await page.waitForFunction(() => {
        return document.readyState === 'complete';
      }, { timeout: 10000 }).catch(() => {
        console.log(`[${requestId}] 快速水合等待超时`);
      });
    }

    // 快速等待动态内容
    await waitForDynamicContentFast(page, requestId);

    // 快速等待关键资源
    await waitForAssetsFast(page, requestId);

    return true;
  }

  return false;
}

// 快速Next.js水合等待
async function waitForNextJSHydrationFast(page, requestId) {
  console.log(`[${requestId}] 开始Next.js快速水合等待`);

  const currentUrl = await page.url();
  const isTargetSite = currentUrl.includes('islanddragon.cn');

  // 第一阶段：等待基础DOM结构（缩短时间）
  await page.waitForFunction(() => {
    return document.readyState === 'complete' &&
           document.querySelector('#__next') &&
           document.querySelector('#__next').children.length > 0;
  }, { timeout: 8000 }).catch(() => {
    console.log(`[${requestId}] Next.js DOM结构快速等待超时`);
  });

  // 第二阶段：快速水合检查
  await page.waitForFunction(() => {
    const hasLoadingStates = !!document.querySelector('[data-loading]') ||
                            !!document.querySelector('.loading') ||
                            !!document.querySelector('[aria-busy="true"]');

    const reactRoot = document.querySelector('#__next');
    const hasReactComponents = reactRoot && reactRoot.querySelector('[data-reactroot], [data-react-root]');

    return !hasLoadingStates && (hasReactComponents || !window.__NEXT_DATA__);
  }, { timeout: 12000 }).catch(() => {
    console.log(`[${requestId}] Next.js快速水合等待超时，继续执行`);
  });

  // 第三阶段：针对目标网站的快速等待
  if (isTargetSite) {
    console.log(`[${requestId}] 目标网站快速渲染等待`);

    await page.waitForFunction(() => {
      const hasLayout = document.querySelector('header, nav') &&
                       document.querySelector('main, [role="main"]') &&
                       document.querySelector('h1');

      const hasTailwindClasses = !!document.querySelector('[class*="bg-"], [class*="text-"]');

      return hasLayout && hasTailwindClasses;
    }, { timeout: 10000 }).catch(() => {
      console.log(`[${requestId}] 目标网站快速组件渲染等待超时`);
    });

    // 减少额外等待时间
    await page.waitForTimeout(2000);
  } else {
    await page.waitForTimeout(1500);
  }

  console.log(`[${requestId}] Next.js快速水合等待完成`);
}

// 快速动态内容等待
async function waitForDynamicContentFast(page, requestId) {
  console.log(`[${requestId}] 快速等待动态内容加载`);

  const currentUrl = await page.url();
  const isTargetSite = currentUrl.includes('islanddragon.cn');

  if (isTargetSite) {
    // 快速滚动策略
    await page.evaluate(async () => {
      const scrollHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      );

      const steps = 5; // 减少步骤
      const stepHeight = scrollHeight / steps;

      for (let i = 0; i <= steps; i++) {
        window.scrollTo(0, stepHeight * i);
        await new Promise(resolve => setTimeout(resolve, 100)); // 减少等待时间
      }

      window.scrollTo(0, 0);
    });

    await page.waitForTimeout(500);
  } else {
    await page.waitForTimeout(300);
  }
}

// 快速资源等待
async function waitForAssetsFast(page, requestId) {
  console.log(`[${requestId}] 快速等待关键资源`);

  await page.waitForFunction(() => {
    const images = Array.from(document.images);
    const criticalImages = images.slice(0, 5); // 只等待前5张图片
    return criticalImages.every(img => img.complete && img.naturalHeight !== 0);
  }, { timeout: 8000 }).catch(() => {
    console.log(`[${requestId}] 快速图片加载等待超时`);
  });
}

// 现代前端框架检测和等待策略
async function waitForModernFramework(page, requestId) {
  console.log(`[${requestId}] 开始现代前端框架检测`);

  // 检测框架类型和详细信息
  const frameworkInfo = await page.evaluate(() => {
    const frameworks = {
      nextjs: !!(window.__NEXT_DATA__ || window.next || document.querySelector('[data-nextjs-scroll-focus-boundary]') || document.querySelector('#__next')),
      react: !!(window.React || document.querySelector('[data-reactroot]') || document.querySelector('#__next') || document.querySelector('[data-react-root]')),
      vue: !!(window.Vue || document.querySelector('[data-v-]') || document.querySelector('[data-vue-]')),
      angular: !!(window.ng || document.querySelector('[ng-version]')),
      nuxt: !!(window.$nuxt || window.__NUXT__),
      gatsby: !!(window.___gatsby || window.___loader),
      svelte: !!(window.__SVELTE__ || document.querySelector('[data-svelte]'))
    };

    // 更精确的Next.js检测
    const isNextJS = frameworks.nextjs;
    const hasNextData = !!window.__NEXT_DATA__;
    const hasNextRouter = !!window.next;
    const hasNextRoot = !!document.querySelector('#__next');

    // 检测是否有水合需求
    const hasHydration = !!(
      (isNextJS && hasNextData) ||
      window.$nuxt ||
      window.___gatsby ||
      (window.__NEXT_DATA__ && window.__NEXT_DATA__.props)
    );

    return {
      frameworks,
      hasFramework: Object.values(frameworks).some(Boolean),
      isNextJS,
      isReact: frameworks.react,
      hasHydration,
      nextjsDetails: {
        hasNextData,
        hasNextRouter,
        hasNextRoot,
        dataKeys: hasNextData ? Object.keys(window.__NEXT_DATA__ || {}) : []
      }
    };
  });

  console.log(`[${requestId}] 框架检测结果:`, frameworkInfo);

  if (frameworkInfo.hasFramework) {
    console.log(`[${requestId}] 检测到现代前端框架，使用增强等待策略`);

    // 针对Next.js的特殊处理
    if (frameworkInfo.isNextJS) {
      console.log(`[${requestId}] 检测到Next.js应用，使用专门的等待策略`);
      await waitForNextJSHydration(page, requestId, frameworkInfo);
    } else if (frameworkInfo.hasHydration) {
      console.log(`[${requestId}] 等待其他框架水合完成`);
      await waitForGenericHydration(page, requestId);
    }

    // 等待动态内容加载
    await waitForDynamicContent(page, requestId);

    // 等待图片和字体加载
    await waitForAssets(page, requestId);

    // 等待动画完成
    await waitForAnimations(page, requestId);

    return true;
  }

  return false;
}

// 专门针对Next.js的水合等待
async function waitForNextJSHydration(page, requestId, frameworkInfo) {
  console.log(`[${requestId}] 开始Next.js水合等待，详情:`, frameworkInfo.nextjsDetails);

  // 获取当前URL以确定是否为目标网站
  const currentUrl = await page.url();
  const isTargetSite = currentUrl.includes('islanddragon.cn');

  // 第一阶段：等待基础DOM结构
  console.log(`[${requestId}] 第一阶段：等待Next.js DOM结构`);
  await page.waitForFunction(() => {
    return document.readyState === 'complete' &&
           document.querySelector('#__next') &&
           document.querySelector('#__next').children.length > 0;
  }, { timeout: 15000 }).catch(() => {
    console.log(`[${requestId}] Next.js DOM结构等待超时`);
  });

  // 第二阶段：等待React水合完成
  console.log(`[${requestId}] 第二阶段：等待React水合完成`);
  await page.waitForFunction(() => {
    // 检查是否有未水合的元素
    const hasUnhydratedElements = !!document.querySelector('[data-react-checksum]');

    // 检查Next.js路由是否就绪
    const hasNextRouter = window.next && window.next.router;

    // 检查是否有加载中的状态
    const hasLoadingStates = !!document.querySelector('[data-loading]') ||
                            !!document.querySelector('.loading') ||
                            !!document.querySelector('[aria-busy="true"]') ||
                            !!document.querySelector('[data-testid*="loading"]');

    // 检查React组件是否已挂载
    const reactRoot = document.querySelector('#__next');
    const hasReactComponents = reactRoot && reactRoot.querySelector('[data-reactroot], [data-react-root]');

    return !hasUnhydratedElements && !hasLoadingStates && (hasNextRouter || hasReactComponents || !window.__NEXT_DATA__);
  }, { timeout: 25000 }).catch(() => {
    console.log(`[${requestId}] Next.js水合等待超时，继续执行`);
  });

  // 第三阶段：针对目标网站的特殊等待
  if (isTargetSite) {
    console.log(`[${requestId}] 第三阶段：目标网站特殊渲染等待`);

    // 等待关键组件渲染完成
    await page.waitForFunction(() => {
      // 检查是否有Framer Motion组件
      const hasFramerMotion = !!document.querySelector('[data-framer-motion]') ||
                             !!document.querySelector('[style*="transform"]');

      // 检查是否有Tailwind CSS类应用
      const hasTailwindClasses = !!document.querySelector('[class*="bg-"], [class*="text-"], [class*="p-"], [class*="m-"]');

      // 检查是否有自定义组件
      const hasCustomComponents = !!document.querySelector('[data-component], [data-testid]');

      // 检查页面是否有基本的布局结构
      const hasLayout = document.querySelector('header, nav') &&
                       document.querySelector('main, [role="main"]') &&
                       document.querySelector('h1');

      return hasLayout && (hasTailwindClasses || hasCustomComponents || hasFramerMotion);
    }, { timeout: 20000 }).catch(() => {
      console.log(`[${requestId}] 目标网站组件渲染等待超时`);
    });

    // 额外等待时间确保所有样式和动画初始化完成
    await page.waitForTimeout(5000);
  } else {
    // 第三阶段：标准额外渲染时间
    console.log(`[${requestId}] 第三阶段：标准额外渲染等待`);
    await page.waitForTimeout(3000);
  }

  console.log(`[${requestId}] Next.js水合等待完成`);
}

// 通用框架水合等待
async function waitForGenericHydration(page, requestId) {
  await page.waitForFunction(() => {
    // Nuxt 水合检测
    if (window.$nuxt) {
      return window.$nuxt.$el && window.$nuxt.isHydrated !== false;
    }

    // Gatsby 水合检测
    if (window.___gatsby) {
      return window.___loader && window.___loader.pageReady;
    }

    return document.readyState === 'complete';
  }, { timeout: 15000 }).catch(() => {
    console.log(`[${requestId}] 通用水合等待超时，继续执行`);
  });
}

// 等待动态内容加载
async function waitForDynamicContent(page, requestId) {
  console.log(`[${requestId}] 等待动态内容加载`);

  // 获取当前URL以确定等待策略
  const currentUrl = await page.url();
  const isTargetSite = currentUrl.includes('islanddragon.cn');

  if (isTargetSite) {
    console.log(`[${requestId}] 检测到目标网站，使用增强的内容渲染等待策略`);

    // 等待关键内容元素完全渲染
    await waitForIslandDragonContent(page, requestId);

    // 增强的滚动策略触发懒加载
    await performEnhancedScrolling(page, requestId);

    // 等待CSS样式完全应用
    await waitForStylesApplied(page, requestId);

    // 最终的内容稳定性检查
    await waitForContentStability(page, requestId);

  } else {
    // 标准的动态内容等待策略
    await page.evaluate(async () => {
      const scrollHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      );

      const steps = 10;
      const stepHeight = scrollHeight / steps;

      for (let i = 0; i <= steps; i++) {
        window.scrollTo(0, stepHeight * i);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      window.scrollTo(0, 0);
    });

    await page.waitForTimeout(1000);
  }
}

// 专门等待islanddragon.cn的关键内容元素
async function waitForIslandDragonContent(page, requestId) {
  console.log(`[${requestId}] 等待islanddragon.cn关键内容元素`);

  await page.waitForFunction(() => {
    // 等待导航栏完全加载
    const navigation = document.querySelector('nav') ||
                      document.querySelector('header nav') ||
                      document.querySelector('[role="navigation"]');

    // 等待主要内容区域
    const mainContent = document.querySelector('main') ||
                       document.querySelector('[role="main"]') ||
                       document.querySelector('.main-content');

    // 等待hero区域（通常包含主要标题和介绍）
    const heroSection = document.querySelector('.hero') ||
                       document.querySelector('[data-hero]') ||
                       document.querySelector('section:first-of-type') ||
                       document.querySelector('h1').closest('section');

    // 等待页面标题
    const title = document.querySelector('h1');

    // 检查这些元素是否有实际内容（不是空的）
    const hasNavigationContent = navigation && navigation.children.length > 0;
    const hasMainContent = mainContent && mainContent.children.length > 0;
    const hasHeroContent = heroSection && heroSection.children.length > 0;
    const hasTitleContent = title && title.textContent.trim().length > 0;

    return hasNavigationContent && hasMainContent && hasHeroContent && hasTitleContent;
  }, { timeout: 20000 }).catch(() => {
    console.log(`[${requestId}] islanddragon.cn关键内容元素等待超时`);
  });
}

// 增强的滚动策略
async function performEnhancedScrolling(page, requestId) {
  console.log(`[${requestId}] 执行增强滚动策略`);

  await page.evaluate(async () => {
    // 获取页面真实高度
    const getPageHeight = () => Math.max(
      document.body.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.clientHeight,
      document.documentElement.scrollHeight,
      document.documentElement.offsetHeight
    );

    let previousHeight = 0;
    let currentHeight = getPageHeight();
    let attempts = 0;
    const maxAttempts = 5;

    // 循环滚动直到页面高度稳定
    while (currentHeight !== previousHeight && attempts < maxAttempts) {
      previousHeight = currentHeight;

      // 分段滚动
      const steps = 25;
      const stepHeight = currentHeight / steps;

      for (let i = 0; i <= steps; i++) {
        const scrollPosition = stepHeight * i;
        window.scrollTo(0, scrollPosition);

        // 等待更长时间让内容加载
        await new Promise(resolve => setTimeout(resolve, 400));

        // 触发各种可能的懒加载事件
        window.dispatchEvent(new Event('scroll'));
        window.dispatchEvent(new Event('resize'));
        window.dispatchEvent(new Event('load'));

        // 触发Intersection Observer
        if (window.IntersectionObserver) {
          const elements = document.querySelectorAll('[data-lazy], [loading="lazy"], img[src*="placeholder"]');
          elements.forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom > 0) {
              el.dispatchEvent(new Event('intersect'));
            }
          });
        }
      }

      // 重新计算页面高度
      await new Promise(resolve => setTimeout(resolve, 1000));
      currentHeight = getPageHeight();
      attempts++;
    }

    // 回到顶部
    window.scrollTo(0, 0);
    await new Promise(resolve => setTimeout(resolve, 1000));
  });
}

// 等待CSS样式完全应用
async function waitForStylesApplied(page, requestId) {
  console.log(`[${requestId}] 等待CSS样式完全应用`);

  await page.waitForFunction(() => {
    // 检查关键元素是否有正确的样式
    const checkElementStyles = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return true; // 如果元素不存在，认为已完成

      const styles = window.getComputedStyle(element);

      // 检查是否有基本的布局样式
      const hasLayout = styles.display !== 'none' &&
                       styles.visibility !== 'hidden' &&
                       styles.opacity !== '0';

      // 检查是否有尺寸
      const hasSize = element.offsetWidth > 0 && element.offsetHeight > 0;

      return hasLayout && hasSize;
    };

    // 检查关键元素的样式
    const navigationStyled = checkElementStyles('nav') || checkElementStyles('header nav');
    const mainContentStyled = checkElementStyles('main') || checkElementStyles('[role="main"]');
    const heroStyled = checkElementStyles('.hero') || checkElementStyles('h1').closest('section');

    // 检查是否有异常的空白（通过检查元素间距）
    const checkSpacing = () => {
      const nav = document.querySelector('nav') || document.querySelector('header nav');
      const hero = document.querySelector('.hero') || document.querySelector('h1').closest('section');

      if (nav && hero) {
        const navRect = nav.getBoundingClientRect();
        const heroRect = hero.getBoundingClientRect();

        // 检查导航和hero之间的间距是否合理（不超过200px）
        const spacing = heroRect.top - navRect.bottom;
        return spacing < 200;
      }

      return true;
    };

    return navigationStyled && mainContentStyled && heroStyled && checkSpacing();
  }, { timeout: 15000 }).catch(() => {
    console.log(`[${requestId}] CSS样式应用等待超时`);
  });
}

// 等待内容稳定性
async function waitForContentStability(page, requestId) {
  console.log(`[${requestId}] 等待内容稳定性`);

  // 等待页面高度稳定
  await page.waitForFunction(() => {
    return new Promise((resolve) => {
      let lastHeight = document.body.scrollHeight;
      let stableCount = 0;

      const checkStability = () => {
        const currentHeight = document.body.scrollHeight;
        if (currentHeight === lastHeight) {
          stableCount++;
          if (stableCount >= 3) { // 连续3次检查高度相同
            resolve(true);
            return;
          }
        } else {
          stableCount = 0;
          lastHeight = currentHeight;
        }

        setTimeout(checkStability, 500);
      };

      checkStability();

      // 最多等待10秒
      setTimeout(() => resolve(true), 10000);
    });
  }, { timeout: 15000 }).catch(() => {
    console.log(`[${requestId}] 内容稳定性等待超时`);
  });

  // 最终等待时间，确保所有渲染完成
  await page.waitForTimeout(2000);
}

// 等待资源加载
async function waitForAssets(page, requestId) {
  console.log(`[${requestId}] 等待图片和字体资源加载`);

  await page.waitForFunction(() => {
    // 检查图片加载
    const images = Array.from(document.images);
    const imagesLoaded = images.every(img => img.complete && img.naturalHeight !== 0);

    // 检查字体加载
    const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();

    return imagesLoaded && document.readyState === 'complete';
  }, { timeout: 20000 }).catch(() => {
    console.log(`[${requestId}] 资源加载等待超时，继续执行`);
  });

  // 额外等待字体渲染
  if (await page.evaluate(() => !!document.fonts)) {
    await page.evaluate(() => document.fonts.ready).catch(() => {});
  }
}

// 等待动画完成
async function waitForAnimations(page, requestId) {
  console.log(`[${requestId}] 等待动画完成`);

  // 获取当前URL以确定等待策略
  const currentUrl = await page.url();
  const isTargetSite = currentUrl.includes('islanddragon.cn');

  if (isTargetSite) {
    console.log(`[${requestId}] 使用目标网站增强动画等待策略`);
    await waitForIslandDragonAnimations(page, requestId);
  } else {
    // 标准动画等待
    await page.waitForFunction(() => {
      // 检查CSS动画
      const elements = document.querySelectorAll('*');
      let hasRunningAnimations = false;

      for (const el of elements) {
        const computedStyle = window.getComputedStyle(el);
        const animationName = computedStyle.animationName;
        const transitionProperty = computedStyle.transitionProperty;

        if (animationName !== 'none' || transitionProperty !== 'none') {
          // 检查动画是否还在运行
          const animations = el.getAnimations ? el.getAnimations() : [];
          if (animations.some(anim => anim.playState === 'running')) {
            hasRunningAnimations = true;
            break;
          }
        }
      }

      // 检查 Framer Motion 动画
      const framerMotionElements = document.querySelectorAll('[data-framer-motion]');
      const hasFramerAnimations = Array.from(framerMotionElements).some(el => {
        return el.style.transform && el.style.transform !== 'none';
      });

      return !hasRunningAnimations && !hasFramerAnimations;
    }, { timeout: 10000 }).catch(() => {
      console.log(`[${requestId}] 动画等待超时，继续执行`);
    });
  }
}

// 专门针对islanddragon.cn的动画等待
async function waitForIslandDragonAnimations(page, requestId) {
  console.log(`[${requestId}] 等待islanddragon.cn动画和过渡效果`);

  // 第一阶段：等待初始动画完成
  await page.waitForFunction(() => {
    // 检查页面加载动画
    const loadingAnimations = document.querySelectorAll('[class*="animate"], [class*="transition"]');
    let hasActiveAnimations = false;

    for (const el of loadingAnimations) {
      const animations = el.getAnimations ? el.getAnimations() : [];
      if (animations.some(anim => anim.playState === 'running')) {
        hasActiveAnimations = true;
        break;
      }
    }

    return !hasActiveAnimations;
  }, { timeout: 15000 }).catch(() => {
    console.log(`[${requestId}] 初始动画等待超时`);
  });

  // 第二阶段：等待Framer Motion动画稳定
  await page.waitForFunction(() => {
    // 检查Framer Motion元素
    const framerElements = document.querySelectorAll('[data-framer-motion], [style*="transform"]');
    let hasActiveFramerAnimations = false;

    for (const el of framerElements) {
      // 检查transform变化
      const style = window.getComputedStyle(el);
      const transform = style.transform;

      // 检查是否有正在进行的transform动画
      if (transform && transform !== 'none' && transform !== 'matrix(1, 0, 0, 1, 0, 0)') {
        const animations = el.getAnimations ? el.getAnimations() : [];
        if (animations.some(anim => anim.playState === 'running')) {
          hasActiveFramerAnimations = true;
          break;
        }
      }
    }

    return !hasActiveFramerAnimations;
  }, { timeout: 12000 }).catch(() => {
    console.log(`[${requestId}] Framer Motion动画等待超时`);
  });

  // 第三阶段：等待所有过渡效果完成
  await page.waitForFunction(() => {
    // 检查所有可能的过渡效果
    const allElements = document.querySelectorAll('*');
    let hasActiveTransitions = false;

    for (const el of allElements) {
      const style = window.getComputedStyle(el);

      // 检查CSS过渡
      if (style.transitionProperty !== 'none') {
        const animations = el.getAnimations ? el.getAnimations() : [];
        if (animations.some(anim => anim.playState === 'running')) {
          hasActiveTransitions = true;
          break;
        }
      }

      // 检查CSS动画
      if (style.animationName !== 'none') {
        const animations = el.getAnimations ? el.getAnimations() : [];
        if (animations.some(anim => anim.playState === 'running')) {
          hasActiveTransitions = true;
          break;
        }
      }
    }

    return !hasActiveTransitions;
  }, { timeout: 8000 }).catch(() => {
    console.log(`[${requestId}] 过渡效果等待超时`);
  });

  // 最终稳定等待
  console.log(`[${requestId}] 动画检测完成，等待最终稳定`);
  await page.waitForTimeout(2000);
}

// URL自动补全函数
function normalizeUrl(inputUrl) {
  if (!inputUrl || typeof inputUrl !== 'string') {
    return null;
  }

  let url = inputUrl.trim();

  // 如果没有协议，自动添加https://
  if (!url.match(/^https?:\/\//i)) {
    url = 'https://' + url;
  }

  try {
    // 验证URL格式
    const urlObj = new URL(url);
    return urlObj.href;
  } catch (e) {
    // 如果https失败，尝试http
    if (url.startsWith('https://')) {
      try {
        const httpUrl = url.replace('https://', 'http://');
        const urlObj = new URL(httpUrl);
        return urlObj.href;
      } catch (e2) {
        return null;
      }
    }
    return null;
  }
}

app.post('/api/screenshot', async (req, res) => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 11);

  console.log(`[${requestId}] 开始处理截图请求:`, req.body);

  const { url: inputUrl, device = 'desktop', quality = 'medium' } = req.body;

  // URL验证和自动补全
  if (!inputUrl || typeof inputUrl !== 'string') {
    console.log(`[${requestId}] URL验证失败: 缺少URL`);
    return res.status(400).json({ error: '请提供有效的URL' });
  }

  const url = normalizeUrl(inputUrl);
  if (!url) {
    console.log(`[${requestId}] URL格式化失败:`, inputUrl);
    return res.status(400).json({
      error: '无效的URL格式',
      tip: '请输入有效的网址，如：example.com 或 https://example.com'
    });
  }

  console.log(`[${requestId}] URL格式化: ${inputUrl} -> ${url}`);

  // 获取 Hobby 计划配置
  const config = getHobbyPlanConfig(url);
  const siteComplexity = detectSiteComplexity(url);
  console.log(`[${requestId}] 网站复杂度:`, siteComplexity);
  console.log(`[${requestId}] Hobby 计划配置:`, config);

  // 设置总体执行时间限制
  const executionTimer = setTimeout(() => {
    console.log(`[${requestId}] 执行时间超限，强制终止`);
    if (browser) {
      browser.close().catch(() => {});
    }
  }, config.maxExecutionTime);

  // 验证设备类型
  if (!deviceProfiles[device]) {
    console.log(`[${requestId}] 设备类型验证失败:`, device);
    clearTimeout(executionTimer);
    return res.status(400).json({ error: '无效的设备类型' });
  }

  // 验证质量设置
  if (!qualitySettings[quality]) {
    console.log(`[${requestId}] 质量设置验证失败:`, quality);
    clearTimeout(executionTimer);
    return res.status(400).json({ error: '无效的质量设置' });
  }

  let browser;

  try {
    // 初始内存监控
    console.log(`[${requestId}] 开始处理，初始内存状态:`);
    getMemoryUsage(requestId);

    console.log(`[${requestId}] 开始获取浏览器路径`);
    const executablePath = await getExecutablePath();
    console.log(`[${requestId}] 使用浏览器路径:`, executablePath);

    // 使用 Hobby 计划的激进内存优化配置
    const browserArgs = getMemoryOptimizedBrowserArgs(config.memory.optimization);

    console.log(`[${requestId}] 内存优化策略: ${config.memory.optimization}, 内存限制: ${config.memory.limit}MB`);

    // Vercel 环境特殊配置
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      browserArgs.push(...chromium.args);
      browserArgs.push('--disable-setuid-sandbox');

      // Hobby 计划使用单进程模式以节省内存
      console.log(`[${requestId}] 使用单进程模式以节省内存 (Hobby 计划优化)`);
      // 单进程模式已在 getMemoryOptimizedBrowserArgs 中添加
    } else {
      // 本地环境可以使用多进程提高性能
      browserArgs.push('--disable-setuid-sandbox');
    }

    console.log(`[${requestId}] 启动浏览器，参数:`, browserArgs.slice(0, 5).join(', '), '...');

    // 使用重试机制启动浏览器
    browser = await retryOperation(async () => {
      return await puppeteer.launch({
        args: browserArgs,
        executablePath: executablePath,
        headless: process.env.VERCEL ? chromium.headless : true,
        ignoreHTTPSErrors: true,
        timeout: 30000 // 30秒超时
      });
    }, 3, 2000);

    console.log(`[${requestId}] 浏览器启动成功`);

    // 浏览器启动后内存监控
    console.log(`[${requestId}] 浏览器启动后内存状态:`);
    getMemoryUsage(requestId);

    console.log(`[${requestId}] 创建新页面`);
    const page = await browser.newPage();

    // 设置现代浏览器用户代理
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // 设置页面配置以支持现代前端应用
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    });

    // 启用JavaScript和现代Web特性
    await page.setJavaScriptEnabled(true);

    // 设置缓存策略
    await page.setCacheEnabled(true);

    // 设置设备尺寸
    console.log(`[${requestId}] 设置视口尺寸:`, deviceProfiles[device]);
    await page.setViewport({
      width: deviceProfiles[device].width,
      height: deviceProfiles[device].height,
      deviceScaleFactor: 1,
      hasTouch: device === 'mobile',
      isMobile: device === 'mobile'
    });

    // 导航到目标URL - 针对现代前端应用优化
    console.log(`[${requestId}] 开始导航到URL:`, url);

    // 设置请求拦截以优化加载速度
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      const url = req.url();

      // 阻止不必要的资源加载以提升速度
      if (resourceType === 'font' && !url.includes('google') && !url.includes('typekit')) {
        req.abort();
      } else if (resourceType === 'media' && url.includes('.mp4')) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // 使用 Hobby 计划的保守导航配置
    console.log(`[${requestId}] 使用导航超时: ${config.navigationTimeout}ms, 重试次数: ${config.retries}`);

    // 设置请求拦截以优化加载速度和减少内存使用
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      const reqUrl = req.url();

      // Hobby 计划的激进资源过滤
      if (siteComplexity.complexity === 'high') {
        // 高复杂度网站：只加载必要资源
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
      } else if (siteComplexity.complexity === 'medium') {
        // 中等复杂度：过滤部分资源
        if (resourceType === 'media' ||
            reqUrl.includes('.mp4') ||
            reqUrl.includes('analytics')) {
          req.abort();
          return;
        }
      }

      req.continue();
    });

    await retryOperation(async () => {
      await page.goto(url, {
        waitUntil: ['domcontentloaded'], // 只等待DOM加载，不等待网络空闲
        timeout: config.navigationTimeout
      });
    }, config.retries, 2000);

    console.log(`[${requestId}] 页面初始加载完成，开始 Hobby 计划等待策略`);

    // 使用 Hobby 计划专用的简化等待策略
    const pageWaitSuccess = await waitForPageHobbyPlan(page, requestId, config, siteComplexity);

    if (!pageWaitSuccess) {
      console.log(`[${requestId}] 页面等待策略失败，使用最小等待时间`);
      await page.waitForTimeout(1000);
    }

    console.log(`[${requestId}] 页面完全加载完成`);

    // 页面加载后内存监控
    console.log(`[${requestId}] 页面加载后内存状态:`);
    getMemoryUsage(requestId);

    // 检查内存压力
    if (checkMemoryPressure(requestId, config.memory.limit)) {
      console.log(`[${requestId}] 检测到内存压力，尝试清理`);
      await forceGarbageCollection(requestId);
    }

    // 获取页面真实高度 - 针对现代前端应用优化
    console.log(`[${requestId}] 获取页面高度`);
    const pageMetrics = await page.evaluate(() => {
      // 强制重新计算布局
      document.body.offsetHeight;

      const bodyHeight = Math.max(
        document.body.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.clientHeight,
        document.documentElement.scrollHeight,
        document.documentElement.offsetHeight
      );

      // 检查是否有固定定位的元素影响高度
      const fixedElements = Array.from(document.querySelectorAll('*')).filter(el => {
        const style = window.getComputedStyle(el);
        return style.position === 'fixed' || style.position === 'sticky';
      });

      return {
        height: bodyHeight,
        hasFixedElements: fixedElements.length > 0,
        viewportHeight: window.innerHeight,
        scrollHeight: document.documentElement.scrollHeight
      };
    });

    console.log(`[${requestId}] 页面尺寸信息:`, pageMetrics);

    // 智能设置视口高度
    const optimalHeight = Math.min(
      Math.max(pageMetrics.height, pageMetrics.viewportHeight),
      32767 // 限制最大高度避免内存问题
    );

    await page.setViewport({
      width: deviceProfiles[device].width,
      height: optimalHeight,
      deviceScaleFactor: 1,
      hasTouch: device === 'mobile',
      isMobile: device === 'mobile'
    });

    // 最后一次等待确保所有内容渲染完成
    await page.waitForTimeout(1000);

    // 截图前内存监控
    console.log(`[${requestId}] 截图前内存状态:`);
    getMemoryUsage(requestId);

    // Hobby 计划专用截图配置 - 优先可靠性
    console.log(`[${requestId}] 开始截图，质量:`, quality, `复杂度:`, siteComplexity.complexity);

    const screenshotOptions = {
      type: 'jpeg',
      quality: qualitySettings[quality],
      fullPage: true,
      optimizeForSpeed: true, // Hobby 计划始终启用速度优化
      captureBeyondViewport: false, // 禁用视口外捕获以节省内存
      clip: null
    };

    // 根据网站复杂度调整截图策略
    if (siteComplexity.complexity === 'high') {
      // 高复杂度网站：降低质量以确保成功
      screenshotOptions.quality = Math.min(screenshotOptions.quality, 60);
      console.log(`[${requestId}] 高复杂度网站，降低截图质量到 ${screenshotOptions.quality}`);
    }

    console.log(`[${requestId}] 使用 Hobby 计划优化的截图参数:`, screenshotOptions);

    const screenshot = await page.screenshot(screenshotOptions);

    console.log(`[${requestId}] 截图完成，大小:`, Math.round(screenshot.length / 1024), 'KB');

    // 截图后内存监控
    console.log(`[${requestId}] 截图后内存状态:`);
    getMemoryUsage(requestId);

    // 将截图转换为Base64
    const base64Image = screenshot.toString('base64');
    const dataURI = `data:image/jpeg;base64,${base64Image}`;

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`[${requestId}] 请求处理完成，耗时:`, duration, 'ms');

    // 清除执行时间限制器
    clearTimeout(executionTimer);

    // 返回结果
    res.json({
      success: true,
      image: dataURI,
      device,
      quality,
      dimensions: {
        width: deviceProfiles[device].width,
        height: pageMetrics.height
      },
      metadata: {
        requestId,
        duration,
        timestamp: new Date().toISOString(),
        plan: 'hobby',
        siteComplexity: siteComplexity.complexity,
        pageMetrics: {
          actualHeight: pageMetrics.height,
          viewportHeight: pageMetrics.viewportHeight,
          hasFixedElements: pageMetrics.hasFixedElements
        },
        performance: {
          screenshotSize: Math.round(screenshot.length / 1024) + 'KB',
          loadingStrategy: 'hobby-optimized',
          memoryOptimization: 'aggressive'
        },
        hobbyPlanOptimizations: {
          resourceFiltering: siteComplexity.complexity === 'high',
          qualityReduction: siteComplexity.complexity === 'high',
          speedOptimization: true
        }
      }
    });

  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    // 清除执行时间限制器
    clearTimeout(executionTimer);

    console.error(`[${requestId}] 截图生成错误 (耗时: ${duration}ms):`, error);
    console.error(`[${requestId}] 错误堆栈:`, error.stack);

    // Hobby 计划专用错误处理和诊断
    let errorMessage = '截图生成失败';
    let errorTip = '请检查网络连接和URL是否正确';
    let errorCategory = 'unknown';

    // 详细的错误分类和处理
    if (error.message.includes('timeout') || error.message.includes('Timeout')) {
      errorCategory = 'timeout';
      errorMessage = '页面加载超时';
      if (duration >= config.maxExecutionTime - 5000) {
        errorTip = `Hobby 计划限制执行时间为 ${Math.round(config.maxExecutionTime/1000)} 秒。该网站可能过于复杂，建议：1) 稍后重试 2) 升级到 Pro 计划获得更长执行时间`;
      } else {
        errorTip = '目标网页响应较慢。建议：1) 检查网址是否正确 2) 稍后重试 3) 该网站可能不适合在免费计划下截图';
      }
    } else if (error.message.includes('net::ERR_') || error.message.includes('Navigation failed')) {
      errorCategory = 'network';
      errorMessage = '无法访问目标网页';
      errorTip = '网络连接问题。请检查：1) 网址是否正确 2) 网站是否可访问 3) 是否存在地域限制';
    } else if (error.message.includes('Protocol error') || error.message.includes('Target closed')) {
      errorCategory = 'browser';
      errorMessage = '浏览器连接异常';
      errorTip = 'Hobby 计划内存限制可能导致浏览器异常。建议：1) 稍后重试 2) 尝试更简单的网站 3) 升级到 Pro 计划';
    } else if (error.message.includes('Memory') || error.message.includes('memory')) {
      errorCategory = 'memory';
      errorMessage = '内存不足';
      errorTip = 'Hobby 计划内存限制 (1024MB) 不足以处理该网站。建议：1) 升级到 Pro 计划 (3008MB) 2) 尝试更简单的网站';
    } else if (error.message.includes('无法获取浏览器路径')) {
      errorCategory = 'system';
      errorMessage = '浏览器初始化失败';
      errorTip = '服务器配置问题，请联系管理员';
    } else if (error.message.includes('Cannot read properties of null')) {
      errorCategory = 'page_error';
      errorMessage = '页面脚本错误';
      errorTip = '目标网站存在脚本错误。这在复杂网站中很常见，Hobby 计划已尽力处理，建议升级到 Pro 计划获得更好的兼容性';
    }

    res.status(500).json({
      error: errorMessage,
      details: error.message,
      tip: errorTip,
      requestId,
      duration,
      errorCategory,
      siteComplexity: siteComplexity?.complexity || 'unknown',
      planInfo: {
        currentPlan: 'hobby',
        maxExecutionTime: Math.round(config.maxExecutionTime/1000) + 's',
        memoryLimit: config.memory.limit + 'MB',
        upgradeUrl: 'https://vercel.com/pricing'
      },
      debugging: {
        url: url,
        userAgent: 'Chrome/120.0.0.0',
        memoryOptimization: 'aggressive',
        resourceFiltering: siteComplexity?.complexity === 'high',
        errorStack: error.stack?.split('\n').slice(0, 5) // 只返回前5行堆栈
      }
    });
  } finally {
    if (browser) {
      try {
        console.log(`[${requestId}] 关闭浏览器`);
        await browser.close();
      } catch (closeError) {
        console.error(`[${requestId}] 关闭浏览器失败:`, closeError);
      }
    }
  }
});

// 启动服务器
app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
});

module.exports = app; // 为了Vercel Lambda函数