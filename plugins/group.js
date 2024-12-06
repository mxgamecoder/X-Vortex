import { bot } from '../lib/plugins.js';
import { delay } from 'baileys';
import { numtoId, isAdmin } from '../lib/utils.js';
import { Antilink } from './sql/antilink.js';
import { AntiWord } from './sql/antiword.js';

bot(
	{
		pattern: 'add',
		isPublic: false,
		desc: 'Adds A User to Group',
		type: 'group',
	},
	async (message, match) => {
		if (!message.isGroup) return message.send('_For groups only!_');
		if (!isAdmin(message.jid, message.user, message.client)) return await message.send("_I'm not admin_");

		let jid;
		if (message.reply_message) {
			jid = message.reply_message.sender;
		} else if (message.mention && message.mention[0]) {
			jid = message.mention[0];
		} else if (match) {
			jid = numtoId(match);
		}
		if (!jid) return message.send('_Reply, tag, or give me the participant number_');
		try {
			await message.client.groupParticipantsUpdate(message.jid, [jid], 'add');
			return message.send(`_@${jid.split('@')[0]} added_`, { mentions: [jid] });
		} catch {
			const inviteLink = await message.client.groupInviteCode(message.jid);
			const userMessage = {
				text: `_@${message.sender.split('@')[0]} wants to add you to the group._\n\n*_Join here: https://chat.whatsapp.com/${inviteLink}_*\n`,
				mentions: [message.sender],
			};
			await message.send(jid, userMessage);
			return message.send("_Can't Added User, Invite Sent In DM_");
		}
	},
);

bot(
	{
		pattern: 'advertise',
		isPublic: false,
		desc: 'Create and Share Advertisement Messages to all Your Groups',
		type: 'group',
	},
	async (message, match) => {
		const adMsg = match || message.reply_message?.text;
		if (!adMsg) return message.send('_I need text to advertise!_');
		const groups = await message.client.groupFetchAllParticipating();
		const groupDetails = Object.values(groups);
		const groupIds = groupDetails.map(group => group.id);
		await message.send(`_Broadcasting to ${groupIds.length} groups. Estimated completion in ${groupIds.length * 1.5} seconds_`);
		const broadcastMessage = `\`\`\`*Broadcast*\n\n*Message:*\`\`\`` + adMsg;
		const messageOptions = {
			forwardingScore: 9999999,
			isForwarded: true,
		};
		for (const groupId of groupIds) {
			await delay(1500);
			await message.client.sendMessage(groupId, { text: broadcastMessage, contextInfo: messageOptions });
		}
		return await message.send(`_Advertised Message to ${groupIds.length} Groups_`);
	},
);

bot(
	{
		pattern: 'antilink ?(.*)',
		isPublic: true,
		desc: 'Setup Antilink For Groups',
		type: 'Group',
	},
	async (message, match) => {
		if (!message.isGroup) return message.send('_For Groups only!_');
		if (!isAdmin(message.jid, message.user, message.client)) return await message.send("_I'm not admin_");

		const [settings] = await Antilink.findOrCreate({
			where: { groupId: message.jid },
			defaults: { groupId: message.jid, warnings: {} },
		});

		const cmd = match.trim().toLowerCase();
		const validActions = ['delete', 'warn', 'kick'];

		if (['on', 'off'].includes(cmd)) {
			const newState = cmd === 'on';
			if (settings.enabled === newState) return message.send(`_Antilink is already ${cmd}_`);
			settings.enabled = newState;
			await settings.save();
			return message.send(`_Antilink ${cmd === 'on' ? 'enabled' : 'disabled'}!_`);
		}

		if (validActions.includes(cmd)) {
			if (!settings.enabled) return message.send('_Enable antilink first using antilink on_');
			if (settings.action === cmd) return message.send(`_Antilink action is already set to ${cmd}_`);
			settings.action = cmd;
			await settings.save();
			return message.send(`_Antilink action set to ${cmd}_`);
		}
		return message.send('_' + message.prefix + 'antilink on/off/delete/kick/warn_');
	},
);

