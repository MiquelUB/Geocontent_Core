const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const rs = await prisma.route.findMany({
        where: { routePois: { some: {} } },
        include: { routePois: { include: { poi: true } } }
    });
    console.log(JSON.stringify(rs[0].routePois, null, 2));
}
check().catch(console.error).finally(() => prisma.$disconnect());
