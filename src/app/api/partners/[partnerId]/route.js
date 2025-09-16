// /api/partners/[partnerId]/route.js
import { executeQueryWithRetry } from '../../../lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/authOptions';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
    const { partnerId } = await params;
    
    try {
        const partner = await executeQueryWithRetry({
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
                WHERE partner_id = ? AND is_active = 1
            `,
            values: [partnerId],
        });

        if (!partner || partner.length === 0) {
            return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
        }

        return NextResponse.json(partner[0]);
    } catch (error) {
        console.error('Error fetching partner:', error);
        return NextResponse.json({ error: 'Failed to fetch partner' }, { status: 500 });
    }
}

export async function PUT(request, { params }) {
    const session = await getServerSession(authOptions);

    if (!session || session.user.level < 1) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { partnerId } = await params;

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

        // Check if partner exists
        const existingPartner = await executeQueryWithRetry({
            query: `SELECT partner_id FROM partners WHERE partner_id = ? AND is_active = 1`,
            values: [partnerId]
        });

        if (!existingPartner || existingPartner.length === 0) {
            return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
        }

        // Update partner
        await executeQueryWithRetry({
            query: `
                UPDATE partners 
                SET 
                    partner_name = ?,
                    partner_description = ?,
                    partner_url = ?,
                    partner_image_path = ?,
                    updated_at = NOW()
                WHERE partner_id = ?
            `,
            values: [
                partner_name,
                partner_description || null,
                partner_url,
                partner_image_path || null,
                partnerId
            ]
        });

        // Fetch updated partner
        const updatedPartner = await executeQueryWithRetry({
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
            values: [partnerId]
        });

        return NextResponse.json(updatedPartner[0]);
    } catch (error) {
        console.error('Error updating partner:', error);
        return NextResponse.json({ error: 'Failed to update partner' }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    const session = await getServerSession(authOptions);

    if (!session || session.user.level < 1) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { partnerId } = await params;

    try {
        // Check if partner exists and get image path
        const existingPartner = await executeQueryWithRetry({
            query: `
                SELECT 
                    partner_id, 
                    partner_image_path 
                FROM partners 
                WHERE partner_id = ? AND is_active = 1
            `,
            values: [partnerId]
        });

        if (!existingPartner || existingPartner.length === 0) {
            return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
        }

        const partner = existingPartner[0];

        // Delete the image file if it exists
        if (partner.partner_image_path) {
            try {
                const { unlink } = await import('fs/promises');
                const { join } = await import('path');
                const { existsSync } = await import('fs');
                
                // Convert public path back to server path
                const serverPath = join(
                    process.env.SERVER_UPLOADS_DIR || '/home/merotuit/root/public/uploads',
                    partner.partner_image_path.replace('/uploads', '').replace(/^\//, '')
                );

                // Also check local path
                const localPath = join(
                    process.cwd(), 
                    'public', 
                    partner.partner_image_path.replace(/^\//, '')
                );

                // Delete from server storage if exists
                if (existsSync(serverPath)) {
                    await unlink(serverPath);
                }

                // Delete from local storage if exists
                if (existsSync(localPath)) {
                    await unlink(localPath);
                }

            } catch (fileError) {
                console.error('Error deleting partner image file:', fileError);
                // Continue with database deletion even if file deletion fails
            }
        }

        // Soft delete by setting is_active to 0
        const result = await executeQueryWithRetry({
            query: `UPDATE partners SET is_active = 0, updated_at = NOW() WHERE partner_id = ?`,
            values: [partnerId]
        });

        if (result.affectedRows === 0) {
            return NextResponse.json({ error: 'Partner not found or already deleted' }, { status: 404 });
        }

        return NextResponse.json({
            success         : true,
            message         : 'Partner and associated files deleted successfully',
            affectedRows    : result.affectedRows
        });

    } catch (error) {
        console.error('Error deleting partner:', error);
        return NextResponse.json({ error: 'Failed to delete partner' }, { status: 500 });
    }
}
