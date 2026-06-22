// backend/emailService.js
const nodemailer = require('nodemailer');

// Create transporter with better configuration
const createTransporter = () => {
    // Clean the password - remove any spaces
    const cleanPassword = (process.env.EMAIL_PASS || '').replace(/\s/g, '');
    
    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: cleanPassword, // Use cleaned password without spaces
        },
        tls: {
            rejectUnauthorized: false,
            ciphers: 'SSLv3'
        },
        connectionTimeout: 30000,
        greetingTimeout: 30000,
        socketTimeout: 30000,
    });
};

// Verify email configuration
const verifyEmailConfig = async () => {
    try {
        const transporter = createTransporter();
        await transporter.verify();
        console.log('✅ Email configuration verified successfully');
        console.log(`   📧 Email: ${process.env.EMAIL_USER}`);
        console.log(`   📧 Admin: ${process.env.ADMIN_EMAIL}`);
        return true;
    } catch (error) {
        console.error('❌ Email configuration error:', error.message);
        console.error('   Please check:');
        console.error('   1. EMAIL_USER is correct');
        console.error('   2. EMAIL_PASS is the App Password (not regular password)');
        console.error('   3. Remove any spaces from the App Password');
        console.error('   4. 2-Step Verification is enabled for App Password');
        return false;
    }
};

