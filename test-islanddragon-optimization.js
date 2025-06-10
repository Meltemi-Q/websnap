const fetch = require('node-fetch');

async function testIslandDragonOptimization() {
    console.log('🎯 开始测试 islanddragon.cn 优化效果...\n');
    
    const testCases = [
        {
            name: 'islanddragon.cn - 桌面端高质量',
            url: 'islanddragon.cn', // 测试URL自动补全
            device: 'desktop',
            quality: 'high',
            expectedTime: 90000 // 90秒内完成
        },
        {
            name: 'islanddragon.cn - 移动端中等质量',
            url: 'https://islanddragon.cn',
            device: 'mobile',
            quality: 'medium',
            expectedTime: 80000 // 80秒内完成
        },
        {
            name: 'islanddragon.cn - 平板端中等质量',
            url: 'https://islanddragon.cn',
            device: 'tablet',
            quality: 'medium',
            expectedTime: 85000 // 85秒内完成
        },
        {
            name: '对比测试 - huasheng.ai',
            url: 'https://www.huasheng.ai/',
            device: 'desktop',
            quality: 'medium',
            expectedTime: 30000 // 30秒内完成
        }
    ];
    
    const results = [];
    
    for (const testCase of testCases) {
        console.log(`📸 正在测试: ${testCase.name}`);
        console.log(`   URL: ${testCase.url}`);
        console.log(`   设备: ${testCase.device}, 质量: ${testCase.quality}`);
        console.log(`   期望耗时: ${testCase.expectedTime / 1000}秒内`);
        
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
                    expectedTime: testCase.expectedTime,
                    withinExpected: duration <= testCase.expectedTime,
                    imageSize: Math.round(result.image.length / 1024),
                    dimensions: result.dimensions,
                    metadata: result.metadata
                };
                
                results.push(testResult);
                
                const timeStatus = testResult.withinExpected ? '✅' : '⚠️';
                console.log(`   ${timeStatus} 耗时: ${duration}ms (期望: ${testCase.expectedTime}ms)`);
                console.log(`   📊 图片大小: ${testResult.imageSize}KB`);
                console.log(`   📐 尺寸: ${result.dimensions.width}x${result.dimensions.height}`);
                
                if (result.metadata) {
                    console.log(`   🔍 框架检测: ${result.metadata.hasModernFramework ? 'Next.js' : '传统网站'}`);
                    console.log(`   ⚡ 加载策略: ${result.metadata.performance?.loadingStrategy || 'unknown'}`);
                    console.log(`   📏 页面高度: ${result.metadata.pageMetrics?.actualHeight || 'unknown'}`);
                    console.log(`   🎯 固定元素: ${result.metadata.pageMetrics?.hasFixedElements ? '有' : '无'}`);
                    
                    // 检查内容完整性
                    const contentQuality = analyzeContentQuality(result.metadata);
                    console.log(`   📋 内容质量: ${contentQuality}`);
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
        await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    // 输出详细分析
    console.log('📊 详细分析报告:');
    console.log('='.repeat(60));
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const islandDragonResults = results.filter(r => r.name.includes('islanddragon'));
    const comparisonResults = results.filter(r => r.name.includes('huasheng'));
    
    console.log(`\n✅ 总体成功率: ${successful.length}/${results.length} (${Math.round(successful.length/results.length*100)}%)`);
    
    if (islandDragonResults.length > 0) {
        console.log('\n🎯 islanddragon.cn 性能分析:');
        islandDragonResults.forEach(result => {
            if (result.success) {
                const timeStatus = result.withinExpected ? '达标' : '超时';
                console.log(`   ${result.name.split(' - ')[1]}: ${result.duration}ms (${timeStatus})`);
            }
        });
        
        const avgTime = islandDragonResults
            .filter(r => r.success)
            .reduce((sum, r) => sum + r.duration, 0) / islandDragonResults.filter(r => r.success).length;
        console.log(`   平均耗时: ${Math.round(avgTime)}ms`);
    }
    
    if (comparisonResults.length > 0 && comparisonResults[0].success) {
        console.log('\n📈 性能对比:');
        const comparisonTime = comparisonResults[0].duration;
        const islandAvgTime = islandDragonResults
            .filter(r => r.success)
            .reduce((sum, r) => sum + r.duration, 0) / islandDragonResults.filter(r => r.success).length;
        
        console.log(`   huasheng.ai: ${comparisonTime}ms`);
        console.log(`   islanddragon.cn: ${Math.round(islandAvgTime)}ms`);
        console.log(`   性能差异: ${Math.round((islandAvgTime - comparisonTime) / comparisonTime * 100)}%`);
    }
    
    if (failed.length > 0) {
        console.log('\n❌ 失败详情:');
        failed.forEach(result => {
            console.log(`   - ${result.name}: ${result.error}`);
        });
    }
    
    console.log('\n🎉 测试完成!');
    
    // 提供优化建议
    if (islandDragonResults.some(r => r.success && !r.withinExpected)) {
        console.log('\n💡 优化建议:');
        console.log('   - 考虑进一步优化图片懒加载策略');
        console.log('   - 检查Framer Motion动画配置');
        console.log('   - 优化字体加载策略');
        console.log('   - 考虑使用CDN加速资源加载');
    }
}

function analyzeContentQuality(metadata) {
    if (!metadata || !metadata.pageMetrics) {
        return '未知';
    }
    
    const { actualHeight, viewportHeight } = metadata.pageMetrics;
    
    if (actualHeight > viewportHeight * 3) {
        return '内容丰富';
    } else if (actualHeight > viewportHeight) {
        return '内容正常';
    } else {
        return '内容较少';
    }
}

// 运行测试
testIslandDragonOptimization().catch(console.error);
