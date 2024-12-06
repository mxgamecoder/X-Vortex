import { bot } from '../lib/plugins.js';
import { ChatBot } from './sql/lydia.js';

bot(
	{
		pattern: 'lydia',
		isPublic: false,
		desc: 'Set Lydia for various chats',
		type: 'user',
	},
	async (message, match) => {
		const args = match?.split(' ') || [];
		const command = args[0]?.toLowerCase();

		const chatSettings = await ChatBot.findOne();
		if (!chatSettings) await ChatBot.create();

		if (command === 'on') {
			await ChatBot.update({ isActive: true }, { where: {} });
			await message.send('Lydia has been enabled for all chats.');
		} else if (command === 'off') {
			await ChatBot.update({ isActive: false }, { where: {} });
			await message.send('Lydia has been disabled for all chats.');
		} else if (command === 'dm') {
			await ChatBot.update({ isActive: true, isDMOnly: true, isGCOnly: false }, { where: {} });
			await message.send('Lydia is enabled for direct messages only.');
		} else if (command === 'gc') {
			await ChatBot.update({ isActive: true, isDMOnly: false, isGCOnly: true }, { where: {} });
			await message.send('Lydia is enabled for group chats only.');
		} else {
			await message.send('Use `.lydia on`, `.lydia off`, `.lydia dm`, or `.lydia gc`.');
		}
	},
);
