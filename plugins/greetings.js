import { bot } from '../lib/plugins.js';
import Greetings, { isEnabled, setWelcomeMessage, setGoodByeMessage, getWelcomeMessage, getGoodByeMessage } from './sql/greetings.js';

bot(
	{
		pattern: 'welcome',
		isPublic: true,
		desc: 'Setup Welcome Messages for new Group Members',
		type: 'group',
	},
	async (message, match) => {
		if (!message.isGroup) return message.send('_for groups only!_');
		const groupJid = message.jid;
		const args = match.trim().split(' ');

		if (args[0] === 'on' || args[0] === 'off') {
			const status = args[0] === 'on';
			await Greetings.upsert({ groupJid, enabled: status });
			return message.send(`_Welcome messages are now ${status ? 'enabled' : 'disabled'}._`);
		}

		if (args[0] === 'set') {
			const welcomeMessage = args.slice(1).join(' ');
			if (!welcomeMessage) {
				return message.send('_Please provide a welcome message._');
			}

			await setWelcomeMessage(groupJid, welcomeMessage);
			return message.send(`_Welcome message updated successfully!_\n\n_New Message:_ ${welcomeMessage}`);
		}

		if (args[0] === 'get') {
			const currentMessage = await getWelcomeMessage(groupJid);
			const status = await isEnabled(groupJid);
			return message.send(currentMessage ? `_Current Welcome Message:_\n${currentMessage}\n\n_Status:_ ${status ? 'Enabled' : 'Disabled'}` : '_No Welcome Message has been set yet._');
		}

		return message.send('_Invalid command. Usage: .welcome [on/off] | .welcome set [message] | .welcome get_');
	},
);

bot(
	{
		pattern: 'goodbye',
		isPublic: true,
		desc: 'Setup Goodbye Messages for left Group Members',
		type: 'group',
	},
	async (message, match) => {
		if (!message.isGroup) return message.send('_for groups only!_');
		const groupJid = message.jid;
		const args = match.trim().split(' ');

		if (args[0] === 'on' || args[0] === 'off') {
			const status = args[0] === 'on';
			await Greetings.upsert({ groupJid, enabled: status });
			return message.send(`_Goodbye messages are now ${status ? 'enabled' : 'disabled'}._`);
		}

		if (args[0] === 'set') {
			const goodbyeMessage = args.slice(1).join(' ');
			if (!goodbyeMessage) {
				return message.send('_Please provide a goodbye message._');
			}

			await setGoodByeMessage(groupJid, goodbyeMessage);
			return message.send(`_Goodbye message updated successfully!_\n\n_New Message:_ ${goodbyeMessage}`);
		}

		if (args[0] === 'get') {
			const currentMessage = await getGoodByeMessage(groupJid);
			const status = await isEnabled(groupJid);
			return message.send(currentMessage ? `_Current Goodbye Message:_\n${currentMessage}\n\n_Status:_ ${status ? 'Enabled' : 'Disabled'}` : '_No Goodbye Message has been set yet._');
		}

		return message.send('_Invalid command. Usage: .goodbye [on/off] | .goodbye set [message] | .goodbye get_');
	},
);
