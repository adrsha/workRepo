// /app/partners/page.js
'use client';
import { Suspense } from 'react';
import PartnersList from './PartnersList';
import Loading from '../components/Loading';

export default function PartnersPage() {
    return (
        <Suspense fallback={<Loading />}>
            <PartnersList />
        </Suspense>
    );
}