bot(
	{
		pattern: 'antiword',
		isPublic: true,
		desc: 'Setup Antiword for Groups',
		type: 'group',
	},
	async (message, match) => {
		if (!message.isGroup) return message.send('_For Groups only!_');
		if (!isAdmin(message.jid, message.user, message.client)) return await message.send("_I'm not admin_");

		const groupId = message.jid;
		const antiWordConfig = await AntiWord.findOrCreate({ where: { groupId } });

		if (!match) return message.send(`_${message.prefix}antiword on_\n_${message.prefix}antiword off_\n_${message.prefix}antiword set badword1,badword2_`);

		if (match === 'on') {
			if (antiWordConfig[0].isEnabled) return message.send('_Antiword is already enabled for this group._');
			antiWordConfig[0].isEnabled = true;
			await antiWordConfig[0].save();
			const words = antiWordConfig[0].filterWords;
			return message.send(words.length > 0 ? '_Antiword has been enabled for this group._' : '_Antiword is enabled but no bad words were set._');
		}

		if (match === 'off') {
			if (!antiWordConfig[0].isEnabled) return message.send('_Antiword is already disabled for this group._');
			antiWordConfig[0].isEnabled = false;
			await antiWordConfig[0].save();
			return message.send('_Antiword has been disabled for this group._');
		}

		if (match.startsWith('set ')) {
			const words = match
				.slice(4)
				.split(',')
				.map(word => word.trim());
			antiWordConfig[0].filterWords = words;
			await antiWordConfig[0].save();
			return message.send(`_Antiword filter updated with words: ${words.join(', ')}_`);
		}

		return message.send(`_${message.prefix}antiword on_\n_${message.prefix}antiword off_\n_${message.prefix}antiword set badword1,badword2_`);
	},
);

bot(
	{
		pattern: 'ckick',
		isPublic: false,
		desc: 'Kick a certain country code from a group',
		type: 'group',
	},
	async (message, match) => {
		if (!message.isGroup) return message.send('_For groups only!_');
		if (!isAdmin(message.jid, message.user, message.client)) return await message.send("_I'm not admin_");
		const countryCode = match?.trim().replace('+', '');
		if (!countryCode || isNaN(countryCode)) return message.send('_Please provide a valid country code._');
		const metadata = await message.client.groupMetadata(message.jid);
		const participants = metadata.participants;
		const toKick = participants.filter(participant => participant.id.startsWith(`${countryCode}`) && !participant.admin).map(participant => participant.id);
		if (!toKick.length) return message.send(`_No members found with the country code ${countryCode}._`);
		for (const jid of toKick) {
			await message.client.groupParticipantsUpdate(message.jid, [jid], 'remove');
			await message.send(`_Kicked member:_ @${jid.split('@')[0]}`, { mentions: [jid] });
			await delay(2000);
		}
		await message.send(`_Kicked All Memeber from ${countryCode}._`);
	},
);

bot(
	{
		pattern: 'gname',
		isPublic: true,
		desc: 'Change Group Name',
		type: 'group',
	},
	async (message, match) => {
		if (!message.isGroup) return message.send('_For groups only!_');
		if (!isAdmin(message.jid, message.user, message.client)) return await message.send("_I'm not admin_");
		const subject = match || message.reply_message?.text;
		if (!subject) return message.send('_Provide A New Name for the Group!_');
		await message.client.groupUpdateSubject(message.jid, subject);
		return message.send('_Group Name Updated_');
	},
);

bot(
	{
		pattern: 'gdesc ?(.*)',
		isPublic: true,
		desc: 'Changes Group Description',
		type: 'group',
	},
	async (message, match) => {
		if (!message.isGroup) return message.send('_For groups only!_');
		if (!isAdmin(message.jid, message.user, message.client)) return await message.send("_I'm not admin_");
		const desciption = match || message.reply_message?.text;
		await message.client.groupUpdateDescription(message.jid, desciption);
		return message.send('_Group Description Updated_');
	},
);

bot(
	{
		pattern: 'promote',
		isPublic: true,
		desc: 'Promotes Someone to Admin',
		type: 'group',
	},
	async (message, match) => {
		if (!message.isGroup) return message.send('_For groups only!_');
		if (!isAdmin(message.jid, message.user, message.client)) return await message.send("_I'm not admin_");
		let jid;
		if (message.reply_message) {
			jid = message.reply_message.sender;
		} else if (message.mention && message.mention[0]) {
			jid = message.mention[0];
		} else if (match) {
			jid = numtoId(match);
		}
		if (!jid) return message.send('_Reply, tag, or give me the participant number_');
		const groupMetadata = await message.client.groupMetadata(message.jid);
		const participant = groupMetadata.participants.find(p => p.id === jid);
		if (participant.admin)
			return message.send(`_@${jid.replace('@s.whatsapp.net', '')} is already an admin._`, {
				mentions: [jid],
			});
		await message.client.groupParticipantsUpdate(message.jid, [jid], 'promote');
		return message.send(`_@${jid.replace('@s.whatsapp.net', '')} is now an admin_`, {
			mentions: [jid],
		});
	},
);

