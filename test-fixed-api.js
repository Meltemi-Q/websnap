#!/usr/bin/env node

/**
 * 测试修复版本的 API
 * 验证根因修复是否有效
 */

const http = require('http');

// 测试 URL 列表
const TEST_URLS = [
  'https://example.com',           // 简单网站
  'https://github.com',            // 中等复杂度
  'https://github.com/Meltemi-Q/websnap', // 具体测试页面
  'https://www.islanddragon.cn/'   // 复杂网站
];

// 模拟 Vercel 环境变量
process.env.VERCEL = '1';

// 导入修复版本的 API
const screenshotApi = require('./api/screenshot-fixed.js');

// 创建模拟的 HTTP 服务器来测试 API
function createTestServer() {
  return http.createServer(async (req, res) => {
    // 解析请求体
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      
      req.on('end', async () => {
        try {
          req.body = JSON.parse(body);
        } catch (e) {
          req.body = {};
        }
        
        // 调用 API 函数
        await screenshotApi(req, res);
      });
    } else {
      // GET 请求
      req.body = {};
      await screenshotApi(req, res);
    }
  });
}

// 发送测试请求
function sendTestRequest(url, device = 'desktop', quality = 'medium') {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      url: url,
      device: device,
      quality: quality
    });

    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/screenshot',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 70000 // 70秒超时
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            body: response
          });
        } catch (parseError) {
          resolve({
            statusCode: res.statusCode,
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

// 测试单个 URL
async function testSingleUrl(url) {
  const testId = Math.random().toString(36).substring(2, 8);
  console.log(`\n🧪 测试 URL: ${url}`);
  console.log(`📊 测试 ID: ${testId}`);
  
  const startTime = Date.now();
  
  try {
    const response = await sendTestRequest(url);
    const duration = Date.now() - startTime;
    
    console.log(`⏱️  响应时间: ${duration}ms`);
    console.log(`📊 状态码: ${response.statusCode}`);
    
    if (response.statusCode === 200 && response.body.success) {
      console.log(`✅ 测试成功`);
      console.log(`   请求ID: ${response.body.metadata?.requestId}`);
      console.log(`   截图大小: ${response.body.metadata?.screenshotSize}`);
      console.log(`   处理时间: ${response.body.metadata?.duration}ms`);
      
      return {
        url,
        success: true,
        duration,
        metadata: response.body.metadata
      };
    } else {
      console.log(`❌ 测试失败`);
      console.log(`   错误: ${response.body.error || '未知错误'}`);
      console.log(`   详情: ${response.body.details || '无详情'}`);
      console.log(`   建议: ${response.body.tip || '无建议'}`);
      
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
    console.log(`❌ 请求失败: ${error.message}`);
    console.log(`⏱️  失败时间: ${duration}ms`);
    
    return {
      url,
      success: false,
      error: error.message,
      duration
    };
  }
}

// 健康检查测试
async function testHealthCheck() {
  console.log(`\n🏥 健康检查测试`);
  
  try {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/health',
      method: 'GET',
      timeout: 5000
    };

    const response = await new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            resolve({
              statusCode: res.statusCode,
              body: JSON.parse(data)
            });
          } catch (e) {
            resolve({
              statusCode: res.statusCode,
              body: data
            });
          }
        });
      });
      
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Health check timeout'));
      });
      
      req.end();
    });

    if (response.statusCode === 200) {
      console.log(`✅ 健康检查通过`);
      console.log(`   状态: ${response.body.status}`);
      console.log(`   版本: ${response.body.version}`);
      console.log(`   计划: ${response.body.plan}`);
      return true;
    } else {
      console.log(`❌ 健康检查失败: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ 健康检查错误: ${error.message}`);
    return false;
  }
}

// 主测试函数
async function runTests() {
  console.log('🔧 WebSnap 修复版本测试');
  console.log(`📅 测试时间: ${new Date().toISOString()}`);
  console.log(`🎯 测试版本: fixed`);
  
  // 启动测试服务器
  const server = createTestServer();
  
  await new Promise((resolve) => {
    server.listen(3001, () => {
      console.log(`🚀 测试服务器启动在 http://localhost:3001`);
      resolve();
    });
  });

  try {
    // 健康检查
    const healthOk = await testHealthCheck();
    if (!healthOk) {
      console.log(`\n❌ 健康检查失败，停止测试`);
      return;
    }

    // 测试所有 URL
    const results = [];
    
    for (const url of TEST_URLS) {
      const result = await testSingleUrl(url);
      results.push(result);
      
      // 等待一段时间避免资源冲突
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // 输出测试总结
    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 测试总结');
    console.log(`${'='.repeat(60)}`);
    
    let successCount = 0;
    let failureCount = 0;
    
    results.forEach(result => {
      const hostname = new URL(result.url).hostname;
      console.log(`\n🌐 ${hostname}:`);
      
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
    
    if (successCount > 0) {
      console.log(`\n✅ 修复版本工作正常！可以部署到 Vercel`);
    } else {
      console.log(`\n❌ 修复版本仍有问题，需要进一步调试`);
    }

  } finally {
    // 关闭服务器
    server.close();
    console.log(`\n🛑 测试服务器已关闭`);
  }
}

// 运行测试
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testSingleUrl,
  testHealthCheck,
  createTestServer
};
