import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail', // You can change this to another provider
    auth: {
        user: process.env.EMAIL_USER, // Your email
        pass: process.env.EMAIL_PASS, // App password (not your actual email password)
    },
});

export async function sendEmail(to, subject, text) {
    try {
        await transporter.sendMail({
            from: `"Mero Tuition"`,
            to,
            subject,
            text,
        });
        console.log(`Email sent to ${to}`);
    } catch (error) {
        console.error('Email sending failed:', error);
        throw new Error('Failed to send email');
    }
}
