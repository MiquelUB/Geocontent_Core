
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function check() {
    const profiles = await prisma.profile.findMany()
    console.log('--- PROFILES ---')
    profiles.forEach(p => console.log(`${p.username} | ${p.role}`))
    process.exit(0)
}
check()