bot(
	{
		pattern: 'demote',
		isPublic: true,
		desc: 'Demotes Someone from Admin',
		type: 'group',
	},
	async (message, match) => {
		if (!message.isGroup) return message.send('_For groups only!_');
		if (!isAdmin(message.jid, message.user, message.client)) return await message.send("_I'm not admin_");
		let jid;
		if (message.reply_message) {
			jid = message.reply_message.sender;
		} else if (message.mention && message.mention[0]) {
			jid = message.mention[0];
		} else if (match) {
			jid = numtoId(match);
		}
		if (!jid) return message.send('_Reply, tag, or give me the participant number_');
		const groupMetadata = await message.client.groupMetadata(message.jid);
		const participant = groupMetadata.participants.find(p => p.id === jid);
		if (!participant.admin)
			return message.send(`_@${jid.replace('@s.whatsapp.net', '')} is not an admin._`, {
				mentions: [jid],
			});
		await message.client.groupParticipantsUpdate(message.jid, [jid], 'demote');
		return message.send(`_@${jid.replace('@s.whatsapp.net', '')} is no longer an admin_`, {
			mentions: [jid],
		});
	},
);

bot(
	{
		pattern: 'kick ?(.*)',
		isPublic: false,
		desc: 'Kicks A Participant from Group',
		type: 'group',
	},
	async (message, match) => {
		if (!message.isGroup) return message.send('_For groups only!_');
		if (!isAdmin(message.jid, message.user, message.client)) return await message.send("_I'm not admin_");
		let jid;
		if (message.reply_message) {
			jid = message.reply_message.sender;
		} else if (message.mention && message.mention[0]) {
			jid = message.mention[0];
		} else if (match) {
			jid = numtoId(match);
		}
		if (!jid) return message.send('_Reply, tag, or give me the participant number_');
		await message.client.groupParticipantsUpdate(message.jid, [jid], 'remove');
		return message.send(`_@${jid.split('@')[0]} has been kicked!_`, { mentions: [jid] });
	},
);

bot(
	{
		pattern: 'invite',
		isPublic: true,
		desc: 'Get Group Invite link',
		type: 'group',
	},
	async message => {
		if (!message.isGroup) return message.send('_For groups only!_');
		if (!isAdmin(message.jid, message.user, message.client)) return await message.send("_I'm not admin_");
		const msg = await message.send('*wait*');
		const code = await message.client.groupInviteCode(message.jid);
		return msg.edit(`https://chat.whatsapp.com/${code}`);
	},
);

bot(
	{
		pattern: 'leave',
		isPublic: false,
		desc: 'leave a group',
		type: 'group',
	},
	async message => {
		await message.send('_Left Group_');
		return message.client.groupParticipantsUpdate(message.jid, [message.user], 'remove');
	},
);

bot(
	{
		pattern: 'poll',
		isPublic: true,
		desc: 'Creates a poll in the group.',
		type: 'group',
	},
	async (message, match) => {
		let [pollName, pollOptions] = match.split(';');
		if (!pollOptions) return await message.send(message.prefix + 'poll question;option1,option2,option3.....');
		let options = [];
		for (let option of pollOptions.split(',')) if (option && option.trim() !== '') options.push(option.trim());
		await message.client.sendMessage(message.jid, {
			poll: {
				name: pollName,
				values: options,
			},
		});
	},
);

bot(
	{
		pattern: 'tag',
		isPublic: true,
		desc: 'Tag all participants in the group with an optional message',
		type: 'group',
	},
	async (message, match) => {
		if (!message.isGroup) return message.send('_For groups only!_');
		const msg = match || message.reply_message?.text;
		const text = msg || '';
		const participants = await message.client.groupMetadata(message.jid);
		const participantJids = participants.participants.map(p => p.id);
		let taggedMessage = text ? `*${text}*` : '';
		await message.client.sendMessage(message.jid, {
			text: taggedMessage,
			mentions: participantJids,
		});
	},
);

