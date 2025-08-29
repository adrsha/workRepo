import { useEffect, useState } from 'react';
import { contentService } from '../app/api/contentService';
import { sortContentsByDate } from '../utils/contentUtils';

export const useClassContent = (classId, session) => {
    const [contents, setContents] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchContent = async () => {
        if (!classId) return;

        try {
            const data = await contentService.fetchClassContent(classId, session?.accessToken);
            const sortedContents = sortContentsByDate(data, 'asc');
 
            setContents(sortedContents);
        } catch (err) {
            console.error('Error fetching class content:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchContent();
    }, [classId, session?.accessToken]);

    return { contents, setContents, loading, refetch: fetchContent };
};
