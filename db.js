// backend/db.js
const mysql = require('mysql2/promise');
require('dotenv').config();

// Create connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '', // Handle empty password
    database: process.env.DB_NAME || 'Columbia',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// Test connection
const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ MySQL Database connected successfully!');
        console.log(`📊 Database: ${process.env.DB_NAME || 'epitome_steel'}`);
        console.log(`🔌 Host: ${process.env.DB_HOST || 'localhost'}`);
        
        const [rows] = await connection.query('SELECT VERSION() as version');
        console.log(`📦 MySQL Version: ${rows[0].version}`);
        
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.error('💡 Please check:');
        console.error('   1. XAMPP MySQL is running');
        console.error('   2. Database credentials in .env file');
        console.error('   3. Database name exists');
        return false;
    }
};

// Execute query
const executeQuery = async (query, params = []) => {
    try {
        const [results] = await pool.execute(query, params);
        return results;
    } catch (error) {
        console.error('❌ Query execution failed:', error.message);
        console.error('📝 Query:', query);
        console.error('📝 Parameters:', params);
        throw error;
    }
};

// Get pool status
const getPoolStatus = () => {
    return {
        totalConnections: pool.pool ? pool.pool._allConnections.length : 0,
        freeConnections: pool.pool ? pool.pool._freeConnections.length : 0,
        queueSize: pool.pool ? pool.pool._connectionQueue.length : 0,
    };
};

// Close pool
const closePool = async () => {
    try {
        await pool.end();
        console.log('✅ Database pool closed successfully');
    } catch (error) {
        console.error('❌ Error closing database pool:', error.message);
    }
};

module.exports = {
    pool,
    testConnection,
    executeQuery,
    getPoolStatus,
    closePool
};