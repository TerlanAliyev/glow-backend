// prisma/seed.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding started...');

    // 1. "BOT" rolunun mövcud olduğundan əmin oluruq. Yoxdursa, yaradırıq.
    const botRole = await prisma.role.upsert({
        where: { name: 'BOT' },
        update: {},
        create: { id: 3, name: 'BOT' }, // ID-ni manual təyin etmək daha stabildir
    });
    console.log(`✅ 'BOT' role ensured. ID: ${botRole.id}`);

    // 2. "Lyra Bot" istifadəçisini yaradırıq (əgər yoxdursa)
    const lyraBot = await prisma.user.upsert({
        where: { email: 'bot@lyra.app' },
        update: {},
        create: {
            email: 'bot@lyra.app',
            roleId: botRole.id,
            isActive: false, // Botun login etməsinin qarşısını almaq üçün
            profile: {
                create: {
                    name: 'Lyra',
                    age: 99,
                    gender: 'OTHER'
                }
            }
        },
        include: { profile: true }
    });

    console.log(`🤖 Lyra Bot user created/ensured: ${lyraBot.profile.name} (ID: ${lyraBot.id})`);
    console.log('🌴 Seeding finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });