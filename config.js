import dotenv from 'dotenv';
dotenv.config();
import { Sequelize } from 'sequelize';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const toBool = x => x === 'true';
const DATABASE_URL = process.env.DATABASE_URL || './database.db';
const config = {
	BASE_API_URL: process.env.BASE_API_URL || 'https://xstro-api-ec3ad328e76f.herokuapp.com',
	SESSION_ID: process.env.SESSION_ID || '',
	BOT_INFO: process.env.BOT_INFO || 'ᴍxɢᴀᴍᴇᴄᴏᴅᴇʀ;X-ᴠᴏʀᴛᴇx',
	PREFIX: process.env.PREFIX || '.',
	SUDO: process.env.SUDO || '',
	STICKER_PACK: process.env.STICKER_PACK || 'ᴍxɢᴀᴍᴇᴄᴏᴅᴇʀ;X-ᴠᴏʀᴛᴇx',
	READ_CMD: toBool(process.env.READ_CMD) || true,
	AUTO_READ: toBool(process.env.AUTO_READ) || false,
	AUTO_STATUS_READ: toBool(process.env.AUTO_STATUS_READ) || false,
	MODE: process.env.MODE || 'private',
	CMD_REACT: process.env.CMD_REACT || true,
	HEROKU_API_KEY: process.env.HEROKU_API_KEY || '',
	HEROKU_APP_NAME: process.env.HEROKU_APP_NAME || '',
	TIME_ZONE: process.env.TZ || process.env.TIME_ZONE || 'Africa/Lagos',
	VERSION: require('./package.json').version,
	DATABASE:
		DATABASE_URL === './database.db'
			? new Sequelize({
					dialect: 'sqlite',
					storage: DATABASE_URL,
					logging: false,
			  })
			: new Sequelize(DATABASE_URL, {
					dialect: 'postgres',
					ssl: true,
					protocol: 'postgres',
					dialectOptions: {
						native: true,
						ssl: { require: true, rejectUnauthorized: false },
					},
					logging: false,
			  }),
};

export default config;
