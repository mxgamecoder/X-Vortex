import { bot } from '../lib/plugins.js';
import { exec } from 'child_process';
import simplegit from 'simple-git';
import { manageProcess } from '../lib/utils.js';
import { updateHerokuApp } from './bot/tools.js';
import config from '../config.js';

const git = simplegit();

bot(
	{
		pattern: 'update',
		isPublic: false,
		desc: 'Update the bot',
		type: 'system',
	},
	async (message, match) => {
		await git.fetch();
		const commits = await git.log(['master..origin/master']);
		if (commits.total === 0) return await message.send(`\`\`\`you are on version ${config.VERSION}\`\`\``);
		if (match === 'now') {
			message.send('restarting bot');
			exec('git stash && git pull origin master', async (err, stderr) => {
				if (err) return await message.send('```' + stderr + '```');
			});
			manageProcess('restart');
		} else {
			let changesList = commits.all.map((c, i) => `${i + 1}. ${c.message}`).join('\n');
			let changes = `*New Update*\n\n*Changes:*\n${changesList}\n\n*Use:* ${message.prefix}update now`;
			await message.send('```' + changes + '```');
		}
	},
);

bot(
	{
		pattern: 'redeploy',
		isPublic: false,
		desc: 'Fully Updates & Redeploy Heroku App',
		type: 'system',
	},
	async message => {
		if (!process.env.HEROKU_APP_NAME && !process.env.HEROKU_API_KEY) return message.send('invaild heroku app, make sure you are running on heroku with the correct variables');
		message.send('Redeploying Heroku Dyno\n5mins');
		await updateHerokuApp();
	},
);
