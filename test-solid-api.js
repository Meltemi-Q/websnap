// 测试SolidJS优化版API
const fetch = require('node-fetch');

async function testSolidAPI() {
    console.log('🧪 开始测试SolidJS优化版API...\n');

    // 测试用例
    const testCases = [
        {
            name: '健康检查',
            method: 'GET',
            url: 'http://localhost:3000/api/screenshot',
            body: null
        },
        {
            name: '简单网站截图',
            method: 'POST',
            url: 'http://localhost:3000/api/screenshot',
            body: {
                url: 'https://example.com',
                device: 'desktop',
                quality: 'medium'
            }
        },
        {
            name: 'GitHub截图测试',
            method: 'POST',
            url: 'http://localhost:3000/api/screenshot',
            body: {
                url: 'https://github.com',
                device: 'desktop',
                quality: 'medium'
            }
        }
    ];

    for (const testCase of testCases) {
        console.log(`📋 测试: ${testCase.name}`);
        console.log(`🔗 方法: ${testCase.method}`);
        
        try {
            const startTime = Date.now();
            
            const options = {
                method: testCase.method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            if (testCase.body) {
                options.body = JSON.stringify(testCase.body);
                console.log(`📝 请求体:`, testCase.body);
            }

            const response = await fetch(testCase.url, options);
            const duration = Date.now() - startTime;

            console.log(`⏱️  响应时间: ${duration}ms`);
            console.log(`📊 状态码: ${response.status}`);

            if (response.ok) {
                const result = await response.json();
                
                if (testCase.method === 'GET') {
                    console.log(`✅ 健康检查成功`);
                    console.log(`📄 响应:`, {
                        status: result.status,
                        version: result.version,
                        platform: result.platform,
                        capabilities: result.capabilities
                    });
                } else {
                    if (result.success) {
                        console.log(`✅ 截图生成成功`);
                        console.log(`📊 元数据:`, {
                            requestId: result.metadata?.requestId,
                            duration: result.metadata?.duration,
                            dimensions: result.metadata?.dimensions,
                            sizeKB: result.metadata?.sizeKB,
                            version: result.metadata?.version
                        });
                        console.log(`🖼️  图片大小: ${Math.round(result.image.length / 1024)}KB`);
                    } else {
                        console.log(`❌ 截图失败:`, result.error);
                    }
                }
            } else {
                const errorResult = await response.json();
                console.log(`❌ 请求失败:`, errorResult);
            }

        } catch (error) {
            console.log(`💥 测试异常:`, error.message);
        }

        console.log('─'.repeat(60));
        console.log('');
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    testSolidAPI()
        .then(() => {
            console.log('🎉 测试完成!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 测试失败:', error);
            process.exit(1);
        });
}

module.exports = { testSolidAPI }; 