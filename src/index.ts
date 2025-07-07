import {SapphireClient} from "@sapphire/framework";
import {GatewayIntentBits} from "discord.js";
import {logger} from "./utils/logs";
import {setup} from "./setup";

async function start(): Promise<void> {
    await setup();

    const token = process.env.BUON_APPETITO_TOKEN;
    if (!token) {
        return logger.error("No token found");
    }

    const client = new SapphireClient({
        intents: [GatewayIntentBits.MessageContent, GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildVoiceStates],
        loadMessageCommandListeners: true
    });

    await client.login(token);
}

start();