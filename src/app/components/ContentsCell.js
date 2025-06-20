import { useState } from 'react';
import { ContentsPopup } from './ContentsPopup';

export const ContentsCell = ({ classId, contentsCount, contentsData, onSaveContent, onAddContent, onDeleteContent }) => {
    console.log("CDATA", contentsData, contentsCount)
    const [isPopupOpen, setIsPopupOpen] = useState(false);

    const handleToggle = () => {
        setIsPopupOpen(!isPopupOpen);
    };

    const handleClosePopup = () => {
        setIsPopupOpen(false);
    };

    return (
        <div className="contents-container">
            <div
                className="contents-count clickable"
                onClick={handleToggle}
                title="Click to view and edit contents"
            >
                <span className="content-count-badge">
                    {contentsCount} content{contentsCount !== 1 ? 's' : ''}
                    <span className="view-icon">📚</span>
                </span>
            </div>

            {isPopupOpen && (
                <ContentsPopup
                    classId={classId}
                    contentsData={contentsData}
                    onClose={handleClosePopup}
                    onSaveContent={onSaveContent}
                    onAddContent={onAddContent}
                    onDeleteContent={onDeleteContent}
                />
            )}
        </div>
    );
};

// contentsUtils.js - Utility functions for contents management
