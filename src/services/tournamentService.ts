import { BracketsManager } from 'brackets-manager';
import { MemoryStorage } from './memoryStorage';
import { Player, Participant, Match, Stage, Group, Round, BracketsData, Tournament } from '../types';

class TournamentService {
    private manager: BracketsManager;
    private storage: MemoryStorage;
    private currentTournamentId: number = 1;

    constructor() {
        this.storage = new MemoryStorage();
        this.manager = new BracketsManager(this.storage);
    }

    /**
     * Create a new tournament with participants
     */
    async createTournament(
        players: Player[],
        bracketType: 'single_elimination' | 'double_elimination' = 'double_elimination',
        tournamentName?: string,
        options?: {
            description?: string;
            gameType?: string;
            trueDouble?: boolean;
            raceWinners?: number;
            raceLosers?: number;
        }
    ): Promise<BracketsData> {
        try {
            console.log('Creating tournament with players:', players);
            console.log('Bracket type:', bracketType);

            // Convert players to participants and pad to next power of 2
            const participantNames = players.map(p => p.name);

            // Calculate next power of 2
            const nextPowerOf2 = Math.pow(2, Math.ceil(Math.log2(Math.max(2, participantNames.length))));
            const byesNeeded = nextPowerOf2 - participantNames.length;

            console.log(`Players: ${participantNames.length}, Next power of 2: ${nextPowerOf2}, BYEs needed: ${byesNeeded}`);

            // Add BYE participants if needed
            const paddedParticipants: (string | null)[] = [...participantNames];
            for (let i = 0; i < byesNeeded; i++) {
                paddedParticipants.push(null); // null represents a BYE
            }

            console.log('Final participants (with BYEs):', paddedParticipants);

            // Create the tournament stage
            console.log('Creating stage...');
            const stageName = tournamentName ? `${tournamentName}` : 'Main Stage';
            const stageSettings: any = {
                grandFinal: bracketType === 'double_elimination' ? 'double' : 'none',
                balanceByes: true,
            };

            if (options) {
                if (options.trueDouble !== undefined) stageSettings.trueDouble = !!options.trueDouble;
                if (options.gameType) stageSettings.gameType = options.gameType;
                if (options.description) stageSettings.description = options.description;
                if (options.raceWinners) stageSettings.raceWinners = options.raceWinners;
                if (options.raceLosers) stageSettings.raceLosers = options.raceLosers;
            }

            await this.manager.create.stage({
                tournamentId: this.currentTournamentId,
                name: stageName,
                type: bracketType,
                seeding: paddedParticipants,
                settings: stageSettings
            });
            console.log('Stage created successfully');

            // Get all tournament data
            const data = await this.getTournamentData();
            console.log('Tournament data retrieved:', data);
            return data;
        } catch (error) {
            console.error('Error creating tournament:', error);
            if (error instanceof Error) {
                console.error('Error stack:', error.stack);

                // Provide more helpful error messages
                if (error.message.includes('power of two')) {
                    console.error('Power of 2 issue - this should have been handled. Players count:', players.length);
                }
            }
            throw error;
        }
    }

    /**
     * Get all tournament data
     */
    async getTournamentData(): Promise<BracketsData> {
        try {
            const [stages, groups, rounds, matches, matchGames, participants] = await Promise.all([
                this.storage.select('stage'),
                this.storage.select('group'),
                this.storage.select('round'),
                this.storage.select('match'),
                this.storage.select('match_game'),
                this.storage.select('participant')
            ]);

            return {
                stage: (stages as Stage[]) || [],
                group: (groups as Group[]) || [],
                round: (rounds as Round[]) || [],
                match: (matches as Match[]) || [],
                match_game: (matchGames as any[]) || [],
                participant: (participants as Participant[]) || []
            };
        } catch (error) {
            console.error('Error getting tournament data:', error);
            throw error;
        }
    }

    /**
     * Update match score
     */
    async updateMatch(
        matchId: number,
        opponent1Score?: number,
        opponent2Score?: number,
        opponent1Result?: 'win' | 'loss' | 'draw',
        opponent2Result?: 'win' | 'loss' | 'draw'
    ): Promise<void> {
        try {
            const updateData: any = {
                id: matchId,
                opponent1: {},
                opponent2: {}
            };

            if (opponent1Score !== undefined) {
                updateData.opponent1.score = opponent1Score;
            }
            if (opponent1Result) {
                updateData.opponent1.result = opponent1Result;
            }
            if (opponent2Score !== undefined) {
                updateData.opponent2.score = opponent2Score;
            }
            if (opponent2Result) {
                updateData.opponent2.result = opponent2Result;
            }

            await this.manager.update.match(updateData);
        } catch (error) {
            console.error('Error updating match:', error);
            throw error;
        }
    }

    /**
     * Get participants with their phone numbers (custom field)
     */
    async getParticipantsWithPhone(players: Player[]): Promise<Participant[]> {
        const participants = await this.storage.select('participant') as Participant[] || [];

        return participants.map((p: Participant) => ({
            ...p,
            phone: players.find(player => player.name === p.name)?.phone || ''
        }));
    }

    /**
     * Get seeding
     */
    async getSeeding(stageId: number): Promise<any[]> {
        try {
            return await this.manager.get.seeding(stageId);
        } catch (error) {
            console.error('Error getting seeding:', error);
            throw error;
        }
    }

    /**
     * Get final standings
     */
    async getFinalStandings(stageId: number): Promise<any[]> {
        try {
            return await this.manager.get.finalStandings(stageId);
        } catch (error) {
            console.error('Error getting final standings:', error);
            throw error;
        }
    }

    /**
     * Find next matches for a participant
     */
    async getNextMatches(participantId: number): Promise<any[]> {
        try {
            return await this.manager.find.nextMatches(participantId);
        } catch (error) {
            console.error('Error getting next matches:', error);
            throw error;
        }
    }

    /**
     * Check if tournament is complete
     */
    async isTournamentComplete(): Promise<boolean> {
        try {
            const matches = await this.storage.select('match') as Match[] || [];
            return matches.every((match: Match) =>
                match.status === 'completed' || match.status === 'archived'
            );
        } catch (error) {
            console.error('Error checking tournament completion:', error);
            return false;
        }
    }

    /**
     * Get matches by status
     */
    async getMatchesByStatus(status: 'waiting' | 'ready' | 'running' | 'completed'): Promise<Match[]> {
        try {
            const matches = await this.storage.select('match') as Match[] || [];
            return matches.filter((match: Match) => match.status === status);
        } catch (error) {
            console.error('Error getting matches by status:', error);
            throw error;
        }
    }

    /**
     * Get BracketsManager instance for advanced operations
     */
    getManager(): BracketsManager {
        return this.manager;
    }

    /**
     * Get storage instance for direct access
     */
    getStorage(): MemoryStorage {
        return this.storage;
    }
}

export default TournamentService;