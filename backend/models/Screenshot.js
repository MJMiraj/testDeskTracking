const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const TimeEntry = require('./TimeEntry');

const Screenshot = sequelize.define('Screenshot', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    imageUrl: { type: DataTypes.STRING, allowNull: false },
    activeWindow: { type: DataTypes.STRING, allowNull: true },
    isIdle: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
    tableName: 'screenshots',
    timestamps: true
});

User.hasMany(Screenshot, { foreignKey: 'userId', onDelete: 'CASCADE' });
Screenshot.belongsTo(User, { foreignKey: 'userId' });

TimeEntry.hasMany(Screenshot, { foreignKey: 'timeEntryId', onDelete: 'CASCADE' });
Screenshot.belongsTo(TimeEntry, { foreignKey: 'timeEntryId' });

module.exports = Screenshot;
