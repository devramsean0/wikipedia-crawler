/*
MINIMAL robots.txt example
import fetch from "node-fetch";
import robotsParser from "robots-parser";

const robotsTXT = await fetch("https://en.wikipedia.org/robots.txt");
const robotsTXTString = await robotsTXT.text();
const robot = robotsParser(
    "https://en.wikipedia.org/robots.txt",
    robotsTXTString
)
console.log(robot.isAllowed('https://en.wikipedia.org/api/', '*')); */
import fetch from "node-fetch";
import robotsParser from "robots-parser";
import * as cheerio from "cheerio";
import { sleep } from "./lib/sleep.js";
import { PrismaClient } from "@prisma/client";

// DB
const db = new PrismaClient();
await db.$connect();

// Robots.TXT Cache
const robotsTXTCache: any = {};

const pagesToVisit: string[] = ["https://www.wikipedia.org"];
const pagesVisited: string[] = [];

while (pagesToVisit.length >= 1) {
    const url = pagesToVisit[0];
    const parsedURL = new URL(url);
    const baseURL = `${parsedURL.protocol}/${parsedURL.host}`

    // Ensure domain / page is in DB
    const domain = await db.domain.upsert({
        where: {
            name: baseURL
        },
        update: {},
        create: {
            name: baseURL
        }
    })
    await db.page.upsert({
        where: {
            url: url
        },
        update: {},
        create: {
            url: url,
            domainId: domain.id
        }
    })
    // Ensure robots.txt is in the cache
    if (typeof(robotsTXTCache[baseURL]) == undefined) {
        const robotsTXT = await fetch(`${baseURL}/robots.txt`);  
        const robotsTXTString = await robotsTXT.text();
        robotsTXTCache[baseURL] = robotsTXTString;
    }
    const robot = robotsParser(
        `${baseURL}/robots.txt`,
        robotsTXTCache[baseURL]
    )
    // Do the parsing if allowed
    if (robot.isAllowed(url)) {
        const pageHTML = await fetch(url);
        const pageHTMLString = await pageHTML.text();
        const $ = cheerio.load(pageHTMLString);
        $("a").each((_index, element) => {
            const newURL = `https:${String($(element).attr("href"))}`;
            pagesToVisit.push(newURL)
        }) 
        pagesToVisit.shift();
        console.log("crawled page:", url);
        pagesVisited.push(url)
        const domain = await db.domain.upsert({
            where: {
                name: baseURL
            },
            update: {},
            create: {
                name: baseURL
            }
        })
        const dbPage = await db.page.upsert({
            where: {
                url: url
            },
            update: {},
            create: {
                url: url,
                domainId: domain.id,
            },
            include: {
                reachedBy: true
            }
        })
    } else {
        pagesToVisit.shift();
        continue;
    }
    sleep(1000);
}