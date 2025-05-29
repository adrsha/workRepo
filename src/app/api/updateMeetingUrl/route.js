import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/authOptions';
import { executeQueryWithRetry } from '../../lib/db';

const isValidUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { classId, meetingUrl } = await request.json();

    if (!classId) {
      return NextResponse.json({ message: 'Class ID is required' }, { status: 400 });
    }

    if (!meetingUrl || !meetingUrl.trim()) {
      return NextResponse.json({ message: 'Meeting URL is required' }, { status: 400 });
    }

    if (!isValidUrl(meetingUrl.trim())) {
      return NextResponse.json({ message: 'Invalid URL format' }, { status: 400 });
    }

    // Verify user is the teacher for this class
    const classData = await executeQueryWithRetry({
      query: 'SELECT teacher_id FROM classes WHERE class_id = ?',
      values: [classId]
    });

    if (!classData?.length || classData[0].teacher_id !== session.user.id) {
      return NextResponse.json(
        { message: 'You do not have permission to update this class' },
        { status: 403 }
      );
    }

    // Update the meeting URL
    await executeQueryWithRetry({
      query: 'UPDATE classes SET meeting_url = ? WHERE class_id = ?',
      values: [meetingUrl.trim(), classId]
    });

    return NextResponse.json({ 
      message: 'Meeting URL updated successfully',
      meetingUrl: meetingUrl.trim()
    });

  } catch (error) {
    console.error('Error updating meeting URL:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
