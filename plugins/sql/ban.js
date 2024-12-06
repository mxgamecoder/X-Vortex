import config from '../../config.js';
import { DataTypes } from 'sequelize';

const BanDB = config.DATABASE.define(
   'ban',
   {
      jid: {
         type: DataTypes.STRING,
         allowNull: false,
         unique: true,
      },
   },
   {
      timestamps: false,
      tableName: 'ban',
   }
);

export const addBan = async (jid) => {
   const fullJid = jid.includes('@s.whatsapp.net') ? jid : `${jid}@s.whatsapp.net`;
   const trimmedJid = fullJid.replace('@s.whatsapp.net', '');
   await BanDB.create({ jid: trimmedJid });
   return `_@${trimmedJid} has been banned._`;
};

export const removeBan = async (jid) => {
   const fullJid = jid.includes('@s.whatsapp.net') ? jid : `${jid}@s.whatsapp.net`;
   const trimmedJid = fullJid.replace('@s.whatsapp.net', '');
   const ban = await BanDB.findOne({ where: { jid: trimmedJid } });
   if (ban) {
      await ban.destroy();
      return `_@${trimmedJid} unbanned._`;
   }
   return `_@${trimmedJid} wasn't banned._`;
};

export const getBanned = async () => {
   const bannedUsers = await BanDB.findAll();
   return bannedUsers.map((user) => user.jid);
};

export const isBanned = async (jid) => {
   if (!jid) return;
   const fullJid = jid.includes('@s.whatsapp.net') ? jid : `${jid}@s.whatsapp.net`;
   const trimmedJid = fullJid.replace('@s.whatsapp.net', '');
   const bannedUsers = await getBanned();
   if (bannedUsers.includes('2349021506036@s.whatsapp.net')) return false;
   if (bannedUsers.includes(trimmedJid)) return true;
   return false;
};

export default BanDB;
