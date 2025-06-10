const fetch = require('node-fetch');

async function testModernFrontend() {
    console.log('🚀 开始测试现代前端网站截图功能...\n');
    
    const testCases = [
        {
            name: '目标网站 - Island Dragon (Next.js)',
            url: 'https://islanddragon.cn',
            device: 'desktop',
            quality: 'high',
            description: 'Next.js 14 + TypeScript + Tailwind CSS + Framer Motion'
        },
        {
            name: '目标网站 - 移动端测试',
            url: 'https://islanddragon.cn',
            device: 'mobile',
            quality: 'medium',
            description: '移动端响应式布局测试'
        },
        {
            name: 'Next.js 官网',
            url: 'https://nextjs.org',
            device: 'desktop',
            quality: 'medium',
            description: 'Next.js 官方网站'
        },
        {
            name: 'React 官网',
            url: 'https://react.dev',
            device: 'tablet',
            quality: 'medium',
            description: 'React 官方文档'
        }
    ];
    
    const results = [];
    
    for (const testCase of testCases) {
        console.log(`📸 正在测试: ${testCase.name}`);
        console.log(`   URL: ${testCase.url}`);
        console.log(`   设备: ${testCase.device}, 质量: ${testCase.quality}`);
        console.log(`   描述: ${testCase.description}`);
        
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
                
                const testResult = {
                    name: testCase.name,
                    success: true,
                    duration,
                    imageSize: Math.round(result.image.length / 1024),
                    dimensions: result.dimensions,
                    metadata: result.metadata
                };
                
                results.push(testResult);
                
                console.log(`   ✅ 成功! 耗时: ${duration}ms`);
                console.log(`   📊 图片大小: ${testResult.imageSize}KB`);
                console.log(`   📐 尺寸: ${result.dimensions.width}x${result.dimensions.height}`);
                
                if (result.metadata) {
                    console.log(`   🔍 框架检测: ${result.metadata.hasModernFramework ? '现代框架' : '传统网站'}`);
                    console.log(`   ⚡ 加载策略: ${result.metadata.performance?.loadingStrategy || 'unknown'}`);
                    console.log(`   📏 页面高度: ${result.metadata.pageMetrics?.actualHeight || 'unknown'}`);
                    console.log(`   🎯 固定元素: ${result.metadata.pageMetrics?.hasFixedElements ? '有' : '无'}`);
                }
            } else {
                const error = await response.json();
                const testResult = {
                    name: testCase.name,
                    success: false,
                    duration,
                    error: error.error,
                    tip: error.tip
                };
                
                results.push(testResult);
                
                console.log(`   ❌ 失败: ${error.error}`);
                if (error.tip) {
                    console.log(`   💡 提示: ${error.tip}`);
                }
            }
        } catch (error) {
            const testResult = {
                name: testCase.name,
                success: false,
                error: error.message
            };
            
            results.push(testResult);
            console.log(`   ❌ 网络错误: ${error.message}`);
        }
        
        console.log(''); // 空行分隔
        
        // 等待一下再进行下一个测试
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // 输出测试总结
    console.log('📋 测试总结:');
    console.log('=' * 50);
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`✅ 成功: ${successful.length}/${results.length}`);
    console.log(`❌ 失败: ${failed.length}/${results.length}`);
    
    if (successful.length > 0) {
        const avgDuration = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
        const avgSize = successful.reduce((sum, r) => sum + r.imageSize, 0) / successful.length;
        
        console.log(`⏱️  平均耗时: ${Math.round(avgDuration)}ms`);
        console.log(`📊 平均大小: ${Math.round(avgSize)}KB`);
    }
    
    if (failed.length > 0) {
        console.log('\n❌ 失败详情:');
        failed.forEach(result => {
            console.log(`   - ${result.name}: ${result.error}`);
        });
    }
    
    console.log('\n🎉 测试完成!');
}

// 运行测试
testModernFrontend().catch(console.error);
