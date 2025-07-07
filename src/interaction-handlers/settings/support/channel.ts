import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import {ActionRowBuilder, ButtonInteraction, ChannelSelectMenuBuilder, ChannelType, MessageFlags} from 'discord.js';
import {logger} from "../../../utils/logs";
import {executeGetQuery} from "../../../utils/database";

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonHandler extends InteractionHandler {
	public async run(interaction: ButtonInteraction) {
		const roleIdQuery = `
			SELECT roleId as id
			FROM supportRole
			WHERE guildId = ?;
		`
		try {
			const row = await executeGetQuery("../database/support.sqlite", roleIdQuery, [interaction.guildId]);
			if (!row.id) {
				await interaction.reply({
					content: "サポートロールを設定してから再度実行してください。",
					flags: [MessageFlags.Ephemeral]
				})
				return logger.warn(`Failed to create support channel. Support role not found. by ${interaction.user.tag}.`)
			}
		} catch (e) {
			await interaction.reply({
				content: "エラーが発生しました。管理者に問い合わせてください。",
				flags: [MessageFlags.Ephemeral]
			})
			return logger.error(`Error occurred while creating support channel: ${e}`)
		}

		const select = new ChannelSelectMenuBuilder()
			.setCustomId("settings:support:channel:select")
			.setPlaceholder("サポートチャンネルを選択してください。")
			.setChannelTypes([ChannelType.GuildText])
			.setMinValues(1)
			.setMaxValues(1)

		const row = new ActionRowBuilder<ChannelSelectMenuBuilder>()
			.addComponents(select)

		await interaction.reply({
			content: "",
			flags: [MessageFlags.Ephemeral],
			components: [row]
		})

		return logger.info(`Executed "settings:support:channel" command by ${interaction.user.tag}.`)
	}

	public override parse(interaction: ButtonInteraction) {
		if (interaction.customId !== 'settings:support:channel') return this.none();

		return this.some();
	}
}
