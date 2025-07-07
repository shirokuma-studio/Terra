import {ApplyOptions} from '@sapphire/decorators';
import {InteractionHandler, InteractionHandlerTypes} from '@sapphire/framework';
import {StringSelectMenuInteraction, MessageFlags} from 'discord.js';
import {executeRunQuery} from "../../../utils/database";
import {logger} from "../../../utils/logs";

@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.SelectMenu
})
export class MenuHandler extends InteractionHandler {
    public override async run(interaction: StringSelectMenuInteraction) {
        const roleId = interaction.values[0];
        if (!interaction.guild) {
            await interaction.reply({
                content: "",
                flags: [MessageFlags.Ephemeral]
            })
            return logger.warn(`Failed to set support role. Guild not found. by ${interaction.user.tag}.`)
        }

        const role = await interaction.guild.roles.fetch(roleId)
        if (!role) {
            await interaction.reply({
                content: "ロールが見つかりませんでした",
                flags: [MessageFlags.Ephemeral]
            })
            return logger.warn(`Failed to set support role. Role not found. by ${interaction.user.tag}.`)
        }

        const deleteQuery = `
            DELETE
            FROM supportRole
            WHERE guildId = ?;
        `
        const insertQuery = `
            INSERT INTO supportRole (guildId, roleId)
            VALUES (?, ?);
        `

        try {
            // 古いデータの削除
            await executeRunQuery("../database/support.sqlite", deleteQuery, [interaction.guildId]);

            // 新しいデータの挿入
            await executeRunQuery("../database/support.sqlite", insertQuery, [interaction.guildId, roleId]);

            // 成功時の返信
            await interaction.reply({
                content: "サポートロールが正常に設定されました。",
                flags: [MessageFlags.Ephemeral]
            });
        } catch (error) {
            // エラーハンドリング: エラー内容をログに記録し、ユーザーに通知
            logger.error(`Database query failed: ${error}`);
            await interaction.reply({
                content: "ロールの設定中にエラーが発生しました。管理者にご連絡ください。",
                flags: [MessageFlags.Ephemeral]
            });
        }
        return logger.info(`Executed "settings:support:role:select" command by ${interaction.user.tag}.`)
    }

    public override parse(interaction: StringSelectMenuInteraction) {
        if (interaction.customId !== 'settings:support:role:select') return this.none();

        return this.some();
    }
}
