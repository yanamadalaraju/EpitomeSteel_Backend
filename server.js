// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Import database functions
const { 
    testConnection, 
    executeQuery, 
    getPoolStatus,
    closePool 
} = require('./db');

// Import email service
const { 
    sendUserConfirmation, 
    sendAdminNotification, 
    verifyEmailConfig 
} = require('./emailService');

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ FIXED CORS Configuration - Allow multiple origins
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000', 
    'http://localhost:8080',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:8080'
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
            callback(null, true);
        } else {
            console.log('❌ CORS blocked for origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    exposedHeaders: ['Content-Length', 'X-Requested-With']
}));

// ✅ Handle preflight requests explicitly
app.options('*', cors());

// Other middleware
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log all requests for debugging
app.use((req, res, next) => {
    console.log(`📝 ${req.method} ${req.url} from ${req.headers.origin || 'unknown'}`);
    next();
});

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many submissions from this IP, please try again later.'
});
app.use('/api/contact', limiter);

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        const poolStatus = getPoolStatus();
        const [rows] = await executeQuery('SELECT 1 as connected');
        
        res.json({
            status: 'OK',
            database: 'connected',
            timestamp: new Date(),
            poolStatus: poolStatus,
            serverUptime: process.uptime()
        });
    } catch (error) {
        res.status(500).json({
            status: 'ERROR',
            database: 'disconnected',
            message: error.message,
            timestamp: new Date()
        });
    }
});

// Database status endpoint (for debugging)
app.get('/api/db-status', async (req, res) => {
    try {
        const poolStatus = getPoolStatus();
        
        // Check if tables exist
        const tables = await executeQuery('SHOW TABLES');
        const tableNames = tables.map(row => Object.values(row)[0]);
        
        res.json({
            status: 'connected',
            poolStatus: poolStatus,
            tables: tableNames,
            database: process.env.DB_NAME
        });
    } catch (error) {
        res.status(500).json({
            status: 'disconnected',
            error: error.message
        });
    }
});

// Contact form submission endpoint with email notifications
app.post('/api/contact', [
    body('full_name').trim().notEmpty().withMessage('Full name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('message').trim().notEmpty().withMessage('Message is required'),
    body('phone').optional().trim(),
    body('company').optional().trim(),
    body('project_type').optional().trim()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
        });
    }

    const formData = req.body;
    const { full_name, company, email, phone, project_type, message } = formData;

    try {
        // 1. Save to database
        const result = await executeQuery(
            `INSERT INTO contact_submissions 
            (full_name, company, email, phone, project_type, message) 
            VALUES (?, ?, ?, ?, ?, ?)`,
            [full_name, company || null, email, phone || null, project_type || 'PEB Building', message]
        );

        console.log('✅ Contact saved to database with ID:', result.insertId);

        // 2. Send confirmation email to user (customer)
        try {
            await sendUserConfirmation(formData);
            console.log('✅ Thank you email sent to customer:', email);
        } catch (emailError) {
            console.error('❌ Failed to send customer email:', emailError.message);
            // Don't fail the request if email fails
        }

        // 3. Send notification email to admin
        try {
            await sendAdminNotification(formData);
            console.log('✅ Notification email sent to admin');
        } catch (emailError) {
            console.error('❌ Failed to send admin email:', emailError.message);
            // Don't fail the request if email fails
        }

        res.status(201).json({
            success: true,
            message: 'Contact form submitted successfully. We\'ll be in touch soon!',
            id: result.insertId
        });

    } catch (error) {
        console.error('❌ Error saving contact submission:', error);
        res.status(500).json({
            error: 'Failed to submit contact form. Please try again.'
        });
    }
});

// Admin login endpoint
app.post('/api/admin/login', [
    body('username').notEmpty().withMessage('Username required'),
    body('password').notEmpty().withMessage('Password required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array() });
    }

    const { username, password } = req.body;

    try {
        const users = await executeQuery(
            'SELECT * FROM admin_users WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update last login
        await executeQuery(
            'UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
            [user.id]
        );

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid or expired token.' });
    }
};

// Get all submissions (admin only)
app.get('/api/admin/submissions', authenticateToken, async (req, res) => {
    try {
        const submissions = await executeQuery(
            `SELECT id, full_name, company, email, phone, project_type, 
            message, status, created_at, updated_at 
            FROM contact_submissions 
            ORDER BY created_at DESC`
        );
        res.json({ submissions });
    } catch (error) {
        console.error('❌ Error fetching submissions:', error);
        res.status(500).json({ error: 'Failed to fetch submissions' });
    }
});

// Get single submission
app.get('/api/admin/submissions/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const submissions = await executeQuery(
            'SELECT * FROM contact_submissions WHERE id = ?',
            [id]
        );
        
        if (submissions.length === 0) {
            return res.status(404).json({ error: 'Submission not found' });
        }
        
        res.json({ submission: submissions[0] });
    } catch (error) {
        console.error('❌ Error fetching submission:', error);
        res.status(500).json({ error: 'Failed to fetch submission' });
    }
});

