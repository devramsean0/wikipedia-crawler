export class URLParser {
    public url = "";
    constructor(url: string) {
        this.url = url
    }
    private computeRegex(pattern: RegExp) {
        const match: RegExpExecArray | null = pattern.exec(this.url);
        if (match) {
            const protocol: string = match[1];
            return protocol
        } else {
            return null
        }
    }
    public protocool() {
        const pattern: RegExp = /^(\w+):\/\//;
        return this.computeRegex(pattern);
    }
    public host() {
        const pattern: RegExp = /^(?:\w+:\/\/)?([^/]+)/
        return this.computeRegex(pattern);
    }
}