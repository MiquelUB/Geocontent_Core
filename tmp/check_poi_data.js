const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const pois = await prisma.poi.findMany({
        where: { title: { contains: 'Camp', mode: 'insensitive' } },
        include: {
            userUnlocks: true
        }
    });

    console.log('POIs found:', pois.length);
    pois.forEach(p => {
        console.log('---');
        console.log('ID:', p.id);
        console.log('Title:', p.title);
        console.log('TextContent:', p.textContent);
        console.log('Carousel:', p.carouselImages);
        console.log('AppThumbnail:', p.appThumbnail);
        console.log('Header:', p.header16x9);
        console.log('Unlocks:', p.userUnlocks.length);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
