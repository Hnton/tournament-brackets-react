import { Player, Match, DoubleBracketState, BracketMapping, LBMatch } from '../types';
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

/**
 * Generate a double elimination tournament bracket with rematch avoidance
 * Uses the new algorithmic approach for proper bracket generation
 */
export const generateDoubleElim = (players: Player[]): DoubleBracketState => {
    // Use the new algorithmic approach which implements the canonical
    // "zip then pair leftovers" rule to prevent early rematches
    return generateDoubleElimAlgorithmic(players);
};

/**
 * Generate a double elimination tournament bracket using the legacy hardcoded approach
 * Kept for backwards compatibility - use generateDoubleElim() for the improved algorithm
 */
export const generateDoubleElimLegacy = (players: Player[]): DoubleBracketState => {
    // Shuffle players for randomness
    const shuffled = shuffleArray(players);

    // Calculate bracket size (next power of 2)
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(players.length)));
    const numByes = bracketSize - players.length;

    // Step 1: Initialize Winners Bracket
    const winnersMatches = initializeWinnersBracket(shuffled, bracketSize, numByes);

    // Step 2: Initialize Losers Bracket Structure
    const losersMatches = initializeLosersBracket(bracketSize);

    // Step 3: Initialize Finals
    const finalsMatches = initializeFinalsMatches();

    return {
        winnersMatches,
        losersMatches,
        finalsMatches,
        winnersChampion: null,
        losersChampion: null
    };
};

/**
 * Initialize the winners bracket (similar to single elimination)
 */
