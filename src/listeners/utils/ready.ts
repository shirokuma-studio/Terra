import {Listener} from '@sapphire/framework';
import {Client} from "discord.js";

export class ReadyListener extends Listener {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            once: true,
            event: 'ready'
        });
    }

    public run(client: Client) {
        const {username, id} = client.user!;
        this.container.logger.info(`Logged in as ${username} (${id})`);
    }
}