import { Listener } from '@sapphire/framework';
import { VoiceState, Events } from 'discord.js';
import { executeGetQuery, executeRunQuery } from '../../utils/database';
import { logger } from '../../utils/logs';

export class TempVoiceStateUpdateListener extends Listener {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.VoiceStateUpdate
        });
    }

    public async run(oldState: VoiceState, newState: VoiceState) {
        // ユーザーがVCから退出した、または別のVCに移動した場合、古いチャンネルをチェック
        if (oldState.channel && oldState.channelId !== newState.channelId) {
            try {
                const tempChannel = await executeGetQuery(
                    '../database/general.sqlite',
                    'SELECT * FROM tempVoice WHERE voiceChannelId = ?',
                    [oldState.channel.id]
                );

                if (tempChannel && oldState.channel.members.size === 0) {
                    // チャンネルが空になったので削除
                    await oldState.channel.delete('Temporary channel empty');

                    // データベースからエントリを削除
                    await executeRunQuery(
                        '../database/general.sqlite',
                        'DELETE FROM tempVoice WHERE voiceChannelId = ?',
                        [oldState.channel.id]
                    );
                    logger.info(`Deleted temporary voice channel with ID ${oldState.channel.id}.`);
                }
            } catch (error) {
                // チャンネルが既に削除されている場合などのエラーを握りつぶす
                if (error.code !== 10003) { // Unknown Channel
                    logger.error(`Error in TempVoiceStateUpdateListener: ${error}`);
                }
            }
        }
    }
}