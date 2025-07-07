import {ApplyOptions} from '@sapphire/decorators';
import {Command, Subcommand} from '@sapphire/framework';
import {
    ActionRowBuilder,
    ButtonBuilder,
    EmbedBuilder,
    MessageFlags,
    ButtonStyle,
    PermissionFlagsBits,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} from "discord.js";
import {logger} from "../../utils/logs";
import { executeRunQuery, executeAllQuery } from '../../utils/database';

@ApplyOptions<Subcommand.Options>({
    name: "settings",
    description: 'ボットの設定をするためのコマンドです。',
    subcommands: [
        {
            name: 'panel',
            chatInputRun: 'chatInputPanel',
            default: true
        },
        {
            name: 'ngword',
            type: 'group',
            entries: [
                { name: 'add', chatInputRun: 'chatInputNgWordAdd' },
                { name: 'remove', chatInputRun: 'chatInputNgWordRemove' },
                { name: 'list', chatInputRun: 'chatInputNgWordList' },
            ]
        }
    ]
})
export class SettingsCommand extends Subcommand {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder //
                .setName(this.name)
                .setDescription(this.description)
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('panel')
                        .setDescription('設定パネルを表示します。')
                )
                .addSubcommandGroup((group) =>
                    group
                        .setName('ngword')
                        .setDescription('NGワードの設定をします。')
                        .addSubcommand((subcommand) =>
                            subcommand
                                .setName('add')
                                .setDescription('NGワードを追加します。')
                                .addStringOption((option) =>
                                    option
                                        .setName('word')
                                        .setDescription('追加するNGワード')
                                        .setRequired(true)
                                )
                        )
                        .addSubcommand((subcommand) =>
                            subcommand
                                .setName('remove')
                                .setDescription('NGワードを削除します。')
                                .addStringOption((option) =>
                                    option
                                        .setName('word')
                                        .setDescription('削除するNGワード')
                                        .setRequired(true)
                                )
                        )
                        .addSubcommand((subcommand) =>
                            subcommand
                                .setName('list')
                                .setDescription('NGワードの一覧を表示します。')
                        )
                )
        );
    }

    public async chatInputPanel(interaction: Command.ChatInputCommandInteraction) {
        // (既存のコード)
    }

    public async chatInputNgWordAdd(interaction: Command.ChatInputCommandInteraction) {
        if (!interaction.guildId) return;
        const word = interaction.options.getString('word', true);

        try {
            await executeRunQuery(
                '../database/general.sqlite',
                'INSERT INTO ngWords (guildId, word) VALUES (?, ?)',
                [interaction.guildId, word]
            );
            await interaction.reply({
                content: `「${word}」をNGワードに追加しました。`,
                flags: [MessageFlags.Ephemeral],
            });
            logger.info(`Added NG word "${word}" by ${interaction.user.tag}.`);
        } catch (error) {
            logger.error(`Failed to add NG word: ${error}`);
            await interaction.reply({
                content: 'NGワードの追加に失敗しました。',
                flags: [MessageFlags.Ephemeral],
            });
        }
    }

    public async chatInputNgWordRemove(interaction: Command.ChatInputCommandInteraction) {
        if (!interaction.guildId) return;
        const word = interaction.options.getString('word', true);

        try {
            await executeRunQuery(
                '../database/general.sqlite',
                'DELETE FROM ngWords WHERE guildId = ? AND word = ?',
                [interaction.guildId, word]
            );
            await interaction.reply({
                content: `「${word}」をNGワードから削除しました。`,
                flags: [MessageFlags.Ephemeral],
            });
            logger.info(`Removed NG word "${word}" by ${interaction.user.tag}.`);
        } catch (error) {
            logger.error(`Failed to remove NG word: ${error}`);
            await interaction.reply({
                content: 'NGワードの削除に失敗しました。',
                flags: [MessageFlags.Ephemeral],
            });
        }
    }

    public async chatInputNgWordList(interaction: Command.ChatInputCommandInteraction) {
        if (!interaction.guildId) return;

        try {
            const rows = await executeAllQuery(
                '../database/general.sqlite',
                'SELECT word FROM ngWords WHERE guildId = ?',
                [interaction.guildId]
            );

            if (rows.length === 0) {
                await interaction.reply({
                    content: '登録されているNGワードはありません。',
                    flags: [MessageFlags.Ephemeral],
                });
                return;
            }

            const wordList = rows.map(row => `- ${row.word}`).join('\n');
            const embed = new EmbedBuilder()
                .setTitle('NGワードリスト')
                .setDescription(wordList)
                .setColor('Red');

            await interaction.reply({
                embeds: [embed],
                flags: [MessageFlags.Ephemeral],
            });
        } catch (error) {
            logger.error(`Failed to list NG words: ${error}`);
            await interaction.reply({
                content: 'NGワードの取得に失敗しました。',
                flags: [MessageFlags.Ephemeral],
            });
        }
    }
}