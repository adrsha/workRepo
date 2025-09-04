import HomePageClient from './HomePageClient';
import { getMetadata } from './seoConfig';
import { sendEmail } from './lib/email';
export const metadata = getMetadata('home');

// Feature data configuration
const FEATURE_SIDES_DATA = [
    {
        title: 'Course Classes',
        img: '/course.png',
        color: '--primary',
        route: '/classes',
    },
    {
        title: 'Preparation Classes',
        img: '/preparation.png',
        color: '--secondary',
        route: '/preparation',
    },
    {
        title: 'Language Classes',
        img: '/language.png',
        color: '--tertiary',
        route: '/language-classes',
    },
    {
        title: 'Other Classes',
        img: '/others.png',
        color: '--quaternary',
        route: '/other-classes',
    },
];

const FEATURES_DATA = [
    {
        title: 'Quizes',
        desc: 'Test your knowledge with our quizzes',
        img: '/course.png',
        color: '--primary',
        route: '/',
    },
    {
        title: 'Games',
        desc: 'Try our interactive games to learn faster',
        img: '/preparation.png',
        color: '--secondary',
        route: '/',
    },
    {
        title: 'Available classes and courses',
        desc: 'Join our online classes and courses',
        img: '/language.png',
        color: '--tertiary',
        route: '/',
    },
    {
        title: 'Available Teachers',
        desc: 'Check out all of our available Teachers',
        img: '/others.png',
        color: '--quaternary',
        route: '/',
    },
];

export default function HomePage() {
    return (
        <HomePageClient 
            featureSidesData={FEATURE_SIDES_DATA}
            featuresData={FEATURES_DATA}
        />
    );
}
