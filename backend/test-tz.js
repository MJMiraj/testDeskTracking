const moment = require('moment-timezone');
const sequelize = require('./config/database');
const { DataTypes } = require('sequelize');

const Screenshot = sequelize.define('Screenshot', {
    userId: { type: DataTypes.INTEGER, allowNull: false },
    imagePath: { type: DataTypes.STRING, allowNull: true },
    activeWindow: { type: DataTypes.STRING, allowNull: true },
    isIdle: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
    tableName: 'screenshots',
    timestamps: true
});

const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    settings: { type: DataTypes.JSON, allowNull: false }
}, {
    tableName: 'users',
    timestamps: true
});

async function run() {
    try {
        const user = await User.findOne();
        console.log("User timezone setting:", user?.settings?.timezone);
        
        const userTimezone = user?.settings?.timezone || 'UTC';
        
        // Find recent screenshots
        const ss = await Screenshot.findAll({
            limit: 5,
            order: [['id', 'DESC']]
        });
        
        console.log("\nRecent screenshots in DB:");
        ss.forEach(s => {
            console.log(`ID: ${s.id}, activeWindow: ${s.activeWindow}, createdAt from DB: ${s.createdAt.toISOString()}`);
            const ssDate = moment(s.createdAt).tz(userTimezone);
            console.log(`Parsed hour for timeline: ${ssDate.hour()}:${ssDate.minute()}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

run();
