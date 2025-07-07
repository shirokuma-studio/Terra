import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import {
	ActionRowBuilder,
	ButtonInteraction,
	ModalBuilder, TextInputBuilder,
	TextInputStyle
} from 'discord.js';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonHandler extends InteractionHandler {
	public async run(interaction: ButtonInteraction) {
		const modal = new ModalBuilder()
			.setCustomId("support:contact:modal")
			.setTitle("お問い合わせ")

		const title = new TextInputBuilder()
			.setCustomId("support:contact:modal:title")
			.setLabel("お問い合わせ内容を入力してください")
			.setPlaceholder("例）Botの使い方がわからない")
			.setStyle(TextInputStyle.Short);
		const detail = new TextInputBuilder()
			.setCustomId("support:contact:modal:detail")
			.setLabel("詳細を入力してください")
			.setPlaceholder("例）BuonappetitoBotの /avatar コマンドの使い方がわかりません。")
			.setStyle(TextInputStyle.Paragraph);

		const titleRow = new ActionRowBuilder<TextInputBuilder>().addComponents(title);
		const detailRow = new ActionRowBuilder<TextInputBuilder>().addComponents(detail)

		modal.addComponents(titleRow, detailRow);

		await interaction.showModal(modal)
	}

	public override parse(interaction: ButtonInteraction) {
		if (interaction.customId !== 'support:contact') return this.none();

		return this.some();
	}
}
