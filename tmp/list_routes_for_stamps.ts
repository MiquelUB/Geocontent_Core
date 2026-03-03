import { prisma } from "../lib/database/prisma";

async function listRoutes() {
    const routes = await prisma.route.findMany({
        select: {
            id: true,
            name: true,
            themeId: true
        }
    });

    console.log(JSON.stringify(routes, null, 2));
}

listRoutes().catch(console.error);
