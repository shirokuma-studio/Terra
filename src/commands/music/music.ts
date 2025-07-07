import { ApplyOptions } from '@sapphire/decorators';
import { Command, Subcommand } from '@sapphire/framework';
import { GuildMusicManager } from '../../lib/music/GuildMusicManager';

const musicManagers = new Map<string, GuildMusicManager>();

@ApplyOptions<Subcommand.Options>({
    name: 'music',
    description: '音楽を再生します。',
    subcommands: [
        { name: 'play', chatInputRun: 'chatInputPlay' },
        { name: 'skip', chatInputRun: 'chatInputSkip' },
        { name: 'stop', chatInputRun: 'chatInputStop' },
        { name: 'queue', chatInputRun: 'chatInputQueue' },
        { name: 'nowplaying', chatInputRun: 'chatInputNowPlaying' },
        { name: 'pause', chatInputRun: 'chatInputPause' },
        { name: 'resume', chatInputRun: 'chatInputResume' },
    ]
})
export class MusicCommand extends Subcommand {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand(builder =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('play')
                        .setDescription('曲を再生またはキューに追加します。')
                        .addStringOption(option =>
                            option.setName('query')
                                .setDescription('曲名またはYouTubeのURL')
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand => subcommand.setName('skip').setDescription('現在の曲をスキップします。'))
                .addSubcommand(subcommand => subcommand.setName('stop').setDescription('再生を停止し、VCから切断します。'))
                .addSubcommand(subcommand => subcommand.setName('queue').setDescription('再生キューを表示します。'))
                .addSubcommand(subcommand => subcommand.setName('nowplaying').setDescription('現在再生中の曲を表示します。'))
                .addSubcommand(subcommand => subcommand.setName('pause').setDescription('再生を一時停止します。'))
                .addSubcommand(subcommand => subcommand.setName('resume').setDescription('再生を再開します。'))
        );
    }
    
    private getMusicManager(guildId: string): GuildMusicManager {
        let manager = musicManagers.get(guildId);
        if (!manager) {
            manager = new GuildMusicManager(guildId);
            musicManagers.set(guildId, manager);
        }
        return manager;
    }

    public async chatInputPlay(interaction: Command.ChatInputCommandInteraction) {
        if (!interaction.guildId) return;
        const manager = this.getMusicManager(interaction.guildId);
        const query = interaction.options.getString('query', true);
        await manager.play(interaction, query);
    }

    public async chatInputSkip(interaction: Command.ChatInputCommandInteraction) {
        if (!interaction.guildId) return;
        const manager = this.getMusicManager(interaction.guildId);
        manager.skip(interaction);
    }

    public async chatInputStop(interaction: Command.ChatInputCommandInteraction) {
        if (!interaction.guildId) return;
        const manager = this.getMusicManager(interaction.guildId);
        manager.stop();
        musicManagers.delete(interaction.guildId);
        await interaction.reply({ content: '再生を停止しました。' });
    }

    public async chatInputQueue(interaction: Command.ChatInputCommandInteraction) {
        if (!interaction.guildId) return;
        const manager = this.getMusicManager(interaction.guildId);
        manager.showQueue(interaction);
    }

    public async chatInputNowPlaying(interaction: Command.ChatInputCommandInteraction) {
        if (!interaction.guildId) return;
        const manager = this.getMusicManager(interaction.guildId);
        manager.nowPlaying(interaction);
    }
    
    public async chatInputPause(interaction: Command.ChatInputCommandInteraction) {
        if (!interaction.guildId) return;
        const manager = this.getMusicManager(interaction.guildId);
        manager.pause(interaction);
    }

    public async chatInputResume(interaction: Command.ChatInputCommandInteraction) {
        if (!interaction.guildId) return;
        const manager = this.getMusicManager(interaction.guildId);
        manager.resume(interaction);
    }
}