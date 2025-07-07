import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import {ActionRowBuilder, ButtonInteraction, MessageFlags, RoleSelectMenuBuilder} from 'discord.js';
import {logger} from "../../../../utils/logs";

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonHandler extends InteractionHandler {
	public async run(interaction: ButtonInteraction) {
		try {
			const select = new RoleSelectMenuBuilder()
				.setCustomId("settings:general:noticeBumpRole:select")
				.setPlaceholder("Bump通知を行うロールを選択してください")
				.setMinValues(1)
				.setMaxValues(1)

			const row = new ActionRowBuilder<RoleSelectMenuBuilder>()
				.addComponents(select)

			await interaction.reply({
				content: "",
				flags: [MessageFlags.Ephemeral],
				components: [row]
			})

			return logger.info(`Executed "settings:general:noticeBumpRole" command by ${interaction.user.tag}.`)
		} catch (e) {
			await interaction.reply({
				content: "不明なエラーが発生しました。開発者に問い合わせてください。",
				flags: [MessageFlags.Ephemeral],
			})
			return logger.error(`Failed to create general settings panel. by ${interaction.user.tag}.`)
		}
	}

	public override parse(interaction: ButtonInteraction) {
		if (interaction.customId !== 'settings:general:noticeBumpRole') return this.none();

		return this.some();
	}
}
