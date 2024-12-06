import { DataTypes } from 'sequelize';
import config from '../../config.js';

export const AuthState = config.DATABASE.define(
	'AuthState',
	{
		session_id: {
			type: DataTypes.STRING,
			primaryKey: true,
		},
		data_key: {
			type: DataTypes.STRING,
			primaryKey: true,
		},
		data_value: {
			type: DataTypes.TEXT,
			allowNull: false,
		},
	},
	{
		tableName: 'session',
		timestamps: false,
		indexes: [{ fields: ['session_id', 'data_key'] }],
	},
);
