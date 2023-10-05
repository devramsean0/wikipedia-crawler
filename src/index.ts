/* import fetch from "node-fetch";
import robotsParser from "robots-parser";
import * as cheerio from "cheerio";
import { sleep } from "./lib/sleep.js";
import { PrismaClient } from "@prisma/client";

// DB
const db = new PrismaClient();
await db.$connect();

// Robots.TXT Cache
const robotsTXTCache: any = {};

const pagesToVisit: string[] = ["https://www.sean.cyou/"];
const pagesVisited: string[] = [];

while (pagesToVisit.length >= 1) {
    const url = pagesToVisit[0];
    var parsedURL: URL = new URL("https://example.com");
    if (URL.canParse(url)) {
        parsedURL = new URL(url);
    } else { 
        console.log(`Skipped URL: ${url}`);
        pagesToVisit.shift();
        continue;
    }
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
        try {
        const pageHTML = await fetch(url)
        const pageHTMLString = await pageHTML.text();
        const $ = cheerio.load(pageHTMLString);
        $("a").each((_index, element) => {
            const href = $(element).attr("href");
            if (!href?.startsWith("//")) {
                const newURL = `${String($(element).attr("href"))}/`;
                pagesToVisit.push(newURL)
            } else {
                const newURL = `https:${String($(element).attr("href"))}/`;
                pagesToVisit.push(newURL)
            }
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
        await db.page.upsert({
            where: {
                url: url
            },
            update: {},
            create: {
                url: url,
                domainId: domain.id,
            },
        })
        console.log("Saved crawled site to DB")
    } catch {
        pagesToVisit.shift();
        continue;
    }
    } else {
        pagesToVisit.shift();
        continue;
    }
    sleep(250);
} */

import robotsParser from "robots-parser";
import * as cheerio from "cheerio";
import { sleep } from "./lib/sleep.js";
import { PrismaClient } from "@prisma/client";
import { URLParser } from "./lib/urlParser.js";
//import { updateDB } from "./lib/updateDB.js";

// DB
const db = new PrismaClient();
await db.$connect();

// Robots.TXT Cache
const robotsTXTCache: any = {};

const pagesToVisit: string[] = ["https://wikipedia.org"];
const pagesScraped: string[] = [];

while (pagesToVisit.length >= 1) {
    const url = pagesToVisit[0];
    if (URL.canParse(url)) {
        if (url.startsWith("/")) {
            console.log("Skipping (started with a /): ", url)
            pagesToVisit.shift();
            continue;
        } else {
            const URLParserClass = new URLParser(url);
            const baseURL = `${URLParserClass.protocool()}://${URLParserClass.host()}`
            if (URLParserClass.protocool() === null) {
                console.log("Skipping (Invalid protocool) :", url)
                pagesToVisit.shift();
                continue;
            }
            if (URLParserClass.protocool() === "https" || "http") {
            if (typeof(robotsTXTCache[baseURL]) == "undefined") {
                try {
                const robotsTXT = await fetch(`${baseURL}/robots.txt`);  
                const robotsTXTString = await robotsTXT.text();
                robotsTXTCache[baseURL] = robotsTXTString;
                } catch {
                    console.log("Skipping (error when scraping robots.txt)")
                    pagesToVisit.shift();
                    continue;
                }
            }
            const robot = robotsParser(`${baseURL}/robots.txt`, robotsTXTCache[baseURL]);
            if (robot.isAllowed(url)) {
                if (pagesScraped.includes(url) || await db.page.count({
                    where: {
                        url: url
                    }
                }) == 1) {
                    pagesToVisit.shift();
                    continue;
                }
                try {
                    const pageHTML = await fetch(url)
                    const pageHTMLString = await pageHTML.text();
                    const $ = cheerio.load(pageHTMLString);
                    $("a").each((_index, element) => {
                        var newURL = `${String($(element).attr("href"))}/`;
                        if (newURL.startsWith("//")) {
                            const oldURL = newURL;
                            newURL = `${URLParserClass.protocool()}:${oldURL}`
                        } else if (newURL.startsWith("/")) {
                            const relativeURL = newURL;
                            newURL = `${baseURL}${relativeURL}`
                        }
                        pagesToVisit.push(newURL)
                    });
                    console.log("Successfully scraped", url)
                    pagesToVisit.shift();
                    pagesScraped.push(url);
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
                            domainId: domain.id,
                        },
                    })
                    sleep(1000)
                } catch {
                    console.log("Skipping (error when scraping)", url)
                    pagesToVisit.shift();
                    continue;
                }
            } else {
                console.log("Skipping (not allowed): ", url)
                pagesToVisit.shift();
                continue;
            }
        } else {
            console.log("Skipping (not http or https): ", url)
            pagesToVisit.shift();
            continue;
        }
        }
    } else {
        console.log("Skipping (can't parse URL): ", url)
        pagesToVisit.shift();
        continue;
    }
}