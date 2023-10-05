import robotsParser from "robots-parser";
import * as cheerio from "cheerio";
import { sleep } from "./lib/sleep.js";
import { PrismaClient } from "@prisma/client";
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