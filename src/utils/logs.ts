import {User} from "discord.js";
import {getCallSites} from "node:util";

export function commandLog(name: string, user: User): void {
    return logger.info(`Executed command "${name}" by ${user.tag}[${user.id}]`);
}

/*
loggerの使い方
logger関数をimportしたら使えます。
e.g ->
    logger.info("some messages here.") //info message.
 */

export function logger() {
}

logger.date = () => {
    const dateFormat = Intl.DateTimeFormat(
        //undefinedにするとシステム依存の時間になります。
        undefined, {
            // @ts-ignore
            fractionalSecondDigits: 3,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        }
    )
    return dateFormat.format(new Date()).replace(" ", "T")
}

logger.getCallSite = () => {
    const callsite = getCallSites().at(2)
    // @ts-ignore
    return `file:///${callsite.scriptName}:${callsite.lineNumber}`
}

logger.TYPE = {
    //ANSI-Escapecode: https://en.wikipedia.org/wiki/ANSI_escape_code#Colors
    //90: GRAY
    DEBUG: `\u001B[90m[DEBUG]\u001B[0m`,
    //31: RED
    ERROR: `\u001B[31m[ERROR]\u001B[0m`,
    //32: GREEN
    INFO: `\u001B[32m[INFO]\u001B[0m`,
    //33: YELLOW
    WARN: `\u001B[33m[WARN]\u001B[0m`,
}

logger.debug = function (msg: any) {
    console.debug(`${this.date()}\t${this.TYPE.DEBUG}\t${msg} ${this.getCallSite()}`)
}
logger.info = function (msg: any) {
    console.info(`${this.date()}\t${this.TYPE.INFO}\t${msg} ${this.getCallSite()}`)
}
logger.warn = function (msg: any) {
    console.warn(`${this.date()}\t${this.TYPE.WARN}\t${msg} ${this.getCallSite()}`)
}
logger.error = function (msg: any) {
    console.error(`${this.date()}\t${this.TYPE.ERROR}\t${msg} ${this.getCallSite()}`)
}