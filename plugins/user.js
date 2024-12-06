import { bot } from '../lib/plugins.js';
import config from '../config.js';
import { numtoId } from '../lib/utils.js';
import { aliveMessage, setAliveMsg } from './sql/alive.js';
import { addBan, getBanned, removeBan } from './sql/ban.js';
import { getSudo, delSudo, addSudo } from './sql/sudo.js';
import { addNote, removeNote, updateNote, getNotes } from './sql/notes.js';

bot(
   {
      pattern: 'alive',
      isPublic: true,
      desc: 'Is Bot Alive?',
      type: 'user',
   },
   async (message, match) => {
      if (match) {
         await setAliveMsg(match);
         return message.send('_Alive Updated_');
      }
      const msg = await aliveMessage(message);
      const botInfo = config.BOT_INFO.split(';')[2];

      const mentionData = {
         mentions: [message.sender],
         contextInfo: {
            mentionedJid: [message.sender],
         },
      };

      return botInfo ? message.send(botInfo, { ...mentionData, caption: msg }) : message.send(msg, mentionData);
   }
);

bot(
   {
      pattern: 'ban ?(.*)',
      isPublic: false,
      desc: 'Ban a user from the bot',
      type: 'user',
   },
   async (message, match) => {
      let jid;
      if (message.reply_message) {
         jid = message.reply_message.sender;
      } else if (message.mention && message.mention[0]) {
         jid = message.mention[0];
      } else if (match) {
         jid = numtoId(match);
      }
      if (!jid) return message.send('_Tag, Reply, or provide the number of a user to ban._');
      const fullJid = jid.includes('@s.whatsapp.net') ? jid : `${jid}@s.whatsapp.net`;
      const trimmedJid = fullJid.replace('@s.whatsapp.net', '');
      return message.send(await addBan(trimmedJid), { mentions: [fullJid] });
   }
);

bot(
   {
      pattern: 'unban ?(.*)',
      isPublic: false,
      desc: 'Unban a user from the bot',
      type: 'user',
   },
   async (message, match) => {
      let jid;
      if (message.reply_message) {
         jid = message.reply_message.sender;
      } else if (message.mention && message.mention[0]) {
         jid = message.mention[0];
      } else if (match) {
         jid = numtoId(match);
      }
      if (!jid) return message.send('_Tag, Reply, or provide the number of a user to unban._');
      const fullJid = jid.includes('@s.whatsapp.net') ? jid : `${jid}@s.whatsapp.net`;
      const trimmedJid = fullJid.replace('@s.whatsapp.net', '');
      return message.send(await removeBan(trimmedJid), { mentions: [fullJid] });
   }
);

bot(
   {
      pattern: 'getban',
      isPublic: false,
      desc: 'Get a list of all banned users',
      type: 'user',
   },
   async (message) => {
      const bannedUsers = await getBanned();
      if (bannedUsers.length === 0) return message.send('_No banned users._');
      const mentions = bannedUsers.map((jid) => `${jid}@s.whatsapp.net`);
      return message.send('*_Banned Users:_*\n' + bannedUsers.map((jid, index) => `${index + 1}. @${jid}`).join('\n'), { mentions });
   }
);

bot(
   {
      pattern: 'setsudo',
      isPublic: false,
      desc: 'Add User to Sudo list',
      type: 'user',
   },
   async (message, match) => {
      let jid;
      if (message.reply_message) {
         jid = message.reply_message.sender;
      } else if (message.mention && message.mention[0]) {
         jid = message.mention[0];
      } else if (match) {
         jid = numtoId(match);
      }
      if (!jid) return message.send('_Tag, Reply, or provide the number to set as sudo_');
      const sudolist = await addSudo(jid);
      return message.send(sudolist);
   }
);

bot(
   {
      pattern: 'delsudo',
      isPublic: false,
      desc: 'Remove User from Sudo',
      type: 'user',
   },
   async (message, match) => {
      let jid;
      if (message.reply_message) {
         jid = message.reply_message.sender;
      } else if (message.mention && message.mention[0]) {
         jid = message.mention[0];
      } else if (match) {
         jid = numtoId(match);
      }
      if (!jid) return message.send('_Tag, Reply, or provide the number of a user to delete from sudo._');
      const rsudo = await delSudo(jid);
      return message.send(rsudo);
   }
);

