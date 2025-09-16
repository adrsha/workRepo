// /api/partners/route.js
import { executeQueryWithRetry } from '../../lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/authOptions';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const partners = await executeQueryWithRetry({
            query: `
                SELECT 
                    partner_id,
                    partner_name,
                    partner_description,
                    partner_url,
                    partner_image_path,
                    created_at,
                    updated_at,
                    is_active
                FROM partners
                WHERE is_active = 1
                ORDER BY created_at DESC
            `,
            values: [],
        });

        return NextResponse.json(partners);
    } catch (error) {
        console.error('Error fetching partners:', error);
        return NextResponse.json({ error: 'Failed to fetch partners' }, { status: 500 });
    }
}

export async function POST(request) {
    const session = await getServerSession(authOptions);

    if (!session || session.user.level < 1) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { 
            partner_name, 
            partner_description, 
            partner_url, 
            partner_image_path 
        } = await request.json();

        if (!partner_name || !partner_url) {
            return NextResponse.json({ 
                error: 'Partner name and URL are required' 
            }, { status: 400 });
        }

        const result = await executeQueryWithRetry({
            query: `
                INSERT INTO partners (
                    partner_name,
                    partner_description,
                    partner_url,
                    partner_image_path,
                    is_active,
                    created_at,
                    updated_at
                ) VALUES (?, ?, ?, ?, 1, NOW(), NOW())
            `,
            values: [
                partner_name,
                partner_description || null,
                partner_url,
                partner_image_path || null
            ]
        });

        // Fetch the created partner
        const newPartner = await executeQueryWithRetry({
            query: `
                SELECT 
                    partner_id,
                    partner_name,
                    partner_description,
                    partner_url,
                    partner_image_path,
                    created_at,
                    updated_at,
                    is_active
                FROM partners
                WHERE partner_id = ?
            `,
            values: [result.insertId]
        });

        return NextResponse.json(newPartner[0], { status: 201 });
    } catch (error) {
        console.error('Error creating partner:', error);
        return NextResponse.json({ error: 'Failed to create partner' }, { status: 500 });
    }
}
