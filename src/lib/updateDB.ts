import { PrismaClient } from "@prisma/client";

export async function updateDB(db: PrismaClient, baseURL: string, url: string) {
    const dbDomain = await db.domain.upsert({
        where: {
            name: baseURL
        },
        update: {
            name: baseURL
        },
        create: {
            name: baseURL,
        }
    })
    await db.page.upsert({
        where: {
            url: url
        },
        update: {},
        create: {
            url: url,
            domainId: dbDomain.id
        }
    })
}