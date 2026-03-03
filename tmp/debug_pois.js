const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const routes = await prisma.route.findMany({
        include: {
            municipality: { select: { name: true } },
            routePois: {
                include: {
                    poi: {
                        include: { userUnlocks: true }
                    }
                },
                orderBy: { orderIndex: 'asc' }
            }
        }
    });

    console.log('Total routes:', routes.length);
    if (routes.length > 0) {
        const r = routes[0];
        console.log('Route 0 name:', r.name);
        console.log('Route 0 POIs count:', r.routePois.length);
        if (r.routePois.length > 0) {
            console.log('First POI title:', r.routePois[0].poi.title);
            console.log('First POI description:', r.routePois[0].poi.description);
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
