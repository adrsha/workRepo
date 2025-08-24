import { getMetadata } from '../seoConfig';
import ContactUsClient from './ContactUsClient';

export const metadata = getMetadata('contactus');

export default function ContactUsPage() {
  return (
    <div>
      <ContactUsClient />
    </div>
  );
}
