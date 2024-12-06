import { detectType } from 'utils';
import { getContentType, generateForwardMessageContent, generateWAMessageFromContent, downloadMediaMessage } from 'baileys';
import { decodeJid, numtoId, parsedJid } from './utils.js';
import config from '../config.js';

class Message {
	constructor(client, data) {
		Object.defineProperty(this, 'client', {
			value: client,
			enumerable: false,
			writable: true,
			configurable: true,
		});
		Object.defineProperty(this, 'data', {
			value: data,
			enumerable: false,
			writable: true,
			configurable: true,
		});
		if (data) this._events(data);
	}

	_events(data) {
		const { key, isGroup, pushName, sender, messageTimestamp, body, message, quoted } = data;
		this.data = data;
		this.key = key;
		this.id = key.id;
		this.jid = key.remoteJid;
		this.isGroup = isGroup;
		this.fromMe = key.fromMe;
		this.pushName = pushName;
		this.message = message;
		this.prefix = config.PREFIX.trim();
		this.sender = parsedJid(sender)?.[0];
		this.user = decodeJid(this.client.user.id);
		this.timestamp = messageTimestamp?.low || messageTimestamp || Date.now();
		this.text = body || '';
		this.bot = /^(BAE5|3EB0)/.test(key.id);
		this.mention = message?.extendedTextMessage?.contextInfo?.mentionedJid || false;

		this.reply_message = data?.quoted
			? {
					id: quoted.key.id,
					fromMe: quoted.isSelf,
					sender: parsedJid(quoted.sender)?.[0],
					key: quoted.key,
					pushName: quoted.pushName,
					bot: /^(BAE5|3EB0)/.test(quoted.key.id),
					text: quoted.body,
					image: Boolean(quoted.message?.ephemeralMessage?.imageMessage || quoted.message.imageMessage),
					video: Boolean(quoted.message?.ephemeralMessage?.videoMessage || quoted.message.videoMessage),
					audio: Boolean(quoted.message?.ephemeralMessage?.audioMessage || quoted.message.audioMessage),
					sticker: Boolean(quoted.message?.ephemeralMessage?.stickerMessage || quoted.message.stickerMessage),
					document: Boolean(quoted.message?.ephemeralMessage?.documentMessage || quoted.message.documentMessage),
					viewonce: quoted.message.audioMessage?.viewOnce || quoted.message.imageMessage?.viewOnce || quoted.message.videoMessage?.viewOnce || quoted.message.viewOnce || quoted.message.viewOnceMessageV2 || quoted.message.viewOnceMessageV2Extension || false,
					ephemeral: Boolean(quoted.message?.ephemeralMessage),
			  }
			: false;
	}

	async edit(content) {
		const msg = await this.client.sendMessage(this.jid, {
			text: content,
			edit: this.reply_message?.key || this.key,
		});
		return new Message(this.client, msg);
	}

	async react(emoji, opts = {}) {
		const msg = await this.client.sendMessage(this.jid, { react: { text: emoji, key: opts.key || this.key } });
		return new Message(this.client, msg);
	}

	async delete() {
		const msg = await this.client.sendMessage(this.jid, { delete: this.reply_message?.key });
		return new Message(this.client, msg);
	}

	async clearChat() {
		const msg = await this.client.chatModify(
			{
				delete: true,
				lastMessages: [
					{
						key: this.key,
						messageTimestamp: this.timestamp,
					},
				],
			},
			this.jid,
		);
		return new Message(this.client, msg);
	}

