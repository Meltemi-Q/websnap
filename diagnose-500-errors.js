#!/usr/bin/env node

/**
 * 500 错误诊断脚本
 * 专门诊断 islanddragon.cn 和 qq.com 的问题
 */

const https = require('https');
const http = require('http');

// 问题 URL
const PROBLEM_URLS = [
  'https://www.islanddragon.cn/',
  'https://kf.qq.com/faq/180725biaAn2180725VnQjYF.html'
];

// 测试 API 端点
const API_ENDPOINT = 'https://websnap-gold.vercel.app/api/screenshot';

// 发送截图请求
function sendScreenshotRequest(url) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      url: url,
      device: 'desktop',
      quality: 'medium'
    });

    const options = {
      hostname: 'websnap-gold.vercel.app',
      port: 443,
      path: '/api/screenshot',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 60000 // 60秒超时
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: response
          });
        } catch (parseError) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
            parseError: parseError.message
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(postData);
    req.end();
  });
}

// 检查网站可访问性
function checkSiteAccessibility(url) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'HEAD',
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };

    const req = client.request(options, (res) => {
      resolve({
        accessible: true,
        statusCode: res.statusCode,
        headers: res.headers
      });
    });

    req.on('error', (error) => {
      resolve({
        accessible: false,
        error: error.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        accessible: false,
        error: 'Timeout'
      });
    });

    req.end();
  });
}

// 诊断单个 URL
async function diagnoseUrl(url) {
  console.log(`\n🔍 诊断 URL: ${url}`);
  console.log(`${'='.repeat(50)}`);
  
  // 1. 检查网站可访问性
  console.log('1️⃣ 检查网站可访问性...');
  const accessibility = await checkSiteAccessibility(url);
  
  if (accessibility.accessible) {
    console.log(`   ✅ 网站可访问 (状态码: ${accessibility.statusCode})`);
    
    // 检查重定向
    if (accessibility.statusCode >= 300 && accessibility.statusCode < 400) {
      console.log(`   🔄 检测到重定向: ${accessibility.headers.location}`);
    }
    
    // 检查内容类型
    if (accessibility.headers['content-type']) {
      console.log(`   📄 内容类型: ${accessibility.headers['content-type']}`);
    }
  } else {
    console.log(`   ❌ 网站不可访问: ${accessibility.error}`);
    return {
      url,
      accessible: false,
      error: accessibility.error
    };
  }
  
  // 2. 发送截图请求
  console.log('\n2️⃣ 发送截图请求...');
  const startTime = Date.now();
  
  try {
    const response = await sendScreenshotRequest(url);
    const duration = Date.now() - startTime;
    
    console.log(`   ⏱️  请求耗时: ${duration}ms`);
    console.log(`   📊 响应状态: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      console.log(`   ✅ 截图成功`);
      
      if (response.body.metadata) {
        console.log(`   📈 元数据:`);
        console.log(`      请求ID: ${response.body.metadata.requestId}`);
        console.log(`      执行时间: ${response.body.metadata.duration}ms`);
        console.log(`      网站复杂度: ${response.body.metadata.siteComplexity || '未知'}`);
        console.log(`      截图大小: ${response.body.metadata.performance?.screenshotSize || '未知'}`);
      }
      
      return {
        url,
        success: true,
        duration,
        metadata: response.body.metadata
      };
      
    } else if (response.statusCode === 500) {
      console.log(`   ❌ 服务器错误 (500)`);
      
      if (response.body.error) {
        console.log(`   🚨 错误信息: ${response.body.error}`);
        console.log(`   💡 建议: ${response.body.tip}`);
        
        if (response.body.errorCategory) {
          console.log(`   🏷️  错误类型: ${response.body.errorCategory}`);
        }
        
        if (response.body.debugging) {
          console.log(`   🔧 调试信息:`);
          console.log(`      内存优化: ${response.body.debugging.memoryOptimization}`);
          console.log(`      资源过滤: ${response.body.debugging.resourceFiltering}`);
          
          if (response.body.debugging.errorStack) {
            console.log(`   📚 错误堆栈:`);
            response.body.debugging.errorStack.forEach((line, index) => {
              console.log(`      ${index + 1}. ${line}`);
            });
          }
        }
      }
      
      return {
        url,
        success: false,
        error: response.body,
        duration
      };
      
    } else {
      console.log(`   ⚠️  意外状态码: ${response.statusCode}`);
      console.log(`   📄 响应内容: ${JSON.stringify(response.body, null, 2)}`);
      
      return {
        url,
        success: false,
        statusCode: response.statusCode,
        response: response.body,
        duration
      };
    }
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`   ❌ 请求失败: ${error.message}`);
    console.log(`   ⏱️  失败耗时: ${duration}ms`);
    
    return {
      url,
      success: false,
      requestError: error.message,
      duration
    };
  }
}

// 主诊断函数
async function runDiagnosis() {
  console.log('🩺 WebSnap 500 错误诊断工具');
  console.log(`📅 诊断时间: ${new Date().toISOString()}`);
  console.log(`🎯 API 端点: ${API_ENDPOINT}`);
  
  const results = [];
  
  for (const url of PROBLEM_URLS) {
    const result = await diagnoseUrl(url);
    results.push(result);
    
    // 等待一段时间避免请求过于频繁
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // 输出诊断总结
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 诊断总结');
  console.log(`${'='.repeat(60)}`);
  
  let successCount = 0;
  let errorCount = 0;
  
  results.forEach(result => {
    const hostname = new URL(result.url).hostname;
    console.log(`\n🌐 ${hostname}:`);
    
    if (result.success) {
      successCount++;
      console.log(`   ✅ 状态: 成功`);
      console.log(`   ⏱️  耗时: ${result.duration}ms`);
      if (result.metadata?.siteComplexity) {
        console.log(`   🧩 复杂度: ${result.metadata.siteComplexity}`);
      }
    } else {
      errorCount++;
      console.log(`   ❌ 状态: 失败`);
      console.log(`   ⏱️  耗时: ${result.duration}ms`);
      
      if (result.error?.errorCategory) {
        console.log(`   🏷️  错误类型: ${result.error.errorCategory}`);
      }
      
      if (result.error?.error) {
        console.log(`   🚨 错误: ${result.error.error}`);
      }
      
      if (result.requestError) {
        console.log(`   🌐 请求错误: ${result.requestError}`);
      }
    }
  });
  
  console.log(`\n📈 统计:`);
  console.log(`   成功: ${successCount}/${results.length}`);
  console.log(`   失败: ${errorCount}/${results.length}`);
  console.log(`   成功率: ${Math.round(successCount / results.length * 100)}%`);
  
  // 建议
  console.log(`\n💡 建议:`);
  if (errorCount > 0) {
    console.log(`   1. 检查 Vercel 函数日志以获取更多详细信息`);
    console.log(`   2. 考虑升级到 Pro 计划以获得更多资源`);
    console.log(`   3. 对于复杂网站，可能需要特殊处理`);
    console.log(`   4. 检查网站是否有反爬虫机制`);
  } else {
    console.log(`   ✅ 所有测试都通过了！`);
  }
  
  console.log(`\n✅ 诊断完成`);
}

// 运行诊断
if (require.main === module) {
  runDiagnosis().catch(console.error);
}

module.exports = {
  diagnoseUrl,
  sendScreenshotRequest,
  checkSiteAccessibility
};
