import styles from '../../styles/ClassDetails.module.css';

export const MeetingButton = ({ onJoinMeeting, hasMeetingLink, classJoinable, repeatNDays, isValidDay }) => {
    let buttonText = 'Join Meeting';
    let isDisabled = !hasMeetingLink || !classJoinable;
    let tooltipText = '';

    if (!hasMeetingLink) {
        tooltipText = 'No meeting link available';
    } else if (repeatNDays && !isValidDay) {
        tooltipText = `This class occurs every ${repeatNDays} days. Not available today.`;
        isDisabled = true;
    } else if (!classJoinable) {
        tooltipText = 'Class is not currently active';
    } else {
        tooltipText = 'Join online meeting';
    }

    return (
        <button
            className={`${styles.meetingButton}`}
            onClick={onJoinMeeting}
            disabled={isDisabled}
            title={tooltipText}
        >
            {buttonText}
        </button>
    );
};
