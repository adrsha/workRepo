// app/api/login/route.js
import { compare } from 'bcryptjs';
import { executeQueryWithRetry } from '../../lib/db';
import { NextResponse } from 'next/server';


export async function POST(request) {
    try {
        const body = await request.json();
        const { email, password } = body;

        // Validate input
        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }

        // Find user by email
        const users = await executeQueryWithRetry({
            query: 'SELECT * FROM users WHERE user_email = ?',
            values: [email],
        });
        
        if (users.length === 0) {
            return NextResponse.json({ error: 'Email could not be found' }, { status: 401 });
        }

        const user = users[0];

        // Verify password
        const passwordMatch = await compare(password, user.user_passkey);

        if (!passwordMatch) {
            return NextResponse.json({ error: 'Invalid Password' }, { status: 401 });
        }

        const { password: _, ...userWithoutPassword } = user;
        return NextResponse.json(
            {
                message: 'Login successful',
                user: userWithoutPassword,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
}
