// // update-password.js
// const bcrypt = require('bcrypt');
// const mysql = require('mysql2/promise');
// require('dotenv').config();

// async function updateAdminPassword() {
//     const password = 'admin123';
//     const saltRounds = 10;
    
//     try {
//         // Generate hash
//         const hash = await bcrypt.hash(password, saltRounds);
//         console.log('✅ Generated hash:', hash);
//         console.log('📝 Password:', password);
//         console.log('\n📋 SQL to update:');
//         console.log(`UPDATE admin_users SET password_hash = '${hash}' WHERE username = 'admin';`);
        
//         // Connect to database
//         const connection = await mysql.createConnection({
//             host: process.env.DB_HOST || 'localhost',
//             user: process.env.DB_USER || 'root',
//             password: process.env.DB_PASSWORD || '',
//             database: process.env.DB_NAME || 'epitome_steel'
//         });
        
//         // Update the password
//         const [result] = await connection.execute(
//             'UPDATE admin_users SET password_hash = ? WHERE username = ?',
//             [hash, 'admin']
//         );
        
//         if (result.affectedRows > 0) {
//             console.log(`\n✅ Password updated successfully!`);
//             console.log(`   Affected rows: ${result.affectedRows}`);
//             console.log(`   Username: admin`);
//             console.log(`   Password: ${password}`);
//         } else {
//             console.log(`\n❌ No user found with username 'admin'`);
//         }
        
//         await connection.end();
//     } catch (error) {
//         console.error('❌ Error:', error.message);
//     }
// }

// updateAdminPassword();



// update-password.js
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateAdminPassword() {
    const username = 'admin@epitomesteel.com';
    const password = 'adminepitomesteel123';
    const saltRounds = 10;
    
    try {
        // Generate hash
        const hash = await bcrypt.hash(password, saltRounds);
        console.log('✅ Generated hash:', hash);
        console.log('📝 Username:', username);
        console.log('📝 Password:', password);
        console.log('\n📋 SQL to update:');
        console.log(`UPDATE admin_users SET password_hash = '${hash}' WHERE username = '${username}';`);
        
        // Connect to database
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'epitome_steel'
        });
        
        // Check if user exists first
        const [existingUser] = await connection.execute(
            'SELECT * FROM admin_users WHERE username = ?',
            [username]
        );
        
        if (existingUser.length === 0) {
            // User doesn't exist, create new admin user
            console.log(`\n⚠️  User '${username}' not found. Creating new admin user...`);
            
            const [insertResult] = await connection.execute(
                'INSERT INTO admin_users (username, password_hash, created_at) VALUES (?, ?, NOW())',
                [username, hash]
            );
            
            if (insertResult.affectedRows > 0) {
                console.log(`\n✅ New admin user created successfully!`);
                console.log(`   Username: ${username}`);
                console.log(`   Password: ${password}`);
                console.log(`   User ID: ${insertResult.insertId}`);
            }
        } else {
            // Update existing user's password
            const [result] = await connection.execute(
                'UPDATE admin_users SET password_hash = ? WHERE username = ?',
                [hash, username]
            );
            
            if (result.affectedRows > 0) {
                console.log(`\n✅ Password updated successfully!`);
                console.log(`   Affected rows: ${result.affectedRows}`);
                console.log(`   Username: ${username}`);
                console.log(`   Password: ${password}`);
            }
        }
        
        await connection.end();
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.code === 'ER_BAD_DB_ERROR') {
            console.error('   Database does not exist. Please check your DB_NAME configuration.');
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('   Access denied. Please check your database credentials.');
        }
    }
}

// Run the function
updateAdminPassword();