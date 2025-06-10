const fetch = require('node-fetch');

async function testContentRendering() {
    console.log('🎨 开始测试内容渲染优化效果...\n');
    
    const testCases = [
        {
            name: 'islanddragon.cn - 桌面端内容渲染测试',
            url: 'https://islanddragon.cn',
            device: 'desktop',
            quality: 'medium',
            description: '测试空白区域和元素渲染完整性'
        },
        {
            name: 'islanddragon.cn - 移动端内容渲染测试',
            url: 'https://islanddragon.cn',
            device: 'mobile',
            quality: 'medium',
            description: '测试移动端布局和间距'
        },
        {
            name: '对比测试 - huasheng.ai',
            url: 'https://www.huasheng.ai/',
            device: 'desktop',
            quality: 'medium',
            description: '确保其他网站功能不受影响'
        },
        {
            name: '对比测试 - Next.js官网',
            url: 'https://nextjs.org',
            device: 'desktop',
            quality: 'medium',
            description: '确保标准Next.js网站正常工作'
        }
    ];
    
    const results = [];
    
    for (const testCase of testCases) {
        console.log(`🔍 正在测试: ${testCase.name}`);
        console.log(`   URL: ${testCase.url}`);
        console.log(`   设备: ${testCase.device}, 质量: ${testCase.quality}`);
        console.log(`   目标: ${testCase.description}`);
        
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
                    metadata: result.metadata,
                    contentAnalysis: analyzeContentQuality(result)
                };
                
                results.push(testResult);
                
                console.log(`   ✅ 成功! 耗时: ${duration}ms`);
                console.log(`   📊 图片大小: ${testResult.imageSize}KB`);
                console.log(`   📐 尺寸: ${result.dimensions.width}x${result.dimensions.height}`);
                
                if (result.metadata) {
                    console.log(`   🔍 框架检测: ${result.metadata.hasModernFramework ? 'Next.js' : '传统网站'}`);
                    console.log(`   ⚡ 加载策略: ${result.metadata.performance?.loadingStrategy || 'unknown'}`);
                    console.log(`   📏 页面高度: ${result.metadata.pageMetrics?.actualHeight || 'unknown'}`);
                    console.log(`   🎯 固定元素: ${result.metadata.pageMetrics?.hasFixedElements ? '有' : '无'}`);
                }
                
                // 内容质量分析
                console.log(`   📋 内容分析: ${testResult.contentAnalysis.quality}`);
                if (testResult.contentAnalysis.issues.length > 0) {
                    console.log(`   ⚠️  潜在问题: ${testResult.contentAnalysis.issues.join(', ')}`);
                } else {
                    console.log(`   ✨ 内容渲染: 完美`);
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
    console.log('📊 内容渲染优化分析报告:');
    console.log('='.repeat(60));
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const islandDragonResults = results.filter(r => r.name.includes('islanddragon'));
    const comparisonResults = results.filter(r => !r.name.includes('islanddragon'));
    
    console.log(`\n✅ 总体成功率: ${successful.length}/${results.length} (${Math.round(successful.length/results.length*100)}%)`);
    
    if (islandDragonResults.length > 0) {
        console.log('\n🎯 islanddragon.cn 内容渲染分析:');
        islandDragonResults.forEach(result => {
            if (result.success) {
                console.log(`   ${result.name.split(' - ')[1]}:`);
                console.log(`     耗时: ${result.duration}ms`);
                console.log(`     图片大小: ${result.imageSize}KB`);
                console.log(`     内容质量: ${result.contentAnalysis.quality}`);
                if (result.contentAnalysis.issues.length > 0) {
                    console.log(`     问题: ${result.contentAnalysis.issues.join(', ')}`);
                }
            }
        });
    }
    
    if (comparisonResults.length > 0) {
        console.log('\n📈 对比网站兼容性检查:');
        comparisonResults.forEach(result => {
            if (result.success) {
                console.log(`   ${result.name.split(' - ')[1]}: ✅ 正常 (${result.duration}ms)`);
            } else {
                console.log(`   ${result.name.split(' - ')[1]}: ❌ 异常`);
            }
        });
    }
    
    if (failed.length > 0) {
        console.log('\n❌ 失败详情:');
        failed.forEach(result => {
            console.log(`   - ${result.name}: ${result.error}`);
        });
    }
    
    // 优化效果评估
    console.log('\n🎨 内容渲染优化效果评估:');
    const islandDragonSuccess = islandDragonResults.filter(r => r.success);
    if (islandDragonSuccess.length > 0) {
        const avgQuality = islandDragonSuccess.reduce((sum, r) => {
            return sum + (r.contentAnalysis.quality === '优秀' ? 3 : 
                         r.contentAnalysis.quality === '良好' ? 2 : 1);
        }, 0) / islandDragonSuccess.length;
        
        const qualityLevel = avgQuality >= 2.5 ? '优秀' : avgQuality >= 1.5 ? '良好' : '需改进';
        console.log(`   整体内容质量: ${qualityLevel}`);
        
        const hasIssues = islandDragonSuccess.some(r => r.contentAnalysis.issues.length > 0);
        console.log(`   渲染问题: ${hasIssues ? '仍有问题需要解决' : '已解决'}`);
    }
    
    console.log('\n🎉 测试完成!');
}

function analyzeContentQuality(result) {
    const analysis = {
        quality: '未知',
        issues: []
    };
    
    if (!result.metadata || !result.metadata.pageMetrics) {
        analysis.issues.push('缺少页面指标数据');
        return analysis;
    }
    
    const { actualHeight, viewportHeight } = result.metadata.pageMetrics;
    const imageSize = Math.round(result.image.length / 1024);
    
    // 分析页面高度合理性
    if (actualHeight < viewportHeight * 0.5) {
        analysis.issues.push('页面内容过少');
    } else if (actualHeight > viewportHeight * 20) {
        analysis.issues.push('页面过长可能有异常空白');
    }
    
    // 分析图片大小合理性
    if (imageSize < 100) {
        analysis.issues.push('图片过小可能内容缺失');
    } else if (imageSize > 3000) {
        analysis.issues.push('图片过大可能有冗余内容');
    }
    
    // 分析宽高比
    const aspectRatio = result.dimensions.height / result.dimensions.width;
    if (aspectRatio > 15) {
        analysis.issues.push('页面过长可能有布局问题');
    }
    
    // 综合评估
    if (analysis.issues.length === 0) {
        analysis.quality = '优秀';
    } else if (analysis.issues.length <= 1) {
        analysis.quality = '良好';
    } else {
        analysis.quality = '需改进';
    }
    
    return analysis;
}

// 运行测试
testContentRendering().catch(console.error);