bot(
	{
		pattern: 'tagall',
		isPublic: true,
		desc: 'Tag all participants in the group',
		type: 'group',
	},
	async (message, match) => {
		if (!message.isGroup) return message.send('_For groups only!_');
		const msg = match || message.reply_message?.text;
		if (!msg) return message.send('_You must provide a reason for tagging everyone._');
		const participants = await message.client.groupMetadata(message.jid);
		const participantJids = participants.participants.map(p => p.id);
		const tagMsg = `*Reason:* ${msg}\n\n` + participantJids.map(jid => `@${jid.split('@')[0]}`).join('\n');
		await message.client.sendMessage(message.jid, {
			text: tagMsg,
			mentions: participantJids,
		});
	},
);

bot(
	{
		pattern: 'mute',
		isPublic: true,
		desc: 'Mute a group (admins only)',
		type: 'group',
	},
	async message => {
		if (!message.isGroup) return message.send('_For groups only!_');
		if (!isAdmin(message.jid, message.user, message.client)) return await message.send("_I'm not admin_");
		const metadata = await message.client.groupMetadata(message.jid);
		if (metadata.announce) return message.send('_Group is already muted. Only admins can send messages._');
		await message.client.groupSettingUpdate(message.jid, 'announcement');
		await message.send('_Group has been muted. Only admins can send messages now._');
	},
);

bot(
	{
		pattern: 'unmute',
		isPublic: true,
		desc: 'Unmute a group (admins only)',
		type: 'group',
	},
	async message => {
		if (!message.isGroup) return message.send('_For groups only!_');
		if (!isAdmin(message.jid, message.user, message.client)) return await message.send("_I'm not admin_");
		const metadata = await message.client.groupMetadata(message.jid);
		if (!metadata.announce) return message.send('_Group is already unmuted. All members can send messages._');
		await message.client.groupSettingUpdate(message.jid, 'not_announcement');
		await message.send('_Group has been unmuted. All members can send messages now._');
	},
);

bot(
	{
		pattern: 'tagadmin',
		isPublic: false,
		desc: 'Tags Admins of A Group',
		type: 'group',
	},
	async message => {
		if (!message.isGroup) return message.send('_For groups only!_');
		const groupMetadata = await message.client.groupMetadata(message.jid);
		const groupAdmins = groupMetadata.participants.filter(p => p.admin !== null).map(p => p.id);
		if (groupAdmins.length > 0) {
			const adminTags = groupAdmins.map(admin => `@${admin.split('@')[0]}`);
			const replyText = `*_Group Admins:_*\n ${adminTags.join('\n')}`;
			await message.send(replyText, { mentions: groupAdmins });
		} else {
			await message.send('_No admins found._');
		}
	},
);

bot(
	{
		pattern: 'revoke',
		isPublic: true,
		desc: 'Revoke Invite link',
		type: 'group',
	},
	async message => {
		if (!message.isGroup) return message.send('_For groups only!_');
		if (!isAdmin(message.jid, message.user, message.client)) return await message.send("_I'm not admin_");
		await message.client.groupRevokeInvite(message.jid);
		return message.send('_Group Link Revoked!_');
	},
);

bot(
	{
		pattern: 'gpp',
		isPublic: false,
		desc: 'Changes Group Profile Picture',
		type: 'group',
	},
	async message => {
		if (!message.isGroup) return message.send('_For groups only!_');
		if (!isAdmin(message.jid, message.user, message.client)) return await message.send("_I'm not admin_");
		if (!message.reply_message?.image) return message.send('_Reply An Image!_');
		const img = await message.downloadAndSaveMedia();
		await message.client.updateProfilePicture(message.jid, img);
		return await message.send('_Group Image Updated_');
	},
);

bot(
	{
		pattern: 'lock',
		isPublic: true,
		desc: 'Lock groups settings',
		type: 'group',
	},
	async message => {
		if (!message.isGroup) return message.send('_For groups only!_');
		if (!isAdmin(message.jid, message.user, message.client)) return await message.send("_I'm not admin_");
		const meta = await message.client.groupMetadata(message.jid);
		if (meta.restrict) return message.send('_Group is already locked to Admins._');
		await message.client.groupSettingUpdate(message.jid, 'locked');
		return message.send('_Group has been locked to Admins_');
	},
);

