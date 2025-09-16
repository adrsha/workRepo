import HomePageClient from './HomePageClient';
import { getMetadata } from './seoConfig';
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
        title: 'Quizzes',
        desc: 'Test your knowledge with our quizzes',
        img: '/preparation.png',
        color: '--primary',
        route: '/quizzes',
    },
    {
        title: 'Games',
        desc: 'Try our interactive games to learn faster',
        img: '/game.png',
        color: '--secondary',
        route: '/games',
    },
    {
        title: 'Available classes and courses',
        desc: 'Join our online classes and courses',
        img: '/course.png',
        color: '--tertiary',
        route: '/',
    },
    {
        title: 'Our Valued Partners',
        desc: 'Check out all of our values partners',
        img: '/partners.png',
        color: '--quaternary',
        route: '/partners',
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
