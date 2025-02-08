// app/api/signup/route.js
import { hash } from 'bcryptjs';
import { query } from '../../lib/db';
import { NextResponse } from 'next/server';

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
        const { username, email, password, terms } = body;

        // Validate input
        if (!username || !email || !password) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (!terms) {
            return NextResponse.json({ error: 'You must agree to terms and conditions' }, { status: 400 });
        }

        // Check if email and/or username already exists
        // TODO: make the user_level dynamic
        const existingUsersForEmail = await executeQueryWithRetry({
            query: 'SELECT * FROM users WHERE user_email = ? AND user_level = 0',
            values: [email],
        });

        if (existingUsersForEmail.length > 0) {
            return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
        }

        // if (existingUsersForEmail.length > 0 && existingUsersForUsername.length > 0) {
        //     return NextResponse.json({ error: 'Email and Username already in use' }, { status: 409 });
        // } else if (existingUsersForUsername.length > 0 ) {
        //     return NextResponse.json({ error: 'Username already in use' }, { status: 409 });
        // } else if (existingUsersForEmail.length > 0) {
        //     return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
        // }

        // Hash password
        const hashedPassword = await hash(password, 10);

        let userLevel = 0;
        // Insert new user
        const result = await executeQueryWithRetry({
            query: 'INSERT INTO users (user_name, user_email, user_passkey, user_level) VALUES (?, ?, ?, ?)',
            values: [username, email, hashedPassword, userLevel],
        });

        return NextResponse.json(
            {
                message: 'User created successfully',
                userId: result.insertId,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Signup error:', error);
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
}
// To reset the auto increment value
// -- Get the maximum user_id value
// SELECT MAX(user_id) FROM users;
//
// -- Set AUTO_INCREMENT to max(user_id) + 1
// SET @new_ai = (SELECT MAX(user_id) FROM users) + 1;
// SET @query = CONCAT('ALTER TABLE users AUTO_INCREMENT = ', @new_ai);
// PREPARE stmt FROM @query;
// EXECUTE stmt;
// DEALLOCATE PREPARE stmt;
