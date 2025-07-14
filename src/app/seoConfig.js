export const seoConfig = {
    baseUrl: 'https://merotuition.com',
    siteName: 'MeroTuition',
    siteTagline: 'Nepal\'s Leading Online Learning Platform',
    defaultImage: '/opengraph-image.png', // Using Next.js default location
    twitterHandle: '@merotuition',
    locale: 'en_US',
    
    pages: {
        home: {
            title: 'Best Online Learning Management System in Nepal | MeroTuition',
            description: 'MeroTuition offers comprehensive online education in Nepal. Join courses, preparation classes, language learning, and connect with expert teachers. Start learning today!',
            keywords: 'online, learning, management, system, nepal, merotuition, online education Nepal, online class, online courses Nepal, online classes Nepal, digital learning Nepal',
            ogType: 'website',
            priority: 1.0,
            changefreq: 'weekly',
            breadcrumb: [
                { name: 'Home', url: '/' }
            ]
        },

        aboutus: {
            title: 'About MeroTuition - Nepal\'s Premier Online Learning Platform',
            description: 'Learn about MeroTuition\'s mission to provide quality online education in Nepal. Discover our story, values, and commitment to student success through innovative learning management system.',
            keywords: 'about MeroTuition, online education Nepal, e-learning platform Nepal, educational technology Nepal',
            ogType: 'website',
            priority: 0.8,
            changefreq: 'monthly',
            breadcrumb: [
                { name: 'Home', url: '/' },
                { name: 'About Us', url: '/about' }
            ]
        },

        contactus: {
            title: 'Contact MeroTuition - Get Help with Online Learning',
            description: 'Get in touch with MeroTuition for any questions about our courses, teachers, or platform. We\'re here to help you start your learning journey.',
            keywords: 'contact MeroTuition, online learning support Nepal, customer service Nepal',
            ogType: 'website',
            priority: 0.6,
            changefreq: 'monthly',
            breadcrumb: [
                { name: 'Home', url: '/' },
                { name: 'Contact', url: '/contact' }
            ]
        },

        teachers: {
            title: 'Expert Teachers - Qualified Instructors at MeroTuition',
            description: 'Meet our qualified and experienced teachers who are passionate about helping students achieve their academic goals through personalized online learning.',
            keywords: 'online teachers Nepal, qualified instructors Nepal, expert tutors Nepal, online education professionals',
            ogType: 'website',
            priority: 0.9,
            changefreq: 'weekly',
            breadcrumb: [
                { name: 'Home', url: '/' },
                { name: 'Teachers', url: '/teachers' }
            ]
        },

        classes: {
            title: 'Live Online Classes - Interactive Learning Sessions | MeroTuition',
            description: 'Join live online classes with expert teachers. Interactive learning sessions designed to help you master subjects and achieve academic excellence.',
            keywords: 'live online classes Nepal, interactive learning Nepal, virtual classroom Nepal, online education sessions',
            ogType: 'website',
            priority: 0.9,
            changefreq: 'daily',
            breadcrumb: [
                { name: 'Home', url: '/' },
                { name: 'Classes', url: '/classes' }
            ]
        },
        
        courses: {
            title: 'Online Courses - Comprehensive Learning Programs | MeroTuition',
            description: 'Explore our wide range of online courses. Choose from a variety of subjects and levels to start your educational journey.',
            keywords: 'online courses Nepal, digital courses Nepal, e-learning courses Nepal, educational programs Nepal',
            ogType: 'website',
            priority: 0.9,
            changefreq: 'weekly',
            breadcrumb: [
                { name: 'Home', url: '/' },
                { name: 'Courses', url: '/courses' }
            ]
        },

        downloads: {
            title: 'Educational Downloads - Study Materials & Resources | MeroTuition',
            description: 'Access downloadable study materials, notes, practice papers, and educational resources to enhance your learning experience.',
            keywords: 'study materials Nepal, educational downloads Nepal, practice papers Nepal, learning resources Nepal',
            ogType: 'website',
            priority: 0.7,
            changefreq: 'weekly',
            breadcrumb: [
                { name: 'Home', url: '/' },
                { name: 'Downloads', url: '/downloads' }
            ]
        },

        login: {
            title: 'Student Login - Access Your Learning Dashboard | MeroTuition',
            description: 'Login to your MeroTuition account to access your courses, classes, and learning dashboard.',
            keywords: 'student login Nepal, online learning dashboard, MeroTuition account access',
            ogType: 'website',
            priority: 0.3,
            changefreq: 'never',
            noIndex: true,
            breadcrumb: [
                { name: 'Home', url: '/' },
                { name: 'Login', url: '/login' }
            ]
        },

        signup: {
            title: 'Sign Up for MeroTuition - Start Your Online Learning Journey',
            description: 'Create your MeroTuition account today! Join thousands of students learning online with expert teachers in Nepal.',
            keywords: 'sign up MeroTuition, create account Nepal, join online learning Nepal, student registration Nepal',
            ogType: 'website',
            priority: 0.8,
            changefreq: 'never',
            breadcrumb: [
                { name: 'Home', url: '/' },
                { name: 'Sign Up', url: '/signup' }
            ]
        },

        // Private pages with noIndex
        lmshome: { 
            title: 'Learning Dashboard - Your Personal Learning Space | MeroTuition', 
            noIndex: true,
            priority: 0.0,
            changefreq: 'never'
        },
        notifications: { 
            title: 'Notifications - Stay Updated | MeroTuition', 
            noIndex: true,
            priority: 0.0,
            changefreq: 'never'
        },
        settings: { 
            title: 'Account Settings - Manage Your Profile | MeroTuition', 
            noIndex: true,
            priority: 0.0,
            changefreq: 'never'
        },
        profile: { 
            title: 'Your Profile - Personal Information | MeroTuition', 
            noIndex: true,
            priority: 0.0,
            changefreq: 'never'
        }
    }
};

