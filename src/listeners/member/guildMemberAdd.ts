import { Listener, Events } from '@sapphire/framework';
import type { GuildMember } from 'discord.js';
import { executeGetQuery } from '../../utils/database';
import { logger } from '../../utils/logs';

export class GuildMemberAddListener extends Listener<typeof Events.GuildMemberAdd> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.GuildMemberAdd
        });
    }

    public async run(member: GuildMember) {
        try {
            const data: { roleId: string } | undefined = await executeGetQuery(
                '../database/general.sqlite',
                'SELECT roleId FROM autoRole WHERE guildId = ?',
                [member.guild.id]
            );

            if (!data) return;

            const role = await member.guild.roles.fetch(data.roleId);
            if (!role) {
                logger.warn(`Auto role with ID ${data.roleId} not found in guild ${member.guild.id}.`);
                return;
            }

            if (!member.guild.members.me?.permissions.has('ManageRoles')) {
                logger.warn(`Bot lacks ManageRoles permission in guild ${member.guild.id}.`);
                return;
            }
            
            if (role.position >= member.guild.members.me.roles.highest.position) {
                 logger.warn(`Cannot assign role ${role.name} because it's higher than the bot's role in guild ${member.guild.id}.`);
                 return;
            }

            await member.roles.add(role);
            logger.info(`Assigned role ${role.name} to new member ${member.user.tag} in guild ${member.guild.id}.`);

        } catch (error) {
            logger.error(`Failed to assign auto role to ${member.user.tag}: ${error}`);
        }
    }
}