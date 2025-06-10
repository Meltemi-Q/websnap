const fetch = require('node-fetch');

async function testScreenshot() {
    console.log('开始测试截图功能...');
    
    const testCases = [
        {
            name: '测试简单网页',
            url: 'https://example.com',
            device: 'desktop',
            quality: 'medium'
        },
        {
            name: '测试移动端',
            url: 'https://www.baidu.com',
            device: 'mobile',
            quality: 'low'
        }
    ];
    
    for (const testCase of testCases) {
        console.log(`\n正在测试: ${testCase.name}`);
        console.log(`URL: ${testCase.url}`);
        console.log(`设备: ${testCase.device}, 质量: ${testCase.quality}`);
        
        try {
            const startTime = Date.now();
            
            const response = await fetch('http://localhost:3000/api/screenshot', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    url: testCase.url,
                    device: testCase.device,
                    quality: testCase.quality
                })
            });
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            if (response.ok) {
                const result = await response.json();
                console.log(`✅ 成功! 耗时: ${duration}ms`);
                console.log(`   图片大小: ${Math.round(result.image.length / 1024)}KB`);
                console.log(`   尺寸: ${result.dimensions.width}x${result.dimensions.height}`);
                if (result.metadata) {
                    console.log(`   请求ID: ${result.metadata.requestId}`);
                }
            } else {
                const error = await response.json();
                console.log(`❌ 失败: ${error.error}`);
                if (error.tip) {
                    console.log(`   提示: ${error.tip}`);
                }
            }
        } catch (error) {
            console.log(`❌ 网络错误: ${error.message}`);
        }
        
        // 等待一下再进行下一个测试
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n测试完成!');
}

// 运行测试
testScreenshot().catch(console.error);
