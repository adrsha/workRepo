import "../global.css"
import DownloadContent from '../components/DownloadContent';
import { getMetadata } from "../seoConfig";
export const metadata = getMetadata('downloads');

export default function Downloads() {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <DownloadContent />
    </div>
}

