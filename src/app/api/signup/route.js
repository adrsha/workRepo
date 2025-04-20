import { hash } from 'bcryptjs';
import { executeQueryWithRetry } from '../../lib/db';
import { NextResponse } from 'next/server';
import { sendEmail } from '../../lib/email';
import crypto from 'crypto';

const SECRET_KEY_EXPIRATION_DAYS = 3;

export async function POST(request) {
  try {
    const body = await request.json();
    const { username, email, password, userLevel, terms, secretCode, contact, address, experience, qualification, ...extraData } = body;

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
      address: 100,
      dateOfBirth: 10, // YYYY-MM-DD
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
    const userLevels = { student: 0, teacher: 1 };
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

    if (userLevel === 'teacher') {
      // Generate a secret key for verification
      const secretKey = crypto.randomBytes(20).toString('hex');
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + SECRET_KEY_EXPIRATION_DAYS);

      const existingTeach = await executeQueryWithRetry({
        query: 'SELECT * FROM pending_teachers WHERE contact = ?',
        values: [contact],
      });

      if (existingTeach.length > 0) {
        return NextResponse.json({ error: 'Contact already in pending' }, { status: 409 });
      }

      await query({
        query: 'INSERT INTO pending_teachers (user_name, user_email, contact, qualification, experience, user_passkey, secret_key, expires_at) VALUES (?, ?, ?,?, ?, ?, ?, ?)',
        values: [
          username,
          email,
          contact,
          qualification,
          experience,
          hashedPassword,
          secretKey,
          expirationDate,
        ],
      });

      await sendEmail(email, 'Teacher Verification Code', `Your Teacher verification key: ${secretKey}`);

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
        query: 'INSERT INTO students (user_id, guardian_name, guardian_relation, guardian_contact, school, date_of_birth) VALUES (?, ?, ?, ?, ?, ? )',
        values: [
          userId,
          extraData.guardianName || '',
          extraData.guardianRelation || '',
          extraData.guardianContact || '',
          extraData.school || '',
          extraData.dateOfBirth || '',
        ],
      });
    }

    return NextResponse.json({ message: 'User created successfully', userId }, { status: 201 });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