bot(
   {
      pattern: 'getsudo',
      isPublic: false,
      desc: 'Get Sudo Users',
      type: 'user',
   },
   async (message) => {
      const sudoList = await getSudo();
      if (sudoList === '_No Sudo Numbers_') return message.send('*_No Sudo Users_*');
      const sudoNumbers = sudoList.split('\n').map((number) => number.split('@')[0]);
      const formattedSudoList = '*_Sudo Users_*\n\n' + sudoNumbers.map((number, index) => `${index + 1}. @${number}`).join('\n');
      const mentions = sudoNumbers.map((number) => `${number}@s.whatsapp.net`);
      return message.send(formattedSudoList, { mentions: mentions });
   }
);
bot(
   {
      pattern: 'addnote',
      isPublic: true,
      desc: 'Create Notes',
      type: 'user',
   },
   async (message, match) => {
      const text = match.trim() || message.reply_message?.text;
      if (!text) return await message.send('*Format*: _.addnote title|content_');
      const [title, content] = text.split('|');
      if (!title) return await message.send('*Format*: _.addnote title|content_');
      const words = content ? content.trim().split(/\s+/) : [];
      if (words.length > 500) return await message.send('*Content exceeds 500 words limit*');
      const newNote = await addNote(title, content || '').catch(() => null);
      if (!newNote) return await message.send('*Unable to perform action*');
      return await message.send(`*Note added*\n\n*ID*: ${newNote.id}`);
   }
);

bot(
   {
      pattern: 'delnote',
      isPublic: true,
      desc: 'Delete a Note',
      type: 'user',
   },
   async (message, match) => {
      const noteId = parseInt(match.trim());
      if (!noteId || isNaN(noteId)) return await message.send('*Format*: _.delnote id_');
      const deleted = await removeNote(noteId).catch(() => null);
      if (!deleted) return await message.send('*Unable to perform action*');
      return await message.send(`*Note deleted*`);
   }
);

bot(
   {
      pattern: 'editnote',
      isPublic: true,
      desc: 'Update an Existing Note',
      type: 'user',
   },
   async (message, match) => {
      const text = match.trim() || message.reply_message?.text;
      if (!text) return await message.send('*Format*: _.editnote id; title|content_');
      const [id, content] = text.split(';').map((item) => item.trim());
      if (!id || !content) return await message.send('*Format*: _.editnote id; title|content_');
      const [title, newContent] = content.split('|');
      const updates = {
         title: title.trim(),
         content: newContent?.trim() || '',
      };
      const updatedNote = await updateNote(parseInt(id), updates).catch(() => null);
      if (!updatedNote) return await message.send('*Unable to perform action*');
      return await message.send('*Note updated*');
   }
);

bot(
   {
      pattern: 'getnotes',
      isPublic: true,
      desc: 'List all Notes',
      type: 'user',
   },
   async (message) => {
      const notes = await getNotes().catch(() => null);
      if (!notes) return await message.send('*Unable to perform action*');
      if (notes.length === 0) return await message.send('*No notes found*');
      const notesList = notes.map((note, index) => `${index + 1}. ${note.title}`).join('\n');
      return await message.send(`*_Notes:_*\n\n${notesList}`);
   }
);

bot(
   {
      pattern: 'cnote',
      isPublic: true,
      desc: 'Get Note Content',
      type: 'user',
   },
   async (message, match) => {
      const noteId = parseInt(match.trim());
      if (!noteId || isNaN(noteId)) return await message.send('*Format*: _.cnote id_');
      const notes = await getNotes().catch(() => null);
      if (!notes) return await message.send('*Unable to perform action*');
      const note = notes.find((n) => n.id === noteId);
      if (!note) return await message.send('*Note not found*');
      return await message.send(`*Title*: ${note.title}\n*Content*: ${note.content}`);
   }
);
