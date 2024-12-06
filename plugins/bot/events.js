import moment from 'moment-timezone';
import config from '../../config.js';
import { getBuffer, getJson } from 'utils';
import { format } from 'date-fns';
import { schedule as _schedule } from 'node-cron';
import { downloadMediaMessage } from 'baileys';
import { numtoId } from '../../lib/utils.js';
import { loadMessage } from '../sql/store.js';
import { getAnti } from '../sql/antidel.js';
import { Antilink } from '../sql/antilink.js';
import { getStatus } from '../sql/antivv.js';
import { AntiWord } from '../sql/antiword.js';
import { getKicks } from '../sql/akick.js';
import { isEnabled, getWelcomeMessage, getGoodByeMessage } from '../sql/greetings.js';
import { ChatBot } from '../sql/lydia.js';
import Scheduler from '../sql/scheduler.js';

export const handleAntiDelete = async (conn, updates) => {
	for (const update of updates) {
		if (update.key && (update.update.deleteMessage || update.update?.message === null)) {
			const store = await loadMessage(update.key.id);

			if (store && store.message) {
				const msg = store.message;
				const isGroup = store.jid.endsWith('@g.us');

				if (isGroup) {
					const antiDeleteStatus = await getAnti(store.jid);
					if (!antiDeleteStatus) continue;

					const groupMetadata = await conn.groupMetadata(store.jid);
					const groupName = groupMetadata.subject;
					const senderNumber = msg.key.participant.split('@')[0];
					const deleterNumber = update.key.participant.split('@')[0];
					const deleteTime = format(new Date(), 'HH:mm:ss');

					let notificationText = `*ᴀɴᴛɪᴅᴇʟᴇᴛᴇ ᴅᴇᴛᴇᴄᴛᴇᴅ*\n\n*ᴛɪᴍᴇ:* ${deleteTime}\n*ɢʀᴏᴜᴘ:* ${groupName}\n*ᴅᴇʟᴇᴛᴇᴅ ʙʏ:* @${deleterNumber}\n*sᴇɴᴅᴇʀ:* @${senderNumber}`;
					const mediaTypes = ['imageMessage', 'videoMessage', 'audioMessage'];
					const mediaType = mediaTypes.find(type => msg.message[type]);

					if (mediaType) {
						const mediaBuffer = await downloadMediaMessage(msg, 'buffer', {}, { logger: conn.logger });

						const captions = {
							imageMessage: 'Image attached.',
							videoMessage: 'Video attached.',
							audioMessage: 'Audio attached.',
						};

						notificationText += `\n\n*ᴄᴏɴᴛᴇɴᴛ:* ${captions[mediaType]}`;

						await conn.sendMessage(
							store.jid,
							{
								[mediaType === 'audioMessage' ? 'audio' : 'video']: mediaBuffer,
								caption: mediaType === 'audioMessage' ? '' : notificationText,
								ptt: mediaType === 'audioMessage',
								mimetype: msg.message[mediaType].mimetype,
								contextInfo: { mentionedJid: [update.key.participant, msg.key.participant] },
							},
							{ quoted: msg },
						);
					} else {
						const messageContent = msg.message?.conversation || msg.message?.extendedTextMessage?.text || 'Unknown content';
						notificationText += `\n\n*ᴄᴏɴᴛᴇɴᴛ:* ${messageContent}`;

						await conn.sendMessage(
							store.jid,
							{
								text: notificationText,
								contextInfo: { mentionedJid: [update.key.participant, msg.key.participant] },
							},
							{ quoted: msg },
						);
					}
				}
			}
		}
	}
};

