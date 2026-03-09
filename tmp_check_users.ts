
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const users = await prisma.$queryRaw`
    SELECT u.id, u.email, p.username, p.xp, p.level 
    FROM auth.users u 
    JOIN public.profiles p ON u.id = p.id
  `
    console.log(JSON.stringify(users, null, 2))
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