bot(
	{
		pattern: 'unlock',
		isPublic: true,
		desc: 'Unlock groups settings',
		type: 'group',
	},
	async message => {
		if (!message.isGroup) return message.send('_For groups only!_');
		if (!isAdmin(message.jid, message.user, message.client)) return await message.send("_I'm not admin_");
		const meta = await message.client.groupMetadata(message.jid);
		if (!meta.restrict) return message.send('_Group is already unlocked for participants._');
		await message.client.groupSettingUpdate(message.jid, 'unlocked');
		return message.send('_Group is now unlocked for participants._');
	},
);

bot(
	{
		pattern: 'requests',
		isPublic: true,
		desc: 'Shows the pending requests of the group',
		type: 'group',
	},
	async message => {
		if (!message.isGroup) return message.send('_For groups only!_');
		if (!isAdmin(message.jid, message.user, message.client)) return await message.send("_I'm not admin_");
		const joinRequests = await message.client.groupRequestParticipantsList(message.jid);
		if (!joinRequests || !joinRequests[0]) return await message.send('_No Join Requests_');
		let requestList = '*_Group Join Requets List_*\n\n';
		let requestJids = [];
		for (let request of joinRequests) {
			requestList += `@${request.jid.split('@')[0]}\n`;
			requestJids.push(request.jid);
		}
		await message.send(requestList, { mentions: requestJids });
	},
);

bot(
	{
		pattern: 'acceptall',
		isPublic: true,
		desc: 'Accept all join requests',
		type: 'group',
	},
	async message => {
		if (!message.isGroup) return message.send('_For groups only!_');
		if (!isAdmin(message.jid, message.user, message.client)) return await message.send("_I'm not admin_");

		const joinRequests = await message.client.groupRequestParticipantsList(message.jid);
		if (!joinRequests || !joinRequests[0]) return await message.send('_No Requests Found!_');
		let acceptedUsers = [];
		let acceptanceList = '*_Accepted Users_*\n\n';
		for (let request of joinRequests) {
			await message.client.groupRequestParticipantsUpdate(message.jid, [request.jid], 'approve');
			acceptanceList += `@${request.jid.split('@')[0]}\n`;
			acceptedUsers.push(request.jid);
		}
		await message.send(acceptanceList, { mentions: acceptedUsers });
	},
);

bot(
	{
		pattern: 'rejectall',
		isPublic: true,
		desc: 'Reject all join requests',
		type: 'group',
	},
	async message => {
		if (!message.isGroup) return message.send('_For groups only!_');
		if (!isAdmin(message.jid, message.user, message.client)) return await message.send("_I'm not admin_");
		const joinRequests = await message.client.groupRequestParticipantsList(message.jid);
		if (!joinRequests || !joinRequests[0]) return await message.send('_No Requests Found!_');
		let rejectedUsers = [];
		let rejectionList = '*_Rejected Users_*\n\n';
		for (let request of joinRequests) {
			await message.client.groupRequestParticipantsUpdate(message.jid, [request.jid], 'reject');
			rejectionList += `@${request.jid.split('@')[0]}\n`;
			rejectedUsers.push(request.jid);
		}
		await message.send(rejectionList, { mentions: rejectedUsers });
	},
);

bot(
	{
		pattern: 'rgpp',
		isPublic: false,
		desc: 'Removes Group Profile Photo',
		type: 'group',
	},
	async message => {
		if (!message.isGroup) return message.send('_For groups only!_');
		if (!isAdmin(message.jid, message.user, message.client)) return await message.send("_I'm not admin_");
		await message.client.removeProfilePicture(message.jid);
		return await message.send('_Group Profile Photo Removed!_');
	},
);

bot(
	{
		pattern: 'newgc',
		isPublic: false,
		desc: 'Creates A New Group',
		type: 'group',
	},
	async (message, match) => {
		if (!match) return await message.send(`*Provide group name: .newgc GroupName*`);

		let groupName = match.split(';')[0];
		let members = [message.sender];

		if (message.reply_message?.sender) members.push(message.reply_message.sender);
		if (message.mention && message.mention[0]) members.push(message.mention[0]);
		if (match.split(';')[1]) {
			let additionalMembers = match
				.split(';')[1]
				.split(',')
				.map(member => member.trim());
			const ids = additionalMembers.map(member => numtoId(member));
			members = [...members, ...ids];
		}
		members = [...new Set(members)];
		await message.client.groupCreate(groupName, members);
		return await message.send(`_Group Created_`);
	},
);