	async archiveChat(opts = true) {
		const lstMsg = {
			message: this.message,
			key: this.key,
			messageTimestamp: this.timestamp,
		};
		await this.client.chatModify(
			{
				archive: opts,
				lastMessages: [lstMsg],
			},
			this.jid,
		);
	}
	/**
	 * Takes A String And Updates User's WA Name
	 * @param {string} name - Name to Update With
	 * @returns {Promise<void>}
	 */
	async updateName(name) {
		return await this.client.updateProfileName(this.user, name);
	}
	/**
	 * Takes An Image Buffer And Updates User's Profile Picture
	 * @param {buffer} imageBuffer
	 * @returns {Promise<void>}
	 */
	async updatePP(imageBuffer) {
		return await this.client.updateProfilePicture(this.user, imageBuffer);
	}
	/**
	 * Remove Profile Picture of current user
	 * @returns {Promise<void>}
	 */
	async rPP() {
		return await this.client.removeProfilePicture(this.user);
	}
	/**
	 * - Blocks A User from the Provided Jid
	 * @param {string} jid - The User to Block
	 * @returns {Promise<void>}
	 */
	async Block(jid) {
		this.send(`_@${jid.split('@')[0]} Blocked_`, { mentions: [jid] });
		return await this.client.updateBlockStatus(jid, 'block');
	}

	/**
	 * - UnBlocks A User from the Provided Jid
	 * @param {string} jid - The User to Block
	 * @returns {Promise<void>}
	 */
	async Unblock(jid) {
		this.send(`_@${jid.split('@')[0]} Unblocked_`, { mentions: [jid] });
		return await this.client.updateBlockStatus(jid, 'unblock');
	}

	/**
	 * That Person's JID
	 * @param {string} match - Jid of the person automatically or Manually
	 * @returns {Promise<void>}
	 */
	async thatJid(match) {
		let jid;
		if (!match && !this.isGroup) {
			jid = this.data.key.remoteJid || this.reply_message?.sender;
		} else if (!match && this.isGroup) {
			jid = this.reply_message?.sender || this.mention[0];
		} else {
			jid = numtoId(match);
		}
		return jid;
	}

	async send(content, opts = {}) {
		const jid = opts.jid || this.jid;
		const quoted = this.data.quoted || this.data;
		const type = opts.type || (await detectType(content));
		const mentions = opts.mentions || [];

		let message = { ...opts };
		if (type === 'text') {
			message = { text: content.toString(), mentions };
		} else if (type === 'image') {
			message = { image: Buffer.isBuffer(content) ? content : { url: content }, caption: opts.caption, mentions, ...opts };
		} else if (type === 'video') {
			message = { video: Buffer.isBuffer(content) ? content : { url: content }, caption: opts.caption, mentions, ...opts };
		} else if (type === 'audio') {
			message = { audio: Buffer.isBuffer(content) ? content : { url: content }, mimetype: 'audio/mpeg', mentions, ...opts };
		} else if (type === 'document') {
			message = { document: Buffer.isBuffer(content) ? content : { url: content }, fileName: opts.fileName, mentions, ...opts };
		} else if (type === 'sticker') {
			message = { sticker: Buffer.isBuffer(content) ? content : { url: content }, mentions };
		} else {
			throw new Error('Unsupported message type');
		}
		const msg = await this.client.sendMessage(jid, message, { quoted });
		return new Message(this.client, msg);
	}

	async forward(jid, content, options = {}) {
		if (options.readViewOnce) {
			content = content?.ephemeralMessage?.message || content;
			const viewOnceKey = Object.keys(content)[0];
			delete content?.ignore;
			delete content?.viewOnceMessage?.message?.[viewOnceKey]?.viewOnce;
			content = { ...content?.viewOnceMessage?.message };
		}

		const forwardContent = generateForwardMessageContent(content, options.force);
		const contentType = getContentType(forwardContent);

		const forwardOptions = {
			...options,
			contextInfo: {
				...(options.contextInfo || {}),
				...(options.mentions ? { mentionedJid: options.mentions } : {}),
				...forwardContent[contentType]?.contextInfo,
			},
		};

		const waMessage = generateWAMessageFromContent(jid, forwardContent, forwardOptions);
		return this.client.relayMessage(jid, waMessage.message, {
			messageId: waMessage.key.id,
		});
	}

	async downloadAndSaveMedia() {
		const buffer = await downloadMediaMessage(
			{
				key: this.data.quoted.key || this.key,
				message: this.data.quoted?.ephemeralMessage.message || this.data.quoted?.message,
			},
			'buffer',
			{},
			{
				logger: console,
				reuploadRequest: this.client.updateMediaMessage,
			},
		);
		return buffer;
	}
}

export default Message;
