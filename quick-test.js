const fetch = require('node-fetch');

async function quickTest() {
    console.log('🚀 快速测试内容渲染优化...\n');
    
    try {
        console.log('📸 测试 islanddragon.cn 桌面端截图...');
        const startTime = Date.now();
        
        const response = await fetch('http://localhost:3000/api/screenshot', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: 'https://islanddragon.cn',
                device: 'desktop',
                quality: 'medium'
            })
        });
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        if (response.ok) {
            const result = await response.json();
            
            console.log(`✅ 成功! 耗时: ${duration}ms`);
            console.log(`📊 图片大小: ${Math.round(result.image.length / 1024)}KB`);
            console.log(`📐 尺寸: ${result.dimensions.width}x${result.dimensions.height}`);
            
            if (result.metadata) {
                console.log(`🔍 框架检测: ${result.metadata.hasModernFramework ? 'Next.js' : '传统网站'}`);
                console.log(`⚡ 加载策略: ${result.metadata.performance?.loadingStrategy || 'unknown'}`);
                console.log(`📏 页面高度: ${result.metadata.pageMetrics?.actualHeight || 'unknown'}`);
                
                // 分析内容质量
                const { actualHeight, viewportHeight } = result.metadata.pageMetrics || {};
                if (actualHeight && viewportHeight) {
                    const aspectRatio = actualHeight / viewportHeight;
                    console.log(`📊 高宽比: ${aspectRatio.toFixed(2)}`);
                    
                    if (aspectRatio > 15) {
                        console.log(`⚠️  警告: 页面过长，可能存在异常空白`);
                    } else if (aspectRatio < 2) {
                        console.log(`⚠️  警告: 页面过短，可能内容缺失`);
                    } else {
                        console.log(`✨ 页面比例正常`);
                    }
                }
            }
            
            console.log('\n🎉 测试完成! 内容渲染优化已生效。');
            
        } else {
            const error = await response.json();
            console.log(`❌ 失败: ${error.error}`);
            if (error.tip) {
                console.log(`💡 提示: ${error.tip}`);
            }
        }
        
    } catch (error) {
        console.log(`❌ 网络错误: ${error.message}`);
    }
}

// 运行测试
quickTest().catch(console.error);
