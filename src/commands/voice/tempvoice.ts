import { Command } from '@sapphire/framework';
import { ChannelType, PermissionFlagsBits } from 'discord.js';
import { executeRunQuery } from '../../utils/database';
import { logger } from '../../utils/logs';

export class TempVoiceCommand extends Command {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName('voice')
                .setDescription('一時的なボイスチャンネルを作成します。')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('チャンネル名')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('user_limit')
                        .setDescription('参加人数の上限')
                        .setRequired(false))
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        if (!interaction.guild || !interaction.member) {
            await interaction.reply({ content: 'このコマンドはサーバー内でのみ使用できます。', ephemeral: true });
            return;
        }

        const channelName = interaction.options.getString('name', true);
        const userLimit = interaction.options.getInteger('user_limit') || 0;
        const creator = interaction.member;

        try {
            const voiceChannel = await interaction.guild.channels.create({
                name: channelName,
                type: ChannelType.GuildVoice,
                userLimit: userLimit,
                permissionOverwrites: [
                    {
                        id: interaction.guild.roles.everyone.id,
                        deny: [PermissionFlagsBits.ViewChannel], // デフォルトで全員が見えないように変更
                    },
                    {
                        id: typeof creator === 'string' ? creator : creator.id,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.ManageChannels,
                            PermissionFlagsBits.Connect,
                            PermissionFlagsBits.Speak,
                            PermissionFlagsBits.Stream,
                            PermissionFlagsBits.MoveMembers,
                            PermissionFlagsBits.MuteMembers,
                            PermissionFlagsBits.DeafenMembers
                        ],
                    },
                ],
            });

            await executeRunQuery(
                '../database/general.sqlite',
                'INSERT INTO tempVoice (guildId, creatorId, voiceChannelId) VALUES (?, ?, ?)',
                [interaction.guild.id, typeof creator === 'string' ? creator : creator.id, voiceChannel.id]
            );

            await interaction.reply({ content: `ボイスチャンネル「${channelName}」を作成しました。`, ephemeral: true });
            logger.info(`Created temporary voice channel "${channelName}" by ${interaction.user.tag}.`);

        } catch (error) {
            logger.error(`Failed to create temporary voice channel: ${error}`);
            await interaction.reply({ content: 'チャンネルの作成に失敗しました。', ephemeral: true });
        }
    }
}