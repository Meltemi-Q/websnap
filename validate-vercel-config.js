#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Validates the Vercel configuration for WebSnap deployment
 */
function validateVercelConfig() {
    console.log('🔍 Validating Vercel Configuration for WebSnap...\n');
    
    const configPath = path.join(__dirname, 'vercel.json');
    
    // Check if vercel.json exists
    if (!fs.existsSync(configPath)) {
        console.error('❌ vercel.json not found!');
        process.exit(1);
    }
    
    let config;
    try {
        const configContent = fs.readFileSync(configPath, 'utf8');
        config = JSON.parse(configContent);
        console.log('✅ vercel.json is valid JSON');
    } catch (error) {
        console.error('❌ vercel.json contains invalid JSON:', error.message);
        process.exit(1);
    }
    
    // Validation checks
    const checks = [
        {
            name: 'No builds/functions conflict',
            test: () => !(config.builds && config.functions),
            fix: 'Remove either "builds" or "functions" property'
        },
        {
            name: 'Functions configuration exists',
            test: () => config.functions && config.functions['api/screenshot.js'],
            fix: 'Add functions configuration for api/screenshot.js'
        },
        {
            name: '120-second timeout configured',
            test: () => config.functions?.['api/screenshot.js']?.maxDuration === 120,
            fix: 'Set maxDuration to 120 in functions configuration'
        },
        {
            name: '3GB memory allocated',
            test: () => config.functions?.['api/screenshot.js']?.memory === 3008,
            fix: 'Set memory to 3008 in functions configuration'
        },
        {
            name: 'Chromium files included',
            test: () => config.functions?.['api/screenshot.js']?.includeFiles?.includes('chromium'),
            fix: 'Add includeFiles with chromium path'
        },
        {
            name: 'Modern rewrites used (not routes)',
            test: () => config.rewrites && !config.routes,
            fix: 'Replace "routes" with "rewrites" and update syntax'
        },
        {
            name: 'API endpoints configured',
            test: () => {
                const rewrites = config.rewrites || [];
                const hasScreenshot = rewrites.some(r => r.source === '/api/screenshot');
                const hasHealth = rewrites.some(r => r.source === '/api/health');
                return hasScreenshot && hasHealth;
            },
            fix: 'Add rewrites for /api/screenshot and /api/health'
        },
        {
            name: 'CORS headers configured',
            test: () => config.headers && config.headers.some(h => h.source.includes('/api/')),
            fix: 'Add CORS headers for API endpoints'
        },
        {
            name: 'Puppeteer environment variable set',
            test: () => config.env?.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD === 'true',
            fix: 'Set PUPPETEER_SKIP_CHROMIUM_DOWNLOAD to "true" in env'
        },
        {
            name: 'No legacy version property',
            test: () => !config.version,
            fix: 'Remove "version" property (not needed in modern format)'
        }
    ];
    
    console.log('Running validation checks...\n');
    
    let allPassed = true;
    checks.forEach((check, index) => {
        const passed = check.test();
        const status = passed ? '✅' : '❌';
        console.log(`${index + 1}. ${status} ${check.name}`);
        
        if (!passed) {
            console.log(`   💡 Fix: ${check.fix}`);
            allPassed = false;
        }
    });
    
    console.log('\n' + '='.repeat(60));
    
    if (allPassed) {
        console.log('🎉 All validation checks passed!');
        console.log('✅ Configuration is ready for Vercel deployment');
        
        // Display configuration summary
        console.log('\n📋 Configuration Summary:');
        console.log(`   • Timeout: ${config.functions['api/screenshot.js'].maxDuration}s`);
        console.log(`   • Memory: ${config.functions['api/screenshot.js'].memory}MB`);
        console.log(`   • Chromium: ${config.functions['api/screenshot.js'].includeFiles ? 'Included' : 'Not included'}`);
        console.log(`   • API Endpoints: ${config.rewrites?.length || 0} configured`);
        console.log(`   • CORS: ${config.headers ? 'Enabled' : 'Disabled'}`);
        
        console.log('\n🚀 Ready to deploy with:');
        console.log('   vercel --prod');
        
    } else {
        console.log('❌ Configuration validation failed!');
        console.log('🔧 Please fix the issues above before deploying');
        process.exit(1);
    }
}

/**
 * Validates package.json dependencies
 */
function validateDependencies() {
    console.log('\n🔍 Validating Dependencies...\n');
    
    const packagePath = path.join(__dirname, 'package.json');
    
    if (!fs.existsSync(packagePath)) {
        console.error('❌ package.json not found!');
        return false;
    }
    
    let packageJson;
    try {
        packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    } catch (error) {
        console.error('❌ package.json contains invalid JSON:', error.message);
        return false;
    }
    
    const requiredDeps = {
        '@sparticuz/chromium': '^121.0.0',
        'puppeteer-core': '^21.0.0',
        'express': '^4.18.2'
    };
    
    let allDepsOk = true;
    
    Object.entries(requiredDeps).forEach(([dep, version]) => {
        const installed = packageJson.dependencies?.[dep];
        if (installed) {
            console.log(`✅ ${dep}: ${installed}`);
        } else {
            console.log(`❌ ${dep}: Missing (required: ${version})`);
            allDepsOk = false;
        }
    });
    
    if (packageJson.engines?.node) {
        console.log(`✅ Node.js version: ${packageJson.engines.node}`);
    } else {
        console.log('⚠️  Node.js version not specified (recommended: 18.x)');
    }
    
    return allDepsOk;
}

/**
 * Main validation function
 */
function main() {
    console.log('WebSnap Vercel Configuration Validator');
    console.log('=====================================\n');
    
    validateVercelConfig();
    const depsOk = validateDependencies();
    
    if (!depsOk) {
        console.log('\n❌ Dependency validation failed!');
        console.log('🔧 Run: npm install');
        process.exit(1);
    }
    
    console.log('\n🎯 Final Status: Ready for Production Deployment! 🚀');
}

// Run validation if called directly
if (require.main === module) {
    main();
}

module.exports = { validateVercelConfig, validateDependencies };
