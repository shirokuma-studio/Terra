import { ApplyOptions } from '@sapphire/decorators';
import { Command, Subcommand } from '@sapphire/framework';
import {
    ActionRowBuilder,
    AttachmentBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    Guild,
    MessageFlags,
    OverwriteResolvable,
    PermissionFlagsBits,
    TextChannel
} from 'discord.js';
import { logger } from '../../utils/logs';
import fs from 'fs/promises';
import path from 'path';

interface ChannelBackup {
    type: Exclude<ChannelType, ChannelType.GuildDirectory | ChannelType.GuildForum | ChannelType.PrivateThread | ChannelType.PublicThread>;
    name: string;
    position: number;
    topic?: string | null;
    nsfw?: boolean;
    bitrate?: number;
    userLimit?: number;
    permissionOverwrites: OverwriteResolvable[];
    children?: ChannelBackup[];
}

interface BackupData {
    guildId: string;
    createdAt: number;
    channels: ChannelBackup[];
}

@ApplyOptions<Subcommand.Options>({
    name: 'backup',
    description: 'サーバーのチャンネル構成をバックアップ・復元します。',
    runIn: ['GUILD_ANY'],
    preconditions: ['GuildOnly'],
    requiredClientPermissions: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.Administrator],
    requiredUserPermissions: [PermissionFlagsBits.Administrator],
    subcommands: [
        { name: 'create', chatInputRun: 'chatInputCreate' },
        { name: 'load', chatInputRun: 'chatInputLoad' }
    ]
})
export class BackupCommand extends Subcommand {
    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand(builder =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
                .addSubcommand(sub => sub.setName('create').setDescription('サーバー構成のバックアップを作成します。'))
                .addSubcommand(sub =>
                    sub
                        .setName('load')
                        .setDescription('バックアップファイルからサーバー構成を復元します。')
                        .addAttachmentOption(opt =>
                            opt.setName('file').setDescription('バックアップ用のJSONファイル').setRequired(true)
                        )
                )
        );
    }

    public async chatInputCreate(interaction: Command.ChatInputCommandInteraction) {
        if (!interaction.guild) return;
        await interaction.deferReply({ ephemeral: true });

        try {
            const backupData = await this.createBackupData(interaction.guild);
            const backupJson = JSON.stringify(backupData, null, 2);
            const backupId = `${interaction.guild.id}-${Date.now()}`;
            const filePath = path.join(__dirname, `../../../backups/${backupId}.json`);

            await fs.writeFile(filePath, backupJson);

            const file = new AttachmentBuilder(filePath, { name: `backup-${backupId}.json` });
            await interaction.editReply({
                content: 'サーバーのバックアップを作成しました。このファイルは安全に保管してください。',
                files: [file]
            });

            logger.info(`Backup created for guild ${interaction.guild.id} by ${interaction.user.tag}`);
        } catch (error) {
            logger.error(`Failed to create backup: ${error}`);
            await interaction.editReply({ content: 'バックアップの作成中にエラーが発生しました。' });
        }
    }

    public async chatInputLoad(interaction: Command.ChatInputCommandInteraction) {
        if (!interaction.guild) return;
        await interaction.deferReply({ ephemeral: true });

        const attachment = interaction.options.getAttachment('file', true);
        if (attachment.contentType !== 'application/json') {
            await interaction.editReply({ content: 'JSONファイルではありません。' });
            return;
        }

        const confirmButton = new ButtonBuilder()
            .setCustomId(`confirm-load:${interaction.id}`)
            .setLabel('復元実行')
            .setStyle(ButtonStyle.Danger);

        const cancelButton = new ButtonBuilder()
            .setCustomId(`cancel-load:${interaction.id}`)
            .setLabel('キャンセル')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmButton, cancelButton);

        const confirmationMessage = await interaction.editReply({
            content: '⚠️ **警告** ⚠️\nバックアップを復元すると、**現在の全てのチャンネルとカテゴリが削除**されます。この操作は元に戻せません。本当に実行しますか？',
            components: [row]
        });

        const collector = confirmationMessage.createMessageComponentCollector({ time: 60000 });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                await i.reply({ content: 'コマンド実行者のみが操作できます。', ephemeral: true });
                return;
            }

            collector.stop();
            if (i.customId === `confirm-load:${interaction.id}`) {
                await i.update({ content: '復元処理を開始します... この処理には数分かかることがあります。', components: [] });
                try {
                    const fileContent = await fetch(attachment.url).then(res => res.text());
                    const backupData: BackupData = JSON.parse(fileContent);

                    await this.restoreFromBackup(interaction.guild!, backupData);

                    await interaction.followUp({ content: '✅ サーバーの復元が完了しました。', ephemeral: true });
                    logger.info(`Backup restored for guild ${interaction.guild!.id} by ${interaction.user.tag}`);
                } catch (error) {
                    logger.error(`Failed to load backup: ${error}`);
                    await interaction.followUp({ content: 'バックアップの復元中にエラーが発生しました。', ephemeral: true });
                }
            } else {
                await i.update({ content: '復元をキャンセルしました。', components: [] });
            }
        });
        
        collector.on('end', collected => {
            if (collected.size === 0) {
                interaction.editReply({ content: 'タイムアウトしました。復元はキャンセルされました。', components: [] });
            }
        });
    }

    private async createBackupData(guild: Guild): Promise<BackupData> {
        const allChannels = await guild.channels.fetch();
        const categories = allChannels
            .filter(ch => ch?.type === ChannelType.GuildCategory)
            .sort((a, b) => a!.position - b!.position);
        
        const channelsWithoutCategory = allChannels
            .filter(ch => ch && !ch.parentId && ch.type !== ChannelType.GuildCategory)
            .sort((a,b) => a!.position - b!.position);

        const backupChannels: ChannelBackup[] = [];

        for (const channel of channelsWithoutCategory.values()) {
             if (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildStageVoice || channel.type === ChannelType.GuildAnnouncement || channel.type === ChannelType.GuildCategory) {
                backupChannels.push(this.serializeChannel(channel));
            }
        }
        
        for (const category of categories.values()) {
            if (category?.type !== ChannelType.GuildCategory) continue;

            const categoryData = this.serializeChannel(category);
            categoryData.children = [];

            const children = allChannels
                .filter(ch => ch?.parentId === category.id)
                .sort((a, b) => a!.position - b!.position);
            
            for (const child of children.values()) {
                 if (child.type === ChannelType.GuildText || child.type === ChannelType.GuildVoice || child.type === ChannelType.GuildStageVoice || child.type === ChannelType.GuildAnnouncement) {
                    categoryData.children.push(this.serializeChannel(child));
                }
            }
            backupChannels.push(categoryData);
        }

        return {
            guildId: guild.id,
            createdAt: Date.now(),
            channels: backupChannels
        };
    }
    
    private serializeChannel(channel: any): ChannelBackup {
        const channelData: ChannelBackup = {
            type: channel.type,
            name: channel.name,
            position: channel.position,
            permissionOverwrites: Array.from(channel.permissionOverwrites.cache.values()).map((p: any) => ({
                id: p.id,
                type: p.type,
                allow: p.allow.bitfield.toString(),
                deny: p.deny.bitfield.toString()
            }))
        };
        if (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement) {
            channelData.topic = (channel as TextChannel).topic;
            channelData.nsfw = (channel as TextChannel).nsfw;
        }
        if (channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildStageVoice) {
            channelData.bitrate = channel.bitrate;
            channelData.userLimit = channel.userLimit;
        }
        return channelData;
    }
    
    private async restoreFromBackup(guild: Guild, data: BackupData) {
        // Delete all current channels
        const channels = await guild.channels.fetch();
        for (const channel of channels.values()) {
            try {
                await channel?.delete('Backup Restore');
            } catch (e) {
                logger.warn(`Could not delete channel ${channel?.name}: ${e}`);
            }
        }
        
        // Restore channels
        for (const categoryData of data.channels.filter(c => c.type === ChannelType.GuildCategory)) {
            const newCategory = await guild.channels.create({
                name: categoryData.name,
                type: ChannelType.GuildCategory,
                position: categoryData.position,
                permissionOverwrites: categoryData.permissionOverwrites,
            });

            if (categoryData.children) {
                for (const channelData of categoryData.children) {
                    await guild.channels.create({
                        name: channelData.name,
                        type: channelData.type,
                        topic: channelData.topic,
                        nsfw: channelData.nsfw,
                        bitrate: channelData.bitrate,
                        userLimit: channelData.userLimit,
                        parent: newCategory.id,
                        position: channelData.position,
                        permissionOverwrites: channelData.permissionOverwrites,
                    });
                }
            }
        }
        
         for (const channelData of data.channels.filter(c => c.type !== ChannelType.GuildCategory)) {
             await guild.channels.create({
                name: channelData.name,
                type: channelData.type,
                topic: channelData.topic,
                nsfw: channelData.nsfw,
                bitrate: channelData.bitrate,
                userLimit: channelData.userLimit,
                position: channelData.position,
                permissionOverwrites: channelData.permissionOverwrites,
             });
         }
    }
}