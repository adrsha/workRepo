// /app/games/[game]/page.js - Individual game page
import GameDetailsClient from './GameDetailsClient';
import { getMetadata } from '@/app/seoConfig';
import '../../global.css';
import styles from '../../../styles/Game.module.css';

export const metadata = getMetadata('game');

export default function GameDetailsPage({ params }) {
    const gameId = params.game;

    return (
        <div className={styles.container}>
            <GameDetailsClient gameId={gameId} />
        </div>
    );
}
