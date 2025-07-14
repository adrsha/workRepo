import { getMetadata } from '../seoConfig';
import GradesClient from './GradesClient';

export const metadata = getMetadata('classes');

export default function GradesPage() {
    return <GradesClient />;
}