// Enhanced metadata generation for App Router
export const getMetadata = (pageKey, customData = {}) => {
    const page = seoConfig.pages[pageKey];
    if (!page) return {};

    const title = customData.title || page.title;
    const description = customData.description || page.description || `${page.title} - MeroTuition`;
    const keywords = customData.keywords || page.keywords;
    const ogImage = customData.image || seoConfig.defaultImage;
    const canonical = `${seoConfig.baseUrl}${customData.path || '/'}`;

    const metadata = {
        metadataBase: new URL(seoConfig.baseUrl),
        title,
        description,
        keywords,
        robots: page.noIndex ? 'noindex, nofollow' : 'index, follow',
        
        openGraph: {
            title,
            description,
            url: canonical,
            siteName: seoConfig.siteName,
            images: [
                {
                    url: ogImage,
                    width: 1200,
                    height: 630,
                    alt: title
                }
            ],
            locale: seoConfig.locale,
            type: page.ogType || 'website'
        },

        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [ogImage],
            creator: seoConfig.twitterHandle,
            site: seoConfig.twitterHandle
        },

        // Additional meta tags
        other: {
            'theme-color': '#3DB0B7',
            'apple-mobile-web-app-capable': 'yes',
            'apple-mobile-web-app-status-bar-style': 'default',
            'format-detection': 'telephone=no'
        }
    };

    // Add structured data for breadcrumbs
    if (page.breadcrumb) {
        metadata.other['application/ld+json'] = JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: page.breadcrumb.map((item, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                name: item.name,
                item: `${seoConfig.baseUrl}${item.url}`
            }))
        });
    }

    return metadata;
};

// Generate sitemap data for /app/sitemap.js
export const getSitemapData = () => {
    return Object.entries(seoConfig.pages)
        .filter(([key, page]) => !page.noIndex)
        .map(([key, page]) => ({
            url: `${seoConfig.baseUrl}${key === 'home' ? '' : `/${key}`}`,
            lastModified: new Date(),
            changeFrequency: page.changefreq || 'monthly',
            priority: page.priority || 0.5
        }));
};

// Generate robots.txt content for /app/robots.js
export const getRobotsData = () => {
    const disallowedPaths = Object.entries(seoConfig.pages)
        .filter(([key, page]) => page.noIndex)
        .map(([key]) => key === 'home' ? '/' : `/${key}`);

    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: disallowedPaths
            }
        ],
        sitemap: `${seoConfig.baseUrl}/sitemap.xml`
    };
};

// Legacy support for Pages Router
export const getHeadProps = (pageKey, customData = {}) => {
    const page = seoConfig.pages[pageKey];
    if (!page) return {};

    const title = customData.title || `${page.title} | ${seoConfig.siteName}`;
    const description = customData.description || page.description || `${page.title} - MeroTuition`;
    const keywords = customData.keywords || page.keywords;
    const ogImage = customData.image || seoConfig.defaultImage;
    const canonical = `${seoConfig.baseUrl}${customData.path || '/'}`;

    return {
        title,
        meta: [
            { name: 'description', content: description },
            { name: 'keywords', content: keywords },
            { name: 'viewport', content: 'width=device-width, initial-scale=1' },
            { name: 'robots', content: page.noIndex ? 'noindex, nofollow' : 'index, follow' },
            
            // Open Graph
            { property: 'og:type', content: page.ogType || 'website' },
            { property: 'og:title', content: title },
            { property: 'og:description', content: description },
            { property: 'og:image', content: ogImage },
            { property: 'og:url', content: canonical },
            { property: 'og:site_name', content: seoConfig.siteName },
            { property: 'og:locale', content: seoConfig.locale },
            
            // Twitter Cards
            { name: 'twitter:card', content: 'summary_large_image' },
            { name: 'twitter:title', content: title },
            { name: 'twitter:description', content: description },
            { name: 'twitter:image', content: ogImage },
            { name: 'twitter:creator', content: seoConfig.twitterHandle },
            { name: 'twitter:site', content: seoConfig.twitterHandle },
            
            // Additional
            { name: 'theme-color', content: '#3DB0B7' },
            { name: 'apple-mobile-web-app-capable', content: 'yes' },
            { name: 'format-detection', content: 'telephone=no' }
        ],
        link: [
            { rel: 'canonical', href: canonical }
        ]
    };
};

export default seoConfig;
