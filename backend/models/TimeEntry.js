const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const TimeEntry = sequelize.define('TimeEntry', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    taskName: { type: DataTypes.STRING, allowNull: false },
    projectName: { type: DataTypes.STRING, allowNull: true, defaultValue: 'General' },
    startTime: { type: DataTypes.DATE, allowNull: false },
    endTime: { type: DataTypes.DATE, allowNull: true },
    durationSeconds: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 }
}, {
    tableName: 'time_entries',
    timestamps: true
});

// Relationships
User.hasMany(TimeEntry, { foreignKey: 'userId', onDelete: 'CASCADE' });
TimeEntry.belongsTo(User, { foreignKey: 'userId' });

module.exports = TimeEntry;
