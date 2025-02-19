// app/api/changePass/route.js
import { compare } from 'bcryptjs';
import { executeQueryWithRetry } from '../../lib/db';
import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';

export async function POST(request) {
    try {
        const body = await request.json();
        const { email, oldPassword, newPassword } = body;

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }
        
        if (!oldPassword || !newPassword) {
            return NextResponse.json({ error: 'Old password and new password are required' }, { status: 400 });
        }

        const users = await executeQueryWithRetry({
            query: 'SELECT * FROM users WHERE user_email = ?',
            values: [email],
        });
        
        if (users.length === 0) {
            return NextResponse.json({ error: 'Email could not be found' }, { status: 401 });
        }

        const user = users[0];

        // Verify password
        const passwordMatch = await compare(oldPassword, user.user_passkey);
        if (!passwordMatch) {
            return NextResponse.json({ error: 'Invalid Password' }, { status: 401 });
        }

        const hashedPassword = await hash(newPassword, 10);
        
        // Update password
        await executeQueryWithRetry({
            query: 'UPDATE users SET user_passkey = ? WHERE user_email = ?',
            values: [hashedPassword, email],
        });

        return NextResponse.json(
            { message: 'Password Change successful'},
            { status: 200 }
        );
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
}
