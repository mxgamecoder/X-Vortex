import config from '../config.js';
import { commands, bot } from '../lib/plugins.js';
import { formatBytes, runtime } from '../lib/utils.js';
import { platform, totalmem, freemem } from 'os';
import { fancy } from './bot/font.js';

bot(
   {
      pattern: 'menu',
      isPublic: true,
      desc: 'Show All Commands',
      dontAddCommandList: true,
   },
   async (message) => {
      let menuText = `╭─ ${config.BOT_INFO.split(';')[1]} ───
│ User ${message.pushName}
│ Mode ${config.MODE}
│ Uptime ${runtime(process.uptime())}
│ Platform ${platform()}
│ Plugins ${commands.length}
│ Memory ${formatBytes(totalmem() - freemem())}
│ Version ${config.VERSION}
╰────────────────\n`;

      let commandCounter = 1;
      const categorized = commands
         .filter((cmd) => cmd.pattern && !cmd.dontAddCommandList)
         .map((cmd) => ({
            name: cmd.pattern.toString().split(/\W+/)[2],
            category: cmd.type?.toLowerCase() || 'misc',
         }))
         .reduce((acc, { name, category }) => {
            acc[category] = (acc[category] || []).concat(name);
            return acc;
         }, {});

      Object.keys(categorized).forEach((category) => {
         menuText += `\n╭──〈 ${category} 〉────\n`;
         categorized[category].forEach((cmd) => {
            menuText += `│▸ ${commandCounter}. ${cmd}\n`;
            commandCounter++;
         });
         menuText += `╰──────────────\n`;
      });

      return await message.send(fancy(`\`\`\`${menuText}\`\`\``));
   }
);

bot(
   {
      pattern: 'list',
      isPublic: true,
      desc: 'Show All Commands',
      dontAddCommandList: true,
   },
   async (message) => {
      let menu = 'XSTRO HELP LIST\n\n';
      let cmdList = [];
      let cmd, desc;
      commands.map((command) => {
         if (command.pattern) cmd = command.pattern.toString().split(/\W+/)[2];
         desc = command.desc || false;
         if (!command.dontAddCommandList && cmd !== undefined) cmdList.push({ cmd, desc });
      });
      cmdList.sort((a, b) => a.cmd.localeCompare(b.cmd));
      cmdList.forEach(({ cmd, desc }, num) => {
         menu += `${(num += 1)} ${cmd.trim()}\n`;
         if (desc) menu += `${desc}\n\n`;
      });

      return await message.send(fancy(menu), {
         contextInfo: { isForwarded: true, forwardingscore: 999 },
      });
   }
);
