import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/authOptions';
import { executeQueryWithRetry } from '../../lib/db';


export async function POST(request) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ message: 'Unauthorized or invalid session' }, { status: 401 });
        }

        // Parse the request body
        const { classId, startDate, endDate, className, updateDatabase = true } = await request.json(); 

        // Validate required fields
        if (!classId) {
            return NextResponse.json({ message: 'Class ID is required' }, { status: 400 });
        }

        if (!startDate || !endDate) {
            return NextResponse.json({ message: 'Start date and end date are required' }, { status: 400 });
        }

        // Ensure user ID is not undefined
        const userId = session.user.id;
        if (!userId) {
            return NextResponse.json({ message: 'Invalid user session' }, { status: 401 });
        }

        // Verify the user is actually the teacher for this class
        const classData = await executeQueryWithRetry({
            query: 'SELECT * FROM classes WHERE class_id = ? AND teacher_id = ?',
            values: [classId, userId]
        });

        if (!classData || classData.length === 0) {
            return NextResponse.json(
                { message: 'You do not have permission to create a meeting for this class' },
                { status: 403 }
            );
        }

        // Format dates for Whereby API
        let startDateTime, endDateTime;
        try {
            startDateTime = new Date(startDate);
            endDateTime = new Date(endDate);

            // Validate dates are valid
            if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
                return NextResponse.json({ message: 'Invalid date format' }, { status: 400 });
            }
        } catch (error) {
            return NextResponse.json({ message: 'Invalid date format' }, { status: 400 });
        }

        const isoDates = {
            startDate: startDateTime.toISOString(),
            endDate: endDateTime.toISOString()
        };

        // Call Whereby API to create a room
        const response = await fetch('https://api.whereby.dev/v1/meetings', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.WHEREBY_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                isLocked: false,
                roomNamePrefix: `class-${classId}`,
                roomNamePattern: 'uuid',
                roomMode: 'normal',
                startDate: isoDates.startDate,
                endDate: isoDates.endDate,
                fields: ['hostRoomUrl', 'roomUrl']
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Whereby API error:', errorData);
            return NextResponse.json(
                { message: 'Failed to create meeting room' },
                { status: response.status }
            );
        }

        // Get the meeting details from Whereby
        const meetingData = await response.json();

        // Validate meeting data
        if (!meetingData || !meetingData.roomUrl) {
            return NextResponse.json(
                { message: 'Invalid response from meeting provider' },
                { status: 500 }
            );
        }

        // UPDATE: Only update database if requested
        if (updateDatabase) {
            await executeQueryWithRetry({
                query: 'UPDATE classes SET meeting_url = ? WHERE class_id = ?',
                values: [meetingData.roomUrl, classId]
            });
        }

        // Return the meeting URL to the client
        return NextResponse.json({
            meetingUrl: meetingData.roomUrl,
            hostUrl: meetingData.hostRoomUrl || meetingData.roomUrl,
            databaseUpdated: updateDatabase 
        });
    } catch (error) {
        console.error('Error creating meeting:', error);
        return NextResponse.json(
            { message: 'Internal server error', error: error.message },
            { status: 500 }
        );
    }
}
