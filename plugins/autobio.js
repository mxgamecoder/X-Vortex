import { bot } from '../lib/plugins.js';

let autobioActive = false;
let autobioInterval;

bot(
	{
		pattern: 'autobio ?(.*)',
		isPublic: false,
		desc: 'Automatically update your WhatsApp bio every 5 minutes. Use "on" to start and "off" to stop.',
		type: 'whatsapp',
	},
	async (message, match) => {
		const action = match?.toLowerCase();
		const updateBio = async () => {
			const timestamp = new Date().toLocaleString();
			const newBio = `${('xstro md auto bio bot')} ${timestamp}`; // Custom bio
			try {
				await message.client.updateProfileStatus(newBio);
				console.log(`[Autobio] Bio updated: ${newBio}`);
			} catch (error) {
				console.error('[Autobio] Failed to update bio:', error);
			}
		};

		if (action === 'on') {
			if (autobioActive) {
				return message.send('_Autobio is already active!_');
			}
			autobioActive = true;
			await updateBio(); // Immediate bio update
			message.send('_Autobio activated! Bio will be updated every 5 minutes._');

			autobioInterval = setInterval(updateBio, 5 * 60 * 1000); // Every 5 minutes
		} else if (action === 'off') {
			if (!autobioActive) {
				return message.send('_Autobio is not active!_');
			}
			clearInterval(autobioInterval);
			autobioActive = false;
			message.send('_Autobio deactivated!_');
		} else {
			return message.send('_Use "autobio on" to activate or "autobio off" to deactivate._');
		}
	},
);
