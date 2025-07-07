import { Listener } from '@sapphire/framework';
import { Message, Events } from 'discord.js';
import { executeAllQuery } from '../../utils/database';
import { logger } from '../../utils/logs';

export class NgWordListener extends Listener {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.MessageCreate
        });
    }

    public async run(message: Message) {
        if (message.author.bot || !message.guild) {
            return;
        }

        try {
            const ngWords = await executeAllQuery(
                '../database/general.sqlite',
                'SELECT word FROM ngWords WHERE guildId = ?',
                [message.guild.id]
            );

            if (ngWords.length === 0) {
                return;
            }

            const content = message.content.toLowerCase();
            const hasNgWord = ngWords.some(row => content.includes(row.word.toLowerCase()));

            if (hasNgWord) {
                await message.delete();
                logger.info(`Deleted a message containing a NG word from ${message.author.tag}.`);
                
                // 必要であればユーザーにDMで通知を送る
                try {
                    await message.author.send({
                        content: `あなたのメッセージはサーバーのNGワードを含んでいたため、削除されました。\nサーバー: ${message.guild.name}`
                    });
                } catch (dmError) {
                    logger.error(`Failed to send DM to ${message.author.tag}.`);
                }
            }
        } catch (error) {
            logger.error(`Error in NgWordListener: ${error}`);
        }
    }
}