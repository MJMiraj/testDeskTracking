const mysql = require('mysql2/promise');

async function createDb() {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '' // Default Laragon MySQL password
        });
        await connection.query('CREATE DATABASE IF NOT EXISTS desktime_pro;');
        console.log('Database desktime_pro created or already exists.');
        await connection.end();
    } catch (e) {
        console.error('Error creating database:', e.message);
    }
}
createDb();
