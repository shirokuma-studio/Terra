import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import {MessageFlags, StringSelectMenuInteraction} from 'discord.js';
import {logger} from "../../../../utils/logs";
import {executeRunQuery} from "../../../../utils/database";

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.SelectMenu
})
export class MenuHandler extends InteractionHandler {
	public override async run(interaction: StringSelectMenuInteraction) {
		const deleteQuery = `
			DELETE FROM bumpRole
			WHERE guildId = ?;
		`
		const insertQuery = `
			INSERT INTO bumpRole (guildId, roleId)
			VALUES (?, ?);
		`
		try {
			await executeRunQuery("../database/general.sqlite", deleteQuery, [interaction.guildId]);
			await executeRunQuery("../database/general.sqlite", insertQuery, [interaction.guildId, interaction.values[0]]);

			await interaction.reply({
				content: `<@&${interaction.values[0]}>を通知ロールとして設定しました。`,
				flags: [MessageFlags.Ephemeral]
			})
			return logger.info(`Executed "settings:general:noticeBumpRole:select" command by ${interaction.user.tag}.`)
		} catch (e) {
			await interaction.reply({
				content: "不明なエラーが発生しました。開発者に問い合わせてください。",
				flags: [MessageFlags.Ephemeral]
			})
			return logger.error(`Failed to create general settings panel. by ${interaction.user.tag}. Error: ${e}`)
		}
	}

	public override parse(interaction: StringSelectMenuInteraction) {
		if (interaction.customId !== 'settings:general:noticeBumpRole:select') return this.none();

		return this.some();
	}
}
