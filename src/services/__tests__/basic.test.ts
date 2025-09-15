/**
 * Basic smoke tests to ensure the application builds and core functionality works
 */

describe('Tournament Brackets Application', () => {
    it('should have basic types defined', () => {
        // Import core types to ensure they compile
        const { Player, Match } = require('../../types');
        expect(typeof Player).toBeDefined();
        expect(typeof Match).toBeDefined();
    });

    it('should have tournament service available', () => {
        // Import tournament service to ensure it compiles
        const TournamentService = require('../tournamentService');
        expect(TournamentService).toBeDefined();
        expect(typeof TournamentService.default).toBeDefined();
    });

    it('should have utility functions available', () => {
        // Import utilities to ensure they compile
        const utils = require('../../utils');
        expect(utils.shuffleArray).toBeDefined();
        expect(utils.generateDemoPlayers).toBeDefined();
        expect(utils.isBye).toBeDefined();
    });
});