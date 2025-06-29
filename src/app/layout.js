import Nav from './components/Nav.js';
import Footer from './components/Footer.js';
import defaultStyle from './page.module.css';
import ClientLayout from './ClientLayout'; // New client wrapper
import './global.css';

export const metadata = {
    title: {
        default: 'MeroTuition | Best Online Learning Management System in Nepal',
        template: '%s | MeroTuition'
    },
    description: 'MeroTuition offers comprehensive online education in Nepal. Join courses, preparation classes, language learning, and connect with expert teachers. Start learning today!',
    keywords: ['MeroTuition', 'online learning Nepal', 'LMS Nepal', 'online classes Nepal', 'tutoring Nepal', 'education platform', 'online courses Nepal'],

    openGraph: {
        type: 'website',
        title: 'MeroTuition | Best Online Learning Platform in Nepal',
        description: 'Quality online education with expert teachers. Courses, preparation classes, and interactive learning.',
        url: 'https://merotuition.com',
        image: 'https://merotuition.com/logo.svg',
        siteName: 'MeroTuition',
    },

    twitter: {
        card: 'summary_large_image',
        title: 'MeroTuition | Online Learning Nepal',
        description: 'Join Nepal\'s leading online education platform',
        image: 'https://merotuition.com/logo.svg',
    },

    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },

    alternates: {
        canonical: 'https://merotuition.com',
    },

    icons: {
        icon: '/favicon.ico',
    },
};

export default function RootLayout({ children }) {
    return (
        <html lang="en" className={defaultStyle.html}>
            <head>
                {/* Structured Data */}
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            "@context": "https://schema.org",
                            "@type": "EducationalOrganization",
                            "name": "MeroTuition",
                            "url": "https://merotuition.com",
                            "description": "Online learning management system providing quality education in Nepal",
                            "address": {
                                "@type": "PostalAddress",
                                "addressCountry": "Nepal"
                            },
                            "sameAs": [
                                "https://facebook.com/merotuition",
                                "https://twitter.com/merotuition"
                            ]
                        })
                    }}
                />

                {/* Performance */}
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="dns-prefetch" href="//merotuition.com" />
            </head>

            <body className={defaultStyle.body}>
                <div className={defaultStyle.nonDecoratorWrapper}>
                    <ClientLayout>
                        <Nav />
                        <div className={defaultStyle.background}>{children}</div>
                        <Footer />
                    </ClientLayout>
                </div>
            </body>
        </html>
    );
}
