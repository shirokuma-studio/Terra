import fs from "node:fs";
import {logger} from "./logs";

export async function readFile(filePath: string) {
    try {
        return fs.promises.readFile(filePath, 'utf-8');
    } catch (e) {
        logger.error(`Failed to read file: ${filePath} \n ${e}`);
        return "";
    }
}