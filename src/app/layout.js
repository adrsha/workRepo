'use client';
import Nav from './components/Nav.js';
import Footer from './components/Footer.js';
import defaultStyle from './page.module.css';
import { SessionProvider } from 'next-auth/react';
import DecoratorWrapper from './decorator/page.js';

export default function RootLayout({ children }) {
    return (
        <html lang="en" className={defaultStyle.html}>
            <body className={defaultStyle.body}>
                <div className={defaultStyle.nonDecoratorWrapper}>
                    <SessionProvider>
                        <Nav />
                        <div className={defaultStyle.background}>{children}</div>
                        <Footer />
                    </SessionProvider>
                </div>
            </body>
        </html>
    );
}
