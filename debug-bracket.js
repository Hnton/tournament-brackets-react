// Quick test to understand double elimination structure
const players = ['A', 'B', 'C', 'D'];
const bracketSize = Math.pow(2, Math.ceil(Math.log2(players.length))); // 4
const numWBRounds = Math.ceil(Math.log2(bracketSize)); // 2
const numLBRounds = 2 * numWBRounds - 2; // 2

console.log('Players:', players.length);
console.log('Bracket size:', bracketSize);
console.log('WB rounds:', numWBRounds);
console.log('LB rounds:', numLBRounds);

console.log('\nWinner\'s Bracket:');
console.log('R1: A vs B, C vs D (2 matches)');
console.log('R2: Winner(AB) vs Winner(CD) (1 match)');

console.log('\nLoser\'s Bracket:');
console.log('R1: Loser(AB) vs Loser(CD) (1 match)');
console.log('R2: Winner(LB R1) vs Loser(WB R2) (1 match)');
console.log('Grand Final: Winner(LB R2) vs Winner(WB R2)');

// Test the mapping function
function getLoserMapping(wbRound, wbMatchIdx, numWBRounds) {
    if (wbRound === 1) {
        return {
            lbRound: 1,
            lbMatchIdx: Math.floor(wbMatchIdx / 2),
            slot: wbMatchIdx % 2 === 0 ? 'player1' : 'player2'
        };
    } else {
        const lbRound = (wbRound - 1) * 2;
        return {
            lbRound: lbRound,
            lbMatchIdx: wbMatchIdx,
            slot: 'player2'
        };
    }
}

console.log('\nLoser Mappings:');
console.log('WB R1 M0 (A loses):', getLoserMapping(1, 0, 2));
console.log('WB R1 M1 (C loses):', getLoserMapping(1, 1, 2));
console.log('WB R2 M0 (finalist loses):', getLoserMapping(2, 0, 2));