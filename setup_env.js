const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Colors for console output (cross-platform compatible)
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkNodeVersion() {
    try {
        const nodeVersion = process.version;
        const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
        if (majorVersion < 16) {
            log(`⚠️  Warning: Node.js version ${nodeVersion} detected. Node.js 16+ is recommended.`, 'yellow');
            return false;
        }
        log(`✅ Node.js ${nodeVersion} detected`, 'green');
        return true;
    } catch (error) {
        log('❌ Error checking Node.js version', 'red');
        return false;
    }
}

function ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        log(`📁 Created directory: ${dirPath}`, 'cyan');
        return true;
    }
    return false;
}

function checkDependencies() {
    const backendPath = path.join(__dirname, 'backend');
    const frontendPath = path.join(__dirname, 'frontend');
    
    const backendNodeModules = path.join(backendPath, 'node_modules');
    const frontendNodeModules = path.join(frontendPath, 'node_modules');
    
    const backendHasDeps = fs.existsSync(backendNodeModules);
    const frontendHasDeps = fs.existsSync(frontendNodeModules);
    
    if (!backendHasDeps) {
        log('⚠️  Backend dependencies not installed. Run: npm run install-backend', 'yellow');
    }
    
    if (!frontendHasDeps) {
        log('⚠️  Frontend dependencies not installed. Run: npm run install-frontend', 'yellow');
    }
    
    return { backendHasDeps, frontendHasDeps };
}

// Main setup function
function setupEnvironment() {
    log('\n🚀 Starting environment setup...\n', 'blue');
    
    // Check Node.js version
    checkNodeVersion();
    
    // Ensure necessary directories exist
    const backendDataPath = path.join(__dirname, 'backend', 'data');
    ensureDirectoryExists(backendDataPath);
    
    // Check if .env file exists
    const envPath = path.join(__dirname, 'backend', '.env');
    const envExamplePath = path.join(__dirname, 'env.example');
    
    if (!fs.existsSync(envExamplePath)) {
        log('❌ Error: env.example file not found!', 'red');
        log(`   Expected location: ${envExamplePath}`, 'red');
        process.exit(1);
    }
    
    if (!fs.existsSync(envPath)) {
        log('🔧 Setting up .env file...', 'yellow');
        
        try {
            // Read the example file
            let envContent = fs.readFileSync(envExamplePath, 'utf8');
            
            // Generate a secure JWT secret
            const jwtSecret = crypto.randomBytes(64).toString('hex');
            
            // Replace the placeholder JWT secret
            envContent = envContent.replace('your_super_secure_jwt_secret_key_here', jwtSecret);
            
            // Normalize path separators for cross-platform compatibility
            const dbPath = path.join(__dirname, 'backend', 'data', 'jail_visitation.sqlite');
            // Use forward slashes for DB_PATH (SQLite handles this on Windows too)
            const normalizedDbPath = dbPath.replace(/\\/g, '/');
            envContent = envContent.replace(
                /DB_PATH=.*/,
                `DB_PATH=${normalizedDbPath}`
            );
            
            // Write the .env file
            fs.writeFileSync(envPath, envContent, 'utf8');
            
            log('✅ .env file created successfully!', 'green');
            log('🔐 JWT secret generated automatically', 'green');
            log(`📝 Database path: ${normalizedDbPath}`, 'cyan');
        } catch (error) {
            log(`❌ Error creating .env file: ${error.message}`, 'red');
            process.exit(1);
        }
    } else {
        log('✅ .env file already exists', 'green');
        
        // Verify .env file has valid content
        try {
            const envContent = fs.readFileSync(envPath, 'utf8');
            if (envContent.includes('your_super_secure_jwt_secret_key_here')) {
                log('⚠️  Warning: .env file contains placeholder JWT secret. Regenerating...', 'yellow');
                const jwtSecret = crypto.randomBytes(64).toString('hex');
                const updatedContent = envContent.replace('your_super_secure_jwt_secret_key_here', jwtSecret);
                fs.writeFileSync(envPath, updatedContent, 'utf8');
                log('✅ JWT secret updated', 'green');
            }
        } catch (error) {
            log(`⚠️  Warning: Could not verify .env file: ${error.message}`, 'yellow');
        }
    }
    
    // Check dependencies
    log('\n📦 Checking dependencies...', 'blue');
    const { backendHasDeps, frontendHasDeps } = checkDependencies();
    
    if (!backendHasDeps || !frontendHasDeps) {
        log('\n💡 To install all dependencies, run:', 'yellow');
        log('   npm run install-all', 'cyan');
    }
    
    log('\n✅ Environment setup complete!', 'green');
    log('\n📋 Next steps:', 'blue');
    log('   1. Install dependencies: npm run install-all', 'cyan');
    log('   2. Start backend: npm start', 'cyan');
    log('   3. Start frontend: cd frontend && npm start', 'cyan');
    log('   4. Or use: npm run start-prod (for production build)\n', 'cyan');
}

// Run setup
try {
    setupEnvironment();
} catch (error) {
    log(`\n❌ Fatal error during setup: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
}
