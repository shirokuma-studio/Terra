import {
    AudioPlayer,
    AudioPlayerStatus,
    createAudioPlayer,
    createAudioResource,
    entersState,
    joinVoiceChannel,
    NoSubscriberBehavior,
    VoiceConnection,
    VoiceConnectionStatus
} from '@discordjs/voice';
import { CommandInteraction, EmbedBuilder, TextBasedChannel, VoiceBasedChannel } from 'discord.js';
import ytdl from 'ytdl-core';
import ytSearch from 'yt-search';
import { logger } from '../../utils/logs';

interface Song {
    title: string;
    url: string;
    thumbnail: string;
    duration: string;
    requester: string;
}

export class GuildMusicManager {
    public readonly guildId: string;
    public queue: Song[] = [];
    private connection: VoiceConnection | null = null;
    private player: AudioPlayer;
    private currentMessageChannel: TextBasedChannel | null = null;
    private lock = false;

    constructor(guildId: string) {
        this.guildId = guildId;
        this.player = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Pause,
            },
        });

        this.player.on(AudioPlayerStatus.Idle, () => {
            this.queue.shift();
            this.playNextSong().catch(e => logger.error(`Error playing next song: ${e}`));
        });

        this.player.on('error', error => {
            logger.error(`AudioPlayer Error in guild ${this.guildId}: ${error.message}`);
            this.stop();
        });
    }

    private join(channel: VoiceBasedChannel) {
        if (this.connection?.joinConfig.channelId === channel.id) return;

        this.connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });

        this.connection.on(VoiceConnectionStatus.Ready, () => {
            this.connection?.subscribe(this.player);
        });

        this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
            try {
                await Promise.race([
                    entersState(this.connection!, VoiceConnectionStatus.Signalling, 5_000),
                    entersState(this.connection!, VoiceConnectionStatus.Connecting, 5_000),
                ]);
            } catch (error) {
                this.stop();
            }
        });
    }

    public async play(interaction: CommandInteraction, query: string) {
        if (!interaction.guild || !interaction.member || !('voice' in interaction.member) || !interaction.member.voice.channel) {
            await interaction.reply({ content: '先にボイスチャンネルに参加してください。', ephemeral: true });
            return;
        }
        
        this.currentMessageChannel = interaction.channel;
        this.join(interaction.member.voice.channel);

        const song = await this.searchSong(query, interaction.user.tag);
        if (!song) {
            await interaction.reply({ content: '曲が見つかりませんでした。', ephemeral: true });
            return;
        }

        this.queue.push(song);
        const embed = new EmbedBuilder()
            .setColor('Green')
            .setTitle('キューに追加しました')
            .setDescription(`[${song.title}](${song.url})`)
            .setThumbnail(song.thumbnail)
            .addFields({ name: '再生時間', value: song.duration, inline: true })
            .setFooter({ text: `リクエスト者: ${song.requester}`});
            
        await interaction.reply({ embeds: [embed] });

        if (this.player.state.status !== AudioPlayerStatus.Playing) {
            await this.playNextSong();
        }
    }

    private async playNextSong() {
        if (this.lock || this.queue.length === 0) return;
        this.lock = true;

        try {
            const song = this.queue[0];
            if (!song) {
                this.stop();
                return;
            }

            const stream = ytdl(song.url, { filter: 'audioonly', quality: 'highestaudio', highWaterMark: 1 << 25 });
            const resource = createAudioResource(stream);
            this.player.play(resource);

            const embed = new EmbedBuilder()
                .setColor('Blue')
                .setTitle('再生開始')
                .setDescription(`[${song.title}](${song.url})`)
                .setThumbnail(song.thumbnail)
                .addFields({ name: '再生時間', value: song.duration, inline: true })
                .setFooter({ text: `リクエスト者: ${song.requester}`});

            this.currentMessageChannel?.send({ embeds: [embed] });

        } catch (error) {
            logger.error(`Error while playing song: ${error}`);
            this.currentMessageChannel?.send({ content: '再生中にエラーが発生しました。次の曲を試します。' });
            this.queue.shift();
            await this.playNextSong();
        } finally {
            this.lock = false;
        }
    }

    public skip(interaction: CommandInteraction) {
        if (this.queue.length === 0) {
            interaction.reply({ content: 'キューが空です。', ephemeral: true });
            return;
        }
        this.player.stop();
        interaction.reply({ content: '現在の曲をスキップしました。' });
    }

    public stop() {
        this.queue = [];
        this.player.stop();
        if (this.connection) {
            this.connection.destroy();
            this.connection = null;
        }
    }
    
    public pause(interaction: CommandInteraction) {
        if (this.player.state.status === AudioPlayerStatus.Playing) {
            this.player.pause();
            interaction.reply({ content: '再生を一時停止しました。', ephemeral: true });
        } else {
            interaction.reply({ content: '現在再生中ではありません。', ephemeral: true });
        }
    }

    public resume(interaction: CommandInteraction) {
        if (this.player.state.status === AudioPlayerStatus.Paused) {
            this.player.unpause();
            interaction.reply({ content: '再生を再開しました。', ephemeral: true });
        } else {
            interaction.reply({ content: '一時停止中ではありません。', ephemeral: true });
        }
    }

    public showQueue(interaction: CommandInteraction) {
        if (this.queue.length === 0) {
            interaction.reply({ content: '現在、再生キューは空です。', ephemeral: true });
            return;
        }

        const nowPlaying = this.queue[0];
        const upcoming = this.queue.slice(1, 11);

        const embed = new EmbedBuilder()
            .setColor('Aqua')
            .setTitle('再生キュー')
            .setDescription(`**現在再生中:**\n[${nowPlaying.title}](${nowPlaying.url}) | \`${nowPlaying.duration}\`\n\n**次の曲:**`);

        if (upcoming.length > 0) {
            const queueString = upcoming.map((song, index) => `${index + 1}. [${song.title}](${song.url}) | \`${song.duration}\``).join('\n');
            embed.addFields({ name: '\u200b', value: queueString });
        } else {
            embed.addFields({ name: '\u200b', value: "キューに待機中の曲はありません。" });
        }
        
        if (this.queue.length > 11) {
            embed.setFooter({ text: `...他${this.queue.length - 11}曲` });
        }

        interaction.reply({ embeds: [embed] });
    }

    public nowPlaying(interaction: CommandInteraction) {
        if (this.queue.length === 0 || this.player.state.status !== AudioPlayerStatus.Playing) {
            interaction.reply({ content: '現在再生中の曲はありません。', ephemeral: true });
            return;
        }
        const song = this.queue[0];
        const embed = new EmbedBuilder()
            .setColor('Blue')
            .setTitle('現在再生中')
            .setDescription(`[${song.title}](${song.url})`)
            .setThumbnail(song.thumbnail)
            .addFields(
                { name: '再生時間', value: song.duration, inline: true },
                { name: 'リクエスト者', value: song.requester, inline: true },
            );
        interaction.reply({ embeds: [embed] });
    }

    private async searchSong(query: string, requester: string): Promise<Song | null> {
        try {
            if (ytdl.validateURL(query)) {
                const info = await ytdl.getInfo(query);
                return {
                    title: info.videoDetails.title,
                    url: info.videoDetails.video_url,
                    thumbnail: info.videoDetails.thumbnails[0].url,
                    duration: this.formatDuration(parseInt(info.videoDetails.lengthSeconds)),
                    requester: requester
                };
            } else {
                const { videos } = await ytSearch(query);
                if (videos.length === 0) return null;
                const video = videos[0];
                return {
                    title: video.title,
                    url: video.url,
                    thumbnail: video.thumbnail,
                    duration: video.timestamp,
                    requester: requester
                };
            }
        } catch (error) {
            logger.error(`Error searching song: ${error}`);
            return null;
        }
    }

    private formatDuration(seconds: number): string {
        if (seconds === 0) return "Live";
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return [h > 0 ? h : null, m, s]
            .filter(x => x !== null)
            .map(x => String(x).padStart(2, '0'))
            .join(':');
    }
}