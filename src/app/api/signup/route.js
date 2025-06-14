import { hash } from 'bcryptjs';
import { executeQueryWithRetry } from '../../lib/db';
import { NextResponse } from 'next/server';
import { sendEmail } from '../../lib/email';
import crypto from 'crypto';

const SECRET_KEY_EXPIRATION_DAYS = 3;
const USER_LEVELS = { student: 0, teacher: 1 };

const MAX_LENGTHS = {
    username: 50,
    email: 320,
    password: 60,
    contact: 15,
    guardianName: 50,
    guardianRelation: 30,
    guardianContact: 15,
    school: 100,
    class: 50,
    address: 200,
    dateOfBirth: 10,
    experience: 500,
    qualification: 500,
};

const REQUIRED_FIELDS = {
    base: ['username', 'email', 'password', 'contact'],
    student: ['guardianName', 'guardianRelation', 'guardianContact', 'school', 'class', 'dateOfBirth'],
    teacher: ['qualification', 'experience', 'certificatePath']
};

// Validation functions
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validateRequiredFields(body, userLevel) {
    const requiredFields = [...REQUIRED_FIELDS.base];
    
    if (userLevel === 'student') {
        requiredFields.push(...REQUIRED_FIELDS.student);
    } else if (userLevel === 'teacher') {
        requiredFields.push(...REQUIRED_FIELDS.teacher);
    }

    const missing = requiredFields.filter(field => !body[field] || body[field].trim() === '');
    return missing.length > 0 ? missing : null;
}

function validateFieldLengths(body) {
    for (const [field, maxLength] of Object.entries(MAX_LENGTHS)) {
        if (body[field] && body[field].length > maxLength) {
            return `${field} exceeds maximum length of ${maxLength} characters`;
        }
    }
    return null;
}

function validateUserLevel(userLevel) {
    return userLevel in USER_LEVELS;
}

function validateTermsAcceptance(terms) {
    return Boolean(terms);
}

// Database operations
async function checkExistingUser(contact) {
    const result = await executeQueryWithRetry({
        query: 'SELECT user_id FROM users WHERE contact = ?',
        values: [contact],
    });
    return result.length > 0;
}

async function checkExistingPendingTeacher(contact) {
    const result = await executeQueryWithRetry({
        query: 'SELECT pending_id FROM pending_teachers WHERE contact = ?',
        values: [contact],
    });
    return result.length > 0;
}

async function createUser(userData) {
    const { username, email, hashedPassword, userLevel, contact, address } = userData;
    
    return await executeQueryWithRetry({
        query: 'INSERT INTO users (user_name, user_email, user_passkey, user_level, contact, address) VALUES (?, ?, ?, ?, ?, ?)',
        values: [username, email, hashedPassword, USER_LEVELS[userLevel], contact, address],
    });
}

async function createStudentProfile(userId, studentData) {
    const { guardianName, guardianRelation, guardianContact, school, class: studentClass, dateOfBirth } = studentData;
    
    return await executeQueryWithRetry({
        query: 'INSERT INTO students (user_id, guardian_name, guardian_relation, guardian_contact, school, class, date_of_birth) VALUES (?, ?, ?, ?, ?, ?, ?)',
        values: [userId, guardianName, guardianRelation, guardianContact, school, studentClass, dateOfBirth],
    });
}

// Fix 1: Update the createPendingTeacher function to include certificate_path
async function createPendingTeacher(teacherData) {
    const { username, email, contact, qualification, experience, hashedPassword, secretKey, expirationDate, certificatePath } = teacherData;
    
    return await executeQueryWithRetry({
        query: 'INSERT INTO pending_teachers (user_name, user_email, contact, qualification, experience, user_passkey, secret_key, expires_at, certificate_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        values: [username, email, contact, qualification, experience, hashedPassword, secretKey, expirationDate, certificatePath],
    });
}


// Business logic functions
function generateSecretKey() {
    return crypto.randomBytes(20).toString('hex');
}

function calculateExpirationDate(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
}

async function hashPassword(password) {
    return await hash(password, 10);
}

async function handleStudentRegistration(userData, extraData) {
    const userResult = await createUser(userData);
    await createStudentProfile(userResult.insertId, extraData);
    return userResult.insertId;
}

async function handleTeacherRegistration(userData) {
    const { username, email, contact, qualification, experience, certificatePath } = userData;
    
    // Check if teacher already pending
    if (await checkExistingPendingTeacher(contact)) {
        throw new Error('TEACHER_PENDING');
    }

    const secretKey = generateSecretKey();
    const expirationDate = calculateExpirationDate(SECRET_KEY_EXPIRATION_DAYS);
    
    const teacherData = {
        username,
        email,
        contact,
        qualification,
        experience,
        hashedPassword: userData.hashedPassword,
        secretKey,
        expirationDate,
        certificatePath  // Add this line
    };

    await createPendingTeacher(teacherData);
    await sendEmail(email, 'Teacher Verification Code', `Your Teacher verification key: ${secretKey}`);
}

// Main handler
export async function POST(request) {
    try {
        const body = await request.json();
        const { username, email, password, userLevel, terms, contact, address, experience, qualification, certificatePath, ...extraData } = body;
        console.log(certificatePath);
        
        // Validation chain
        const missingFields = validateRequiredFields(body, userLevel);
        if (missingFields) {
            return NextResponse.json({ error: `Missing required fields: ${missingFields.join(', ')}` }, { status: 400 });
        }

        if (!validateEmail(email)) {
            return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
        }

        if (!validateTermsAcceptance(terms)) {
            return NextResponse.json({ error: 'You must agree to terms and conditions' }, { status: 400 });
        }

        if (!validateUserLevel(userLevel)) {
            return NextResponse.json({ error: 'Invalid user level' }, { status: 400 });
        }

        const lengthError = validateFieldLengths(body);
        if (lengthError) {
            return NextResponse.json({ error: lengthError }, { status: 400 });
        }

        // Check existing user
        if (await checkExistingUser(contact)) {
            return NextResponse.json({ error: 'Phone number already in use' }, { status: 409 });
        }

        const hashedPassword = await hashPassword(password);
        const userData = { username, email, hashedPassword, userLevel, contact, address, qualification, experience, certificatePath };

        if (userLevel === 'teacher') {
            await handleTeacherRegistration(userData);
            return NextResponse.json(
                { message: 'Verification key sent to email. Please verify within 3 days.' },
                { status: 202 }
            );
        }

        // Handle student registration
        const userId = await handleStudentRegistration(userData, extraData);
        return NextResponse.json({ message: 'User created successfully', userId }, { status: 201 });

    } catch (error) {
        console.error('Signup error:', error);
        
        if (error.message === 'TEACHER_PENDING') {
            return NextResponse.json({ error: 'Contact already in pending verification' }, { status: 409 });
        }
        
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
