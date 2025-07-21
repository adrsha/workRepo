import { getMetadata } from '../seoConfig';
import GradesClient from './GradesClient';
import {
    fetchData,
    fetchViewData,
} from '../lib/helpers';

export const metadata = getMetadata('classes');

export default async function GradesPage() {
    // Fetch initial data on the server
    let gradesData = [];
    let teachersData = [];

    try {
        // Fetch grades data
        gradesData = await fetchData('grades');
        
        // Fetch teachers data
        teachersData = await fetchViewData('teachers_view');
    } catch (error) {
        console.error('Error fetching initial data:', error);
        // Continue with empty arrays - the client can handle this gracefully
    }

    return (
        <GradesClient 
            initialGradesData={gradesData}
            initialTeachersData={teachersData}
        />
    );
}
