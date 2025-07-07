import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import {ActionRowBuilder, ButtonInteraction, MessageFlags, RoleSelectMenuBuilder} from 'discord.js';
import {logger} from "../../../utils/logs";

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonHandler extends InteractionHandler {
	public async run(interaction: ButtonInteraction) {
		const select = new RoleSelectMenuBuilder()
			.setCustomId("settings:support:role:select")
			.setPlaceholder("サポーターとして設定するロールを選択してください。")
			.setMinValues(1)
			.setMaxValues(1)

		const row = new ActionRowBuilder<RoleSelectMenuBuilder>()
			.addComponents(select)

		await interaction.reply({
			content: "",
			flags: [MessageFlags.Ephemeral],
			components: [row]
		})

		return logger.info(`Executed "settings:support:role" command by ${interaction.user.tag}.`)
	}

	public override parse(interaction: ButtonInteraction) {
		if (interaction.customId !== 'settings:support:role') return this.none();

		return this.some();
	}
}
