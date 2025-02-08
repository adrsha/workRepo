import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { executeQueryWithRetry } from '../../../lib/db.js';

export default {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                const users = await executeQueryWithRetry({
                    query: 'SELECT * FROM users WHERE user_email = ?',
                    values: [credentials.email],
                });

                if (users.length === 0 || !(await compare(credentials.password, users[0].user_passkey))) {
                    throw new Error('Invalid credentials');
                }

                const user = users[0];

                const courses = await executeQueryWithRetry({
                    query: `SELECT ucr.relation_id, c.course_name, c.course_details, u.user_name AS teacher_name, c.class_id ,ucr.user_id
                            FROM courses c
                            JOIN users_courses_relational ucr ON ucr.course_id = c.course_id
                            JOIN users u ON u.user_id = c.teacher_id 
                            WHERE ucr.user_id = ?`,
                    values: [user.user_id],
                });
                return {
                    id: user.user_id,
                    name: user.user_name,
                    email: user.user_email,
                    level: user.user_level,
                    courses: courses,
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.user = user;
            }
            return token;
        },
        async session({ session, token }) {
            session.user = token.user;
            return session;
        },
    },
    session: {
        strategy: 'jwt',
    },
    secret: process.env.NEXTAUTH_SECRET,
};
