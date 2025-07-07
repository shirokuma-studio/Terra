import {ApplyOptions} from '@sapphire/decorators';
import {InteractionHandler, InteractionHandlerTypes} from '@sapphire/framework';
import {
    ChannelType,
    EmbedBuilder,
    MessageFlags,
    ModalSubmitInteraction,
    PermissionFlagsBits
} from 'discord.js';
import {executeGetQuery, executeRunQuery} from "../../utils/database";
import {logger} from "../../utils/logs";

@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class ModalHandler extends InteractionHandler {
    public async run(interaction: ModalSubmitInteraction) {
        await interaction.deferReply({flags: [MessageFlags.Ephemeral]});

        const title = interaction.fields.getTextInputValue("support:contact:modal:title");
        const detail = interaction.fields.getTextInputValue("support:contact:modal:detail")

        if (!interaction.guild) {
            await interaction.editReply({
                content: "サーバー情報の取得に失敗しました。"
            })
            return logger.warn(`Failed to create support channel. Guild not found. by ${interaction.user.tag}.`)
        }

        const checkNullQuery = `
            SELECT id as id
            FROM supportChannel
            WHERE guildId = ?
              AND userId = ?
              AND channelId IS NULL;
        `
        const insertQuery = `
            INSERT INTO supportChannel (guildId, userId)
            VALUES (?, ?);
        `
        const roleIdQuery = `
            SELECT roleId as id
            FROM supportRole
            WHERE guildId = ?;
        `
        const updateQuery = `
            UPDATE supportChannel
            SET channelId = ?
            WHERE guildId = ?
              AND userId = ?
              AND channelId IS NULL;
        `

        const row = await executeGetQuery("../database/support.sqlite", checkNullQuery, [interaction.guildId, interaction.user.id]);
        if (row) {
            if (row.id) {
                await interaction.editReply({
                    content: "現在サポートチャンネルを準備中です。"
                })
                return logger.error(`Failed to create support channel. Support channel already exists. by ${interaction.user.tag}.`)
            }
        }

        const row3 = await executeGetQuery("../database/support.sqlite", roleIdQuery, [interaction.guildId]);
        if (!row3) {
            await interaction.editReply({
                content: "サポーターロールの取得に失敗しました。管理者に問い合わせてください。"
            });
            return logger.warn(`Failed to create support channel. Support role not found. by ${interaction.user.tag}.`)
        }

        const role = await interaction.guild?.roles.fetch(row3.id)
        if (!role) {
            await interaction.editReply({
                content: "サポーターロールとして設定されているidと適合するロールが存在しません。管理者に問い合わせてください。"
            })
            return logger.error(`Failed to create support channel. Support role not found. by ${interaction.user.tag}.`)
        }

        await executeRunQuery("../database/support.sqlite", insertQuery, [interaction.guildId, interaction.user.id]);

        const row2 = await executeGetQuery("../database/support.sqlite", checkNullQuery, [interaction.guildId, interaction.user.id]);
        if (!row2.id) {
            await interaction.editReply({
                content: "不明なエラーが発生しました。開発者に問い合わせてください。"
            })
            return logger.error(`Failed to create support channel. by ${interaction.user.tag}.`)
        }


        const channel = await interaction.guild?.channels.create({
            name: `support-${String(row2.id).padStart(4, "0")}`,
            type: ChannelType.GuildText,
            // @ts-ignore
            parent: interaction.channel?.parent,
            permissionOverwrites: [
                {
                    id: interaction.guild?.roles.everyone.id,
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                {
                    id: role.id,
                    allow: [PermissionFlagsBits.ViewChannel]
                },
                {
                    id: interaction.user.id,
                    allow: [PermissionFlagsBits.ViewChannel]
                }
            ]
        })

        const embed = new EmbedBuilder()
            .setColor("Gold")
            .setAuthor({
                name: interaction.user?.displayName,
                iconURL: interaction.user?.displayAvatarURL()
            })
            .setTitle(`Support Request ID:${String(row2.id).padStart(4, "0")}`)
            .addFields(
                {
                    name: "内容",
                    value: title,
                    inline: false
                },
                {
                    name: "詳細",
                    value: detail,
                    inline: false
                }
            )

        await channel.send({
            content: `<@&${role.id}> <@${interaction.user.id}>`,
            embeds: [embed]
        })

        await executeRunQuery("../database/support.sqlite", updateQuery, [channel.id, interaction.guildId, interaction.user.id]);

        await interaction.editReply({
            content: `専用のサポートチャンネルを作成しました！\n${channel.url}`
        })

        return logger.info(`Executed "support:contact:modal" command by ${interaction.user.tag}.`)

    }

    public override parse(interaction: ModalSubmitInteraction) {
        if (interaction.customId !== 'support:contact:modal') return this.none();

        return this.some();
    }
}
