const mysql = require('mysql2/promise');

async function copyDb() {
    console.log('Connecting to remote database...');
    const remote = await mysql.createConnection({
        host: 'mysql-233b72e3-mjmiraj7-157f.h.aivencloud.com',
        port: 27461,
        user: 'avnadmin',
        password: 'YOUR_AIVEN_PASSWORD_HERE',
        database: 'defaultdb',
        ssl: { rejectUnauthorized: false },
        dateStrings: true
    });

    console.log('Connecting to local database...');
    const local = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'desktime_pro',
        dateStrings: true
    });

    try {
        const [tablesInfo] = await remote.query('SHOW TABLES');
        const tables = tablesInfo.map(t => Object.values(t)[0]);
        console.log('Tables to copy:', tables);

        // Turn off foreign key checks locally during import
        await local.query('SET FOREIGN_KEY_CHECKS = 0');
        await local.query("SET SQL_MODE='ANSI_QUOTES'");

        for (const table of tables) {
            console.log('\nProcessing table: ' + table);
            
            // Get create table statement
            const [createTableInfo] = await remote.query('SHOW CREATE TABLE `' + table + '`');
            const createStatement = createTableInfo[0]['Create Table'];
            
            // Recreate table locally
            console.log('- Dropping local table if exists...');
            await local.query('DROP TABLE IF EXISTS `' + table + '`');
            console.log('- Creating local table...');
            await local.query(createStatement);

            // Fetch data
            console.log('- Fetching data from remote...');
            const [rows] = await remote.query('SELECT * FROM `' + table + '`');
            console.log('- Fetched ' + rows.length + ' rows.');

            if (rows.length > 0) {
                // Insert data in chunks
                const chunkSize = 1000;
                for (let i = 0; i < rows.length; i += chunkSize) {
                    const chunk = rows.slice(i, i + chunkSize);
                    const keys = Object.keys(chunk[0]);
                    const values = chunk.map(row => keys.map(k => {
                        const val = row[k];
                        if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
                            return JSON.stringify(val);
                        }
                        return val;
                    }));
                    
                    const placeholders = chunk.map(() => '(' + keys.map(() => '?').join(',') + ')').join(',');
                    const sql = 'INSERT INTO `' + table + '` (' + keys.map(k => '`' + k + '`').join(',') + ') VALUES ' + placeholders;
                    
                    await local.query(sql, values.flat());
                }
                console.log('- Inserted ' + rows.length + ' rows into local.');
            }
        }
        
        await local.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('\nDatabase copy completed successfully!');
    } catch (e) {
        console.error('\nError during copy:', e);
    } finally {
        await remote.end();
        await local.end();
    }
}

copyDb();