export const handleAntiLink = async (conn, msg) => {
	const groupId = msg.from;
	const userId = msg.sender;

	const config = await Antilink.findOne({ where: { groupId } });
	if (!config?.enabled) return;

	if (msg.isAdmin) return;

	const linkRegex = /\bhttps?:\/\/[^\s]+\b/gi;
	if (!linkRegex.test(msg.body)) return;

	await conn.sendMessage(groupId, { delete: msg.key });

	const notify = async text =>
		await conn.sendMessage(groupId, {
			text: `_@${userId.split('@')[0]} ${text}_`,
			mentions: [userId],
		});

	await notify('links are not allowed here');

	if (config.action === 'on') {
		return;
	}

	if (config.action === 'kick') {
		if (msg.isAdmin) return;
		await conn.groupParticipantsUpdate(groupId, [userId], 'remove');
		await notify('has been removed for sending links');
		return;
	}

	if (config.action === 'warn') {
		let warnings = config.warnings || {};
		warnings[userId] = (warnings[userId] || 0) + 1;

		config.set('warnings', warnings);
		config.changed('warnings', true);
		await config.save();

		if (warnings[userId] >= 3) {
			if (msg.isAdmin) return;
			await conn.groupParticipantsUpdate(groupId, [userId], 'remove');
			await notify('has been removed after 3 warnings');
			delete warnings[userId];
			config.set('warnings', warnings);
			config.changed('warnings', true);
			await config.save();
		} else {
			await notify(`warning ${warnings[userId]}/3 for sending links`);
		}
	}
};

export const handleViewOnce = async (msg, conn, __events) => {
	const viewOnceMessage = msg.message?.viewOnceMessageV2?.message;
	if (!viewOnceMessage) return;

	const antiVVStatus = await getStatus();
	if (!antiVVStatus) return;

	const isGroup = !!msg.from?.endsWith('@g.us');
	if ((antiVVStatus === 'dm' && isGroup) || (antiVVStatus === 'gc' && !isGroup)) return;

	const buffer = await downloadMediaMessage(
		{
			key: msg.key,
			message: viewOnceMessage,
		},
		'buffer',
		{},
		{
			logger: console,
			reuploadRequest: conn.updateMediaMessage,
		},
	);

	if (isGroup) {
		return await __events.send(buffer, { jid: msg.from });
	} else {
		return await __events.send(buffer, { jid: __events.user });
	}
};

export const handleAntiWord = async (conn, msg) => {
	const groupId = msg.from;
	const userId = msg.sender;
	const antiWordConfig = await AntiWord.findOne({ where: { groupId } });

	if (!antiWordConfig?.isEnabled) return;
	if (msg.isAdmin) return;

	const badWords = antiWordConfig.filterWords || [];
	if (!badWords.some(word => msg.body.toLowerCase().includes(word.toLowerCase()))) return;

	const warnings = antiWordConfig.warnings || {};
	warnings[userId] = (warnings[userId] || 0) + 1;

	const remainingWarnings = 5 - warnings[userId];

	await conn.sendMessage(groupId, {
		text: `_@${userId.split('@')[0]}, your message contained prohibited words and was removed._\n_You have ${remainingWarnings} warnings left!_`,
		mentions: [userId],
	});
	await conn.sendMessage(groupId, { delete: msg.key });

	if (warnings[userId] >= 5) {
		await conn.groupParticipantsUpdate(groupId, [userId], 'remove');
		delete warnings[userId];
		await conn.sendMessage(groupId, {
			text: `_@${userId.split('@')[0]} has been removed for exceeding the warning limit._`,
			mentions: [userId],
		});
	}

	await AntiWord.update({ warnings }, { where: { groupId } });
};

const monitoredGroups = new Set();
export function handleAutoKick(conn, msg) {
	const groupId = msg.from;
	if (!groupId.endsWith('@g.us') || monitoredGroups.has(groupId)) return;

	monitoredGroups.add(groupId);

	setInterval(async () => {
		const groupMeta = await conn.groupMetadata(groupId);
		const participants = groupMeta.participants.map(p => p.id);

		for (const userJid of participants) {
			const kicks = await getKicks(groupId, userJid);
			if (kicks.length > 0) {
				await conn.sendMessage(groupId, {
					text: `@${userJid.split('@')[0]} is detected from AutoKick, now kicking loser.`,
					mentions: [userJid],
				});
				await conn.groupParticipantsUpdate(groupId, [userJid], 'remove');
			}
		}
	}, 5000);
}

