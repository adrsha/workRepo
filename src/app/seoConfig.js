export const seoConfig = {
    baseUrl: 'https://merotuition.com',
    defaultImage: 'https://merotuition.com/images/og-image.webp', // Modern format
    siteName: 'MeroTuition',
    
    // Social media handles
    social: {
        facebook: 'https://facebook.com/merotuition',
        twitter: 'https://twitter.com/merotuition',
        instagram: 'https://instagram.com/merotuition',
        linkedin: 'https://linkedin.com/company/merotuition'
    },

    baseKeywords: [
        'MeroTuition', 'online learning Nepal', 'LMS Nepal', 'online classes Nepal',
        'tutoring Nepal', 'education platform', 'online courses Nepal', 'best LMS Nepal',
        'online education', 'comprehensive learning', 'expert teachers Nepal'
    ],

    pages: {
        home: {
            title: 'Best Online Learning Management System in Nepal',
            description: 'MeroTuition offers comprehensive online education in Nepal. Join courses, preparation classes, language learning, and connect with expert teachers. Start learning today!',
            keywords: ['online education', 'best LMS Nepal', 'comprehensive learning'],
            path: '/',
            h1: 'Nepal\'s Leading Online Learning Platform',
            h2: 'Expert Teachers, Quality Courses, Interactive Classes'
        },

        aboutus: {
            title: 'About MeroTuition - Nepal\'s Premier Online Education Platform',
            description: 'Learn about MeroTuition\'s mission to provide quality online education in Nepal. Discover our story, values, and commitment to student success through innovative learning management system.',
            keywords: ['about MeroTuition', 'our mission', 'online education Nepal', 'educational platform', 'LMS Nepal'],
            path: '/aboutus',
            h1: 'About MeroTuition',
            h2: 'Transforming Education Through Technology'
        },

        contactus: {
            title: 'Contact MeroTuition - Get Expert Support',
            description: 'Get in touch with MeroTuition for any questions about our courses, teachers, or platform. We\'re here to help you start your learning journey.',
            keywords: ['contact', 'support', 'help', 'customer service', 'get in touch'],
            path: '/contactus',
            h1: 'Contact Us',
            h2: 'We\'re Here to Help You Learn'
        },

        teachers: {
            title: 'Expert Teachers - Qualified Online Instructors in Nepal',
            description: 'Meet our qualified and experienced teachers who are passionate about helping students achieve their academic goals through personalized online learning.',
            keywords: ['expert teachers', 'qualified instructors', 'online tutors', 'experienced educators', 'teaching professionals'],
            path: '/teachers',
            h1: 'Meet Our Expert Teachers',
            h2: 'Qualified Professionals Dedicated to Your Success'
        },

        classes: {
            title: 'Live Online Classes - Interactive Learning Sessions',
            description: 'Join live online classes with expert teachers. Interactive learning sessions designed to help you master subjects and achieve academic excellence.',
            keywords: ['online classes', 'live classes', 'interactive learning', 'virtual classroom', 'online sessions'],
            path: '/classes',
            h1: 'Live Online Classes',
            h2: 'Interactive Learning with Expert Teachers'
        },
        
        courses: {
            title: 'Online Courses - Comprehensive Learning Programs',
            description: 'Explore our wide range of online courses. Choose from a variety of subjects and levels to start your educational journey.',
            keywords: ['online courses', 'learning opportunities', 'educational resources', 'online learning platforms'],
            path: '/courses',
            h1: 'Comprehensive Online Courses',
            h2: 'Choose Your Learning Path'
        },

        downloads: {
            title: 'Educational Downloads - Study Materials & Resources',
            description: 'Access downloadable study materials, notes, practice papers, and educational resources to enhance your learning experience.',
            keywords: ['downloads', 'study materials', 'notes', 'practice papers', 'educational resources', 'PDF downloads'],
            path: '/downloads',
            h1: 'Educational Downloads',
            h2: 'Study Materials and Practice Resources'
        },

        login: {
            title: 'Student Login - Access Your MeroTuition Account',
            description: 'Login to your MeroTuition account to access your courses, classes, and learning dashboard.',
            keywords: ['login', 'sign in', 'access account', 'student login'],
            path: '/registration/login',
            h1: 'Student Login',
            h2: 'Access Your Learning Dashboard'
        },

        signup: {
            title: 'Sign Up for MeroTuition - Start Learning Today',
            description: 'Create your MeroTuition account today! Join thousands of students learning online with expert teachers in Nepal.',
            keywords: ['sign up', 'create account', 'register', 'join MeroTuition', 'student registration'],
            path: '/registration/signup',
            h1: 'Join MeroTuition Today',
            h2: 'Start Your Online Learning Journey'
        },

        // Private pages with noIndex
        lmshome: {
            title: 'Learning Management System Dashboard',
            description: 'Access your personalized learning dashboard. Track progress, join classes, view assignments, and manage your educational journey.',
            keywords: ['LMS', 'learning management system', 'student dashboard'],
            path: '/lmshome',
            noIndex: true
        },

        notifications: { title: 'Notifications', path: '/notifications', noIndex: true },
        settings: { title: 'Settings', path: '/settings', noIndex: true },
        profile: { title: 'Profile', path: '/profile', noIndex: true }
    }
};

