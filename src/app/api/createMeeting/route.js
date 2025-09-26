import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/authOptions';
import { executeQueryWithRetry } from '../../lib/db';
import { makeApiCall } from '@/utils/api';


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

        // Format dates for API with validation and adjustment
        let startDateTime, endDateTime;
        try {
            const originalStartDate = new Date(startDate);
            const originalEndDate = new Date(endDate);

            // Validate dates are valid
            if (isNaN(originalStartDate.getTime()) || isNaN(originalEndDate.getTime())) {
                return NextResponse.json({ message: 'Invalid date format' }, { status: 400 });
            }

            const now = new Date();
            
            // Extract time components from original start date
            const startHours = originalStartDate.getHours();
            const startMinutes = originalStartDate.getMinutes();
            const startSeconds = originalStartDate.getSeconds();
            const startMilliseconds = originalStartDate.getMilliseconds();
            
            // Check if start date is before current date
            if (originalStartDate.toDateString() < now.toDateString()) {
                // Use current date but preserve the original time
                startDateTime = new Date(now);
                startDateTime.setHours(startHours, startMinutes, startSeconds, startMilliseconds);
                
                // If the time has already passed today, add a buffer of 30 seconds
                if (startDateTime <= now) {
                    startDateTime = new Date(now.getTime() + 30000); // 30 seconds buffer
                }
            } else if (originalStartDate.toDateString() === now.toDateString()) {
                // Same date - check if time has passed
                if (originalStartDate <= now) {
                    // Time has passed, set to current time + 30 seconds buffer
                    startDateTime = new Date(now.getTime() + 30000);
                } else {
                    // Future time today, use as is
                    startDateTime = originalStartDate;
                }
            } else {
                // Future date, use as is
                startDateTime = originalStartDate;
            }

            // Calculate duration from original TIME difference only (handles midnight crossover)
            const startHrs = originalStartDate.getUTCHours();
            const startMins = originalStartDate.getUTCMinutes();
            const startSecs = originalStartDate.getUTCSeconds();
            const startMsecs = originalStartDate.getUTCMilliseconds();
            
            const endHours = originalEndDate.getUTCHours();
            const endMinutes = originalEndDate.getUTCMinutes();
            const endSeconds = originalEndDate.getUTCSeconds();
            const endMilliseconds = originalEndDate.getUTCMilliseconds();
            
            // Calculate time difference in milliseconds
            const startTotalMs = (startHours * 60 * 60 + startMinutes * 60 + startSeconds) * 1000 + startMilliseconds;
            const endTotalMs = (endHours * 60 * 60 + endMinutes * 60 + endSeconds) * 1000 + endMilliseconds;
            
            let timeDifferenceMs = endTotalMs - startTotalMs;
            
            // Handle midnight crossover
            if (timeDifferenceMs < 0) {
                timeDifferenceMs += 24 * 60 * 60 * 1000; // Add 24 hours worth of milliseconds
            }
            
            // Set end time based on adjusted start time + time duration only
            endDateTime = new Date(startDateTime.getTime() + timeDifferenceMs);
            
        } catch (error) {
            return NextResponse.json({ message: 'Invalid date format' }, { status: 400 });
        }
        
        // Calculate duration in hours (from time difference only, not date)
        const durationMs = endDateTime.getTime() - startDateTime.getTime();
        const durationHours = Math.round((durationMs / (1000 * 60 * 60)) * 100) / 100; // Round to 2 decimal places

        // console.log({
        //     name: className || `Class ${classId} Meeting`,
        //     room_type: 'webinar',
        //     permanent_room: false, // Use boolean as per docs
        //     starts_at: startDateTime.toISOString(),
        //     duration: durationHours,
        //     timezone: 'UTC',
        //     access_type: 1,
        //     lobby_enabled: true, // Use boolean as per docs
        //     lobby_description: `Welcome to ${className || 'Class'} meeting! Please wait for the instructor to start the session.`,
        //     settings: {
        //         show_on_personal_page: false,
        //         thank_you_emails_enabled: true,
        //         connection_tester_enabled: true,
        //         phonegateway_enabled: false,
        //         recorder_autostart_enabled: false,
        //         room_invite_button_enabled: true,
        //         social_media_sharing_enabled: false,
        //         connection_status_enabled: true,
        //         encryption_enabled: true
        //     }
        // })
        
         // Prepare the conference data
        const conferenceData = {
            name: className || `Class ${classId} Meeting`,
            room_type: 'webinar',
            permanent_room: false, // Use boolean as per docs
            starts_at: startDateTime.toISOString(),
            duration: durationHours,
            timezone: 'UTC',
            access_type: 1,
            lobby_enabled: true, // Use boolean as per docs
            lobby_description: `Welcome to ${className || 'Class'} meeting! Please wait for the instructor to start the session.`,
            'settings[show_on_personal_page]': false,
            'settings[thank_you_emails_enabled]': true,
            'settings[connection_tester_enabled]': true,
            'settings[phonegateway_enabled]': false,
            'settings[recorder_autostart_enabled]': false,
            'settings[room_invite_button_enabled]': true,
            'settings[social_media_sharing_enabled]': false,
            'settings[connection_status_enabled]': true,
            'settings[encryption_enabled]': true
        };

        const isoDates = {
            startDate: startDateTime.toISOString(),
            endDate: endDateTime.toISOString(),
            duration: durationHours
        };

        // Call clickmeeting api
        const response = await fetch('https://api.clickmeeting.com/v1/conferences', {
            method: 'POST',
            headers: {
                'X-API-KEY': process.env.CLICKMEETING_API_KEY,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams(conferenceData).toString()
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('ClickMeeting API error:', errorData);
            return NextResponse.json(
                { message: 'Failed to create meeting room' },
                { status: response.status }
            );
        }

        // Get the meeting details from ClickMeeting
        const meetingData = await response.json();
        console.log('ClickMeeting Response:', meetingData);
        
        // Validate meeting data - ClickMeeting returns data in 'room' object
        if (!meetingData || !meetingData.room || !meetingData.room.room_url) {
            console.error('Invalid ClickMeeting response structure:', meetingData);
            return NextResponse.json(
                { message: 'Invalid response from meeting provider' },
                { status: 500 }
            );
        }

        const roomData = meetingData.room;

        // UPDATE: Only update database if requested
        if (updateDatabase) {
            await executeQueryWithRetry({
                query: 'UPDATE classes SET meeting_url = ? WHERE class_id = ?',
                values: [roomData.room_url, classId]
            });
        }

        // Return the meeting URL to the client with ClickMeeting structure
        return NextResponse.json({
            meetingUrl: roomData.room_url,
            hostUrl: roomData.room_url + `?hash=${roomData.autologin_hash}`, // Add host hash for direct access
            meetingId: roomData.id,
            roomPin: roomData.room_pin,
            embedUrl: roomData.embed_room_url,
            phonePresenterPin: roomData.phone_presenter_pin,
            phoneListenerPin: roomData.phone_listener_pin,
            accessRoles: roomData.access_role_hashes,
            startsAt: roomData.starts_at,
            endsAt: roomData.ends_at,
            databaseUpdated: updateDatabase,
            meetingDetails: {
                name: roomData.name,
                timezone: roomData.timezone,
                status: roomData.status,
                lobbyEnabled: roomData.lobby_enabled,
                accessType: roomData.access_type
            }
        });
    } catch (error) {
        console.error('Error creating meeting:', error);
        return NextResponse.json(
            { message: 'Internal server error', error: error.message },
            { status: 500 }
        );
    }
}
