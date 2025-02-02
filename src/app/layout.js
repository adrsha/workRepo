import Nav from './components/Nav.js';
import defaultStyle from './page.module.css';
export default function RootLayout({ children }) {
    return (
        <html lang="en" className={defaultStyle.html}>
            <body className={defaultStyle.body}>
                <Nav />
                <div className={defaultStyle.background}>
                {children}
                </div>
            </body>
        </html>
    );
}
