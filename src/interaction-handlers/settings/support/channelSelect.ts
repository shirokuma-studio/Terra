import {ApplyOptions} from '@sapphire/decorators';
import {InteractionHandler, InteractionHandlerTypes} from '@sapphire/framework';
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    MessageFlags,
    StringSelectMenuInteraction
} from 'discord.js';
import {logger} from "../../../utils/logs";

@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.SelectMenu
})
export class MenuHandler extends InteractionHandler {
    public override async run(interaction: StringSelectMenuInteraction) {
        const channelId = interaction.values[0];
        if (!interaction.guild) {
            await interaction.reply({
                content: "サーバー情報の取得に失敗しました。",
                flags: [MessageFlags.Ephemeral]
            });
            return logger.warn(`Failed to set support channel. Guild not found. by ${interaction.user.tag}.`);
        }

        const channel = this.container.client.channels.cache.get(channelId)
        if (!channel) {
            await interaction.reply({
                content: "チャンネル情報の取得に失敗しました。",
                flags: [MessageFlags.Ephemeral]
            });
            return logger.warn(`Failed to set support channel. Channel not found. by ${interaction.user.tag}.`);
        }

        const embed = new EmbedBuilder()
            .setColor("White")
            .setTitle("お問い合わせ")
            .setDescription("下の青色のボタンを押すことで、\n専門のサポーターに問い合わせることができます。")

        const button = new ButtonBuilder()
            .setStyle(ButtonStyle.Primary)
            .setLabel("問い合わせる")
            .setCustomId("support:contact")

        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(button)

        if (!channel.isSendable()) {
            await interaction.reply({
                content: "Botが指定されたチャンネルにメッセージを送信できません。",
                flags: [MessageFlags.Ephemeral],
            })
            return logger.warn(`Failed to set support channel. Bot cannot send message to channel. by ${interaction.user.tag}.`);
        }

        await channel.send({
            embeds: [embed],
            components: [row]
        })

        await interaction.reply({
            content: "サポートコンタクトチャンネルの設定に成功しました！削除したい場合はチャンネルまたは、Botが送信したメッセージを削除してください。",
            flags: [MessageFlags.Ephemeral]
        })

        return logger.info(`Executed "settings:support:channel:select" command by ${interaction.user.tag}.`)
    }

    public override parse(interaction: StringSelectMenuInteraction) {
        if (interaction.customId !== 'settings:support:channel:select') return this.none();

        return this.some();
    }
}
