import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import {
    ActionRowBuilder,
    ChannelType,
    ModalBuilder,
    PermissionFlagsBits,
    TextInputBuilder,
    TextInputStyle
} from 'discord.js';

@ApplyOptions<Command.Options>({
    name: 'embed',
    description: '埋め込みメッセージを作成します。',
    requiredUserPermissions: [PermissionFlagsBits.ManageMessages],
})
export class EmbedCommand extends Command {
    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand(builder =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('埋め込みを送信するチャンネル')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        );
    }

    public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const channel = interaction.options.getChannel('channel', true);

        const modal = new ModalBuilder()
            .setCustomId(`embed-creator-${channel.id}`)
            .setTitle('埋め込み作成');

        const titleInput = new TextInputBuilder()
            .setCustomId('title')
            .setLabel('タイトル')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        const descriptionInput = new TextInputBuilder()
            .setCustomId('description')
            .setLabel('説明文')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false);

        const colorInput = new TextInputBuilder()
            .setCustomId('color')
            .setLabel('色 (例: #0099ff)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('#000000 形式で入力してください')
            .setRequired(false);
            
        const fieldsInput = new TextInputBuilder()
            .setCustomId('fields')
            .setLabel('フィールド (タイトル|内容)')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('フィールド1のタイトル|フィールド1の内容\nフィールド2のタイトル|フィールド2の内容')
            .setRequired(false);

        const footerInput = new TextInputBuilder()
            .setCustomId('footer')
            .setLabel('フッター')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput),
            new ActionRowBuilder<TextInputBuilder>().addComponents(descriptionInput),
            new ActionRowBuilder<TextInputBuilder>().addComponents(colorInput),
            new ActionRowBuilder<TextInputBuilder>().addComponents(fieldsInput),
            new ActionRowBuilder<TextInputBuilder>().addComponents(footerInput)
        );

        await interaction.showModal(modal);
    }
}