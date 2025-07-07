import {ApplyOptions} from '@sapphire/decorators';
import {Listener} from '@sapphire/framework';
import {EmbedBuilder, Events, Message} from "discord.js";
import {sleep} from "../../utils/sleep";
import {logger} from "../../utils/logs";
import {executeGetQuery} from "../../utils/database";

@ApplyOptions<Listener.Options>({once: false, event: Events.MessageCreate})
export class UserEvent extends Listener {
    public override async run(message: Message) {
        try {
            if (!message.author.bot) return;
            if (!message.guild) return;
            if (!message.embeds) return;
            if (!message.embeds[0].description) return;
            if (!message.embeds[0].description.includes("表示順をアップしたよ")) return;

            const executeEmbed = new EmbedBuilder()
                .setColor(0x28b463)
                .setTitle("「/bump」が実行されました！")
                .addFields(
                    {name: "実行された日時", value: formatNextBump(new Date())},
                    {name: "次回実行可能になる日時", value: formatNextBump(calculateNextBump())}
                )

            if (!message.channel.isSendable()) return;

            await message.channel.send({embeds: [executeEmbed]});
            await sleep(2 * 60 * 60 * 1000);

            const roleQuery = `
                SELECT roleId as id
                FROM bumpRole
                WHERE guildId = ?;
            `

            const row = await executeGetQuery("../database/general.sqlite", roleQuery, [message.guildId]);

            if (!row.id) return;

            const noticeEmbed = new EmbedBuilder()
                .setColor(0x28b463)
                .setTitle("「</bump:947088344167366698>」が実行可能になりました！")
                .setDescription("クリックして実行！")

            await message.channel.send({
                content: `<@&${row.id}>`,
                embeds: [noticeEmbed]
            })
        } catch (e) {
            logger.error(`Failed to execute bump notification. by ${message.author.tag}.`)
        }
    }
}

function calculateNextBump(): Date {
    const now = new Date();
    return new Date(now.getTime() + 7200000);
}

function formatNextBump(date: Date): string {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();

    const formattedHours = hours.toString().padStart(2, '0');
    const formattedMinutes = minutes.toString().padStart(2, '0');
    const formattedSeconds = seconds.toString().padStart(2, '0');

    return `${formattedHours}時${formattedMinutes}分${formattedSeconds}秒`;
}