// Send THANK YOU email to customer
const sendUserConfirmation = async (formData) => {
    const { full_name, email, company, phone, project_type, message } = formData;

    console.log(`📧 Preparing thank you email for: ${email}`);

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f4f4f4; }
                .header { background: linear-gradient(135deg, #1E3A5F, #2563EB); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #ffffff; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563EB; }
                .detail-item { margin: 10px 0; padding: 5px 0; border-bottom: 1px solid #eee; }
                .label { font-weight: bold; color: #555; }
                .footer { text-align: center; margin-top: 30px; color: #777; font-size: 12px; }
                .button { display: inline-block; padding: 12px 30px; background: #2563EB; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Thank You for Connecting with Us! 🏗️</h1>
                    <p>Epitome Steel - Engineering Strength. Building the Future.</p>
                </div>
                <div class="content">
                    <p>Dear <strong>${full_name}</strong>,</p>
                    <p>Thank you for reaching out to <strong>Epitome Steel</strong>. We are thrilled to connect with you and learn about your steel requirements.</p>
                    
                    <p>Our team has received your inquiry and is excited to help you build something exceptional.</p>

                    <div class="details">
                        <h3 style="color: #2563EB; margin-top: 0;">📋 Your Project Summary</h3>
                        <div class="detail-item"><span class="label">Project Type:</span> ${project_type || 'Not specified'}</div>
                        ${company ? `<div class="detail-item"><span class="label">Company:</span> ${company}</div>` : ''}
                        ${phone ? `<div class="detail-item"><span class="label">Phone:</span> ${phone}</div>` : ''}
                        <div class="detail-item"><span class="label">Email:</span> ${email}</div>
                        <div class="detail-item"><span class="label">Message:</span> ${message}</div>
                    </div>

                    <h3>🚀 What Happens Next?</h3>
                    <ul>
                        <li><strong>Within 24 hours:</strong> Our engineering team will review your project requirements</li>
                        <li><strong>Within 48 hours:</strong> We'll prepare a detailed scope, timeline, and comprehensive quote</li>
                        <li><strong>Next steps:</strong> A senior engineer will reach out to discuss your specific needs</li>
                    </ul>

                    <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 0; color: #1E3A5F;">
                            💡 <strong>Need immediate assistance?</strong><br>
                            📞 Call us: +91 9538204699<br>
                            💬 WhatsApp: +91 9538204699<br>
                            📧 Email: yanamadalarajesh21@gmail.com
                        </p>
                    </div>

                    <p>We look forward to building something exceptional together!</p>
                    <p>
                        Warm regards,<br>
                        <strong>The Epitome Steel Team</strong>
                    </p>
                </div>
                <div class="footer">
                    <p>Epitome Steel Private Limited<br>
                    11, 3rd Floor, Astitva Building, Railway Parallel Road,<br>
                    Nehru Nagar, Seshadripuram, Bengaluru – 560020</p>
                    <p>&copy; ${new Date().getFullYear()} Epitome Steel. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    const text = `
        Thank You for Connecting with Us!

        Dear ${full_name},

        Thank you for reaching out to Epitome Steel. We are thrilled to connect with you and learn about your steel requirements.

        Your Project Summary:
        ---------------------
        Project Type: ${project_type || 'Not specified'}
        ${company ? `Company: ${company}` : ''}
        ${phone ? `Phone: ${phone}` : ''}
        Email: ${email}
        Message: ${message}

        What Happens Next?
        ------------------
        1. Within 24 hours: Our engineering team will review your project requirements
        2. Within 48 hours: We'll prepare a detailed scope, timeline, and comprehensive quote
        3. Next steps: A senior engineer will reach out to discuss your specific needs

        Need immediate assistance?
        -------------------------
        📞 Call us: +91 9538204699
        💬 WhatsApp: +91 9538204699
        📧 Email: yanamadalarajesh21@gmail.com

        Best regards,
        The Epitome Steel Team
    `;

    const mailOptions = {
        from: `"Epitome Steel" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `Thank You for Connecting with Epitome Steel 🏗️`,
        html: html,
        text: text,
        replyTo: process.env.EMAIL_USER
    };

    try {
        const transporter = createTransporter();
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Thank you email sent to customer:', email);
        console.log(`   📧 Message ID: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error('❌ Error sending customer email:', error.message);
        console.error('   Full error:', error);
        throw error;
    }
};

// Send NOTIFICATION email to admin
const sendAdminNotification = async (formData) => {
    const { full_name, company, email, phone, project_type, message } = formData;

    console.log(`📧 Preparing admin notification for: ${full_name}`);

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f4f4f4; }
                .header { background: linear-gradient(135deg, #DC2626, #EF4444); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #ffffff; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .alert-box { background: #FEF2F2; border: 1px solid #FCA5A5; padding: 15px; border-radius: 8px; margin: 20px 0; }
                .details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #DC2626; }
                .detail-item { margin: 10px 0; padding: 5px 0; border-bottom: 1px solid #eee; }
                .label { font-weight: bold; color: #555; }
                .footer { text-align: center; margin-top: 30px; color: #777; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px; }
                .badge { display: inline-block; background: #DC2626; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; }
                .action-btn { display: inline-block; padding: 10px 20px; background: #2563EB; color: white; text-decoration: none; border-radius: 5px; margin: 5px; }
                .action-btn-danger { background: #DC2626; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔔 New Contact Form Submission</h1>
                    <p>Action Required - New Inquiry Received</p>
                </div>
                <div class="content">
                    <div class="alert-box">
                        <strong>⚠️ New Inquiry Alert</strong><br>
                        A new contact form has been submitted and requires your immediate attention.
                    </div>

                    <h3 style="color: #DC2626;">👤 Customer Details</h3>
                    <div class="details">
                        <div class="detail-item"><span class="label">Name:</span> ${full_name}</div>
                        ${company ? `<div class="detail-item"><span class="label">Company:</span> ${company}</div>` : ''}
                        <div class="detail-item"><span class="label">Email:</span> ${email}</div>
                        ${phone ? `<div class="detail-item"><span class="label">Phone:</span> ${phone}</div>` : ''}
                        <div class="detail-item"><span class="label">Project Type:</span> ${project_type || 'Not specified'}</div>
                        <div class="detail-item"><span class="label">Message:</span> ${message}</div>
                    </div>

                    <h3 style="color: #DC2626;">⚡ Quick Actions</h3>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap; margin: 15px 0;">
                        <a href="${process.env.ADMIN_URL || 'http://localhost:8080/admin/admincontacts'}" 
                           class="action-btn action-btn-danger">
                            📋 View in Admin Panel
                        </a>
                        <a href="mailto:${email}" 
                           class="action-btn">
                            ✉️ Reply to Customer
                        </a>
                    </div>

                    <p>
                        <span class="badge">PENDING</span> 
                        <span style="margin-left: 10px; color: #666;">Status: Awaiting response</span>
                    </p>

                    <p style="font-size: 13px; color: #666; margin-top: 20px;">
                        🕐 Received: ${new Date().toLocaleString()}
                    </p>
                </div>
                <div class="footer">
                    <p>This is an automated notification from Epitome Steel.</p>
                    <p>&copy; ${new Date().getFullYear()} Epitome Steel. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    const text = `
        🔔 New Contact Form Submission

        A new contact form has been submitted and requires your immediate attention.

        Customer Details:
        -----------------
        Name: ${full_name}
        ${company ? `Company: ${company}` : ''}
        Email: ${email}
        ${phone ? `Phone: ${phone}` : ''}
        Project Type: ${project_type || 'Not specified'}
        Message: ${message}

        Quick Actions:
        -------------
        1. View in Admin Panel: ${process.env.ADMIN_URL || 'http://localhost:8080/admin/admincontacts'}
        2. Reply to Customer: mailto:${email}

        Status: PENDING - Awaiting response

        Received: ${new Date().toLocaleString()}

        ---
        This is an automated notification from Epitome Steel.
    `;

    const mailOptions = {
        from: `"Epitome Steel" <${process.env.EMAIL_USER}>`,
        to: process.env.ADMIN_EMAIL || 'yanamadalarajesh21@gmail.com',
        subject: `🔔 New Contact Form Submission from ${full_name}`,
        html: html,
        text: text,
        replyTo: email
    };

    try {
        const transporter = createTransporter();
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Notification email sent to admin:', process.env.ADMIN_EMAIL);
        console.log(`   📧 Message ID: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error('❌ Error sending admin email:', error.message);
        console.error('   Full error:', error);
        throw error;
    }
};

module.exports = {
    sendUserConfirmation,
    sendAdminNotification,
    verifyEmailConfig
};