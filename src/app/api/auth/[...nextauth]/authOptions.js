import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { executeQueryWithRetry } from '../../../lib/db.js';
import { randomBytes } from 'crypto'; // Import crypto module for generating random token

export const authOptions = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                contact: { label: 'Phone Number', type: 'tel' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                const users = await executeQueryWithRetry({
                    query: 'SELECT * FROM users WHERE contact = ?',
                    values: [credentials.contact],
                });

                if (users.length === 0 || !(await compare(credentials.password, users[0].user_passkey))) {
                    throw new Error('Invalid credentials');
                }

                const user = users[0];

                // const courses = await executeQueryWithRetry({
                //     query: `SELECT ucr.relation_id, c.course_id, c.course_name, c.course_details, u.user_name AS teacher_name, c.class_id, cl.class_name ,ucr.user_id FROM courses c JOIN users_courses_relational ucr ON ucr.course_id = c.course_id JOIN users u ON u.user_id = c.teacher_id JOIN classes cl ON cl.class_id = c.class_id WHERE ucr.user_id = 1; `,
                //     values: [user.user_id],
                // });
                return {
                    id: user.user_id,
                    name: user.user_name,
                    contact: user.contact,
                    email: user.user_email,
                    level: user.user_level,
                    // courses: courses,
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.user = user;
                token.accessToken = randomBytes(32).toString('hex'); // 64 character token (256 bits)
            }
            return token;
        },
        async session({ session, token }) {

            try {
                if (!token?.user?.id) {
                    return session; // No user info available yet
                }
                const updatedUser = await fetchLatestUserFromDB(token.user.id);

                session.user = updatedUser || token.user;

                if (token.accessToken) {
                    session.accessToken = token.accessToken;
                }

                return JSON.parse(JSON.stringify(session));
            } catch (error) {
                console.error('Session callback error:', error);
                return session;
            }
        },
    },
    session: {
        strategy: 'jwt',
    },
    secret: process.env.NEXTAUTH_SECRET,

    // Add explicit cookie configuration to handle both HTTP and HTTPS environments
    cookies: {
        sessionToken: {
            name: 'next-auth.session-token',
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: true,
            }
        },
        callbackUrl: {
            name: 'next-auth.callback-url',
            options: {
                sameSite: 'lax',
                path: '/',
                secure: true,
            }
        },
        csrfToken: {
            name: 'next-auth.csrf-token',
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: true,
            }
        }
    },
    useSecureCookies: true,
};

async function fetchLatestUserFromDB(userId) {
    const users = await executeQueryWithRetry({
        query: 'SELECT * FROM users WHERE user_id = ?',
        values: [userId],
    });

    if (users.length === 0) return null;

    const user = users[0];
    return {
        id: user.user_id,
        name: user.user_name,
        email: user.user_email,
        contact: user.contact,
        level: user.user_level,
    };
}

export default authOptions;
