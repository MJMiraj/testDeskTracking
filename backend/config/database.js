const { Sequelize } = require('sequelize');

const fs = require('fs');
const path = require('path');

const dbUri = process.env.DB_URI;

// Advanced Concept: Sequelize ORM connection pool
const sequelize = new Sequelize(dbUri, {
    dialect: 'mysql',
    logging: false, // Turn off console logging of every SQL query
    dialectOptions: {
        ssl: {
            ca: fs.readFileSync(path.join(__dirname, 'ca.pem'))
        }
    },
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
});

module.exports = sequelize;
