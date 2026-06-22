// backend/db.js
const mysql = require('mysql2/promise');
require('dotenv').config();

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'epitome_steel',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    multipleStatements: false,
    timezone: '+05:30' // IST timezone
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
const testConnection = async () => {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log('✅ MySQL Database connected successfully!');
        console.log(`📊 Database: ${dbConfig.database}`);
        console.log(`🔌 Host: ${dbConfig.host}:${dbConfig.port}`);
        
        // Get server version
        const [rows] = await connection.query('SELECT VERSION() as version');
        console.log(`📦 MySQL Version: ${rows[0].version}`);
        
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.error('💡 Please check:');
        console.error('   1. XAMPP MySQL is running');
        console.error('   2. Database credentials in .env file');
        console.error('   3. Database name exists');
        return false;
    } finally {
        if (connection) connection.release();
    }
};

// Helper function to execute queries with error handling
const executeQuery = async (query, params = []) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const [rows, fields] = await connection.execute(query, params);
        return rows;
    } catch (error) {
        console.error('❌ Query execution failed:', error.message);
        console.error('📝 Query:', query);
        console.error('📝 Parameters:', params);
        throw error;
    } finally {
        if (connection) connection.release();
    }
};

// Helper function for transactions
const executeTransaction = async (callback) => {
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        
        const result = await callback(connection);
        
        await connection.commit();
        return result;
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error('❌ Transaction failed:', error.message);
        throw error;
    } finally {
        if (connection) connection.release();
    }
};

// Get pool status
const getPoolStatus = () => {
    return {
        totalConnections: pool.pool._allConnections.length,
        freeConnections: pool.pool._freeConnections.length,
        queuedRequests: pool.pool._connectionQueue.length,
        maxConnections: dbConfig.connectionLimit
    };
};

// Close all connections (for graceful shutdown)
const closePool = async () => {
    try {
        await pool.end();
        console.log('✅ Database pool closed successfully');
    } catch (error) {
        console.error('❌ Error closing database pool:', error.message);
    }
};

// Export functions
module.exports = {
    pool,
    testConnection,
    executeQuery,
    executeTransaction,
    getPoolStatus,
    closePool,
    dbConfig
};