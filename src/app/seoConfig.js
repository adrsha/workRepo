// seoConfig.js - Next.js SEO configuration
export const seoConfig = {
    baseUrl: 'https://merotuition.com',
    defaultImage: 'https://merotuition.com/logo.svg',
    siteName: 'MeroTuition',

    baseKeywords: [
        'MeroTuition',
        'online learning Nepal',
        'LMS Nepal',
        'online classes Nepal',
        'tutoring Nepal',
        'education platform',
        'online courses Nepal'
    ],

    pages: {
        home: {
            title: 'Best Online Learning Management System in Nepal',
            description: 'MeroTuition offers comprehensive online education in Nepal. Join courses, preparation classes, language learning, and connect with expert teachers. Start learning today!',
            keywords: ['online education', 'best LMS Nepal', 'comprehensive learning'],
            path: '/'
        },

        aboutus: {
            title: 'About Us',
            description: 'Learn about MeroTuition\'s mission to provide quality online education in Nepal. Discover our story, values, and commitment to student success through innovative learning management system.',
            keywords: ['about MeroTuition', 'our mission', 'online education Nepal', 'educational platform', 'LMS Nepal'],
            path: '/aboutus'
        },

        contactus: {
            title: 'Contact Us',
            description: 'Get in touch with MeroTuition for any questions about our courses, teachers, or platform. We\'re here to help you start your learning journey.',
            keywords: ['contact', 'support', 'help', 'customer service', 'get in touch'],
            path: '/contactus'
        },

        teachers: {
            title: 'Expert Teachers',
            description: 'Meet our qualified and experienced teachers who are passionate about helping students achieve their academic goals through personalized online learning.',
            keywords: ['expert teachers', 'qualified instructors', 'online tutors', 'experienced educators', 'teaching professionals'],
            path: '/teachers'
        },

        classes: {
            title: 'Online Classes',
            description: 'Join live online classes with expert teachers. Interactive learning sessions designed to help you master subjects and achieve academic excellence.',
            keywords: ['online classes', 'live classes', 'interactive learning', 'virtual classroom', 'online sessions'],
            path: '/classes'
        },
        
        courses: {
            title: 'Online Courses',
            description: 'Explore our wide range of online courses. Choose from a variety of subjects and levels to start your educational journey.',
            keywords: ['online courses', 'learning opportunities', 'educational resources', 'online learning platforms'],
            path: '/courses'
        },

        downloads: {
            title: 'Downloads',
            description: 'Access downloadable study materials, notes, practice papers, and educational resources to enhance your learning experience.',
            keywords: ['downloads', 'study materials', 'notes', 'practice papers', 'educational resources', 'PDF downloads'],
            path: '/downloads'
        },

        lmshome: {
            title: 'Learning Management System',
            description: 'Access your personalized learning dashboard. Track progress, join classes, view assignments, and manage your educational journey with MeroTuition LMS.',
            keywords: ['LMS', 'learning management system', 'student dashboard', 'online learning portal', 'education dashboard'],
            path: '/lmshome',
            noIndex: true
        },

        notifications: {
            title: 'Notifications',
            description: 'Stay updated with your latest notifications, class schedules, assignment deadlines, and important announcements from MeroTuition.',
            keywords: ['notifications', 'updates', 'announcements', 'class schedules', 'deadlines'],
            path: '/notifications',
            noIndex: true
        },

        settings: {
            title: 'Settings',
            description: 'Manage your account settings, preferences, and profile information. Customize your MeroTuition learning experience.',
            keywords: ['settings', 'account settings', 'profile', 'preferences', 'account management'],
            path: '/settings',
            noIndex: true
        },
        profile: {
            title: 'Profile',
            description: 'View and manage your profile information, including name, email, and profile picture. Update your personal details to make your MeroTuition account more personalized.',
            keywords: ['profile', 'account profile', 'personal information', 'name', 'email', 'profile picture'],
            path: '/profile',
            noIndex: true
        },
        login: {
            title: 'Login',
            description: 'Login to your MeroTuition account to access your courses, classes, and learning dashboard.',
            keywords: ['login', 'sign in', 'access account', 'student login'],
            path: '/registration/login'
        },

        signup: {
            title: 'Sign Up',
            description: 'Create your MeroTuition account today! Join thousands of students learning online with expert teachers in Nepal.',
            keywords: ['sign up', 'create account', 'register', 'join MeroTuition', 'student registration'],
            path: '/registration/signup'
        }
    }
};

// ============= SERVER SIDE (App Router) =============
// For Next.js 13+ App Router metadata
export const getMetadata = (pageKey) => {
    const page = seoConfig.pages[pageKey];
    if (!page) return {};

    const title = `${page.title} | ${seoConfig.siteName}`;
    const description = page.description;
    const keywords = [...seoConfig.baseKeywords, ...page.keywords];
    const url = `${seoConfig.baseUrl}${page.path}`;

    return {
        title,
        description,
        keywords,
        openGraph: {
            title,
            description,
            url,
            siteName: seoConfig.siteName,
            images: [{ url: seoConfig.defaultImage }],
            type: 'website'
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [seoConfig.defaultImage]
        },
        alternates: {
            canonical: url
        },
        ...(page.noIndex && { robots: { index: false, follow: false } })
    };
};

// ============= CLIENT SIDE (Pages Router) =============
// For Next.js Pages Router with Head component
export const getHeadProps = (pageKey) => {
    const page = seoConfig.pages[pageKey];
    if (!page) return {};

    const title = `${page.title} | ${seoConfig.siteName}`;
    const description = page.description;
    const keywords = [...seoConfig.baseKeywords, ...page.keywords].join(', ');
    const url = `${seoConfig.baseUrl}${page.path}`;

    return {
        title,
        meta: [
            { name: 'description', content: description },
            { name: 'keywords', content: keywords },
            { property: 'og:title', content: title },
            { property: 'og:description', content: description },
            { property: 'og:url', content: url },
            { property: 'og:image', content: seoConfig.defaultImage },
            { property: 'og:site_name', content: seoConfig.siteName },
            { property: 'og:type', content: 'website' },
            { name: 'twitter:card', content: 'summary_large_image' },
            { name: 'twitter:title', content: title },
            { name: 'twitter:description', content: description },
            { name: 'twitter:image', content: seoConfig.defaultImage },
            ...(page.noIndex ? [{ name: 'robots', content: 'noindex,nofollow' }] : [])
        ],
        link: [
            { rel: 'canonical', href: url }
        ]
    };
};

// ============= SEO COMPONENT =============
// Ready-to-use SEO component for Pages Router
import Head from 'next/head';

export const SEO = ({ pageKey }) => {
    const headProps = getHeadProps(pageKey);

    if (!headProps.title) return null;

    return (
        <Head>
            <title>{headProps.title}</title>
            {headProps.meta.map((tag, i) => (
                <meta key={i} {...tag} />
            ))}
            {headProps.link.map((link, i) => (
                <link key={i} {...link} />
            ))}
        </Head>
    );
};

export default seoConfig;
