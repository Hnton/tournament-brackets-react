import { Player, Match } from '../types';
import { shuffleArray, generateRandomScores, isBye } from '../utils';

/**
 * Generate a single elimination tournament bracket with automatic BYE placement
 */
export const generateSingleElim = (players: Player[]): Match[] => {
    // Shuffle players
    const shuffled = shuffleArray(players);

    // Calculate bracket size (next power of 2)
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(players.length)));
    const numByes = bracketSize - players.length;

    // Create BYE players
    const byePlayer: Player = { name: 'BYE', phone: '' };

    // Create bracket ensuring BYEs never face each other
    const bracketPlayers: (Player | null)[] = new Array(bracketSize).fill(null);

    // First place all real players
    for (let i = 0; i < shuffled.length; i++) {
        bracketPlayers[i] = shuffled[i]!;
    }

    // Then strategically place BYEs so they never face each other
    // BYEs should be placed in positions where they face real players
    const availablePositions: number[] = [];
    for (let i = shuffled.length; i < bracketSize; i++) {
        availablePositions.push(i);
    }

    // Shuffle the available positions and place BYEs
    const shuffledPositions = shuffleArray(availablePositions);

    let byeCount = 0;
    for (const pos of shuffledPositions) {
        if (byeCount < numByes) {
            // Check if placing a BYE here would create a BYE vs BYE match
            const pairIndex = pos % 2 === 0 ? pos + 1 : pos - 1;
            const wouldFaceBye = pairIndex < bracketSize && bracketPlayers[pairIndex]?.name === 'BYE';

            if (!wouldFaceBye) {
                bracketPlayers[pos] = byePlayer;
                byeCount++;
            }
        }
    }

    // If we still need to place BYEs and couldn't avoid BYE vs BYE matches,
    // we need to rearrange players to make room
    if (byeCount < numByes) {
        // Reset and use a different approach: pair each BYE with a real player
        const realPlayers = [...shuffled];
        const finalBracket: (Player | null)[] = new Array(bracketSize).fill(null);

        // Randomly select positions for BYE matches (ensuring they're in odd positions)
        const byeMatchPositions: number[] = [];
        const availableSlots = Math.floor(bracketSize / 2); // Number of matches in first round

        // Create array of match indices and shuffle
        const matchIndices = Array.from({ length: availableSlots }, (_, i) => i);
        const shuffledIndices = shuffleArray(matchIndices);

        // Take the first numByes match positions for BYE matches
        for (let i = 0; i < numByes; i++) {
            byeMatchPositions.push(shuffledIndices[i]!);
        }

        // Place players and BYEs
        let playerIndex = 0;
        for (let matchIdx = 0; matchIdx < availableSlots; matchIdx++) {
            const pos1 = matchIdx * 2;
            const pos2 = matchIdx * 2 + 1;

            if (byeMatchPositions.includes(matchIdx)) {
                // This is a BYE match - place one real player and one BYE
                finalBracket[pos1] = realPlayers[playerIndex++] || null;
                finalBracket[pos2] = byePlayer;
            } else {
                // Regular match with two real players
                finalBracket[pos1] = realPlayers[playerIndex++] || null;
                finalBracket[pos2] = realPlayers[playerIndex++] || null;
            }
        }

        // Copy the final arrangement
        for (let i = 0; i < finalBracket.length; i++) {
            bracketPlayers[i] = finalBracket[i] || null;
        }
    }

    // Generate rounds
    const rounds: (Player | null)[][] = [];
    let current: (Player | null)[] = bracketPlayers;
    rounds.push(current);

    while (current.length > 1) {
        const next: (Player | null)[] = [];
        for (let i = 0; i < current.length; i += 2) {
            next.push(null);
        }
        rounds.push(next);
        current = next;
    }

    // Create matches with BYEs only in first round
    let matchId = 1;
    const matches: Match[] = [];

    for (let r = 0; r < rounds.length - 1; r++) {
        const roundPlayers = rounds[r];
        if (!roundPlayers) continue;

        for (let i = 0; i < roundPlayers.length; i += 2) {
            const player1 = roundPlayers[i] || null;
            const player2 = roundPlayers[i + 1] || null;

            // Check for BYE matches (should only happen in first round)
            let winner: Player | null = null;
            if (r === 0) { // First round only
                if (player1?.name === 'BYE' && player2?.name === 'BYE') {
                    // This should never happen with our new logic, but handle it just in case
                    console.error('ERROR: Two BYEs matched against each other!');
                    winner = null; // No winner for BYE vs BYE
                } else if (player1?.name === 'BYE') {
                    winner = player2;
                } else if (player2?.name === 'BYE') {
                    winner = player1;
                }

                // Ensure no BYE ever advances beyond first round
                if (winner?.name === 'BYE') {
                    console.error('ERROR: BYE attempting to advance to next round!');
                    winner = null;
                }
            }

            const match: Match = {
                id: matchId++,
                round: r + 1,
                player1,
                player2,
                winner,
            };

            matches.push(match);

            // Auto-advance winner for BYE matches (first round only)
            if (winner && r === 0 && r + 1 < rounds.length - 1) {
                const nextRoundPlayers = rounds[r + 1];
                if (nextRoundPlayers) {
                    const nextSlot = Math.floor(i / 2);
                    nextRoundPlayers[nextSlot] = winner;
                }
            }
        }
    }
    return matches;
};

