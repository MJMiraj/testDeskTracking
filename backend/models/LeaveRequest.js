const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const LeaveRequest = sequelize.define('LeaveRequest', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    leaveType: { type: DataTypes.ENUM('Sick', 'Casual', 'Unpaid'), allowNull: false },
    startDate: { type: DataTypes.DATEONLY, allowNull: false },
    endDate: { type: DataTypes.DATEONLY, allowNull: false },
    reason: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.ENUM('Pending', 'Approved', 'Rejected'), defaultValue: 'Pending' }
}, {
    tableName: 'leave_requests',
    timestamps: true
});

User.hasMany(LeaveRequest, { foreignKey: 'userId', onDelete: 'CASCADE' });
LeaveRequest.belongsTo(User, { foreignKey: 'userId' });

module.exports = LeaveRequest;
