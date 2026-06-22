// update-password.js
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateAdminPassword() {
    const password = 'admin123';
    const saltRounds = 10;
    
    try {
        // Generate hash
        const hash = await bcrypt.hash(password, saltRounds);
        console.log('✅ Generated hash:', hash);
        console.log('📝 Password:', password);
        console.log('\n📋 SQL to update:');
        console.log(`UPDATE admin_users SET password_hash = '${hash}' WHERE username = 'admin';`);
        
        // Connect to database
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'epitome_steel'
        });
        
        // Update the password
        const [result] = await connection.execute(
            'UPDATE admin_users SET password_hash = ? WHERE username = ?',
            [hash, 'admin']
        );
        
        if (result.affectedRows > 0) {
            console.log(`\n✅ Password updated successfully!`);
            console.log(`   Affected rows: ${result.affectedRows}`);
            console.log(`   Username: admin`);
            console.log(`   Password: ${password}`);
        } else {
            console.log(`\n❌ No user found with username 'admin'`);
        }
        
        await connection.end();
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

updateAdminPassword();