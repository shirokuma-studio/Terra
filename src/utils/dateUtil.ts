export function date2Timestamp(date: number, type = "F"): string {
    const discordTimestamp = Math.round(date / 1000)
    return `<t:${discordTimestamp}:${type}>`
}