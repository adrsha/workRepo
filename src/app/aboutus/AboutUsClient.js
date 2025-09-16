'use client';
import styles from '../../styles/AboutUs.module.css';
import { useState, useEffect } from 'react';
import { MarkdownContent } from '../../utils/markdown';
import { TextOnlyEditor } from '../components/editor';
import { useAboutUsHandlers, fetchAboutContent } from '@/hooks/useAboutUs';

export default function AboutUsClient({ session }) {
    const [aboutData, setAboutData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const {
        isEditing,
        contentForm,
        handleUpdateForm,
        handleSaveContent,
        handleCancel,
        handleStartEditing
    } = useAboutUsHandlers(aboutData, setAboutData);

    useEffect(() => {
        fetchAboutContent()
            .then((data) => {
                console.log('Fetched data:', data);
                setAboutData(data);
                setIsLoading(false);
            })
            .catch((error) => {
                console.error('Error fetching about content:', error);
                setIsLoading(false);
            });
    }, []);

    // Check if user is admin (level >= 2)
    const isAdmin = session?.user?.level >= 2;

    if (isLoading) {
        return (
            <div className={styles.aboutUsContainer}>
                <h1 className={styles.heading}>About Us</h1>
                <p>Loading...</p>
            </div>
        );
    }

    return (
        <div className={styles.aboutUsContainer}>
            <div className={styles.header}>
                <h1 className={styles.heading}>About Us</h1>
                {isAdmin && !isEditing && (
                    <button 
                        className={styles.editButton}
                        onClick={handleStartEditing}
                    >
                        Edit Content
                    </button>
                )}
            </div>

            {isEditing && isAdmin ? (
                <TextOnlyEditor
                    content={contentForm.content_data}
                    onChange={(content) => handleUpdateForm('content_data', content)}
                    onSave={handleSaveContent}
                    onCancel={handleCancel}
                    title="Edit About Us Content"
                    saveButtonText="Save About Content"
                />
            ) : (
                <div className={styles.content}>
                    {aboutData?.content?.[0]?.content_value ? (
                        <MarkdownContent 
                            content={aboutData.content[0].content_value}
                            className={styles.markdownContent}
                        />
                    ) : (
                        <p>No content available.</p>
                    )}
                </div>
            )}
        </div>
    );
}
