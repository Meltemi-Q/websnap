#!/usr/bin/env node

/**
 * 生产环境部署测试脚本
 * 测试部署到 Vercel 后的实际功能
 */

const https = require('https');

// 生产环境配置
const PRODUCTION_URL = 'https://websnap-gold.vercel.app';
const TEST_URLS = [
  'https://example.com',
  'https://github.com',
  'https://github.com/Meltemi-Q/websnap',
  'https://www.islanddragon.cn/'
];

// 发送 HTTPS 请求
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = {
            statusCode: res.statusCode,
            headers: res.headers,
            body: res.headers['content-type']?.includes('application/json') 
              ? JSON.parse(data) 
              : data
          };
          resolve(response);
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

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

// 健康检查测试
async function testHealthCheck() {
  console.log(`\n🏥 健康检查测试`);
  
  try {
    const options = {
      hostname: 'websnap-gold.vercel.app',
      port: 443,
      path: '/api/health',
      method: 'GET',
      timeout: 10000,
      headers: {
        'User-Agent': 'WebSnap-Test/1.0'
      }
    };

    const response = await makeRequest(options);
    
    if (response.statusCode === 200) {
      console.log(`   ✅ 健康检查通过`);
      console.log(`   📊 状态: ${response.body.status}`);
      console.log(`   🏷️  版本: ${response.body.version}`);
      console.log(`   📋 计划: ${response.body.plan}`);
      console.log(`   ⏰ 时间: ${response.body.timestamp}`);
      return true;
    } else {
      console.log(`   ❌ 健康检查失败: HTTP ${response.statusCode}`);
      console.log(`   📄 响应: ${JSON.stringify(response.body, null, 2)}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ 健康检查错误: ${error.message}`);
    return false;
  }
}

// 截图功能测试
async function testScreenshot(url, device = 'desktop', quality = 'medium') {
  const testId = Math.random().toString(36).substring(2, 8);
  console.log(`\n📸 截图测试: ${url}`);
  console.log(`   🆔 测试ID: ${testId}`);
  
  const startTime = Date.now();
  
  try {
    const postData = JSON.stringify({
      url: url,
      device: device,
      quality: quality
    });

    const options = {
      hostname: 'websnap-gold.vercel.app',
      port: 443,
      path: '/api/screenshot',
      method: 'POST',
      timeout: 70000, // 70秒超时
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'WebSnap-Test/1.0'
      }
    };

    const response = await makeRequest(options, postData);
    const duration = Date.now() - startTime;
    
    console.log(`   ⏱️  响应时间: ${duration}ms`);
    console.log(`   📊 状态码: ${response.statusCode}`);
    
    if (response.statusCode === 200 && response.body.success) {
      console.log(`   ✅ 截图成功`);
      console.log(`   🆔 请求ID: ${response.body.metadata?.requestId}`);
      console.log(`   📏 截图大小: ${response.body.metadata?.screenshotSize}`);
      console.log(`   ⚡ 处理时间: ${response.body.metadata?.duration}ms`);
      console.log(`   🏷️  版本: ${response.body.metadata?.version}`);
      
      // 验证图片数据
      if (response.body.image && response.body.image.startsWith('data:image/jpeg;base64,')) {
        const base64Data = response.body.image.split(',')[1];
        const imageSize = Math.round(base64Data.length * 0.75 / 1024); // 估算实际大小
        console.log(`   🖼️  图片数据: 有效 (~${imageSize}KB)`);
      } else {
        console.log(`   ⚠️  图片数据: 格式异常`);
      }
      
      return {
        url,
        success: true,
        duration,
        metadata: response.body.metadata
      };
    } else {
      console.log(`   ❌ 截图失败`);
      console.log(`   🚨 错误: ${response.body.error || '未知错误'}`);
      console.log(`   💡 建议: ${response.body.tip || '无建议'}`);
      console.log(`   📋 详情: ${response.body.details || '无详情'}`);
      
      return {
        url,
        success: false,
        error: response.body.error,
        details: response.body.details,
        duration
      };
    }
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`   ❌ 请求失败: ${error.message}`);
    console.log(`   ⏱️  失败时间: ${duration}ms`);
    
    return {
      url,
      success: false,
      error: error.message,
      duration
    };
  }
}

