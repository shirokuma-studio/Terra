import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import {ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, EmbedBuilder, MessageFlags} from 'discord.js';
import {logger} from "../../../utils/logs";

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonHandler extends InteractionHandler {
	public async run(interaction: ButtonInteraction) {
		console.log(interaction.customId)
		try {
			const embed = new EmbedBuilder()
				.setTitle("一般設定")
				.setColor("White")
				.addFields(
					{
						name: "Bump通知ロール",
						value: "Bump通知でメンションされるロールを設定します。",
						inline: true
					}
				)

			const noticeBumpRoleButton = new ButtonBuilder()
				.setLabel("Bump通知ロール")
				.setStyle(ButtonStyle.Primary)
				.setCustomId("settings:general:noticeBumpRole")

			const row = new ActionRowBuilder<ButtonBuilder>()
				.addComponents(noticeBumpRoleButton)

			await interaction.reply({
				content: "",
				flags: [MessageFlags.Ephemeral],
				embeds: [embed],
				components: [row]
			});

			return logger.info(`Executed "settings:general" command by ${interaction.user.tag}.`)
		} catch (e) {
			await interaction.reply({
				content: "エラーが発生しました。開発者に問い合わせてください。",
				flags: [MessageFlags.Ephemeral],
			})
			return logger.error(`Failed to create general settings panel. by ${interaction.user.tag}.`)
		}
	}

	public override parse(interaction: ButtonInteraction) {
		if (interaction.customId !== 'settings:general') return this.none();

		return this.some();
	}
}
