// app/api/signup/route.js
import { hash } from 'bcryptjs';
import { query } from '../../lib/db';
import { NextResponse } from 'next/server';
import { sendEmail } from '../../lib/email';
import crypto from 'crypto';

const SECRET_KEY_EXPIRATION_DAYS = 3;
const MAX_RETRIES = 30;
const RETRY_DELAY = 1000; // 1 second delay between retries

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function executeQueryWithRetry(queryOptions) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            return await query(queryOptions);
        } catch (error) {
            if (attempt === MAX_RETRIES) {
                throw error;
            }
            console.log(`Attempt ${attempt} failed. Retrying in ${RETRY_DELAY}ms...`);
            await sleep(RETRY_DELAY);
        }
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { username, email, password, userLevel, terms, secretCode, contact, address, ...extraData } = body;

        if (!username || !email || !password) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (!terms) {
            return NextResponse.json({ error: 'You must agree to terms and conditions' }, { status: 400 });
        }

        // Define max length limits for each field
        const MAX_LENGTHS = {
            username: 50,
            email: 320,
            password: 60,
            contact: 10,
            guardianName: 50,
            guardianRelation: 30,
            guardianContact: 10,
            school: 100,
            class: 50,
            address: 100,
            dateOfBirth: 10, // YYYY-MM-DD
            subject: 50,
            experience: 255,
            qualification: 255,
        };

        for (const [field, maxLength] of Object.entries(MAX_LENGTHS)) {
            if (body[field] && body[field].length > maxLength) {
                return NextResponse.json(
                    { error: `${field} exceeds the maximum allowed length of ${maxLength} characters` },
                    { status: 400 }
                );
            }
        }
        const userLevels = { student: 0, teacher: 1, admin: 2 };
        if (!(userLevel in userLevels)) {
            return NextResponse.json({ error: 'Invalid user level' }, { status: 400 });
        }

        const userLevelId = userLevels[userLevel];

        const existingUser = await executeQueryWithRetry({
            query: 'SELECT * FROM users WHERE contact = ?',
            values: [contact],
        });

        if (existingUser.length > 0) {
            return NextResponse.json({ error: 'Phone number already in use' }, { status: 409 });
        }

        const hashedPassword = await hash(password, 10);

        if (userLevel === 'admin') {
            // Generate a secret key for verification
            const secretKey = crypto.randomBytes(20).toString('hex');
            const expirationDate = new Date();
            expirationDate.setDate(expirationDate.getDate() + SECRET_KEY_EXPIRATION_DAYS);

            const existingAdmin = await executeQueryWithRetry({
                query: 'SELECT * FROM pending_admins WHERE contact = ?',
                values: [contact],
            });

            if (existingAdmin.length > 0) {
                return NextResponse.json({ error: 'Contact already in use' }, { status: 409 });
            }

            await query({
                query: 'INSERT INTO pending_admins (user_name, user_email, contact, user_passkey, secret_key, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
                values: [username, email, contact, hashedPassword, secretKey, expirationDate],
            });

            // Send the secret key via email
            await sendEmail(email, 'Admin Verification Code', `Your admin verification key: ${secretKey}`);

            return NextResponse.json(
                { message: 'Verification key sent to email. Please verify within 3 days.' },
                { status: 202 }
            );
        }
        // Regular user registration
        const userInsertResult = await executeQueryWithRetry({
            query: 'INSERT INTO users (user_name, user_email, user_passkey, user_level, contact, address) VALUES (?, ?, ?, ?, ?, ?)',
            values: [username, email, hashedPassword, userLevelId, contact, address],
        });

        const userId = userInsertResult.insertId;

        if (userLevel === 'student') {
            await executeQueryWithRetry({
                query: 'INSERT INTO students (user_id, guardian_name, guardian_relation, guardian_contact, school, class, date_of_birth) VALUES (?, ?, ?, ?, ?, ?, ? )',
                values: [
                    userId,
                    extraData.guardianName || '',
                    extraData.guardianRelation || '',
                    extraData.guardianContact || '',
                    extraData.school || '',
                    extraData.class || '',
                    extraData.dateOfBirth || '',
                ],
            });
        } else if (userLevel === 'teacher') {
            await executeQueryWithRetry({
                query: 'INSERT INTO teachers (user_id, subject, experience, qualification) VALUES (?, ?, ?, ?)',
                values: [userId, extraData.subject || '', extraData.experience || '', extraData.qualification || ''],
            });
        }

        return NextResponse.json({ message: 'User created successfully', userId }, { status: 201 });
    } catch (error) {
        console.error('Signup error:', error);
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
}