const replacePlaceholders = (template, groupMetadata, user, profilePic, adminList) => {
	const gname = groupMetadata.subject || '';
	const gdesc = groupMetadata.desc || '';
	const memberCount = groupMetadata.participants?.length || 0;

	return template
		.replace(/@user/g, user)
		.replace(/@gname/g, gname)
		.replace(/@member/g, memberCount.toString())
		.replace(/@admin/g, adminList.join(', '))
		.replace(/@gdesc/g, gdesc)
		.replace(/@pp/g, profilePic ? '' : '');
};

const getProfilePicture = async (conn, jid) => {
	const ppUrl = await conn.profilePictureUrl(jid, 'image');
	if (!ppUrl) return null;

	const res = await getBuffer(ppUrl);
	return res;
};

export const handleGroupParticipants = conn => {
	conn.ev.on('group-participants.update', async update => {
		const { id, participants, action } = update;

		if (!(await isEnabled(id))) return;

		const groupMetadata = await conn.groupMetadata(id);
		const adminList = groupMetadata.participants?.filter(p => p.admin === 'admin' || p.admin === 'superadmin')?.map(p => `@${p.id.split('@')[0]}`) || [];
		const adminsId = adminList.map(admin => numtoId(admin.replace('@', '')));

		for (const participant of participants) {
			const user = `@${participant.split('@')[0]}`;

			const profilePic = await getProfilePicture(conn, participant);

			const messageOptions = profilePic ? { image: profilePic, mentions: [...participants, ...adminsId] } : { text: '', mentions: [...participants, ...adminsId] };

			if (action === 'add') {
				const welcomeMessage = await getWelcomeMessage(id);
				if (welcomeMessage) {
					const message = replacePlaceholders(welcomeMessage, groupMetadata, user, profilePic, adminList);
					messageOptions.caption = message;
					await conn.sendMessage(id, messageOptions);
				}
			} else if (action === 'remove') {
				const goodbyeMessage = await getGoodByeMessage(id);
				if (goodbyeMessage) {
					const message = replacePlaceholders(goodbyeMessage, groupMetadata, user, profilePic, adminList);
					messageOptions.caption = message;
					await conn.sendMessage(id, messageOptions);
				}
			}
		}
	});
};

export async function chatAi(msg, conn) {
	const chatSettings = await ChatBot.findOne();
	if (!chatSettings?.isActive) return;
	const isDM = msg.isGroup ? false : true;
	if ((chatSettings.isDMOnly && !isDM) || (chatSettings.isGCOnly && isDM)) return;
	await chatBotReply(msg, conn);
}

export async function chatBotReply(msg, conn) {
	if (!msg || !conn) return;
	if (!msg.body) return;
	const res = await getJson(`http://api.brainshop.ai/get?bid=159501&key=6pq8dPiYt7PdqHz3&uid=234&msg=${encodeURIComponent(msg.body)}`);
	await conn.sendMessage(msg.from, { text: res.cnt });
}

const getCurrentTime = () => {
	const timezone = config.TIME_ZONE;
	return moment().tz(timezone).format('HH:mm');
};

export const schedules = async client => {
	_schedule('* * * * *', async () => {
		const currentTime = getCurrentTime();

		const schedules = await Scheduler.findAll({
			where: { isScheduled: true },
		});

		for (const schedule of schedules) {
			if (schedule.muteTime === currentTime && !schedule.isMuted) {
				await client.groupSettingUpdate(schedule.groupId, 'announcement');
				schedule.isMuted = true;
				await schedule.save();
				await client.sendMessage(schedule.groupId, { text: '```🔇 Group is now Closed```' });
			}
			if (schedule.unmuteTime === currentTime && schedule.isMuted) {
				await client.groupSettingUpdate(schedule.groupId, 'not_announcement');
				schedule.isMuted = false;
				await schedule.save();
				await client.sendMessage(schedule.groupId, { text: '```🔊 Group is now Opened```' });
			}
		}
	});
};