/**
 * Generate a demo tournament with some completed matches
 */
export const generateDemoTournament = (players: Player[]): Match[] => {
    const demoMatches = generateSingleElim(players);

    // Simulate some completed matches to show bracket progression
    let completedMatches = demoMatches.map(match => {
        // Complete all first round matches
        if (match.round === 1 && match.player1 && match.player2 &&
            !isBye(match.player1) && !isBye(match.player2)) {
            // Randomly determine winner with scores
            const { score1, score2 } = generateRandomScores();
            const winner = score1 > score2 ? match.player1 : match.player2;

            return {
                ...match,
                score1,
                score2,
                winner
            };
        }
        return match;
    });

    // Advance winners to next round
    let updatedMatches = [...completedMatches];
    completedMatches.forEach(match => {
        if (match.winner && match.round < Math.max(...demoMatches.map(m => m.round))) {
            const nextRoundMatches = updatedMatches.filter(m => m.round === match.round + 1);
            const nextMatchIndex = Math.floor((match.id - 1) / 2) % nextRoundMatches.length;
            const nextMatch = nextRoundMatches[nextMatchIndex];

            if (nextMatch) {
                const isFirstSlot = ((match.id - 1) % 2) === 0;
                updatedMatches = updatedMatches.map(m => {
                    if (m.id === nextMatch.id) {
                        return {
                            ...m,
                            player1: isFirstSlot ? (match.winner || null) : (m.player1 || null),
                            player2: !isFirstSlot ? (match.winner || null) : (m.player2 || null)
                        };
                    }
                    return m;
                });
            }
        }
    });

    // Complete some second round matches too for better demo
    const maxRound = Math.max(...updatedMatches.map(m => m.round));
    if (maxRound >= 2) {
        const secondRoundMatches = updatedMatches.filter(m => m.round === 2 && m.player1 && m.player2);
        // Complete first semifinal match
        if (secondRoundMatches.length > 0) {
            const firstSemi = secondRoundMatches[0];
            if (firstSemi) {
                const { score1, score2 } = generateRandomScores();
                const winner = score1 > score2 ? firstSemi.player1 : firstSemi.player2;

                updatedMatches = updatedMatches.map(m =>
                    m.id === firstSemi.id ? { ...m, score1, score2, winner } : m
                );

                // Advance winner to final
                if (winner && maxRound >= 3) {
                    const finalMatches = updatedMatches.filter(m => m.round === 3);
                    if (finalMatches.length > 0) {
                        const finalMatch = finalMatches[0];
                        if (finalMatch) {
                            updatedMatches = updatedMatches.map(m =>
                                m.id === finalMatch.id ? { ...m, player1: winner || null } : m
                            );
                        }
                    }
                }
            }
        }
    }

    return updatedMatches;
};

/**
 * Update matches after a score is submitted
 */
