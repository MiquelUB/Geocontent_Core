import { prisma } from './lib/database/prisma';

async function check() {
    try {
        const list = await prisma.municipality.findMany();
        console.log("Municipalities count:", list.length);
        console.log("Data:", JSON.stringify(list, null, 2));
    } catch (e) {
        console.error("Error:", e);
    } finally {
        process.exit(0);
    }
}
check();
