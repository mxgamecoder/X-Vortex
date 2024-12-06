import * as baileys from 'baileys';
import * as __ from '../plugins/bot/events.js';
import config from '../config.js';
import Message from './Base.js';
import { commands, Plugins } from './plugins.js';
import { loadMessage, saveMessage } from '../plugins/sql/store.js';
import { serialize } from './serialize.js';
import useSequelizeAuthState from './Auth.js';
import { manageProcess } from './utils.js';

const logger = { level: 'silent', log: () => {}, info: () => {}, error: () => {}, warn: () => {}, debug: () => {}, trace: () => {}, child: () => logger };

const connect = async () => {
	const session = await useSequelizeAuthState(config.SESSION_ID, logger);
	const { state, saveCreds } = session;
	const { version } = await baileys.fetchLatestBaileysVersion();

	const conn = baileys.makeWASocket({
		auth: {
			creds: state.creds,
			keys: baileys.makeCacheableSignalKeyStore(state.keys, logger /**cache*/),
		},
		printQRInTerminal: false,
		logger,
		browser: baileys.Browsers.ubuntu('Chrome'),
		version,
		keepAliveIntervalMs: 2000,
		syncFullHistory: true,
		markOnlineOnConnect: false,
		fireInitQueries: true,
		emitOwnEvents: true,
		generateHighQualityLinkPreview: true,
		getMessage: async key => {
			const store = await loadMessage(key.id);
			if (store) return store;
			return { conversation: null };
		},
	});

	conn.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
		if (connection === 'close') {
			lastDisconnect.error?.output?.statusCode !== baileys.DisconnectReason.loggedOut ? connect() : manageProcess();
		} else if (connection === 'open') {
			const status = `XSTRO BOT ${config.VERSION}\nPREFIX: ${config.PREFIX}\nPLUGINS: ${commands.length}\nMODE: ${config.MODE}\n\nCONFIGURATIONS\nREAD_CMDS: ${config.READ_CMD}\nAUTO_READ: ${config.AUTO_READ}\nREAD_STATUS: ${config.AUTO_STATUS_READ}\nTIME_ZONE: ${config.TIME_ZONE}`;
			await conn.sendMessage(conn.user.id, { text: '```' + status + '```' });
			console.log(`Connected`);
			console.log(status);
		} else if (connection === 'connecting') {
			console.log('Connecting...');
		}
	});

	conn.ev.on('creds.update', saveCreds);
	conn.ev.on('messages.upsert', async ({ messages, type }) => {
		const msg = await serialize(JSON.parse(JSON.stringify(messages[0])), conn);
		const ev = new Message(conn, msg);
		if (type === 'notify') {
			await Plugins(msg, conn, ev);
			await saveMessage(msg, msg.pushName);
			await __.handleViewOnce(msg, conn, ev);
			if (msg.from && msg.body && msg.isGroup) await __.handleAntiWord(conn, msg);
			if (msg.from && msg.body && msg.isGroup) await __.handleAntiLink(conn, msg);
			if (msg.from && msg.isGroup) __.handleAutoKick(conn, msg);
			if (config.AUTO_READ) await conn.readMessages([msg.key]);
			if (config.AUTO_STATUS_READ && msg.from === 'status@broadcast') await conn.readMessages([msg.key]);
			await __.chatAi(msg, conn);
		}
	});

	conn.ev.on('messages.update', async updates => {
		await __.handleAntiDelete(conn, updates);
	});

	__.handleGroupParticipants(conn);
	__.schedules(conn);
	return conn;
};

export default connect;
