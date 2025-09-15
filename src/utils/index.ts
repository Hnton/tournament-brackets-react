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
 * Convert internal round/group identifiers into a user-friendly label
 * Supports Winners Bracket (WB), Losers Bracket (LB) and Finals mapping.
 * allMatches should include the full tournament matches when available for correct LB numbering.
 */
export const getUserFriendlyRoundNumber = (match: any, allMatches?: any[]): string => {
    if (!match) return '';

    if (match.group_id === 1) {
        return `WB Round ${match.round_id}`;
    }

    if (match.group_id === 2) {
        const tournamentMatches = allMatches || [];
        const allLBMatches = tournamentMatches.filter(m => m.group_id === 2);
        const uniqueRoundIds = [...new Set(allLBMatches.map(m => m.round_id))].sort((a, b) => a - b);
        const lbRoundNumber = uniqueRoundIds.indexOf(match.round_id) + 1;
        return lbRoundNumber > 0 ? `LB Round ${lbRoundNumber}` : `LB Round ${match.round_id}`;
    }

    return 'Finals';
};

