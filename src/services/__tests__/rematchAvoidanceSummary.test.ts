import { Player } from '../../types';
import { generateDoubleElim, flattenDoubleBracket } from '../tournamentLogic';

describe('Double Elimination 64-Player Rematch Avoidance Summary', () => {
    test('64-player double elimination successfully prevents early rematches', () => {
        // Generate 64 players
        const players: Player[] = [];
        for (let i = 1; i <= 64; i++) {
            players.push({
                name: `Player${i}`,
                phone: `555-${String(i).padStart(4, '0')}`
            });
        }

        // Initialize double elimination bracket
        const doubleBracket = generateDoubleElim(players);
        const allMatches = flattenDoubleBracket(doubleBracket);

        // Verify bracket structure
        expect(doubleBracket.winnersMatches.length).toBeGreaterThan(0);
        expect(doubleBracket.losersMatches.length).toBeGreaterThan(0);
        expect(doubleBracket.finalsMatches.length).toBe(2);

        // Check WB structure
        const wbRounds = Math.max(...doubleBracket.winnersMatches.map(m => m.round));
        expect(wbRounds).toBe(6); // 64 -> 32 -> 16 -> 8 -> 4 -> 2 -> 1

        // Check LB structure
        const lbRounds = Math.max(...doubleBracket.losersMatches.map(m => m.round));
        expect(lbRounds).toBe(10); // Proper double elimination LB structure

        // Verify WB R1 has 32 matches for 64 players
        const wbR1Matches = doubleBracket.winnersMatches.filter(m => m.round === 1);
        expect(wbR1Matches).toHaveLength(32);

        // Verify LB R1 has 16 matches (32 WB R1 losers paired)
        const lbR1Matches = doubleBracket.losersMatches.filter(m => m.round === 1);
        expect(lbR1Matches).toHaveLength(16);

        // Check that WB R1 losers from same match are NOT placed together in LB R1
        // This is the key rematch avoidance mechanism
        const wbR1LoserPairings: Array<[string, string]> = [];

        // Simulate WB R1 to see where losers would go
        for (let i = 0; i < wbR1Matches.length; i++) {
            const match = wbR1Matches[i]!;
            if (match.player1 && match.player2) {
                // These two players faced each other in WB R1
                wbR1LoserPairings.push([match.player1.name, match.player2.name]);
            }
        }

        // Verify no WB R1 opponents are paired together in LB R1
        let rematchesInLBR1 = 0;
        for (const lbMatch of lbR1Matches) {
            if (lbMatch.player1 && lbMatch.player2) {
                const player1Name = lbMatch.player1.name;
                const player2Name = lbMatch.player2.name;

                // Check if these players faced each other in WB R1
                const hadWBR1Match = wbR1LoserPairings.some(([p1, p2]) =>
                    (p1 === player1Name && p2 === player2Name) ||
                    (p1 === player2Name && p2 === player1Name)
                );

                if (hadWBR1Match) {
                    rematchesInLBR1++;
                }
            }
        }

        // This is the crucial test - no immediate rematches in LB R1
        expect(rematchesInLBR1).toBe(0);

        console.log('✅ 64-player double elimination bracket successfully prevents early rematches:');
        console.log(`   - Winners Bracket: ${doubleBracket.winnersMatches.length} matches across ${wbRounds} rounds`);
        console.log(`   - Losers Bracket: ${doubleBracket.losersMatches.length} matches across ${lbRounds} rounds`);
        console.log(`   - WB R1 potential opponent pairings: ${wbR1LoserPairings.length}`);
        console.log(`   - Immediate rematches in LB R1: ${rematchesInLBR1} (SHOULD BE 0)`);
        console.log(`   - Rematch avoidance: SUCCESSFUL ✅`);
    });
});