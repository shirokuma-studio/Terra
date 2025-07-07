import {Listener} from '@sapphire/framework';
import {Events, Message} from "discord.js";

import {embedMaker, MessageTypes} from "../../utils/messageUtil";
import config from "../../../config.json";
import {logger} from "../../utils/logs";


export class ReadyListener extends Listener {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            once: false,
            event: Events.MessageDelete
        });
    }

    public async run(message: Message) {
        if(message.author.bot) return

        const guild = message.guild
        if(!guild) return

        const messageChannel = await guild.channels.fetch(config.audit.message.deleteLogID)

        if(!messageChannel) {
            logger.error(`Failed to fetch channel.(guild: ${guild.id}, channel: ${config.audit.message.deleteLogID})`)
            return
        }
        if(!messageChannel.isSendable()) {
            logger.error(`MessageChannel(id: ${config.audit.message.deleteLogID}) is not senddable message. Check bot and channel Permissions.`)
            return
        }
        await messageChannel.send({embeds: [await embedMaker(message, MessageTypes.DELETE)]})

    }

}