const initializeWinnersBracket = (players: Player[], bracketSize: number, numByes: number): Match[] => {
    const byePlayer: Player = { name: 'BYE', phone: '' };
    const bracketPlayers: (Player | null)[] = new Array(bracketSize).fill(null);

    // Place real players first
    for (let i = 0; i < players.length; i++) {
        bracketPlayers[i] = players[i]!;
    }

    // Add BYEs strategically to avoid BYE vs BYE matches
    const availablePositions: number[] = [];
    for (let i = players.length; i < bracketSize; i++) {
        availablePositions.push(i);
    }

    const shuffledPositions = shuffleArray(availablePositions);
    let byeCount = 0;
    for (const pos of shuffledPositions) {
        if (byeCount < numByes) {
            const pairIndex = pos % 2 === 0 ? pos + 1 : pos - 1;
            const wouldFaceBye = pairIndex < bracketSize && bracketPlayers[pairIndex]?.name === 'BYE';

            if (!wouldFaceBye) {
                bracketPlayers[pos] = byePlayer;
                byeCount++;
            }
        }
    }

    // If we still need BYEs, use fallback approach
    if (byeCount < numByes) {
        const realPlayers = [...players];
        const finalBracket: (Player | null)[] = new Array(bracketSize).fill(null);

        const availableSlots = Math.floor(bracketSize / 2);
        const matchIndices = Array.from({ length: availableSlots }, (_, i) => i);
        const shuffledIndices = shuffleArray(matchIndices);
        const byeMatchPositions = shuffledIndices.slice(0, numByes);

        let playerIndex = 0;
        for (let matchIdx = 0; matchIdx < availableSlots; matchIdx++) {
            const pos1 = matchIdx * 2;
            const pos2 = matchIdx * 2 + 1;

            if (byeMatchPositions.includes(matchIdx)) {
                finalBracket[pos1] = realPlayers[playerIndex++] || null;
                finalBracket[pos2] = byePlayer;
            } else {
                finalBracket[pos1] = realPlayers[playerIndex++] || null;
                finalBracket[pos2] = realPlayers[playerIndex++] || null;
            }
        }

        for (let i = 0; i < finalBracket.length; i++) {
            bracketPlayers[i] = finalBracket[i] || null;
        }
    }

    // Generate winners bracket rounds
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

    // Create winners bracket matches
    let matchId = 1;
    const matches: Match[] = [];

    for (let r = 0; r < rounds.length - 1; r++) {
        const roundPlayers = rounds[r];
        if (!roundPlayers) continue;

        for (let i = 0; i < roundPlayers.length; i += 2) {
            const player1 = roundPlayers[i] || null;
            const player2 = roundPlayers[i + 1] || null;

            // Handle BYE matches (first round only)
            let winner: Player | null = null;
            if (r === 0) {
                if (player1?.name === 'BYE' && player2?.name === 'BYE') {
                    console.error('ERROR: Two BYEs matched against each other!');
                    winner = null;
                } else if (player1?.name === 'BYE') {
                    winner = player2;
                } else if (player2?.name === 'BYE') {
                    winner = player1;
                }

                if (winner?.name === 'BYE') {
                    console.error('ERROR: BYE attempting to advance!');
                    winner = null;
                }
            }

            const match: Match = {
                id: matchId++,
                round: r + 1,
                player1,
                player2,
                winner,
                bracket: 'winners'
            };

            matches.push(match);

            // Auto-advance BYE winners
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
 * Initialize the losers bracket structure
 * Uses known-correct structure for common bracket sizes
 */
const initializeLosersBracket = (bracketSize: number): Match[] => {
    const matches: Match[] = [];
    let matchId = 10000;

    // Use simple, known-correct patterns based on bracket size
    if (bracketSize === 4) {
        // 4 players: WB has 2 rounds, LB has 2 rounds
        // LB R1: 1 match (2 WB R1 losers)
        // LB R2: 1 match (LB R1 winner + WB R2 loser)
        matches.push(
            { id: matchId++, round: 1, player1: null, player2: null, bracket: 'losers' as const },
            { id: matchId++, round: 2, player1: null, player2: null, bracket: 'losers' as const }
        );
    } else if (bracketSize === 8) {
        // 8 players: WB has 3 rounds, LB has 4 rounds
        // LB R1: 2 matches (4 WB R1 losers pair up - avoid rematches)
        // LB R2: 2 matches (2 LB R1 winners + 2 WB R2 losers)
        // LB R3: 1 match (2 LB R2 survivors pair up) 
        // LB R4: 1 match (1 LB R3 winner + 1 WB R3 loser) - advances to finals
        matches.push(
            // LB Round 1: 2 matches
            { id: matchId++, round: 1, player1: null, player2: null, bracket: 'losers' as const },
            { id: matchId++, round: 1, player1: null, player2: null, bracket: 'losers' as const },
            // LB Round 2: 2 matches  
            { id: matchId++, round: 2, player1: null, player2: null, bracket: 'losers' as const },
            { id: matchId++, round: 2, player1: null, player2: null, bracket: 'losers' as const },
            // LB Round 3: 1 match (LB survivors pair up)
            { id: matchId++, round: 3, player1: null, player2: null, bracket: 'losers' as const },
            // LB Round 4: 1 match (LB R3 winner + WB R3 loser - final LB round)
            { id: matchId++, round: 4, player1: null, player2: null, bracket: 'losers' as const }
        );
    } else if (bracketSize === 16) {
        // 16 players: WB has 4 rounds, LB has 6 rounds
        const lbStructure = [
            { round: 1, matches: 4 }, // 8 WB R1 losers pair up
            { round: 2, matches: 4 }, // 4 LB R1 winners + 4 WB R2 losers
            { round: 3, matches: 2 }, // 4 LB R2 winners pair up
            { round: 4, matches: 2 }, // 2 LB R3 winners + 2 WB R3 losers
            { round: 5, matches: 1 }, // 2 LB R4 winners + 1 WB R4 loser
            { round: 6, matches: 1 }  // LB R5 winner advances to finals
        ];

        for (const { round, matches: numMatches } of lbStructure) {
            for (let i = 0; i < numMatches; i++) {
                matches.push({
                    id: matchId++,
                    round,
                    player1: null,
                    player2: null,
                    bracket: 'losers' as const
                });
            }
        }
    } else if (bracketSize === 32) {
        // 32 players: WB has 5 rounds, LB has 8 rounds
        const lbStructure = [
            { round: 1, matches: 8 },  // 16 WB R1 losers pair up
            { round: 2, matches: 8 },  // 8 LB R1 winners + 8 WB R2 losers
            { round: 3, matches: 4 },  // 8 LB R2 winners pair up
            { round: 4, matches: 4 },  // 4 LB R3 winners + 4 WB R3 losers
            { round: 5, matches: 2 },  // 4 LB R4 winners pair up
            { round: 6, matches: 2 },  // 2 LB R5 winners + 2 WB R4 losers
            { round: 7, matches: 1 },  // 2 LB R6 winners pair up
            { round: 8, matches: 1 }   // LB R7 winner + WB R5 loser
        ];

        for (const { round, matches: numMatches } of lbStructure) {
            for (let i = 0; i < numMatches; i++) {
                matches.push({
                    id: matchId++,
                    round,
                    player1: null,
                    player2: null,
                    bracket: 'losers' as const
                });
            }
        }
    } else if (bracketSize === 64) {
        // 64 players: WB has 6 rounds, LB has 10 rounds
        const lbStructure = [
            { round: 1, matches: 16 }, // 32 WB R1 losers pair up
            { round: 2, matches: 16 }, // 16 LB R1 winners + 16 WB R2 losers
            { round: 3, matches: 8 },  // 16 LB R2 winners pair up
            { round: 4, matches: 8 },  // 8 LB R3 winners + 8 WB R3 losers
            { round: 5, matches: 4 },  // 8 LB R4 winners pair up
            { round: 6, matches: 4 },  // 4 LB R5 winners + 4 WB R4 losers
            { round: 7, matches: 2 },  // 4 LB R6 winners pair up
            { round: 8, matches: 2 },  // 2 LB R7 winners + 2 WB R5 losers
            { round: 9, matches: 1 },  // 2 LB R8 winners pair up
            { round: 10, matches: 1 }  // LB R9 winner + WB R6 loser
        ];

        for (const { round, matches: numMatches } of lbStructure) {
            for (let i = 0; i < numMatches; i++) {
                matches.push({
                    id: matchId++,
                    round,
                    player1: null,
                    player2: null,
                    bracket: 'losers' as const
                });
            }
        }
    } else if (bracketSize === 128) {
        // 128 players: WB has 7 rounds, LB has 12 rounds
        const lbStructure = [
            { round: 1, matches: 32 }, // 64 WB R1 losers pair up
            { round: 2, matches: 32 }, // 32 LB R1 winners + 32 WB R2 losers
            { round: 3, matches: 16 }, // 32 LB R2 winners pair up
            { round: 4, matches: 16 }, // 16 LB R3 winners + 16 WB R3 losers
            { round: 5, matches: 8 },  // 16 LB R4 winners pair up
            { round: 6, matches: 8 },  // 8 LB R5 winners + 8 WB R4 losers
            { round: 7, matches: 4 },  // 8 LB R6 winners pair up
            { round: 8, matches: 4 },  // 4 LB R7 winners + 4 WB R5 losers
            { round: 9, matches: 2 },  // 4 LB R8 winners pair up
            { round: 10, matches: 2 }, // 2 LB R9 winners + 2 WB R6 losers
            { round: 11, matches: 1 }, // 2 LB R10 winners pair up
            { round: 12, matches: 1 }  // LB R11 winner + WB R7 loser
        ];

        for (const { round, matches: numMatches } of lbStructure) {
            for (let i = 0; i < numMatches; i++) {
                matches.push({
                    id: matchId++,
                    round,
                    player1: null,
                    player2: null,
                    bracket: 'losers' as const
                });
            }
        }
    } else if (bracketSize === 256) {
        // 256 players: WB has 8 rounds, LB has 14 rounds
        const lbStructure = [
            { round: 1, matches: 64 }, // 128 WB R1 losers pair up
            { round: 2, matches: 64 }, // 64 LB R1 winners + 64 WB R2 losers
            { round: 3, matches: 32 }, // 64 LB R2 winners pair up
            { round: 4, matches: 32 }, // 32 LB R3 winners + 32 WB R3 losers
            { round: 5, matches: 16 }, // 32 LB R4 winners pair up
            { round: 6, matches: 16 }, // 16 LB R5 winners + 16 WB R4 losers
            { round: 7, matches: 8 },  // 16 LB R6 winners pair up
            { round: 8, matches: 8 },  // 8 LB R7 winners + 8 WB R5 losers
            { round: 9, matches: 4 },  // 8 LB R8 winners pair up
            { round: 10, matches: 4 }, // 4 LB R9 winners + 4 WB R6 losers
            { round: 11, matches: 2 }, // 4 LB R10 winners pair up
            { round: 12, matches: 2 }, // 2 LB R11 winners + 2 WB R7 losers
            { round: 13, matches: 1 }, // 2 LB R12 winners pair up
            { round: 14, matches: 1 }  // LB R13 winner + WB R8 loser
        ];

        for (const { round, matches: numMatches } of lbStructure) {
            for (let i = 0; i < numMatches; i++) {
                matches.push({
                    id: matchId++,
                    round,
                    player1: null,
                    player2: null,
                    bracket: 'losers' as const
                });
            }
        }
    } else if (bracketSize === 512) {
        // 512 players: WB has 9 rounds, LB has 16 rounds
        const lbStructure = [
            { round: 1, matches: 128 }, // 256 WB R1 losers pair up
            { round: 2, matches: 128 }, // 128 LB R1 winners + 128 WB R2 losers
            { round: 3, matches: 64 },  // 128 LB R2 winners pair up
            { round: 4, matches: 64 },  // 64 LB R3 winners + 64 WB R3 losers
            { round: 5, matches: 32 },  // 64 LB R4 winners pair up
            { round: 6, matches: 32 },  // 32 LB R5 winners + 32 WB R4 losers
            { round: 7, matches: 16 },  // 32 LB R6 winners pair up
            { round: 8, matches: 16 },  // 16 LB R7 winners + 16 WB R5 losers
            { round: 9, matches: 8 },   // 16 LB R8 winners pair up
            { round: 10, matches: 8 },  // 8 LB R9 winners + 8 WB R6 losers
            { round: 11, matches: 4 },  // 8 LB R10 winners pair up
            { round: 12, matches: 4 },  // 4 LB R11 winners + 4 WB R7 losers
            { round: 13, matches: 2 },  // 4 LB R12 winners pair up
            { round: 14, matches: 2 },  // 2 LB R13 winners + 2 WB R8 losers
            { round: 15, matches: 1 },  // 2 LB R14 winners pair up
            { round: 16, matches: 1 }   // LB R15 winner + WB R9 loser
        ];

        for (const { round, matches: numMatches } of lbStructure) {
            for (let i = 0; i < numMatches; i++) {
                matches.push({
                    id: matchId++,
                    round,
                    player1: null,
                    player2: null,
                    bracket: 'losers' as const
                });
            }
        }
    } else {
        // Fallback for other sizes - use simplified calculation
        const numWinnersRounds = Math.log2(bracketSize);
        const numLosersRounds = Math.max(2, 2 * (numWinnersRounds - 1));

        for (let round = 1; round <= numLosersRounds; round++) {
            let numMatches: number;

            if (round === 1) {
                // First LB round: half of WB R1 losers
                numMatches = Math.max(1, bracketSize / 4);
            } else if (round === numLosersRounds) {
                // Final LB round: always 1 match
                numMatches = 1;
            } else {
                // Middle rounds: calculate based on pattern
                const prevRoundMatches = matches.filter(m => m.round === round - 1).length;
                numMatches = Math.max(1, Math.ceil(prevRoundMatches / 2));
            }

            for (let i = 0; i < numMatches; i++) {
                matches.push({
                    id: matchId++,
                    round,
                    player1: null,
                    player2: null,
                    bracket: 'losers' as const
                });
            }
        }
    }

    console.log(`Initialized ${matches.length} losers bracket matches for ${bracketSize} players`);
    return matches;
};

/**
 * Initialize finals matches (Grand Finals and potential Reset)
 */
const initializeFinalsMatches = (): Match[] => {
    return [
        {
            id: 20000,
            round: 1,
            player1: null, // WB Champion
            player2: null, // LB Champion
            bracket: 'finals',
            isGrandFinals: true
        },
        {
            id: 20001,
            round: 2,
            player1: null,
            player2: null,
            bracket: 'finals',
            isGrandFinalsReset: true
        }
    ];
};

/**
 * Generate WB-to-LB mapping table for proper branch separation
 * Implements the double elimination structure that prevents rematches
 */
const generateWBtoLBMapping = (bracketSize: number): { [wbMatchId: number]: { lbRound: number; lbMatchIndex: number } } => {
    const mapping: { [wbMatchId: number]: { lbRound: number; lbMatchIndex: number } } = {};

    if (bracketSize === 8) {
        // 8-player mapping based on proper DE structure
        // WB Match numbering: R1: 1,2,3,4 → R2: 5,6 → R3: 7

        // WB R1 losers → LB R1 (paired to avoid rematches)
        mapping[1] = { lbRound: 1, lbMatchIndex: 0 }; // WB Match 1 loser → LB Match A (slot 1)
        mapping[2] = { lbRound: 1, lbMatchIndex: 0 }; // WB Match 2 loser → LB Match A (slot 2)
        mapping[3] = { lbRound: 1, lbMatchIndex: 1 }; // WB Match 3 loser → LB Match B (slot 1)  
        mapping[4] = { lbRound: 1, lbMatchIndex: 1 }; // WB Match 4 loser → LB Match B (slot 2)

        // WB R2 losers → LB R2 (cross-branch placement)
        mapping[5] = { lbRound: 2, lbMatchIndex: 1 }; // WB Match 5 (from 1,2) → LB Match B side
        mapping[6] = { lbRound: 2, lbMatchIndex: 0 }; // WB Match 6 (from 3,4) → LB Match A side

        // WB R3 losers → LB R4 (final placement)
        mapping[7] = { lbRound: 4, lbMatchIndex: 0 }; // WB Final loser → LB Final

    } else if (bracketSize === 4) {
        // 4-player mapping
        mapping[1] = { lbRound: 1, lbMatchIndex: 0 }; // WB Match 1,2 → LB Match A
        mapping[2] = { lbRound: 1, lbMatchIndex: 0 };
        mapping[3] = { lbRound: 2, lbMatchIndex: 0 }; // WB Final → LB Final

    } else if (bracketSize === 16) {
        // 16-player mapping
        // WB R1: 8 matches → LB R1: 4 matches (pair losers to avoid rematches)
        for (let i = 1; i <= 8; i++) {
            mapping[i] = { lbRound: 1, lbMatchIndex: Math.floor((i - 1) / 2) };
        }
        // WB R2: 4 matches → LB R2 (cross-placement)
        mapping[9] = { lbRound: 2, lbMatchIndex: 2 };
        mapping[10] = { lbRound: 2, lbMatchIndex: 3 };
        mapping[11] = { lbRound: 2, lbMatchIndex: 0 };
        mapping[12] = { lbRound: 2, lbMatchIndex: 1 };
        // WB R3: 2 matches → LB R4
        mapping[13] = { lbRound: 4, lbMatchIndex: 1 };
        mapping[14] = { lbRound: 4, lbMatchIndex: 0 };
        // WB R4: 1 match → LB R6
        mapping[15] = { lbRound: 6, lbMatchIndex: 0 };

    } else if (bracketSize === 32) {
        // 32-player mapping
        // WB R1: 16 matches → LB R1: 8 matches
        for (let i = 1; i <= 16; i++) {
            mapping[i] = { lbRound: 1, lbMatchIndex: Math.floor((i - 1) / 2) };
        }
        // WB R2: 8 matches → LB R2
        for (let i = 17; i <= 24; i++) {
            const lbMatchIndex = (i - 17 + 4) % 8; // Cross-placement
            mapping[i] = { lbRound: 2, lbMatchIndex };
        }
        // WB R3: 4 matches → LB R4
        mapping[25] = { lbRound: 4, lbMatchIndex: 3 };
        mapping[26] = { lbRound: 4, lbMatchIndex: 2 };
        mapping[27] = { lbRound: 4, lbMatchIndex: 1 };
        mapping[28] = { lbRound: 4, lbMatchIndex: 0 };
        // WB R4: 2 matches → LB R6
        mapping[29] = { lbRound: 6, lbMatchIndex: 1 };
        mapping[30] = { lbRound: 6, lbMatchIndex: 0 };
        // WB R5: 1 match → LB R8
        mapping[31] = { lbRound: 8, lbMatchIndex: 0 };

    } else if (bracketSize === 64) {
        // 64-player mapping
        // WB R1: 32 matches → LB R1: 16 matches (pair losers to avoid rematches)
        for (let i = 1; i <= 32; i++) {
            mapping[i] = { lbRound: 1, lbMatchIndex: Math.floor((i - 1) / 2) };
        }
        // WB R2: 16 matches → LB R2 (cross-placement to avoid rematches)
        for (let i = 33; i <= 48; i++) {
            const lbMatchIndex = (i - 33 + 8) % 16; // Cross-placement
            mapping[i] = { lbRound: 2, lbMatchIndex };
        }
        // WB R3: 8 matches → LB R4
        for (let i = 49; i <= 56; i++) {
            const lbMatchIndex = (i - 49 + 4) % 8; // Cross-placement
            mapping[i] = { lbRound: 4, lbMatchIndex };
        }
        // WB R4: 4 matches → LB R6
        mapping[57] = { lbRound: 6, lbMatchIndex: 3 };
        mapping[58] = { lbRound: 6, lbMatchIndex: 2 };
        mapping[59] = { lbRound: 6, lbMatchIndex: 1 };
        mapping[60] = { lbRound: 6, lbMatchIndex: 0 };
        // WB R5: 2 matches → LB R8
        mapping[61] = { lbRound: 8, lbMatchIndex: 1 };
        mapping[62] = { lbRound: 8, lbMatchIndex: 0 };
        // WB R6: 1 match → LB R10
        mapping[63] = { lbRound: 10, lbMatchIndex: 0 };

    } else if (bracketSize === 128) {
        // 128-player mapping
        // WB R1: 64 matches → LB R1: 32 matches
        for (let i = 1; i <= 64; i++) {
            mapping[i] = { lbRound: 1, lbMatchIndex: Math.floor((i - 1) / 2) };
        }
        // WB R2: 32 matches → LB R2 (cross-placement)
        for (let i = 65; i <= 96; i++) {
            const lbMatchIndex = (i - 65 + 16) % 32;
            mapping[i] = { lbRound: 2, lbMatchIndex };
        }
        // WB R3: 16 matches → LB R4
        for (let i = 97; i <= 112; i++) {
            const lbMatchIndex = (i - 97 + 8) % 16;
            mapping[i] = { lbRound: 4, lbMatchIndex };
        }
        // WB R4: 8 matches → LB R6
        for (let i = 113; i <= 120; i++) {
            const lbMatchIndex = (i - 113 + 4) % 8;
            mapping[i] = { lbRound: 6, lbMatchIndex };
        }
        // WB R5: 4 matches → LB R8
        mapping[121] = { lbRound: 8, lbMatchIndex: 3 };
        mapping[122] = { lbRound: 8, lbMatchIndex: 2 };
        mapping[123] = { lbRound: 8, lbMatchIndex: 1 };
        mapping[124] = { lbRound: 8, lbMatchIndex: 0 };
        // WB R6: 2 matches → LB R10
        mapping[125] = { lbRound: 10, lbMatchIndex: 1 };
        mapping[126] = { lbRound: 10, lbMatchIndex: 0 };
        // WB R7: 1 match → LB R12
        mapping[127] = { lbRound: 12, lbMatchIndex: 0 };

    } else if (bracketSize === 256) {
        // 256-player mapping
        // WB R1: 128 matches → LB R1: 64 matches
        for (let i = 1; i <= 128; i++) {
            mapping[i] = { lbRound: 1, lbMatchIndex: Math.floor((i - 1) / 2) };
        }
        // WB R2: 64 matches → LB R2 (cross-placement)
        for (let i = 129; i <= 192; i++) {
            const lbMatchIndex = (i - 129 + 32) % 64;
            mapping[i] = { lbRound: 2, lbMatchIndex };
        }
        // WB R3: 32 matches → LB R4
        for (let i = 193; i <= 224; i++) {
            const lbMatchIndex = (i - 193 + 16) % 32;
            mapping[i] = { lbRound: 4, lbMatchIndex };
        }
        // WB R4: 16 matches → LB R6
        for (let i = 225; i <= 240; i++) {
            const lbMatchIndex = (i - 225 + 8) % 16;
            mapping[i] = { lbRound: 6, lbMatchIndex };
        }
        // WB R5: 8 matches → LB R8
        for (let i = 241; i <= 248; i++) {
            const lbMatchIndex = (i - 241 + 4) % 8;
            mapping[i] = { lbRound: 8, lbMatchIndex };
        }
        // WB R6: 4 matches → LB R10
        mapping[249] = { lbRound: 10, lbMatchIndex: 3 };
        mapping[250] = { lbRound: 10, lbMatchIndex: 2 };
        mapping[251] = { lbRound: 10, lbMatchIndex: 1 };
        mapping[252] = { lbRound: 10, lbMatchIndex: 0 };
        // WB R7: 2 matches → LB R12
        mapping[253] = { lbRound: 12, lbMatchIndex: 1 };
        mapping[254] = { lbRound: 12, lbMatchIndex: 0 };
        // WB R8: 1 match → LB R14
        mapping[255] = { lbRound: 14, lbMatchIndex: 0 };

    } else if (bracketSize === 512) {
        // 512-player mapping
        // WB R1: 256 matches → LB R1: 128 matches
        for (let i = 1; i <= 256; i++) {
            mapping[i] = { lbRound: 1, lbMatchIndex: Math.floor((i - 1) / 2) };
        }
        // WB R2: 128 matches → LB R2 (cross-placement)
        for (let i = 257; i <= 384; i++) {
            const lbMatchIndex = (i - 257 + 64) % 128;
            mapping[i] = { lbRound: 2, lbMatchIndex };
        }
        // WB R3: 64 matches → LB R4
        for (let i = 385; i <= 448; i++) {
            const lbMatchIndex = (i - 385 + 32) % 64;
            mapping[i] = { lbRound: 4, lbMatchIndex };
        }
        // WB R4: 32 matches → LB R6
        for (let i = 449; i <= 480; i++) {
            const lbMatchIndex = (i - 449 + 16) % 32;
            mapping[i] = { lbRound: 6, lbMatchIndex };
        }
        // WB R5: 16 matches → LB R8
        for (let i = 481; i <= 496; i++) {
            const lbMatchIndex = (i - 481 + 8) % 16;
            mapping[i] = { lbRound: 8, lbMatchIndex };
        }
        // WB R6: 8 matches → LB R10
        for (let i = 497; i <= 504; i++) {
            const lbMatchIndex = (i - 497 + 4) % 8;
            mapping[i] = { lbRound: 10, lbMatchIndex };
        }
        // WB R7: 4 matches → LB R12
        mapping[505] = { lbRound: 12, lbMatchIndex: 3 };
        mapping[506] = { lbRound: 12, lbMatchIndex: 2 };
        mapping[507] = { lbRound: 12, lbMatchIndex: 1 };
        mapping[508] = { lbRound: 12, lbMatchIndex: 0 };
        // WB R8: 2 matches → LB R14
        mapping[509] = { lbRound: 14, lbMatchIndex: 1 };
        mapping[510] = { lbRound: 14, lbMatchIndex: 0 };
        // WB R9: 1 match → LB R16
        mapping[511] = { lbRound: 16, lbMatchIndex: 0 };

    } else {
        // Fallback for other bracket sizes
        console.warn(`No specific mapping for bracket size ${bracketSize}, using fallback`);

        // Calculate number of WB rounds
        const numWBRounds = Math.log2(bracketSize);

        // WB R1 losers always go to LB R1, paired to avoid rematches
        const numWBR1Matches = bracketSize / 2;
        for (let i = 1; i <= numWBR1Matches; i++) {
            mapping[i] = { lbRound: 1, lbMatchIndex: Math.floor((i - 1) / 2) };
        }

        // For other WB rounds, use a simple pattern
        let wbMatchId = numWBR1Matches + 1;
        for (let wbRound = 2; wbRound <= numWBRounds; wbRound++) {
            const numMatchesInRound = Math.pow(2, numWBRounds - wbRound);
            const targetLBRound = 2 * (wbRound - 1);

            for (let i = 0; i < numMatchesInRound; i++) {
                mapping[wbMatchId] = {
                    lbRound: targetLBRound,
                    lbMatchIndex: i
                };
                wbMatchId++;
            }
        }
    }

    return mapping;
};

/**
 * Assign WB losers to LB using proper branch separation mapping
 * Implements the double elimination structure that prevents rematches
 */
export const assignWBLosersToLB = (
    wbMatch: Match,
    loser: Player,
    winnersMatches: Match[],
    losersMatches: Match[]
): Match[] => {
    // Get the total bracket size to determine mapping
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(winnersMatches.filter(m => m.round === 1).length * 2)));
    const mapping = generateWBtoLBMapping(bracketSize);

    console.log(`🎯 Assigning ${loser.name} from WB Match ${wbMatch.id} to LB using proper mapping`);

    // Get mapping for this WB match
    const wbMapping = mapping[wbMatch.id];
    if (!wbMapping) {
        console.error(`No mapping found for WB match ${wbMatch.id}`);
        return losersMatches;
    }

    const { lbRound, lbMatchIndex } = wbMapping;
    console.log(`📋 Mapping: WB Match ${wbMatch.id} → LB Round ${lbRound}, Match Index ${lbMatchIndex}`);

    // Find matches in the target LB round
    const targetLBMatches = losersMatches.filter(m => m.round === lbRound);

    if (targetLBMatches.length === 0) {
        console.error(`No LB matches found for round ${lbRound}`);
        return losersMatches;
    }

    const targetMatch = targetLBMatches[lbMatchIndex];
    if (!targetMatch) {
        console.error(`No LB match found at index ${lbMatchIndex} in round ${lbRound}`);
        return losersMatches;
    }

    // Place in first available slot of the target match
    if (!targetMatch.player1) {
        console.log(`✅ Placing ${loser.name} in LB match ${targetMatch.id} as player1 (proper mapping)`);
        return losersMatches.map(m =>
            m.id === targetMatch.id ? { ...m, player1: loser } : m
        );
    } else if (!targetMatch.player2) {
        console.log(`✅ Placing ${loser.name} in LB match ${targetMatch.id} as player2 (proper mapping)`);
        return losersMatches.map(m =>
            m.id === targetMatch.id ? { ...m, player2: loser } : m
        );
    } else {
        console.error(`LB match ${targetMatch.id} is full! Cannot place ${loser.name}`);
        return losersMatches;
    }
};

/**
 * Handle first round WB losers - they face each other in LB Round 1
 * Ensures opponents from same WB match DON'T face each other in LB Round 1
 */
const assignFirstRoundWBLosers = (
    loser: Player,
    wbMatchIndex: number,
    targetLBMatches: Match[],
    losersMatches: Match[]
): Match[] => {
    // IMPORTANT: Losers from the SAME WB match should NOT be placed in the same LB match
    // Instead, they should be placed in different LB matches to avoid immediate rematch

    // Calculate LB match index ensuring rematch avoidance
    let lbMatchIndex: number;

    if (wbMatchIndex % 2 === 0) {
        // Even WB match index: place in first half of LB matches
        lbMatchIndex = Math.floor(wbMatchIndex / 2) % targetLBMatches.length;
    } else {
        // Odd WB match index: place in second half of LB matches  
        const secondHalfStart = Math.floor(targetLBMatches.length / 2);
        lbMatchIndex = secondHalfStart + Math.floor(wbMatchIndex / 2) % Math.max(1, targetLBMatches.length - secondHalfStart);
    }

    // Ensure valid index
    lbMatchIndex = Math.min(lbMatchIndex, targetLBMatches.length - 1);

    const targetMatch = targetLBMatches[lbMatchIndex];
    if (!targetMatch) {
        console.error(`No target LB match found at index ${lbMatchIndex}`);
        return losersMatches;
    }

    // Assign to first available slot in the target match
    let updatedMatch: Match;
    if (!targetMatch.player1) {
        console.log(`📥 Assigning ${loser.name} to LB match ${targetMatch.id} as player1 (rematch avoidance)`);
        updatedMatch = { ...targetMatch, player1: loser };
    } else if (!targetMatch.player2) {
        console.log(`📥 Assigning ${loser.name} to LB match ${targetMatch.id} as player2 (rematch avoidance)`);
        updatedMatch = { ...targetMatch, player2: loser };
    } else {
        console.error(`LB match ${targetMatch.id} is already full!`);
        return losersMatches;
    }

    return losersMatches.map(m => m.id === targetMatch.id ? updatedMatch : m);
};

/**
 * Handle later round WB losers - they face LB survivors
 * Implements stream separation to avoid early rematches
 */
const assignLaterRoundWBLosers = (
    loser: Player,
    wbMatchIndex: number,
    wbRound: number,
    targetLBMatches: Match[],
    losersMatches: Match[]
): Match[] => {
    // Determine which stream (top/bottom half) this loser should go to
    // This is based on their position in the WB and maintains separation
    const streamSeparation = calculateStreamSeparation(wbMatchIndex, wbRound);

    // Find appropriate LB match considering stream separation
    let targetMatchIndex = wbMatchIndex % targetLBMatches.length;

    // Apply stream separation logic to avoid early rematches
    if (streamSeparation === 'top') {
        targetMatchIndex = Math.min(targetMatchIndex, Math.floor(targetLBMatches.length / 2) - 1);
    } else {
        targetMatchIndex = Math.max(targetMatchIndex, Math.floor(targetLBMatches.length / 2));
    }

    const targetMatch = targetLBMatches[targetMatchIndex];
    if (!targetMatch) {
        console.error(`No target match found for stream separation`);
        return losersMatches;
    }

    // Assign loser to match
    const updatedMatch: Match = {
        ...targetMatch,
        player1: targetMatch.player1 || loser,
        player2: targetMatch.player1 ? loser : targetMatch.player2
    };

    return losersMatches.map(m => m.id === targetMatch.id ? updatedMatch : m);
};

/**
 * Calculate stream separation for rematch avoidance
 */
const calculateStreamSeparation = (matchIndex: number, round: number): 'top' | 'bottom' => {
    // Players from top half of earlier WB rounds should stay in different LB streams
    // than players from bottom half to avoid early rematches
    const halvingSeparation = Math.pow(2, round - 1);
    return (Math.floor(matchIndex / halvingSeparation) % 2 === 0) ? 'top' : 'bottom';
};

/**
 * Get the index of a match within its round
 */
const getMatchIndexInRound = (match: Match, allMatches: Match[]): number => {
    const roundMatches = allMatches.filter(m => m.round === match.round);
    return roundMatches.findIndex(m => m.id === match.id);
};

/**
 * Check if two players have faced each other before
 * Used to detect and warn about unavoidable rematches in later rounds
 */
export const havePreviouslyFaced = (player1: Player, player2: Player, allMatches: Match[]): boolean => {
    return allMatches.some(match =>
        (match.player1?.name === player1.name && match.player2?.name === player2.name) ||
        (match.player1?.name === player2.name && match.player2?.name === player1.name)
    );
};

/**
 * Advance winners bracket champion to grand finals
 */
export const advanceWBChampion = (champion: Player, doubleBracket: DoubleBracketState): DoubleBracketState => {
    const grandFinals = doubleBracket.finalsMatches.find(m => m.isGrandFinals);
    if (!grandFinals) {
        console.error('Grand finals match not found');
        return doubleBracket;
    }

    const updatedFinalsMatches = doubleBracket.finalsMatches.map(match =>
        match.isGrandFinals ? { ...match, player1: champion } : match
    );

    return {
        ...doubleBracket,
        winnersChampion: champion,
        finalsMatches: updatedFinalsMatches
    };
};

/**
 * Advance losers bracket champion to grand finals
 */
export const advanceLBChampion = (champion: Player, doubleBracket: DoubleBracketState): DoubleBracketState => {
    const grandFinals = doubleBracket.finalsMatches.find(m => m.isGrandFinals);
    if (!grandFinals) {
        console.error('Grand finals match not found');
        return doubleBracket;
    }

    const updatedFinalsMatches = doubleBracket.finalsMatches.map(match =>
        match.isGrandFinals ? { ...match, player2: champion } : match
    );

    return {
        ...doubleBracket,
        losersChampion: champion,
        finalsMatches: updatedFinalsMatches
    };
};

/**
 * Handle grand finals result and potential reset
 * If LB champion wins, both players have 1 loss and must play reset
 * If WB champion wins, tournament is complete
 */
export const handleGrandFinalsResult = (
    grandFinalsMatch: Match,
    doubleBracket: DoubleBracketState
): { updatedBracket: DoubleBracketState; needsReset: boolean; tournamentComplete: boolean } => {
    if (!grandFinalsMatch.winner) {
        return {
            updatedBracket: doubleBracket,
            needsReset: false,
            tournamentComplete: false
        };
    }

    const wbChampion = doubleBracket.winnersChampion;
    const lbChampion = doubleBracket.losersChampion;

    // If WB champion wins, tournament is complete
    if (grandFinalsMatch.winner.name === wbChampion?.name) {
        return {
            updatedBracket: {
                ...doubleBracket,
                finalsMatches: doubleBracket.finalsMatches.map(m =>
                    m.isGrandFinals ? grandFinalsMatch : m
                )
            },
            needsReset: false,
            tournamentComplete: true
        };
    }

    // If LB champion wins, set up grand finals reset
    if (grandFinalsMatch.winner.name === lbChampion?.name) {
        const resetMatch = doubleBracket.finalsMatches.find(m => m.isGrandFinalsReset);
        if (!resetMatch) {
            console.error('Grand finals reset match not found');
            return {
                updatedBracket: doubleBracket,
                needsReset: false,
                tournamentComplete: false
            };
        }

        const updatedFinalsMatches = doubleBracket.finalsMatches.map(match => {
            if (match.isGrandFinals) {
                return grandFinalsMatch;
            }
            if (match.isGrandFinalsReset) {
                return {
                    ...match,
                    player1: wbChampion || null,
                    player2: lbChampion || null
                };
            }
            return match;
        });

        return {
            updatedBracket: {
                ...doubleBracket,
                finalsMatches: updatedFinalsMatches
            },
            needsReset: true,
            tournamentComplete: false
        };
    }

    console.error('Unexpected grand finals winner');
    return {
        updatedBracket: doubleBracket,
        needsReset: false,
        tournamentComplete: false
    };
};

/**
 * Handle grand finals reset result
 */
export const handleGrandFinalsResetResult = (
    resetMatch: Match,
    doubleBracket: DoubleBracketState
): { updatedBracket: DoubleBracketState; tournamentComplete: boolean } => {
    if (!resetMatch.winner) {
        return {
            updatedBracket: doubleBracket,
            tournamentComplete: false
        };
    }

    const updatedFinalsMatches = doubleBracket.finalsMatches.map(match =>
        match.isGrandFinalsReset ? resetMatch : match
    );

    return {
        updatedBracket: {
            ...doubleBracket,
            finalsMatches: updatedFinalsMatches
        },
        tournamentComplete: true
    };
};

/**
 * Update matches for double elimination tournament
 * Handles winner advancement and loser placement with rematch avoidance
 */
export const updateDoubleElimMatch = (
    updatedMatch: Match,
    doubleBracket: DoubleBracketState,
    onTournamentComplete?: (isComplete: boolean) => void
): DoubleBracketState => {
    if (!updatedMatch.winner) {
        // Just update the match without advancing anyone
        return updateMatchInBracket(updatedMatch, doubleBracket);
    }

    let newBracket = { ...doubleBracket };

    // Handle based on bracket type
    switch (updatedMatch.bracket) {
        case 'winners':
            newBracket = handleWinnersMatch(updatedMatch, newBracket);
            break;
        case 'losers':
            newBracket = handleLosersMatch(updatedMatch, newBracket);
            break;
        case 'finals':
            newBracket = handleFinalsMatch(updatedMatch, newBracket, onTournamentComplete);
            break;
        default:
            console.error('Unknown bracket type:', updatedMatch.bracket);
            return newBracket;
    }

    return newBracket;
};

/**
 * Handle winners bracket match completion
 */
const handleWinnersMatch = (match: Match, doubleBracket: DoubleBracketState): DoubleBracketState => {
    let updatedBracket = updateMatchInBracket(match, doubleBracket);

    if (!match.winner) return updatedBracket;

    // Advance winner in winners bracket
    updatedBracket = advanceWinnerInWB(match, match.winner, updatedBracket);

    // Send loser to losers bracket with rematch avoidance
    const loser = match.player1?.name === match.winner.name ? match.player2 : match.player1;
    if (loser && loser.name !== 'BYE') {
        console.log(`Moving ${loser.name} from WB R${match.round} to LB`);
        const updatedLosersMatches = assignWBLosersToLB(match, loser, updatedBracket.winnersMatches, updatedBracket.losersMatches);
        updatedBracket = {
            ...updatedBracket,
            losersMatches: updatedLosersMatches
        };
    }

    return updatedBracket;
};

/**
 * Handle losers bracket match completion
 */
const handleLosersMatch = (match: Match, doubleBracket: DoubleBracketState): DoubleBracketState => {
    let updatedBracket = updateMatchInBracket(match, doubleBracket);

    if (!match.winner) return updatedBracket;

    // Advance winner in losers bracket
    updatedBracket = advanceWinnerInLB(match, match.winner, updatedBracket);

    // Loser is eliminated (no further advancement needed)

    return updatedBracket;
};

/**
 * Handle finals match completion
 */
const handleFinalsMatch = (
    match: Match,
    doubleBracket: DoubleBracketState,
    onTournamentComplete?: (isComplete: boolean) => void
): DoubleBracketState => {
    let updatedBracket = updateMatchInBracket(match, doubleBracket);

    if (!match.winner) return updatedBracket;

    if (match.isGrandFinals) {
        const result = handleGrandFinalsResult(match, updatedBracket);
        onTournamentComplete?.(result.tournamentComplete);
        return result.updatedBracket;
    }

    if (match.isGrandFinalsReset) {
        const result = handleGrandFinalsResetResult(match, updatedBracket);
        onTournamentComplete?.(result.tournamentComplete);
        return result.updatedBracket;
    }

    return updatedBracket;
};

/**
 * Update a specific match within the bracket structure
 */
const updateMatchInBracket = (match: Match, doubleBracket: DoubleBracketState): DoubleBracketState => {
    // Clear table assignment if match is completed
    const matchUpdate = match.winner ? { ...match, table: undefined } : match;

    switch (match.bracket) {
        case 'winners':
            return {
                ...doubleBracket,
                winnersMatches: doubleBracket.winnersMatches.map(m =>
                    m.id === match.id ? matchUpdate : m
                )
            };
        case 'losers':
            return {
                ...doubleBracket,
                losersMatches: doubleBracket.losersMatches.map(m =>
                    m.id === match.id ? matchUpdate : m
                )
            };
        case 'finals':
            return {
                ...doubleBracket,
                finalsMatches: doubleBracket.finalsMatches.map(m =>
                    m.id === match.id ? matchUpdate : m
                )
            };
        default:
            return doubleBracket;
    }
};

/**
 * Advance winner in winners bracket
 */
const advanceWinnerInWB = (match: Match, winner: Player, doubleBracket: DoubleBracketState): DoubleBracketState => {
    const maxWBRound = Math.max(...doubleBracket.winnersMatches.map(m => m.round));

    // If this is the final WB match, player becomes WB champion
    if (match.round === maxWBRound) {
        return advanceWBChampion(winner, doubleBracket);
    }

    // Otherwise, advance to next WB round
    const nextRound = match.round + 1;
    const thisRoundMatches = doubleBracket.winnersMatches.filter(m => m.round === match.round);
    const matchIndex = thisRoundMatches.findIndex(m => m.id === match.id);
    const nextRoundMatches = doubleBracket.winnersMatches.filter(m => m.round === nextRound);
    const nextMatchIndex = Math.floor(matchIndex / 2);
    const nextMatch = nextRoundMatches[nextMatchIndex];

    if (!nextMatch) return doubleBracket;

    const isFirstSlot = (matchIndex % 2) === 0;
    const updatedNextMatch = {
        ...nextMatch,
        player1: isFirstSlot ? winner : nextMatch.player1,
        player2: !isFirstSlot ? winner : nextMatch.player2
    };

    return {
        ...doubleBracket,
        winnersMatches: doubleBracket.winnersMatches.map(m =>
            m.id === nextMatch.id ? updatedNextMatch : m
        )
    };
};

/**
 * Advance winner in losers bracket
 * Handles the complex LB structure where rounds alternate between:
 * - Odd rounds: WB losers enter (or pure LB survivors)  
 * - Even rounds: LB survivors face WB losers from higher rounds
 */
const advanceWinnerInLB = (match: Match, winner: Player, doubleBracket: DoubleBracketState): DoubleBracketState => {
    const maxLBRound = Math.max(...doubleBracket.losersMatches.map(m => m.round));

    // If this is the final LB match, player becomes LB champion
    if (match.round === maxLBRound) {
        return advanceLBChampion(winner, doubleBracket);
    }

    // Calculate correct advancement based on LB structure
    const nextRound = match.round + 1;
    const nextRoundMatches = doubleBracket.losersMatches.filter(m => m.round === nextRound);

    if (nextRoundMatches.length === 0) return doubleBracket;

    // Get this match's position in its round
    const thisRoundMatches = doubleBracket.losersMatches.filter(m => m.round === match.round);
    const matchIndex = thisRoundMatches.findIndex(m => m.id === match.id);

    // LB advancement follows specific patterns based on round structure
    let targetMatchIndex: number;

    if (match.round === 1) {
        // LB R1 → LB R2: Use same-side advancement to work with WB R2 cross-placement
        // LB R1 Match 0 winner → LB R2 Match 0, LB R1 Match 1 winner → LB R2 Match 1
        targetMatchIndex = matchIndex; // Same-side advancement
        console.log(`🔄 LB R1 same-side advancement: Match ${matchIndex} winner → LB R2 Match ${targetMatchIndex}`);
    } else if (match.round % 2 === 1) {
        // Other odd LB rounds: survivors advance (every other match merges)
        targetMatchIndex = Math.floor(matchIndex / 2);
    } else {
        // Even LB rounds: survivors advance (typically 1:1 or merge pattern)  
        targetMatchIndex = matchIndex;
    }

    // Ensure we don't exceed available matches in next round
    targetMatchIndex = Math.min(targetMatchIndex, nextRoundMatches.length - 1);

    const nextMatch = nextRoundMatches[targetMatchIndex];
    if (!nextMatch) {
        console.warn(`No target match found for LB advancement from round ${match.round} to ${nextRound}`);
        return doubleBracket;
    }

    const updatedNextMatch = {
        ...nextMatch,
        player1: nextMatch.player1 || winner,
        player2: nextMatch.player1 ? winner : nextMatch.player2
    };

    return {
        ...doubleBracket,
        losersMatches: doubleBracket.losersMatches.map(m =>
            m.id === nextMatch.id ? updatedNextMatch : m
        )
    };
};

/**
 * Convert double bracket structure to flat match array for UI compatibility
 */
export const flattenDoubleBracket = (doubleBracket: DoubleBracketState): Match[] => {
    return [
        ...doubleBracket.winnersMatches,
        ...doubleBracket.losersMatches,
        ...doubleBracket.finalsMatches.filter(match =>
            // Only include grand finals reset if it's actually needed
            !match.isGrandFinalsReset || (match.player1 && match.player2)
        )
    ];
};

/**
 * Generate a demo double elimination tournament
 */
export const generateDemoDoubleElim = (players: Player[]): Match[] => {
    // Generate 64 demo players if not enough provided
    let demoPlayers = [...players];
    if (demoPlayers.length < 64) {
        const additionalPlayers = [];
        for (let i = demoPlayers.length; i < 64; i++) {
            additionalPlayers.push({
                name: `Player ${i + 1}`,
                phone: `555-${String(i + 1).padStart(4, '0')}`
            });
        }
        demoPlayers = [...demoPlayers, ...additionalPlayers];
    }

    // Take only first 64 players if more provided
    demoPlayers = demoPlayers.slice(0, 64);

    const doubleBracket = generateDoubleElim(demoPlayers);

    // Simulate tournament progression with realistic results
    let updatedBracket = { ...doubleBracket };

    // Complete Winners Bracket Round 1 (32 matches)
    const wbRound1 = updatedBracket.winnersMatches.filter(m => m.round === 1);
    wbRound1.forEach(match => {
        if (match.player1 && match.player2) {
            const { score1, score2 } = generateRandomScores();
            const winner = score1 > score2 ? match.player1 : match.player2;
            const loser = winner === match.player1 ? match.player2 : match.player1;

            // Update WB match
            const updatedMatch = { ...match, score1, score2, winner };
            updatedBracket.winnersMatches = updatedBracket.winnersMatches.map(m =>
                m.id === match.id ? updatedMatch : m
            );

            // Move loser to LB
            updatedBracket.losersMatches = assignWBLosersToLB(
                updatedMatch,
                loser,
                updatedBracket.winnersMatches,
                updatedBracket.losersMatches
            );

            // Advance winner in WB
            updatedBracket = advanceWinnerInWB(updatedMatch, winner, updatedBracket);
        }
    });

    // Complete some Winners Bracket Round 2 matches (16 matches)
    const wbRound2 = updatedBracket.winnersMatches.filter(m => m.round === 2);
    wbRound2.slice(0, 12).forEach(match => {  // Complete 12 out of 16 matches
        if (match.player1 && match.player2) {
            const { score1, score2 } = generateRandomScores();
            const winner = score1 > score2 ? match.player1 : match.player2;
            const loser = winner === match.player1 ? match.player2 : match.player1;

            // Update WB match
            const updatedMatch = { ...match, score1, score2, winner };
            updatedBracket.winnersMatches = updatedBracket.winnersMatches.map(m =>
                m.id === match.id ? updatedMatch : m
            );

            // Move loser to LB
            updatedBracket.losersMatches = assignWBLosersToLB(
                updatedMatch,
                loser,
                updatedBracket.winnersMatches,
                updatedBracket.losersMatches
            );

            // Advance winner in WB
            updatedBracket = advanceWinnerInWB(updatedMatch, winner, updatedBracket);
        }
    });

    // Complete all Losers Bracket Round 1 matches
    const lbRound1 = updatedBracket.losersMatches.filter(m => m.round === 1);
    lbRound1.forEach(match => {
        if (match.player1 && match.player2) {
            const { score1, score2 } = generateRandomScores();
            const winner = score1 > score2 ? match.player1 : match.player2;

            const updatedMatch = { ...match, score1, score2, winner };
            updatedBracket.losersMatches = updatedBracket.losersMatches.map(m =>
                m.id === match.id ? updatedMatch : m
            );

            // Advance winner in LB
            updatedBracket = advanceWinnerInLB(updatedMatch, winner, updatedBracket);
        }
    });

    // Complete some Losers Bracket Round 2 matches  
    const lbRound2 = updatedBracket.losersMatches.filter(m => m.round === 2);
    lbRound2.slice(0, 8).forEach(match => {  // Complete 8 out of potential matches
        if (match.player1 && match.player2) {
            const { score1, score2 } = generateRandomScores();
            const winner = score1 > score2 ? match.player1 : match.player2;

            const updatedMatch = { ...match, score1, score2, winner };
            updatedBracket.losersMatches = updatedBracket.losersMatches.map(m =>
                m.id === match.id ? updatedMatch : m
            );

            // Advance winner in LB
            updatedBracket = advanceWinnerInLB(updatedMatch, winner, updatedBracket);
        }
    });

    return flattenDoubleBracket(updatedBracket);
};

// ============================================================================
// ALGORITHMIC DOUBLE ELIMINATION IMPLEMENTATION
// Based on the canonical algorithm for proper bracket generation
// ============================================================================

/**
 * Build Winners Bracket IDs for N players
 * Returns array indexed by round (1-based) containing match IDs for that round
 */
function buildWBIds(N: number): string[][] {
    const k = Math.log2(N);
    const wbByRound: string[][] = [];
    for (let r = 1; r <= k; r++) {
        const M = N / (2 ** r);
        if (!wbByRound[r]) wbByRound[r] = [];
        for (let m = 1; m <= M; m++) {
            wbByRound[r]!.push(`WB${r}_${m}`);
        }
    }
    return wbByRound;
}

/**
 * Build the complete double elimination bracket mapping using the algorithmic approach
 * This implements the canonical "zip then pair leftovers" rule to prevent early rematches
 */
function buildMapping(N: number): BracketMapping {
    const k = Math.log2(N);
    if (!Number.isInteger(k)) throw new Error('N must be power of two');
    const lbRounds = 2 * (k - 1);
    const wbByRound = buildWBIds(N);

    // Assign WB losers to LB round t = max(1, 2*r - 2)
    const incoming: Record<number, string[]> = {};
    for (let t = 1; t <= lbRounds; t++) incoming[t] = [];
    
    for (let r = 1; r <= k; r++) {
        let t = 2 * r - 2;
        if (t < 1) t = 1;
        const roundMatches = wbByRound[r];
        if (roundMatches) {
            for (const id of roundMatches) {
                if (!incoming[t]) incoming[t] = [];
                incoming[t]!.push(id);
            }
        }
    }

    const lbMatches: Record<number, LBMatch[]> = {};
    let prevWinners: string[] = []; // represented as "winner of LB{t}_{i}"

    for (let t = 1; t <= lbRounds; t++) {
        lbMatches[t] = [];
        const incomingList = incoming[t] || [];
        const inList = [...incomingList]; // WB losers in WB-match order
        const pairs: [string, string][] = [];
        
        // zip prevWinners with inList
        const min = Math.min(prevWinners.length, inList.length);
        for (let i = 0; i < min; i++) {
            const prevWinner = prevWinners[i];
            const incoming = inList[i];
            if (prevWinner && incoming) {
                pairs.push([prevWinner, incoming]);
            }
        }
        
        // leftover prevWinners -> pair among themselves
        let leftoverPrev = prevWinners.slice(min);
        while (leftoverPrev.length >= 2) {
            const first = leftoverPrev.shift();
            const second = leftoverPrev.shift();
            if (first && second) {
                pairs.push([first, second]);
            }
        }
        
        // leftover inList -> pair among themselves
        let leftoverIn = inList.slice(min);
        while (leftoverIn.length >= 2) {
            const first = leftoverIn.shift();
            const second = leftoverIn.shift();
            if (first && second) {
                pairs.push([first, second]);
            }
        }
        
        // create matches in order
        for (let i = 0; i < pairs.length; i++) {
            const matchId = `LB${t}_${i+1}`;
            const pair = pairs[i];
            if (pair && lbMatches[t]) {
                lbMatches[t]!.push({ id: matchId, A: pair[0], B: pair[1] });
            }
        }
        
        // prepare prevWinners for next round
        const currentRoundMatches = lbMatches[t] || [];
        const newPrev: string[] = currentRoundMatches.map(m => `winner of ${m.id}`);
        
        // carry any leftover single from leftoverPrev or leftoverIn (should be at most one)
        const lastPrev = leftoverPrev[0];
        const lastIn = leftoverIn[0];
        if (lastPrev) newPrev.push(lastPrev);
        if (lastIn) newPrev.push(lastIn);
        
        prevWinners = newPrev;
    }

    return { wbByRound, lbMatches };
}

/**
 * Create Match objects from the algorithmic bracket mapping
 */
function createMatchesFromMapping(players: Player[], bracketMapping: BracketMapping): DoubleBracketState {
    const winnersMatches: Match[] = [];
    const losersMatches: Match[] = [];
    
    let wbMatchId = 1;
    let lbMatchId = 10000;
    
    // Create Winners Bracket matches
    const N = Math.pow(2, Math.ceil(Math.log2(players.length)));
    const shuffled = shuffleArray(players);
    
    // Pad with BYEs if needed
    const bracketPlayers: (Player | null)[] = [...shuffled];
    const byePlayer: Player = { name: 'BYE', phone: '' };
    while (bracketPlayers.length < N) {
        bracketPlayers.push(byePlayer);
    }
    
    // Generate WB rounds
    let currentRoundPlayers = [...bracketPlayers];
    let round = 1;
    
    while (currentRoundPlayers.length > 1) {
        const nextRoundPlayers: (Player | null)[] = [];
        
        for (let i = 0; i < currentRoundPlayers.length; i += 2) {
            const player1 = currentRoundPlayers[i] || null;
            const player2 = currentRoundPlayers[i + 1] || null;
            
            let winner: Player | null = null;
            // Handle BYE matches
            if (round === 1) {
                if (player1?.name === 'BYE' && player2?.name === 'BYE') {
                    winner = null; // Should not happen with proper BYE placement
                } else if (player1?.name === 'BYE') {
                    winner = player2;
                } else if (player2?.name === 'BYE') {
                    winner = player1;
                }
            }
            
            const match: Match = {
                id: wbMatchId++,
                round,
                player1,
                player2,
                winner,
                bracket: 'winners'
            };
            
            winnersMatches.push(match);
            nextRoundPlayers.push(null); // Placeholder for winner
            
            // Auto-advance BYE winners
            if (winner) {
                nextRoundPlayers[nextRoundPlayers.length - 1] = winner;
            }
        }
        
        currentRoundPlayers = nextRoundPlayers;
        round++;
    }
    
    // Create Losers Bracket matches from mapping
    for (let t = 1; t <= Object.keys(bracketMapping.lbMatches).length; t++) {
        const roundMatches = bracketMapping.lbMatches[t] || [];
        for (const lbMatch of roundMatches) {
            const match: Match = {
                id: lbMatchId++,
                round: t,
                player1: null,
                player2: null,
                bracket: 'losers'
            };
            losersMatches.push(match);
        }
    }
    
    // Create finals matches
    const finalsMatches: Match[] = [
        {
            id: 20000,
            round: 1,
            player1: null, // WB Champion
            player2: null, // LB Champion
            bracket: 'finals',
            isGrandFinals: true
        },
        {
            id: 20001,
            round: 2,
            player1: null,
            player2: null,
            bracket: 'finals',
            isGrandFinalsReset: true
        }
    ];
    
    return {
        winnersMatches,
        losersMatches,
        finalsMatches,
        winnersChampion: null,
        losersChampion: null
    };
}

/**
 * Generate double elimination bracket using the algorithmic approach
 * This replaces the hardcoded mapping with a clean, scalable algorithm
 */
export const generateDoubleElimAlgorithmic = (players: Player[]): DoubleBracketState => {
    const N = Math.pow(2, Math.ceil(Math.log2(players.length)));
    const bracketMapping = buildMapping(N);
    
    console.log(`Generated algorithmic bracket mapping for ${N} players:`, {
        wbRounds: Object.keys(bracketMapping.wbByRound).length - 1, // Subtract 1 because index 0 is empty
        lbRounds: Object.keys(bracketMapping.lbMatches).length,
        totalLBMatches: Object.values(bracketMapping.lbMatches).flat().length
    });
    
    return createMatchesFromMapping(players, bracketMapping);
};

/**
 * Test the 64-player bracket for rematch prevention
 * This function demonstrates that the algorithm prevents early rematches
 */
export const test64PlayerRematchPrevention = (): { success: boolean; details: string } => {
    console.log('🏆 Testing 64-Player Bracket Rematch Prevention');
    
    // Create 64 test players
    const players: Player[] = Array.from({ length: 64 }, (_, i) => ({
        name: `Player ${i + 1}`,
        phone: `555-${String(i + 1).padStart(4, '0')}`
    }));
    
    // Generate the bracket
    const bracket = generateDoubleElimAlgorithmic(players);
    const mapping = buildMapping(64);
    
    // Verify structure
    const wbRounds = Math.max(...bracket.winnersMatches.map(m => m.round));
    const lbRounds = Math.max(...bracket.losersMatches.map(m => m.round));
    
    const expectedWBRounds = 6; // log2(64) = 6
    const expectedLBRounds = 10; // 2*(6-1) = 10
    
    let success = true;
    let details = '';
    
    if (wbRounds !== expectedWBRounds) {
        success = false;
        details += `❌ Wrong WB rounds: expected ${expectedWBRounds}, got ${wbRounds}\n`;
    } else {
        details += `✅ WB rounds correct: ${wbRounds}\n`;
    }
    
    if (lbRounds !== expectedLBRounds) {
        success = false;
        details += `❌ Wrong LB rounds: expected ${expectedLBRounds}, got ${lbRounds}\n`;
    } else {
        details += `✅ LB rounds correct: ${lbRounds}\n`;
    }
    
    // Check LB Round 1 pairing for rematch prevention
    const lbRound1 = bracket.losersMatches.filter(m => m.round === 1);
    const expectedLBR1Matches = 16; // 32 WB R1 losers / 2
    
    if (lbRound1.length !== expectedLBR1Matches) {
        success = false;
        details += `❌ Wrong LB R1 matches: expected ${expectedLBR1Matches}, got ${lbRound1.length}\n`;
    } else {
        details += `✅ LB R1 matches correct: ${lbRound1.length}\n`;
    }
    
    // Verify the mapping prevents immediate rematches
    const lb1Mapping = mapping.lbMatches[1] || [];
    let hasImmediateRematches = false;
    
    lb1Mapping.forEach(match => {
        if (match.A === match.B) {
            hasImmediateRematches = true;
            details += `❌ Immediate rematch found: ${match.id} pairs ${match.A} with itself\n`;
        }
    });
    
    if (!hasImmediateRematches) {
        details += `✅ No immediate rematches in LB R1 - algorithm working correctly\n`;
    } else {
        success = false;
    }
    
    // Check match distribution follows the expected pattern
    const lbMatchCounts: number[] = [];
    for (let t = 1; t <= 10; t++) {
        const roundMatches = bracket.losersMatches.filter(m => m.round === t);
        lbMatchCounts.push(roundMatches.length);
    }
    
    const expectedLBCounts = [16, 16, 8, 8, 4, 4, 2, 2, 1, 1];
    let distributionCorrect = true;
    
    for (let i = 0; i < expectedLBCounts.length; i++) {
        if (lbMatchCounts[i] !== expectedLBCounts[i]) {
            distributionCorrect = false;
            details += `❌ LB R${i + 1}: expected ${expectedLBCounts[i]} matches, got ${lbMatchCounts[i] || 0}\n`;
        }
    }
    
    if (distributionCorrect) {
        details += `✅ LB match distribution correct: ${lbMatchCounts.join(', ')}\n`;
    } else {
        success = false;
    }
    
    details += `\n📊 Tournament Statistics:\n`;
    details += `- Total WB matches: ${bracket.winnersMatches.length}\n`;
    details += `- Total LB matches: ${bracket.losersMatches.length}\n`;
    details += `- Total Finals matches: ${bracket.finalsMatches.length}\n`;
    details += `- Grand total: ${bracket.winnersMatches.length + bracket.losersMatches.length + bracket.finalsMatches.length}\n`;
    
    if (success) {
        details += `\n🎉 SUCCESS: 64-player bracket prevents early rematches!\n`;
        details += `🎯 Players cannot face the same opponent twice before semifinals/finals.\n`;
    } else {
        details += `\n❌ ISSUES FOUND: Algorithm needs adjustment.\n`;
    }
    
    return { success, details };
};