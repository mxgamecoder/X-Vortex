import config from '../../config.js';
import { DataTypes } from 'sequelize';

const AutoReact = config.DATABASE.define(
	'AReact',
	{
		status: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: false,
		},
	},
	{
		tableName: 'areact',
		timestamps: false,
	},
);

export default AutoReact;
