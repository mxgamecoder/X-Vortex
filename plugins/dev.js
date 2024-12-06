import { bot } from '../lib/plugins.js';
import { inspect } from 'util';
import { isSudo } from './sql/sudo.js';

bot(
	{
		on: 'text',
		dontAddCommandList: true,
	},
	async (message, match, m, client) => {
		const owner = isSudo(message.sender);
		if (!owner) return;
		if (!message.text.startsWith('$ ')) return;

		const code = message.text.slice(2).trim().replace(/\$\s*/g, '');

		try {
			const result = await eval(`(async () => { ${code} })()`);

			const output =
				result === undefined
					? 'undefined'
					: result === null
					? 'null'
					: typeof result === 'function'
					? result.toString()
					: inspect(result, {
							depth: null,
							colors: false,
							maxArrayLength: null,
							maxStringLength: null,
					  });

			return await message.send(`*Result:*\n\`\`\`${output}\`\`\``);
		} catch (error) {
			const errorMessage = error.stack || error.message || String(error);
			await message.send(`*Error:*\n\`\`\`${errorMessage}\`\`\``);
		}
	},
);
