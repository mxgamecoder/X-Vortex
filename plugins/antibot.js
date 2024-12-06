// import { bot } from '../lib/plugins.js';
// import { isAdmin } from '../lib/utils.js';

// let antibotActive = false;

// bot(
// 	{
// 		pattern: 'antibot ?(.*)',
// 		isPublic: false,
// 		desc: 'Activate or deactivate anti-bot mode. Automatically kicks other bots if detected in the group.',
// 		type: 'group',
// 	},
// 	async (message, match) => {
// 		if (!message.isGroup) return message.send('_This command can only be used in groups!_');
// 		const action = match?.toLowerCase();
// 		if (action === 'on') {
// 			if (antibotActive) {
// 				return message.send('_Antibot mode is already active!_');
// 			}
// 			antibotActive = true;
// 			return message.send('_Antibot mode activated! I will monitor and kick bot users detected in this group._');
// 		} else if (action === 'off') {
// 			if (!antibotActive) {
// 				return message.send('_Antibot mode is not active!_');
// 			}
// 			antibotActive = false;
// 			return message.send('_Antibot mode deactivated! I will no longer monitor or kick bot users._');
// 		} else {
// 			return message.send('_Use "antibot on" to activate or "antibot off" to deactivate._');
// 		}
// 	},
// );

// bot(
// 	{
// 		on: 'group-update',
// 		dontAddCommandList: true,
// 	},
// 	async message => {
// 		if (!antibotActive) return;
// 		const hasAdminRole = await isAdmin(message.jid, message.user, message.client);
// 		if (hasAdminRole) {
// 			return;
// 		} else if (message.bot) {
// 			await message.client.groupParticipantsUpdate(message.jid, [message.sender], 'remove');
// 			await message.send(`_@${message.sender.split('@')[0]} has been kicked for using bot, no body allowed here_`, { mentions: [message.sender] });
// 			return;
// 		}
// 	},
// );
