import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ColorResolvable, EmbedBuilder, ModalSubmitInteraction, TextChannel } from 'discord.js';
import { logger } from '../../utils/logs';

@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.ModalSubmit,
})
export class EmbedCreatorModalHandler extends InteractionHandler {
    public override parse(interaction: ModalSubmitInteraction) {
        if (!interaction.customId.startsWith('embed-creator-')) return this.none();
        return this.some();
    }

    public async run(interaction: ModalSubmitInteraction) {
        await interaction.deferReply({ ephemeral: true });

        const channelId = interaction.customId.split('-')[2];
        const channel = await this.container.client.channels.fetch(channelId);

        if (!channel || !(channel instanceof TextChannel)) {
            return interaction.editReply({ content: 'チャンネルが見つかりませんでした。' });
        }

        try {
            const title = interaction.fields.getTextInputValue('title');
            const description = interaction.fields.getTextInputValue('description');
            const color = interaction.fields.getTextInputValue('color');
            const fieldsText = interaction.fields.getTextInputValue('fields');
            const footer = interaction.fields.getTextInputValue('footer');

            const embed = new EmbedBuilder();

            if (title) embed.setTitle(title);
            if (description) embed.setDescription(description);
            if (footer) embed.setFooter({ text: footer });
            if (color) {
                if (/^#[0-9a-f]{6}$/i.test(color)) {
                    embed.setColor(color as ColorResolvable);
                } else {
                    await interaction.editReply({ content: '色の形式が正しくありません。`#0099ff`のように入力してください。' });
                    return;
                }
            }
            
            if (fieldsText) {
                const fields = fieldsText.split('\n').map(line => {
                    const parts = line.split('|');
                    if (parts.length === 2 && parts[0].trim() && parts[1].trim()) {
                        return { name: parts[0].trim(), value: parts[1].trim() };
                    }
                    return null;
                }).filter(field => field !== null);

                if (fields.length > 0) {
                    embed.addFields(fields as {name: string, value: string}[]);
                }
            }
            
            if (Object.keys(embed.data).length === 0) {
                 await interaction.editReply({ content: '埋め込みの内容が空です。少なくとも1つの項目を入力してください。' });
                 return;
            }

            await channel.send({ embeds: [embed] });

            await interaction.editReply({ content: `${channel.toString()}に埋め込みを送信しました！` });

        } catch (error) {
            logger.error(`Failed to create embed: ${error}`);
            await interaction.editReply({ content: '埋め込みの作成中にエラーが発生しました。' });
        }
    }
}