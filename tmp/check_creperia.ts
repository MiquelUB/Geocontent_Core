import { prisma } from "./lib/database/prisma";

async function checkPoi() {
    const poi = await prisma.poi.findFirst({
        where: { title: { contains: 'Creperia' } },
        include: {
            routePois: {
                include: {
                    route: true
                }
            }
        }
    });

    console.log(JSON.stringify(poi, null, 2));
}

checkPoi().catch(console.error);
