CREATE TABLE IF NOT EXISTS supportChannel(
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    guildId   TEXT NOT NULL,
    channelId TEXT NOT NULL,
    userId    TEXT NOT NULL
);