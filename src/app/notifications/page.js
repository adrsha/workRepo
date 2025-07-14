import "../global.css";
import NotificationsClient from './NotificationsClient';
import { getMetadata } from "../seoConfig";

export const metadata = getMetadata('notifications');

export default function NotificationsPage() {
    return <NotificationsClient />;
}
