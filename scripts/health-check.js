#!/usr/bin/env node

/**
 * Health Check Utility
 * Verifies that all required configurations and dependencies are in place
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', '.env.example');

console.log('\n========================================');
console.log('EdTech Backend - Health Check');
console.log('========================================\n');

let checks = {
  passed: 0,
  failed: 0,
  warnings: 0
};

function checkPassed(name, message = '') {
  checks.passed++;
  console.log(`✓ ${name}${message ? ' - ' + message : ''}`);
}

function checkFailed(name, message = '') {
  checks.failed++;
  console.log(`✗ ${name}${message ? ' - ' + message : ''}`);
}

function checkWarning(name, message = '') {
  checks.warnings++;
  console.log(`⚠ ${name}${message ? ' - ' + message : ''}`);
}

// 1. Check .env file
console.log('📋 Configuration Files:');
if (fs.existsSync(envPath)) {
  checkPassed('.env file exists');
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  
  // Check required variables
  const required = [
    'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD',
    'JWT_SECRET', 'PORT', 'NODE_ENV'
  ];
  
  let missingEnvVars = [];
  required.forEach(key => {
    if (!envConfig[key] || envConfig[key].trim() === '') {
      missingEnvVars.push(key);
    }
  });
  
  if (missingEnvVars.length === 0) {
    checkPassed('All required environment variables set');
  } else {
    checkFailed('Missing environment variables', missingEnvVars.join(', '));
  }
  
  // Check optional variables
  const optional = [
    'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET',
    'GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET',
    'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET',
    'EMAIL_HOST', 'EMAIL_USER', 'EMAIL_PASS',
    'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'
  ];
  
  let missingOptional = [];
  optional.forEach(key => {
    if (!envConfig[key] || envConfig[key].trim() === '') {
      missingOptional.push(key);
    }
  });
  
  if (missingOptional.length > 0) {
    checkWarning('Optional environment variables not set', missingOptional.slice(0, 3).join(', ') + (missingOptional.length > 3 ? '...' : ''));
  }
} else {
  checkFailed('.env file not found');
  if (fs.existsSync(envExamplePath)) {
    console.log('   💡 Tip: Copy .env.example to .env and fill in your values');
  }
}

// 2. Check dependencies
console.log('\n📦 Dependencies:');
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = require(packageJsonPath);

const criticalDeps = [
  'express', 'sequelize', 'postgres', 'dotenv', 'cors',
  'bcryptjs', 'jsonwebtoken', 'multer', 'cloudinary',
  'nodemailer', 'passport', 'passport-google-oauth20', 'passport-github2',
  'razorpay'
];

let missingDeps = [];
criticalDeps.forEach(dep => {
  if (!packageJson.dependencies[dep]) {
    missingDeps.push(dep);
  }
});

if (missingDeps.length === 0) {
  checkPassed('All critical dependencies listed in package.json');
} else {
  checkFailed('Missing dependencies', missingDeps.join(', '));
}

// 3. Check directory structure
console.log('\n📁 Directory Structure:');
const requiredDirs = [
  'config',
  'controllers',
  'models',
  'routes',
  'middleware',
  'services',
  'migrations',
  'db/seeders',
  'utils',
  'uploads'
];

requiredDirs.forEach(dir => {
  const dirPath = path.join(__dirname, '..', dir);
  if (fs.existsSync(dirPath)) {
    checkPassed(`${dir}/`);
  } else if (dir === 'uploads') {
    checkWarning(`${dir}/ - Will be created when files are uploaded`);
  } else {
    checkFailed(`${dir}/ - Missing`);
  }
});

// 4. Check critical files
console.log('\n📄 Critical Files:');
const criticalFiles = [
  'server.js',
  'config/database.js',
  'config/passport.js',
  'config/config.js',
  '.sequelizerc',
  'migrations/20260801000000-initial-schema.js'
];

criticalFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    checkPassed(file);
  } else {
    checkFailed(file + ' - Missing');
  }
});

// 5. Check models
console.log('\n🗂️  Database Models:');
const modelsDir = path.join(__dirname, '..', 'models');
const modelFiles = fs.readdirSync(modelsDir).filter(f => f.endsWith('.js') && f !== 'index.js');

const expectedModels = [
  'User.js', 'Profile.js', 'Category.js', 'Course.js', 'Section.js',
  'SubSection.js', 'Enrollment.js', 'CourseProgress.js', 'CourseProgressVideo.js',
  'RatingAndReview.js', 'Otp.js', 'LiveSession.js', 'LiveChatMessage.js'
];

expectedModels.forEach(model => {
  if (modelFiles.includes(model)) {
    checkPassed(model);
  } else {
    checkFailed(model + ' - Missing');
  }
});

// 6. Check controllers
console.log('\n🎮 Controllers:');
const controllersDir = path.join(__dirname, '..', 'controllers');
const controllerFiles = fs.readdirSync(controllersDir).filter(f => f.endsWith('Controller.js'));

const expectedControllers = [
  'authController.js', 'courseController.js', 'profileController.js',
  'sessionsController.js', 'paymentController.js', 'contactController.js'
];

expectedControllers.forEach(controller => {
  if (controllerFiles.includes(controller)) {
    checkPassed(controller);
  } else {
    checkFailed(controller + ' - Missing');
  }
});

// 7. Check middleware
console.log('\n⚙️  Middleware:');
const middlewareDir = path.join(__dirname, '..', 'middleware');
const middlewareFiles = fs.readdirSync(middlewareDir).filter(f => f.endsWith('.js'));

const expectedMiddleware = ['auth.js', 'upload.js'];
expectedMiddleware.forEach(mware => {
  if (middlewareFiles.includes(mware)) {
    checkPassed(mware);
  } else {
    checkFailed(mware + ' - Missing');
  }
});

// 8. Check services
console.log('\n🔧 Services:');
const servicesDir = path.join(__dirname, '..', 'services');
const serviceFiles = fs.readdirSync(servicesDir).filter(f => f.endsWith('.js'));

const expectedServices = ['uploadService.js', 'courseService.js', 'mailService.js'];
expectedServices.forEach(service => {
  if (serviceFiles.includes(service)) {
    checkPassed(service);
  } else {
    checkFailed(service + ' - Missing');
  }
});

// Summary
console.log('\n========================================');
console.log('Summary:');
console.log(`✓ Passed: ${checks.passed}`);
console.log(`⚠ Warnings: ${checks.warnings}`);
console.log(`✗ Failed: ${checks.failed}`);
console.log('========================================\n');

if (checks.failed === 0) {
  console.log('✓ All checks passed! Ready to start the server.\n');
  console.log('Next steps:');
  console.log('1. npm install (if not done yet)');
  console.log('2. npm run migrate (to run database migrations)');
  console.log('3. npm run dev (to start the development server)\n');
  process.exit(0);
} else {
  console.log('✗ Some checks failed. Please fix the issues above.\n');
  process.exit(1);
}
