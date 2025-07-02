import Nav from './components/Nav.js';
import Footer from './components/Footer.js';
import defaultStyle from './page.module.css';
import ClientLayout from './ClientLayout';
import './global.css';

export const metadata = {
    title: {
        default: 'Best Online Learning Management System in Nepal | MeroTuition',
        template: '%s | MeroTuition'
    },
    description: 'MeroTuition offers comprehensive online education in Nepal. Join courses, preparation classes, language learning, and connect with expert teachers. Start learning today!',
    keywords: [
        'MeroTuition', 'merotuition', 'online learning Nepal', 'LMS Nepal', 'online classes Nepal', 
        'tutoring Nepal', 'education platform', 'online courses Nepal', 'best LMS Nepal',
        'online education', 'comprehensive learning', 'expert teachers Nepal'
    ],
    openGraph: {
        type: 'website',
        title: 'Best Online Learning Management System in Nepal | MeroTuition',
        description: 'MeroTuition offers comprehensive online education in Nepal. Join courses, preparation classes, language learning, and connect with expert teachers.',
        url: 'https://merotuition.com',
        images: [{ url: 'https://merotuition.com/logo.svg' }],
        siteName: 'MeroTuition',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Best Online Learning Management System in Nepal | MeroTuition',
        description: 'MeroTuition offers comprehensive online education in Nepal. Join courses, preparation classes, language learning.',
        images: ['https://merotuition.com/logo.svg'],
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
        apple: '/apple-touch-icon.png',
    },
    other: {
        'google-site-verification': 'your-google-verification-code',
    },
};

export default function RootLayout({ children }) {
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "EducationalOrganization",
        "name": "MeroTuition",
        "url": "https://merotuition.com",
        "description": "Best online learning management system providing comprehensive education in Nepal with expert teachers, courses, and interactive classes.",
        "logo": "https://merotuition.com/logo.svg",
        "address": {
            "@type": "PostalAddress",
            "addressCountry": "Nepal"
        },
        "sameAs": [
            "https://facebook.com/merotuition",
            "https://twitter.com/merotuition",
            "https://instagram.com/merotuition",
            "https://linkedin.com/company/merotuition"
        ],
        "offers": {
            "@type": "Offer",
            "category": "Online Education",
            "description": "Online courses, classes, and tutoring services"
        }
    };

    return (
        <html lang="en" className={defaultStyle.html}>
            <head>
                {/* Performance Optimization */}
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
                <link rel="dns-prefetch" href="//merotuition.com" />
                
                {/* Security Headers */}
                <meta httpEquiv="Strict-Transport-Security" content="max-age=31536000; includeSubDomains" />
                <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
                <meta httpEquiv="X-Frame-Options" content="DENY" />
                
                {/* Cache Control */}
                <meta httpEquiv="Cache-Control" content="public, max-age=31536000, immutable" />
                
                {/* Structured Data */}
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify(structuredData)
                    }}
                />
                
                {/* Google Analytics */}
                <script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            window.dataLayer = window.dataLayer || [];
                            function gtag(){dataLayer.push(arguments);}
                            gtag('js', new Date());
                            gtag('config', 'GA_MEASUREMENT_ID');
                        `
                    }}
                />
                
                {/* Social Media Integration */}
                <meta property="fb:app_id" content="your-facebook-app-id" />
                <meta name="twitter:site" content="@merotuition" />
                <meta name="twitter:creator" content="@merotuition" />
            </head>
            <body className={defaultStyle.body}>
                <div className={defaultStyle.nonDecoratorWrapper}>
                    <ClientLayout>
                        <Nav />
                        <main className={defaultStyle.background}>
                            {children}
                        </main>
                        <Footer />
                    </ClientLayout>
                </div>
            </body>
        </html>
    );
}
