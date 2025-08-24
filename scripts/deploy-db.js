// scripts/deploy-db.js faylı yaradın
const { exec } = require('child_process');
const { PrismaClient } = require('@prisma/client');

async function deployDatabase() {
  try {
    console.log('🚀 Starting database deployment...');
    
    // 1. Prisma generate
    console.log('📦 Generating Prisma client...');
    await execAsync('npx prisma generate');
    
    // 2. Run migrations
    console.log('🔄 Running database migrations...');
    await execAsync('npx prisma migrate deploy');
    
    // 3. Check database connection
    console.log('🔍 Testing database connection...');
    const prisma = new PrismaClient();
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // 4. Run seed if needed (yalnız ilk dəfə)
    if (process.env.FIRST_DEPLOY === 'true') {
      console.log('🌱 Running database seed...');
      await execAsync('npm run prisma:seed');
    }
    
    await prisma.$disconnect();
    console.log('🎉 Database deployment completed!');
    
  } catch (error) {
    console.error('❌ Database deployment failed:', error);
    process.exit(1);
  }
}

function execAsync(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        console.log(stdout);
        resolve(stdout);
      }
    });
  });
}

deployDatabase();