import robotsParser from "robots-parser";
import * as cheerio from "cheerio";
import { sleep } from "./lib/sleep.js";
import { page, unscrapedPage, PrismaClient } from "@prisma/client";
import { URLParser } from "./lib/urlParser.js";
import cron from "node-cron";
import { customFetch } from "./lib/fetch.js";
//import { updateDB } from "./lib/updateDB.js";

// DB
const db = new PrismaClient();
await db.$connect();

// Robots.TXT Cache
var robotsTXTCache: any = {};

const pagesToVisit: string[] = ["https://wikipedia.org"];
const pagesScraped: string[] = [];
// Setup these vars with historic data
(await db.page.findMany()).map((page: page) => {
    pagesScraped.push(page.url)
});
(await db.unscrapedPage.findMany()).map((page: unscrapedPage) => {
    pagesToVisit.push(page.url)
})
// Cron to manage resetting of robots.txt
var scrape = true;
cron.schedule('0 * * * *', () => {
    console.log("Resetting Robots.txt cache")
    scrape = false;
    sleep(2000)
    robotsTXTCache = {};
    scrape = true;
    console.log("Reset Robots.txt cache")
})
/* cron.schedule('0 0 * * *', async () => {
    console.log("Sending daily WebSocket")
    const _domainsCount = await db.domain.count();
    const _pagesCount = await db.page.count();
    
}) */
var startTime = new Date().getTime();
// Scraper script
while (pagesToVisit.length >= 1) {
    if (!scrape) continue;
    const url = pagesToVisit[0];
    if (URL.canParse(url)) {
        if (url.startsWith("/")) {
            console.log("Skipping (started with a /): ", url)
            pagesToVisit.shift();
            continue;
        } else {
            const URLParserClass = new URLParser(url);
            const baseURL = `${URLParserClass.protocool()}://${URLParserClass.host()}`
            const dbRecord = await db.domain.upsert({
                where: {
                    name: baseURL
                },
                update: {},
                create: {
                    sleepDuration: 1000,
                    name: baseURL
                }
            })
            sleep(Number(dbRecord.sleepDuration))
            if (URLParserClass.protocool() === null) {
                console.log("Skipping (Invalid protocool) :", url)
                pagesToVisit.shift();
                continue;
            }
            if (URLParserClass.protocool() === "https" || "http") {
            if (typeof(robotsTXTCache[baseURL]) == "undefined") {
                try {
                const robotsTXT = await customFetch(`${baseURL}/robots.txt`);  
                const robotsTXTString = await robotsTXT.text();
                robotsTXTCache[baseURL] = robotsTXTString;
                } catch {
                    console.log("Skipping (error when scraping robots.txt)")
                    pagesToVisit.shift();
                    continue;
                }
            }
            const robot = robotsParser(`${baseURL}/robots.txt`, robotsTXTCache[baseURL]);
            if (robot.isAllowed(url, "WikipediaCrawler")) {
                const sleepDelay = robot.getCrawlDelay("WikipediaCrawler");
                await db.domain.upsert({
                    where: {
                        name: baseURL
                    },
                    update: {
                        sleepDuration: sleepDelay
                    },
                    create: {
                        name: baseURL,
                        sleepDuration: sleepDelay
                    }
                })
                if (pagesScraped.includes(url)) {
                    pagesToVisit.shift();
                    continue;
                }
                try {
                    const pageHTML = await customFetch(url)
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
                        const unscrapedPageDBEntry = db.unscrapedPage.create({
                            data: {
                                url: newURL
                            }
                        })
                        Promise.resolve(unscrapedPageDBEntry);
                    });
                    console.log("Successfully scraped", url)
                    pagesToVisit.shift();
                    pagesScraped.push(url);
                    await db.unscrapedPage.deleteMany({
                        where: {
                            url: url
                        }
                    })
                    const title = $("title").first().text();
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
                            title: title
                        },
                    })
                } catch(e) {
                    console.log("Skipping (error when scraping)", url, e)
                    pagesToVisit.shift();
                    await db.unscrapedPage.deleteMany({
                        where: {
                            url: url
                        }
                    })
                    continue;
                }
            } else {
                console.log("Skipping (not allowed): ", url)
                pagesToVisit.shift();
                await db.unscrapedPage.deleteMany({
                    where: {
                        url: url
                    }
                })
                continue;
            }
        } else {
            console.log("Skipping (not http or https): ", url)
            pagesToVisit.shift();
            await db.unscrapedPage.deleteMany({
                where: {
                    url: url
                }
            })
            continue;
        }
        }
    } else {
        console.log("Skipping (can't parse URL): ", url)
        pagesToVisit.shift();
        await db.unscrapedPage.deleteMany({
            where: {
                url: url
            }
        })
        continue;
    }
}
var endTime = new Date().getTime();
console.log(`Took ${endTime - startTime}`)