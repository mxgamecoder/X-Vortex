import { bot } from '../lib/plugins.js';
import { isAdmin, numtoId } from '../lib/utils.js';
import { addAKick, delKick, getKicks } from './sql/akick.js';

bot(
	{
		pattern: 'akick',
		isPublic: false,
		desc: 'AutoKicks a member from the group.',
		type: 'group',
	},
	async (message, match) => {
		if (!message.isGroup) return message.send('_This command can only be used in groups!_');
		if (!isAdmin(message.jid, message.user, message.client)) return await message.send("_I'm not admin_");

		const groupId = message.jid;

		let jid;
		if (message.reply_message) {
			jid = message.reply_message.sender;
		} else if (message.mention && message.mention[0]) {
			jid = message.mention[0];
		} else if (match) {
			jid = numtoId(match);
		}
		if (!jid) return message.send("_Reply, tag, or provide the participant's number!_");

		const action = match?.split(' ')[0].toLowerCase();

		if (action === 'add') {
			const added = await addAKick(groupId, jid);
			if (added) {
				return message.send('_User added to auto-kick list._');
			} else {
				return message.send('_User is already on the list._');
			}
		} else if (action === 'del') {
			const deleted = await delKick(groupId, jid);
			if (deleted) {
				return message.send('_User removed from auto-kick list._');
			} else {
				return message.send('_User was not on the list._');
			}
		} else if (action === 'get') {
			const kicks = await getKicks(groupId, jid);
			if (kicks.length > 0) {
				return message.send(`_Users in auto-kick list:_\n${kicks.map(k => `• ${k.userJid}`).join('\n')}`);
			} else {
				return message.send('_No users found in the auto-kick list._');
			}
		} else {
			return message.send('_Invalid action! Use add, del, or get._');
		}
	},
);
