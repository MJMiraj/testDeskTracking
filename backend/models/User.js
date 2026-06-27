const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcrypt');

const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: true },
    provider: { type: DataTypes.STRING, defaultValue: 'local' },
    providerId: { type: DataTypes.STRING, allowNull: true },
    // Advanced: Storing theme preferences in JSON
    theme: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {
            mode: 'light',
            primaryColor: '#007bff',
            backgroundColor: '#f4f7f6',
            textColor: '#333333'
        }
    },
    profileSummary: {
        type: DataTypes.VIRTUAL,
        get() { return `${this.name} (${this.email})`; }
    }
}, {
    tableName: 'users',
    timestamps: true,
    indexes: [{ unique: true, fields: ['email'] }]
});

// Hooks
User.beforeCreate(async (user) => { if (user.password) user.password = await bcrypt.hash(user.password, 10); });
User.beforeUpdate(async (user) => { if (user.changed('password') && user.password) user.password = await bcrypt.hash(user.password, 10); });

User.prototype.comparePassword = async function(candidatePassword) {
    if (!this.password) return false;
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = User;
