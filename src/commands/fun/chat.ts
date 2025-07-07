import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, MessageFlags } from 'discord.js';
import OpenAI from 'openai';
import { logger } from '../../utils/logs';

// OpenAIクライアントの初期化
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// チャンネルごとの会話履歴を保存するMap
const conversationHistory = new Map<string, OpenAI.Chat.Completions.ChatCompletionMessageParam[]>();

@ApplyOptions<Command.Options>({
    name: 'chat',
    description: 'AIと会話します。',
})
export class ChatCommand extends Command {

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand(builder =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .addStringOption(option =>
                    option
                        .setName('message')
                        .setDescription('AIへのメッセージ')
                        .setRequired(true)
                )
        );
    }

    public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        if (!process.env.OPENAI_API_KEY) {
            logger.error('OPENAI_API_KEY is not set.');
            return interaction.reply({ content: 'AI機能が設定されていません。管理者にお問い合わせください。', ephemeral: true });
        }
        
        await interaction.deferReply();

        const userMessage = interaction.options.getString('message', true);
        const channelId = interaction.channelId;
        
        try {
            // チャンネルの会話履歴を取得、なければ初期化
            if (!conversationHistory.has(channelId)) {
                conversationHistory.set(channelId, [{
                    role: 'system',
                    content: 'You are a helpful and friendly Discord bot. Your name is BuonAppetitoBot.'
                }]);
            }
            
            const history = conversationHistory.get(channelId)!;
            
            // ユーザーのメッセージを履歴に追加
            history.push({ role: 'user', content: userMessage });

            // APIにリクエストを送信
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o', // 最新のモデルを利用 (gpt-3.5-turboなども可)
                messages: history,
            });

            const aiResponse = completion.choices[0].message;

            // AIの返答も履歴に追加
            if (aiResponse) {
                history.push(aiResponse);
            }
            
            // 古い履歴を削除してトークン量を管理 (システムメッセージ + 最新9件 = 10件)
            if (history.length > 10) {
                 conversationHistory.set(channelId, [history[0], ...history.slice(-9)]);
            }


            const embed = new EmbedBuilder()
                .setColor('Gold')
                .setAuthor({ name: interaction.user.displayName, iconURL: interaction.user.displayAvatarURL() })
                .setDescription(userMessage)
                .setTimestamp(new Date());

            await interaction.editReply({ embeds: [embed] });
            
            // フォローアップでAIの返信を送信
            await interaction.followUp({ content: aiResponse?.content || 'すみません、うまく応答できませんでした。' });


        } catch (error) {
            logger.error(`Error with OpenAI API: ${error}`);
            await interaction.editReply({ content: 'AIとの通信中にエラーが発生しました。' });
        }
    }
}