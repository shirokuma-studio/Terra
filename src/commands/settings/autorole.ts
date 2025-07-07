import { ApplyOptions } from '@sapphire/decorators';
import { Command, Subcommand } from '@sapphire/framework';
import { PermissionFlagsBits, Role } from 'discord.js';
import { executeGetQuery, executeRunQuery } from '../../utils/database';
import { logger } from '../../utils/logs';

@ApplyOptions<Subcommand.Options>({
    name: 'autorole',
    description: 'メンバー参加時の自動ロール付与を設定します。',
    requiredUserPermissions: [PermissionFlagsBits.ManageRoles],
    requiredClientPermissions: [PermissionFlagsBits.ManageRoles],
    runIn: ['GUILD_ANY'],
    subcommands: [
        { name: 'set', chatInputRun: 'chatInputSet' },
        { name: 'disable', chatInputRun: 'chatInputDisable' },
        { name: 'status', chatInputRun: 'chatInputStatus' },
    ]
})
export class AutoRoleCommand extends Subcommand {
    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand(builder =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
                .addSubcommand(sub =>
                    sub
                        .setName('set')
                        .setDescription('参加時に付与するロールを設定します。')
                        .addRoleOption(opt =>
                            opt.setName('role').setDescription('付与するロール').setRequired(true)
                        )
                )
                .addSubcommand(sub => sub.setName('disable').setDescription('自動ロール付与を無効にします。'))
                .addSubcommand(sub => sub.setName('status').setDescription('現在の設定を確認します。'))
        );
    }

    public async chatInputSet(interaction: Command.ChatInputCommandInteraction) {
        if (!interaction.guildId) return;

        const role = interaction.options.getRole('role', true) as Role;

        if (role.managed) {
            return interaction.reply({ content: 'Botやインテグレーションによって管理されているロールは設定できません。', ephemeral: true });
        }
        if (role.position >= interaction.guild!.members.me!.roles.highest.position) {
            return interaction.reply({ content: '私（Bot）のロールより上位のロールは設定できません。', ephemeral: true });
        }

        try {
            await executeRunQuery(
                '../database/general.sqlite',
                'INSERT OR REPLACE INTO autoRole (guildId, roleId) VALUES (?, ?)',
                [interaction.guildId, role.id]
            );
            await interaction.reply({ content: `参加時に ${role} を付与するように設定しました。`, ephemeral: true });
            logger.info(`Auto role set to ${role.name} in guild ${interaction.guildId}`);
        } catch (error) {
            logger.error(`Failed to set auto role: ${error}`);
            await interaction.reply({ content: '設定に失敗しました。', ephemeral: true });
        }
    }

    public async chatInputDisable(interaction: Command.ChatInputCommandInteraction) {
        if (!interaction.guildId) return;

        try {
            await executeRunQuery('..//database/general.sqlite', 'DELETE FROM autoRole WHERE guildId = ?', [interaction.guildId]);
            await interaction.reply({ content: '自動ロール付与を無効にしました。', ephemeral: true });
            logger.info(`Auto role disabled in guild ${interaction.guildId}`);
        } catch (error) {
            logger.error(`Failed to disable auto role: ${error}`);
            await interaction.reply({ content: '無効化に失敗しました。', ephemeral: true });
        }
    }

    public async chatInputStatus(interaction: Command.ChatInputCommandInteraction) {
        if (!interaction.guildId) return;

        try {
            const result: { roleId: string } | undefined = await executeGetQuery(
                '../database/general.sqlite',
                'SELECT roleId FROM autoRole WHERE guildId = ?',
                [interaction.guildId]
            );

            if (result) {
                const role = await interaction.guild!.roles.fetch(result.roleId);
                if (role) {
                    await interaction.reply({ content: `現在、参加したメンバーには ${role} が自動で付与されます。`, ephemeral: true });
                } else {
                    await interaction.reply({ content: 'ロールが設定されていますが、そのロールはサーバーに存在しないようです。再設定してください。', ephemeral: true });
                }
            } else {
                await interaction.reply({ content: '自動ロール付与は現在設定されていません。', ephemeral: true });
            }
        } catch (error) {
            logger.error(`Failed to get auto role status: ${error}`);
            await interaction.reply({ content: '設定の確認に失敗しました。', ephemeral: true });
        }
    }
}