export const updateMatchWithScore = (
    matches: Match[],
    updatedMatch: Match,
    onTournamentComplete?: (isComplete: boolean) => void
): Match[] => {
    const originalMatch = matches.find(m => m.id === updatedMatch.id);
    if (!originalMatch) return matches;

    let newMatches = [...matches];

    // Update the match itself (ensure table property is cleared if match is completed)
    const matchUpdate = updatedMatch.winner ? { ...updatedMatch, table: undefined } : updatedMatch;
    newMatches = newMatches.map(m => m.id === updatedMatch.id ? matchUpdate : m);

    // If this is an edit of a completed match, we need to handle cascade effects
    const maxRound = Math.max(...newMatches.map(m => m.round));
    if (originalMatch.winner && originalMatch.round < maxRound) {
        // Only clear the specific path affected by the old winner, not all subsequent rounds
        const clearAffectedPath = (matchId: number, currentRound: number) => {
            if (currentRound >= maxRound) return;

            const thisRoundMatches = newMatches.filter(m => m.round === currentRound);
            const thisMatchIndex = thisRoundMatches.findIndex(m => m.id === matchId);
            const nextRoundMatches = newMatches.filter(m => m.round === currentRound + 1);
            const nextMatchIndex = Math.floor(thisMatchIndex / 2);
            const nextMatch = nextRoundMatches[nextMatchIndex];

            if (nextMatch) {
                // Determine if this match's winner was in slot 1 or 2 of the next match
                const isFirstSlot = (thisMatchIndex % 2) === 0;
                const wasInNextMatch = isFirstSlot ?
                    (nextMatch.player1 && nextMatch.player1.name === originalMatch.winner?.name) :
                    (nextMatch.player2 && nextMatch.player2.name === originalMatch.winner?.name);

                if (wasInNextMatch) {
                    // Clear this player from the next match
                    const updatedNextMatch: Match = {
                        ...nextMatch,
                        player1: isFirstSlot ? null : nextMatch.player1,
                        player2: !isFirstSlot ? null : nextMatch.player2,
                        winner: null
                    };
                    // Remove scores if match no longer has a winner
                    delete updatedNextMatch.score1;
                    delete updatedNextMatch.score2;

                    newMatches = newMatches.map(m => m.id === nextMatch.id ? updatedNextMatch : m);

                    // Continue clearing the path if this match had a winner
                    if (nextMatch.winner) {
                        clearAffectedPath(nextMatch.id, currentRound + 1);
                    }
                }
            }
        };

        // Start clearing from the edited match
        clearAffectedPath(originalMatch.id, originalMatch.round);
    }

    // Now advance the new winner through the bracket (if there is one)
    if (updatedMatch.winner && updatedMatch.round < maxRound) {
        const advanceWinner = (matchId: number, winner: Player, currentRound: number) => {
            if (currentRound >= maxRound) return;

            const thisRoundMatches = newMatches.filter(m => m.round === currentRound);
            const thisMatchIndex = thisRoundMatches.findIndex(m => m.id === matchId);
            const nextRoundMatches = newMatches.filter(m => m.round === currentRound + 1);
            const nextMatchIndex = Math.floor(thisMatchIndex / 2);
            const nextMatch = nextRoundMatches[nextMatchIndex];

            if (nextMatch) {
                const isFirstSlot = (thisMatchIndex % 2) === 0;
                const updatedNextMatch = {
                    ...nextMatch,
                    player1: isFirstSlot ? winner : nextMatch.player1,
                    player2: !isFirstSlot ? winner : nextMatch.player2,
                };
                newMatches = newMatches.map(m => m.id === nextMatch.id ? updatedNextMatch : m);
            }
        };

        advanceWinner(updatedMatch.id, updatedMatch.winner, updatedMatch.round);
    }

    // Check if tournament is complete
    if (updatedMatch.winner && updatedMatch.round === maxRound) {
        onTournamentComplete?.(true);
    } else {
        // Check if tournament was complete but now isn't (due to editing)
        const finalMatch = newMatches.find(m => m.round === maxRound);
        if (!finalMatch?.winner) {
            onTournamentComplete?.(false);
        }
    }

    return newMatches;
};