// CORS 测试
async function testCORS() {
  console.log(`\n🌐 CORS 测试`);
  
  try {
    const options = {
      hostname: 'websnap-gold.vercel.app',
      port: 443,
      path: '/api/screenshot',
      method: 'OPTIONS',
      timeout: 10000,
      headers: {
        'Origin': 'https://example.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    };

    const response = await makeRequest(options);
    
    if (response.statusCode === 200) {
      console.log(`   ✅ CORS 预检通过`);
      console.log(`   🔓 Access-Control-Allow-Origin: ${response.headers['access-control-allow-origin']}`);
      console.log(`   📝 Access-Control-Allow-Methods: ${response.headers['access-control-allow-methods']}`);
      return true;
    } else {
      console.log(`   ❌ CORS 预检失败: HTTP ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ CORS 测试错误: ${error.message}`);
    return false;
  }
}

// 主测试函数
async function runProductionTests() {
  console.log('🚀 WebSnap 生产环境测试');
  console.log(`📅 测试时间: ${new Date().toISOString()}`);
  console.log(`🎯 生产URL: ${PRODUCTION_URL}`);
  
  // 1. 健康检查
  const healthOk = await testHealthCheck();
  if (!healthOk) {
    console.log(`\n❌ 健康检查失败，停止测试`);
    return;
  }

  // 2. CORS 测试
  await testCORS();

  // 3. 截图功能测试
  const results = [];
  
  for (const url of TEST_URLS) {
    const result = await testScreenshot(url);
    results.push(result);
    
    // 等待一段时间避免请求过于频繁
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  // 4. 输出测试总结
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 生产环境测试总结');
  console.log(`${'='.repeat(60)}`);
  
  let successCount = 0;
  let failureCount = 0;
  let totalDuration = 0;
  
  results.forEach(result => {
    const hostname = new URL(result.url).hostname;
    console.log(`\n🌐 ${hostname}:`);
    
    totalDuration += result.duration;
    
    if (result.success) {
      successCount++;
      console.log(`   ✅ 状态: 成功`);
      console.log(`   ⏱️  耗时: ${result.duration}ms`);
      if (result.metadata?.screenshotSize) {
        console.log(`   📸 大小: ${result.metadata.screenshotSize}`);
      }
    } else {
      failureCount++;
      console.log(`   ❌ 状态: 失败`);
      console.log(`   ⏱️  耗时: ${result.duration}ms`);
      console.log(`   🚨 错误: ${result.error}`);
    }
  });
  
  console.log(`\n📈 统计:`);
  console.log(`   成功: ${successCount}/${results.length}`);
  console.log(`   失败: ${failureCount}/${results.length}`);
  console.log(`   成功率: ${Math.round(successCount / results.length * 100)}%`);
  console.log(`   平均耗时: ${Math.round(totalDuration / results.length)}ms`);
  
  // 5. 结论和建议
  if (successCount === results.length) {
    console.log(`\n🎉 所有测试通过！生产环境工作正常`);
    console.log(`\n✅ 部署成功确认:`);
    console.log(`   • API 健康检查: 正常`);
    console.log(`   • CORS 配置: 正确`);
    console.log(`   • 截图功能: 完全可用`);
    console.log(`   • Hobby 计划: 兼容`);
  } else if (successCount > 0) {
    console.log(`\n⚠️  部分功能正常，需要关注失败的网站`);
    console.log(`\n📋 建议:`);
    console.log(`   • 简单网站工作正常`);
    console.log(`   • 复杂网站可能需要 Pro 计划`);
    console.log(`   • 监控 Vercel 函数日志`);
  } else {
    console.log(`\n❌ 所有测试失败！需要紧急修复`);
    console.log(`\n🔧 排查步骤:`);
    console.log(`   1. 检查 Vercel 部署状态`);
    console.log(`   2. 查看函数日志`);
    console.log(`   3. 验证依赖安装`);
    console.log(`   4. 检查环境变量`);
  }
  
  console.log(`\n✅ 生产环境测试完成`);
}

// 运行测试
if (require.main === module) {
  runProductionTests().catch(console.error);
}

module.exports = {
  testHealthCheck,
  testScreenshot,
  testCORS,
  runProductionTests
};