// Update submission status
app.patch('/api/admin/submissions/:id/status', authenticateToken, [
    body('status').isIn(['pending', 'read', 'replied']).withMessage('Invalid status')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array() });
    }

    const { id } = req.params;
    const { status } = req.body;

    try {
        const result = await executeQuery(
            'UPDATE contact_submissions SET status = ? WHERE id = ?',
            [status, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Submission not found' });
        }

        res.json({ success: true, message: 'Status updated successfully' });
    } catch (error) {
        console.error('❌ Error updating submission:', error);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

// Delete submission
app.delete('/api/admin/submissions/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await executeQuery(
            'DELETE FROM contact_submissions WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Submission not found' });
        }

        res.json({ success: true, message: 'Submission deleted' });
    } catch (error) {
        console.error('❌ Error deleting submission:', error);
        res.status(500).json({ error: 'Failed to delete submission' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('❌ Unhandled error:', err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    await closePool();
    process.exit(0);
});

// Start server
const startServer = async () => {
    console.log('\n🚀 Starting Epitome Steel Backend Server...');
    console.log('📋 Environment:', process.env.NODE_ENV || 'development');
    console.log(`🔌 Port: ${PORT}`);
    
    // Test database connection first
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
        console.log('⚠️  Server will start but database features may not work.');
        console.log('💡 Please fix database connection and restart the server.');
    } else {
        console.log('✅ Database connected successfully');
    }

    // Verify email configuration
    try {
        const emailVerified = await verifyEmailConfig();
        if (emailVerified) {
            console.log('✅ Email service configured successfully');
            console.log(`   📧 Sending emails from: ${process.env.EMAIL_USER}`);
            console.log(`   📧 Admin notifications to: ${process.env.ADMIN_EMAIL}`);
        } else {
            console.log('⚠️  Email service will not work. Please check your .env file');
        }
    } catch (error) {
        console.log('⚠️  Email service error:', error.message);
        console.log('💡 Please check your email configuration in .env file');
        console.log('   For Gmail, use App Password: https://support.google.com/accounts/answer/185833');
    }
    
    // Start server with error handling for port in use
    const server = app.listen(PORT, () => {
        console.log(`\n✅ Server running on http://localhost:${PORT}`);
        console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
        console.log(`📊 DB Status: http://localhost:${PORT}/api/db-status`);
        console.log(`\n📌 Available endpoints:`);
        console.log(`   POST /api/contact - Submit contact form (with email notifications)`);
        console.log(`   POST /api/admin/login - Admin login`);
        console.log(`   GET /api/admin/submissions - Get all submissions (admin)`);
        console.log(`   GET /api/admin/submissions/:id - Get single submission (admin)`);
        console.log(`   PATCH /api/admin/submissions/:id/status - Update status (admin)`);
        console.log(`   DELETE /api/admin/submissions/:id - Delete submission (admin)`);
        console.log(`\n🔒 Admin endpoints require JWT token`);
        console.log(`\n🌐 Allowed CORS origins:`, allowedOrigins.join(', '));
        console.log(`\n📧 Email notifications:`);
        console.log(`   ✅ Customer thank you emails enabled`);
        console.log(`   ✅ Admin notification emails enabled`);
        console.log(`   📧 From: ${process.env.EMAIL_USER || 'not set'}`);
        console.log(`   📧 Admin: ${process.env.ADMIN_EMAIL || 'not set'}`);
        console.log('\n✨ Server is ready to handle requests!\n');
    });

    // Handle server errors (like port in use)
    server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
            console.error(`\n❌ Port ${PORT} is already in use!`);
            console.log(`💡 Try killing the process or use a different port:`);
            console.log(`   netstat -ano | findstr :${PORT}`);
            console.log(`   taskkill /PID <PID> /F`);
            console.log(`   Or set PORT=5001 in your .env file\n`);
            process.exit(1);
        } else {
            console.error('❌ Server error:', error);
        }
    });
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled Rejection:', error);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    if (error.code === 'EADDRINUSE') {
        console.log(`💡 Port ${PORT} is in use. Try killing the process or using a different port.`);
    }
    process.exit(1);
});

startServer();