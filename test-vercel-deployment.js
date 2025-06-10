const fetch = require('node-fetch');

// 配置你的Vercel部署URL
const VERCEL_URL = process.env.VERCEL_URL || 'https://your-app.vercel.app';

async function testVercelDeployment() {
    console.log('🚀 开始测试Vercel部署...\n');
    console.log(`测试URL: ${VERCEL_URL}\n`);
    
    const testCases = [
        {
            name: '健康检查',
            method: 'GET',
            endpoint: '/api/health',
            expectedStatus: 200,
            timeout: 10000
        },
        {
            name: '简单网站截图',
            method: 'POST',
            endpoint: '/api/screenshot',
            body: {
                url: 'https://example.com',
                device: 'desktop',
                quality: 'medium'
            },
            expectedStatus: 200,
            timeout: 60000
        },
        {
            name: 'islanddragon.cn 截图测试',
            method: 'POST',
            endpoint: '/api/screenshot',
            body: {
                url: 'https://islanddragon.cn',
                device: 'desktop',
                quality: 'medium'
            },
            expectedStatus: 200,
            timeout: 130000 // 130秒，考虑冷启动
        },
        {
            name: 'URL自动补全测试',
            method: 'POST',
            endpoint: '/api/screenshot',
            body: {
                url: 'example.com', // 不带协议
                device: 'mobile',
                quality: 'low'
            },
            expectedStatus: 200,
            timeout: 60000
        },
        {
            name: '错误处理测试',
            method: 'POST',
            endpoint: '/api/screenshot',
            body: {
                url: 'invalid-url',
                device: 'desktop',
                quality: 'medium'
            },
            expectedStatus: 400,
            timeout: 10000
        }
    ];
    
    const results = [];
    
    for (const testCase of testCases) {
        console.log(`🔍 测试: ${testCase.name}`);
        
        try {
            const startTime = Date.now();
            
            // 创建请求配置
            const requestConfig = {
                method: testCase.method,
                timeout: testCase.timeout
            };
            
            if (testCase.body) {
                requestConfig.headers = {
                    'Content-Type': 'application/json'
                };
                requestConfig.body = JSON.stringify(testCase.body);
            }
            
            // 发送请求
            const response = await fetch(`${VERCEL_URL}${testCase.endpoint}`, requestConfig);
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            // 检查状态码
            const statusMatch = response.status === testCase.expectedStatus;
            
            let responseData = null;
            try {
                responseData = await response.json();
            } catch (e) {
                responseData = { error: 'Invalid JSON response' };
            }
            
            const result = {
                name: testCase.name,
                success: statusMatch,
                status: response.status,
                expectedStatus: testCase.expectedStatus,
                duration,
                responseData
            };
            
            results.push(result);
            
            if (statusMatch) {
                console.log(`   ✅ 成功! 状态: ${response.status}, 耗时: ${duration}ms`);
                
                // 特殊处理截图测试
                if (testCase.endpoint === '/api/screenshot' && response.ok) {
                    if (responseData.success && responseData.image) {
                        const imageSize = Math.round(responseData.image.length / 1024);
                        console.log(`   📊 图片大小: ${imageSize}KB`);
                        console.log(`   📐 尺寸: ${responseData.dimensions?.width}x${responseData.dimensions?.height}`);
                        
                        if (responseData.metadata) {
                            console.log(`   🔍 框架检测: ${responseData.metadata.hasModernFramework ? 'Next.js' : '传统网站'}`);
                            console.log(`   ⚡ 加载策略: ${responseData.metadata.performance?.loadingStrategy || 'unknown'}`);
                        }
                    }
                }
                
                // 健康检查特殊处理
                if (testCase.endpoint === '/api/health') {
                    console.log(`   💚 服务状态: ${responseData.status || 'unknown'}`);
                }
                
            } else {
                console.log(`   ❌ 失败! 期望状态: ${testCase.expectedStatus}, 实际状态: ${response.status}`);
                if (responseData.error) {
                    console.log(`   📝 错误信息: ${responseData.error}`);
                }
            }
            
        } catch (error) {
            const result = {
                name: testCase.name,
                success: false,
                error: error.message,
                duration: 0
            };
            
            results.push(result);
            console.log(`   ❌ 网络错误: ${error.message}`);
        }
        
        console.log(''); // 空行分隔
        
        // 等待一下再进行下一个测试
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // 输出测试总结
    console.log('📊 Vercel部署测试总结:');
    console.log('='.repeat(60));
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`\n✅ 成功: ${successful.length}/${results.length} (${Math.round(successful.length/results.length*100)}%)`);
    console.log(`❌ 失败: ${failed.length}/${results.length}`);
    
    if (successful.length > 0) {
        const screenshotTests = successful.filter(r => r.name.includes('截图'));
        if (screenshotTests.length > 0) {
            const avgDuration = screenshotTests.reduce((sum, r) => sum + r.duration, 0) / screenshotTests.length;
            console.log(`⏱️  平均截图耗时: ${Math.round(avgDuration)}ms`);
        }
    }
    
    // 详细结果
    console.log('\n📋 详细测试结果:');
    results.forEach(result => {
        const status = result.success ? '✅' : '❌';
        console.log(`   ${status} ${result.name}: ${result.success ? '通过' : '失败'}`);
        if (result.duration > 0) {
            console.log(`      耗时: ${result.duration}ms`);
        }
        if (result.error) {
            console.log(`      错误: ${result.error}`);
        }
    });
    
    // 部署状态评估
    console.log('\n🎯 部署状态评估:');
    const healthCheck = results.find(r => r.name === '健康检查');
    const basicScreenshot = results.find(r => r.name === '简单网站截图');
    const islandDragonTest = results.find(r => r.name.includes('islanddragon'));
    
    if (healthCheck?.success) {
        console.log('   ✅ 服务基础功能正常');
    } else {
        console.log('   ❌ 服务基础功能异常');
    }
    
    if (basicScreenshot?.success) {
        console.log('   ✅ 基础截图功能正常');
    } else {
        console.log('   ❌ 基础截图功能异常');
    }
    
    if (islandDragonTest?.success) {
        console.log('   ✅ islanddragon.cn优化功能正常');
    } else {
        console.log('   ❌ islanddragon.cn优化功能异常');
    }
    
    const overallSuccess = successful.length >= 3; // 至少3个测试通过
    console.log(`\n🎉 总体评估: ${overallSuccess ? '部署成功' : '需要修复'}`);
    
    if (!overallSuccess) {
        console.log('\n💡 修复建议:');
        if (!healthCheck?.success) {
            console.log('   - 检查Vercel函数配置');
            console.log('   - 验证环境变量设置');
        }
        if (!basicScreenshot?.success) {
            console.log('   - 检查Chromium依赖包含');
            console.log('   - 验证函数超时设置');
        }
        if (!islandDragonTest?.success) {
            console.log('   - 检查120秒超时配置');
            console.log('   - 验证内存限制设置');
        }
    }
    
    console.log('\n🔗 有用链接:');
    console.log(`   - 应用URL: ${VERCEL_URL}`);
    console.log(`   - 健康检查: ${VERCEL_URL}/api/health`);
    console.log(`   - Vercel仪表板: https://vercel.com/dashboard`);
}

// 运行测试
if (require.main === module) {
    testVercelDeployment().catch(console.error);
}

module.exports = { testVercelDeployment };
