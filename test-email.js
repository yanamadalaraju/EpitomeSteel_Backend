// backend/test-email.js
require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmail() {
    console.log('📧 Testing Email Configuration...');
    console.log('----------------------------------------');
    console.log(`Email: ${process.env.EMAIL_USER}`);
    console.log(`Host: ${process.env.EMAIL_HOST}`);
    console.log(`Port: ${process.env.EMAIL_PORT}`);
    console.log(`Password: ${process.env.EMAIL_PASS ? '✓ Set' : '✗ Not set'}`);
    console.log('----------------------------------------');

    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    try {
        // Verify connection
        await transporter.verify();
        console.log('✅ Connection verified successfully!');

        // Send test email
        const testEmail = {
            from: `"Epitome Steel Test" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER, // Send to yourself
            subject: 'Test Email from Epitome Steel',
            html: `
                <h1>✅ Test Email Successful!</h1>
                <p>Your email configuration is working correctly.</p>
                <p>Email: ${process.env.EMAIL_USER}</p>
                <p>Time: ${new Date().toLocaleString()}</p>
            `
        };

        const info = await transporter.sendMail(testEmail);
        console.log('✅ Test email sent successfully!');
        console.log(`   Message ID: ${info.messageId}`);
        console.log(`   Check your inbox: ${process.env.EMAIL_USER}`);
        return true;
    } catch (error) {
        console.error('❌ Email test failed:', error.message);
        console.error('   Full error:', error);
        return false;
    }
}

testEmail();