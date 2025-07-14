import Nav from './components/Nav.js';
import Footer from './components/Footer.js';
import defaultStyle from './page.module.css';
import ClientLayout from './ClientLayout';
import './global.css';

export const metadata = {
    title: {
        default: 'MeroTuition | Best Online Learning Platform in Nepal',
        template: '%s | MeroTuition'
    },
    description: 'MeroTuition offers comprehensive online education in Nepal. Join courses, preparation classes, language learning, and connect with expert teachers. Start learning today!',
    twitter: {
        card: 'summary_large_image',
        title: 'MeroTuition | Best Online Learning Management System in Nepal',
        description: 'MeroTuition offers comprehensive online education in Nepal. Join courses, preparation classes, language learning.',
        images: ['https://merotuition.com/logo.svg'],
    },
};

export default function RootLayout({ children }) {

    return (
        <html lang="en" className={defaultStyle.html}>
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
                <link rel="dns-prefetch" href="//merotuition.com" />


                {/* Cache Control */}
                <meta httpEquiv="Cache-Control" content="public, max-age=31536000, immutable" />


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
