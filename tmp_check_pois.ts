import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const pois = await prisma.poi.findMany({
        where: {
            OR: [
                { title: { contains: 'Histories', mode: 'insensitive' } },
                { title: { contains: 'Formatgeria', mode: 'insensitive' } }
            ]
        },
        select: {
            id: true,
            title: true,
            carouselImages: true,
            images: true,
            appThumbnail: true,
            header16x9: true
        }
    });

    console.log(JSON.stringify(pois, null, 2));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
