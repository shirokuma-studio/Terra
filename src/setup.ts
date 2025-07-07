import fs from "node:fs";
import {logger} from "./utils/logs";
import path from "node:path";
import sqlite3 from "sqlite3";
import {readFile} from "./utils/readFile";
import {executeRunQuery} from "./utils/database";

export async function setup() {
    const databaseDirectory = path.join(__dirname, "../database");
    try {
        if (!fs.existsSync(databaseDirectory)) {
            fs.mkdirSync(databaseDirectory);
            logger.info(`Created directory: ${databaseDirectory}`);
        }
    } catch (err) {
        return logger.error(`Error failed creating directory: "${err}"`);
    }

    const backupDirectory = path.join(__dirname, "../backups");
     try {
        if (!fs.existsSync(backupDirectory)) {
            fs.mkdirSync(backupDirectory);
            logger.info(`Created directory: ${backupDirectory}`);
        }
    } catch (err) {
        return logger.error(`Error failed creating backup directory: "${err}"`);
    }

    const databaseFiles = ["general.sqlite", "support.sqlite"];
    for (const fileName of databaseFiles) {
        const filePath = path.join(databaseDirectory, fileName)
        if (!fs.existsSync(filePath)) {
            const db = new sqlite3.Database(filePath, (err) => {
                if (err) {
                    return logger.error(`Error failed connect database: "${err}"`);
                }
            });
            db.close();
            logger.info(`Created database: ${filePath}`);
        }
    }

    const generalDatabasePath = path.join(databaseDirectory, "general.sqlite");
    const supportDatabasePath = path.join(databaseDirectory, "support.sqlite");
    const sqlDirectory = path.join(__dirname, "../sql");

    const createModeratorRoleTable = await readFile(path.join(sqlDirectory, "createModeratorRoleTable.sql"));
    const createBumpRoleTable = await readFile(path.join(sqlDirectory, "createBumpRoleTable.sql"));
    const createSupportRoleTable = await readFile(path.join(sqlDirectory, "createSupportRoleTable.sql"));
    const createSupportChannelTable = await readFile(path.join(sqlDirectory, "createSupportChannelTable.sql"));
    const createTempVoiceTable = await readFile(path.join(sqlDirectory, "createTempVoiceTable.sql"));
    const createBackupsTable = await readFile(path.join(sqlDirectory, "createBackupsTable.sql"));
    const createAutoRoleTable = await readFile(path.join(sqlDirectory, "createAutoRoleTable.sql")); // 追加

    if (createModeratorRoleTable) await executeRunQuery(generalDatabasePath, createModeratorRoleTable);
    if (createBumpRoleTable) await executeRunQuery(generalDatabasePath, createBumpRoleTable);
    if (createSupportRoleTable) await executeRunQuery(supportDatabasePath, createSupportRoleTable);
    if (createSupportChannelTable) await executeRunQuery(supportDatabasePath, createSupportChannelTable);
    if (createTempVoiceTable) await executeRunQuery(generalDatabasePath, createTempVoiceTable);
    if (createBackupsTable) await executeRunQuery(generalDatabasePath, createBackupsTable);
    if (createAutoRoleTable) await executeRunQuery(generalDatabasePath, createAutoRoleTable); // 追加

    return logger.info("Setup completed");
}