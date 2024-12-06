import { bot } from '../lib/plugins.js';

bot(
	{
		pattern: 'repo',
		isPublic: true,
		desc: 'Sends bot info, social links, and GitHub repo details.',
		type: 'misc',
	},
	async message => {
		const adMessage = `\`\`\`
Xstro Multi Device WhatsApp Bot

GitHub: [Explore & Contribute](https://github.com/mxgamecoder/X-Vortex)

Maintainers
- MX-GΔMΞCØDΞR (Main Dev)
- Mr. Wasi (Contributor Dev)
- Paradoxical (Beta Testers)
- Emperor (Beta Testers)

*Help Us Improve:* Star, report bugs, or suggest features!

© 2024 MX-GΔMΞCØDΞR
    \`\`\``;
		await message.send(adMessage);
	},
);