// Enhanced metadata generation for App Router
export const getMetadata = (pageKey) => {
    const page = seoConfig.pages[pageKey];
    if (!page) return {};

    const title = `${page.title} | ${seoConfig.siteName}`;
    const description = page.description || `${page.title} - MeroTuition`;
    const keywords = [...seoConfig.baseKeywords, ...(page.keywords || [])];
    const url = `${seoConfig.baseUrl}${page.path}`;

    return {
        title,
        description,
        keywords: keywords.join(', '),
        openGraph: {
            title,
            description,
            url,
            siteName: seoConfig.siteName,
            images: [{ 
                url: seoConfig.defaultImage,
                width: 1200,
                height: 630,
                alt: `${page.title} - MeroTuition`
            }],
            type: 'website',
            locale: 'en_US'
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [seoConfig.defaultImage],
            site: '@merotuition',
            creator: '@merotuition'
        },
        alternates: {
            canonical: url
        },
        robots: page.noIndex ? {
            index: false,
            follow: false
        } : {
            index: true,
            follow: true,
            googleBot: {
                index: true,
                follow: true,
                'max-video-preview': -1,
                'max-image-preview': 'large',
                'max-snippet': -1,
            }
        }
    };
};

// Enhanced Head props for Pages Router
export const getHeadProps = (pageKey) => {
    const page = seoConfig.pages[pageKey];
    if (!page) return {};

    const title = `${page.title} | ${seoConfig.siteName}`;
    const description = page.description || `${page.title} - MeroTuition`;
    const keywords = [...seoConfig.baseKeywords, ...(page.keywords || [])].join(', ');
    const url = `${seoConfig.baseUrl}${page.path}`;

    return {
        title,
        meta: [
            { name: 'description', content: description },
            { name: 'keywords', content: keywords },
            { name: 'viewport', content: 'width=device-width, initial-scale=1' },
            
            // Open Graph
            { property: 'og:title', content: title },
            { property: 'og:description', content: description },
            { property: 'og:url', content: url },
            { property: 'og:image', content: seoConfig.defaultImage },
            { property: 'og:site_name', content: seoConfig.siteName },
            { property: 'og:type', content: 'website' },
            { property: 'og:locale', content: 'en_US' },
            
            // Twitter
            { name: 'twitter:card', content: 'summary_large_image' },
            { name: 'twitter:title', content: title },
            { name: 'twitter:description', content: description },
            { name: 'twitter:image', content: seoConfig.defaultImage },
            { name: 'twitter:site', content: '@merotuition' },
            { name: 'twitter:creator', content: '@merotuition' },
            
            // Additional SEO
            { name: 'author', content: 'MeroTuition' },
            { name: 'publisher', content: 'MeroTuition' },
            { name: 'language', content: 'English' },
            { name: 'revisit-after', content: '7 days' },
            
            // Robots
            ...(page.noIndex ? 
                [{ name: 'robots', content: 'noindex,nofollow' }] : 
                [{ name: 'robots', content: 'index,follow' }]
            )
        ],
        link: [
            { rel: 'canonical', href: url },
            { rel: 'alternate', hrefLang: 'en', href: url }
        ]
    };
};

// SEO Component with structured headings
import Head from 'next/head';

export const SEO = ({ pageKey, children }) => {
    const headProps = getHeadProps(pageKey);
    const page = seoConfig.pages[pageKey];

    if (!headProps.title) return children;

    return (
        <>
            <Head>
                <title>{headProps.title}</title>
                {headProps.meta.map((tag, i) => (
                    <meta key={i} {...tag} />
                ))}
                {headProps.link.map((link, i) => (
                    <link key={i} {...link} />
                ))}
            </Head>
            
            {/* Add structured headings for SEO */}
            {page?.h1 && (
                <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
                    <h1>{page.h1}</h1>
                    {page.h2 && <h2>{page.h2}</h2>}
                </div>
            )}
            
            {children}
        </>
    );
};

// Image optimization utility
export const getOptimizedImageUrl = (src, width = 800, quality = 80) => {
    if (!src) return seoConfig.defaultImage;
    
    // For Next.js Image optimization
    const params = new URLSearchParams({
        url: src,
        w: width.toString(),
        q: quality.toString()
    });
    
    return `/_next/image?${params.toString()}`;
};

// Social sharing utility
export const getSocialShareUrls = (pageKey, customTitle) => {
    const page = seoConfig.pages[pageKey];
    if (!page) return {};
    
    const url = encodeURIComponent(`${seoConfig.baseUrl}${page.path}`);
    const title = encodeURIComponent(customTitle || page.title);
    const description = encodeURIComponent(page.description || '');
    
    return {
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
        twitter: `https://twitter.com/intent/tweet?url=${url}&text=${title}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
        whatsapp: `https://wa.me/?text=${title}%20${url}`
    };
};

export default seoConfig;
