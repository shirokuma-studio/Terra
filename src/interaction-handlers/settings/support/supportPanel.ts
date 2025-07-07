import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import {ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, EmbedBuilder, MessageFlags} from 'discord.js';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonHandler extends InteractionHandler {
	public async run(interaction: ButtonInteraction) {
		const embed = new EmbedBuilder()
			.setTitle("サポート設定")
			.setColor("White")
			.addFields(
				{
					name: "チャンネル",
					value: "サポートへのコンタクを行うチャンネルを設定します。",
					inline: true
				},
				{
					name: "ロール",
					value: "サポーターロールを設定します。",
					inline: true
				}
			)

		const channelButton = new ButtonBuilder()
			.setLabel("チャンネル")
			.setStyle(ButtonStyle.Primary)
			.setCustomId("settings:support:channel")

		const roleButton = new ButtonBuilder()
			.setLabel("ロール")
			.setStyle(ButtonStyle.Primary)
			.setCustomId("settings:support:role")

		const row = new ActionRowBuilder<ButtonBuilder>()
			.addComponents(channelButton, roleButton)

		await interaction.reply({
			content: "",
			flags: [MessageFlags.Ephemeral],
			embeds: [embed],
			components: [row]
		})
	}

	public override parse(interaction: ButtonInteraction) {
		if (interaction.customId !== 'settings:support') return this.none();

		return this.some();
	}
}
