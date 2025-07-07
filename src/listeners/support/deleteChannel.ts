import {ApplyOptions} from '@sapphire/decorators';
import {Listener} from '@sapphire/framework';
import {Channel, ChannelType, Events} from "discord.js";
import {executeRunQuery} from "../../utils/database";

@ApplyOptions<Listener.Options>({once: false, event: Events.ChannelDelete})
export class UserEvent extends Listener {
    public override async run(channel: Channel) {
		if (!channel) return;
        if (channel.type !== ChannelType.GuildText) return;

        const deleteQuery = `
        	DELETE FROM supportChannel
        	WHERE channelId = ?;
        `

        await executeRunQuery("../database/support.sqlite", deleteQuery, [channel.id]);
        return;
    }
}
