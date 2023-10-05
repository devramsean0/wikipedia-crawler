export async function customFetch(url: string) {
    const res = await fetch(url, {
        headers: {
            'User-Agent': "WikipediaCrawler/1.0.0 (+https://www.github.com/devramsean0/wikipedia-crawler)"
        }
    })
    return res
}