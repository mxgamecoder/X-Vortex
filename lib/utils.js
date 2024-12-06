import { performance } from 'perf_hooks';
import { exec } from 'child_process';
import { jidDecode } from 'baileys';
import { readdir } from 'fs/promises';
import { extname, join } from 'path';
import XUtils from 'utils';

export const utils = XUtils;

export function manageProcess(type) {
	return exec(type === 'restart' ? 'npm start' : 'npm stop');
}

export const decodeJid = jid => {
	if (!jid) return jid;
	if (/:\d+@/gi.test(jid)) {
		const decode = jidDecode(jid) || {};
		return decode.user && decode.server ? `${decode.user}@${decode.server}` : jid;
	} else {
		return jid;
	}
};

export function parsedJid(text = '') {
	return [...text.matchAll(/([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net');
}

export function formatBytes(bytes, decimals = 2) {
	if (!+bytes) return '0 Bytes';
	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function runtime(seconds) {
	seconds = Number(seconds);
	var d = Math.floor(seconds / (3600 * 24));
	var h = Math.floor((seconds % (3600 * 24)) / 3600);
	var m = Math.floor((seconds % 3600) / 60);
	var s = Math.floor(seconds % 60);
	var dDisplay = d > 0 ? d + (d == 1 ? ' d ' : ' d ') : '';
	var hDisplay = h > 0 ? h + (h == 1 ? ' h ' : ' h ') : '';
	var mDisplay = m > 0 ? m + (m == 1 ? ' m ' : ' m ') : '';
	var sDisplay = s > 0 ? s + (s == 1 ? ' s' : ' s') : '';
	return dDisplay + hDisplay + mDisplay + sDisplay;
}

export const getFloor = number => {
	return Math.floor(number);
};

export const getRandom = array => {
	if (array.length === 0) return undefined;
	const randomIndex = Math.floor(Math.random() * array.length);
	return array[randomIndex];
};

export const numtoId = phoneNumber => {
	if (!phoneNumber || typeof phoneNumber !== 'string') return '';
	return `${phoneNumber.replace(/\D/g, '')}@s.whatsapp.net`;
};

export async function isAdmin(jid, user, client) {
	const groupMetadata = await client.groupMetadata(jid);
	const groupAdmins = groupMetadata.participants.filter(participant => participant.admin !== null).map(participant => participant.id);
	return groupAdmins.includes(decodeJid(user));
}

export default async function loadFiles() {
	try {
		const baseDir = process.cwd();
		const pluginsDir = join(baseDir, 'plugins');
		const sqlDir = join(pluginsDir, 'sql');

		const dirsToRead = [pluginsDir, sqlDir];

		for (const dir of dirsToRead) {
			const files = await readdir(dir, { withFileTypes: true });
			await Promise.all(
				files.map(async file => {
					const fullPath = join(dir, file.name);
					if (file.isDirectory() && fullPath !== sqlDir) return;
					if (extname(file.name) === '.js') {
						try {
							await import(`file://${fullPath}`);
						} catch (err) {
							console.log('ERROR', `${file.name}: ${err.message}`);
						}
					}
				}),
			);
		}
	} catch (err) {
		console.log('ERROR:\n', err.message);
	}
}

export const bufferToJSON = obj => {
	if (Buffer.isBuffer(obj)) return { type: 'Buffer', data: Array.from(obj) };
	if (Array.isArray(obj)) return obj.map(bufferToJSON);
	if (obj && typeof obj === 'object') {
		return Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, bufferToJSON(value)]));
	}
	return obj;
};

export const jsonToBuffer = obj => {
	if (obj?.type === 'Buffer' && Array.isArray(obj.data)) return Buffer.from(obj.data);
	if (Array.isArray(obj)) return obj.map(jsonToBuffer);
	if (obj && typeof obj === 'object') {
		return Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, jsonToBuffer(value)]));
	}
	return obj;
};

export const profile = async (name, fn, logger) => {
	const start = performance.now();
	const result = await fn();
	const end = performance.now();
	logger.debug(`${name} took ${(end - start).toFixed(2)} ms`);
	return result;
};