// app/api/login/route.js
import { compare } from 'bcryptjs';
import { executeQueryWithRetry } from '../../lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();
        const { contact, password } = body;

        // Validate input
        if (!contact || !password) {
            return NextResponse.json({ error: 'Phone Number and password are required' }, { status: 400 });
        }

        // Find user by phone number
        const users = await executeQueryWithRetry({
            query: 'SELECT * FROM users WHERE contact = ?',
            values: [contact],
        });
        
        if (users.length === 0) {
            // Check if user is in pending_teachers table
            const pendingTeachers = await executeQueryWithRetry({
                query: 'SELECT * FROM pending_teachers WHERE contact = ?',
                values: [contact],
            });

            if (pendingTeachers.length > 0) {
                const pendingTeacher = pendingTeachers[0];
                
                // Verify password for pending teacher
                const passwordMatch = await compare(password, pendingTeacher.user_passkey);
                
                if (passwordMatch) {
                    return NextResponse.json({ 
                        error: 'Your teacher account is pending approval. Please wait for admin approval before logging in.' 
                    }, { status: 403 });
                }
            }
            
            return NextResponse.json({ error: 'Contact could not be found' }, { status: 401 });
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
