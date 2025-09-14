import { Player } from '../types';

/**
 * Get the default name for a table based on its number
 * Table 1 = "Stream", others are "Table X" where X is tableNumber - 1
 */
export const getDefaultTableName = (tableNumber: number): string => {
    return tableNumber === 1 ? 'Stream' : `Table ${tableNumber - 1}`;
};

/**
 * Check if a player is a BYE player
 */
export const isBye = (player: Player | null): boolean => {
    return player ? player.name.toLowerCase().includes('bye') : false;
};

/**
 * Generate demo players for testing
 */
export const generateDemoPlayers = (): Player[] => {
    return [
        { name: 'Alice Johnson', phone: '555-0101' },
        { name: 'Bob Smith', phone: '555-0102' },
        { name: 'Carol Davis', phone: '555-0103' },
        { name: 'David Wilson', phone: '555-0104' },
        { name: 'Emma Brown', phone: '555-0105' },
        { name: 'Frank Miller', phone: '555-0106' },
        { name: 'Grace Taylor', phone: '555-0107' },
        { name: 'Henry Clark', phone: '555-0108' },
        { name: 'Alsa Clark', phone: '555-0109' }
    ];
};

/**
 * Shuffle an array using Fisher-Yates algorithm
 */
export const shuffleArray = <T>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }
    return shuffled;
};

/**
 * Generate random score between 1 and 3, ensuring no ties
 */
export const generateRandomScores = (): { score1: number; score2: number } => {
    const score1 = Math.floor(Math.random() * 3) + 1;
    let score2 = Math.floor(Math.random() * 3) + 1;

    // Prevent ties
    if (score1 === score2) {
        score2 = score1 + 1;
    }

    return { score1, score2 };
};