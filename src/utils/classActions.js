import { makeApiCall } from './api';

export const updateMeetingUrl = async (session, isTeacher, canEditMeetingUrl, classId, newUrl) => {
    if (!session || !isTeacher) {
        throw new Error('Only teachers can update meeting URLs');
    }

    if (!canEditMeetingUrl) {
        throw new Error('Cannot update meeting URL - class time has passed or not available today');
    }

    const response = await fetch('/api/updateMeetingUrl', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({ classId, meetingUrl: newUrl }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update meeting URL');
    }

    return response.json();
};

export const regenerateMeetingLink = async (session, isTeacher, canGenerateLink, classId, classDetails) => {
    if (!session || !isTeacher) {
        throw new Error('Only teachers can regenerate meeting links');
    }

    if (!canGenerateLink) {
        throw new Error('Cannot regenerate meeting link - class time has passed or not available today');
    }

    return makeApiCall('/api/createMeeting', 'POST', {
        classId,
        startDate: classDetails.start_time,
        endDate: classDetails.end_time,
        className: classDetails.course_name
    }, session.accessToken);
};
