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

            // Convert players to participant seed names and pad to next power of 2
            // Disambiguation rules (per user):
            // If duplicate players share the same display name, choose the disambiguator for each player in this order:
            // 1) If group has different states -> show (state)
            // 2) Else if same state but different cities -> show (state, city)
            // 3) Else if same state & city but different effectiveRating -> show (state, city, effectiveRating)
            // 4) Else show (membershipId) if available
            // If disambiguator still doesn't make names unique, append numeric occurrence suffix (#n)
            const participantNames: string[] = [];
            const seedByIndex: string[] = [];

            const makeBase = (nameStr: string) => nameStr || '';

            // Group players by case-insensitive name
            const groups: { [key: string]: number[] } = {};
            for (let i = 0; i < players.length; i++) {
                const nameForKey = players[i]?.name ?? '';
                const key = nameForKey.toLowerCase();
                if (!groups[key]) groups[key] = [];
                groups[key].push(i);
            }

            // First pass: compute a candidate seed for each player following per-player disambiguation rules
            const candidateSeeds: string[] = new Array(players.length);

            const safe = (v: any) => (v === undefined || v === null) ? '' : String(v);

            const countsFor = (indices: number[], fn: (p: Player) => string) => {
                const m = new Map<string, number>();
                for (const i of indices) {
                    const k = fn(players[i] as Player) || '';
                    m.set(k, (m.get(k) || 0) + 1);
                }
                return m;
            };

            for (const key of Object.keys(groups)) {
                const indices = groups[key] || [];
                if (indices.length === 1) {
                    const firstIdx = indices[0]!;
                    const p = players[firstIdx] as any;
                    candidateSeeds[firstIdx] = makeBase(p?.name);
                    continue;
                }

                // overall state counts across the name-group
                const stateCounts = countsFor(indices, (p: Player) => safe((p as any).state));

                for (const idx of indices) {
                    const p: any = players[idx];
                    const base = makeBase(p.name);
                    const state = safe(p.state);
                    const city = safe(p.city);
                    const rating = p.effectiveRating !== undefined ? String(p.effectiveRating) : '';

                    let disamb = '';

                    // 1) If this player's state is unique in the whole name-group -> (state)
                    if (state && (stateCounts.get(state) || 0) === 1) {
                        disamb = `(${state})`;
                    } else {
                        // players that share this player's state
                        const sameStateIdx = indices.filter(i => safe((players[i] as any).state) === state);
                        if (sameStateIdx.length > 1) {
                            const cityCounts = countsFor(sameStateIdx, (pp: Player) => safe((pp as any).city));
                            // 2) within same-state group, if this city is unique -> (state, city)
                            if (city && (cityCounts.get(city) || 0) === 1) {
                                const parts: string[] = [];
                                if (state) parts.push(state);
                                parts.push(city);
                                disamb = `(${parts.join(', ')})`;
                            } else {
                                // 3) within same state+city, if rating unique -> (state, city, rating)
                                const sameStateCityIdx = sameStateIdx.filter(i => safe((players[i] as any).city) === city);
                                if (sameStateCityIdx.length > 1) {
                                    const ratingCounts = countsFor(sameStateCityIdx, (pp: Player) => pp.effectiveRating !== undefined ? String((pp as any).effectiveRating) : '');
                                    if (rating && (ratingCounts.get(rating) || 0) === 1) {
                                        const parts: string[] = [];
                                        if (state) parts.push(state);
                                        if (city) parts.push(city);
                                        parts.push(rating);
                                        disamb = `(${parts.join(', ')})`;
                                    }
                                }
                            }
                        }
                    }

                    // 4) fallback to membershipId if uniquely identifies the player in the group
                    if (!disamb && p.membershipId) {
                        const mid = safe(p.membershipId);
                        const midCounts = countsFor(indices, (pp: Player) => safe((pp as any).membershipId));
                        if (mid && (midCounts.get(mid) || 0) === 1) disamb = `(${mid})`;
                    }

                    candidateSeeds[idx] = disamb ? `${base} ${disamb}` : base;
                }
            }

            // Ensure global uniqueness by appending numeric suffixes for duplicates
            const used = new Map<string, number>();
            for (let i = 0; i < candidateSeeds.length; i++) {
                let seed = candidateSeeds[i] || makeBase(players[i]?.name ?? '');
                if (!used.has(seed)) {
                    used.set(seed, 1);
                    participantNames.push(seed);
                    seedByIndex.push(seed);
                    continue;
                }

                // already used -> append occurrence index
                let occ = used.get(seed) || 1;
                let newSeed = '';
                while (true) {
                    newSeed = `${seed} (#${occ})`;
                    if (!used.has(newSeed)) break;
                    occ++;
                }
                used.set(seed, occ + 1);
                used.set(newSeed, 1);
                participantNames.push(newSeed);
                seedByIndex.push(newSeed);
            }

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
                balanceByes: true,
            };

            // Map trueDouble to grandFinal for double-elimination stages.
            // Per user request: no (false) -> 'simple', yes (true) -> 'double'.
            if (bracketType === 'double_elimination') {
                const isTrueDouble = options && options.trueDouble === true;
                stageSettings.grandFinal = isTrueDouble ? 'double' : 'simple';
            } else {
                stageSettings.grandFinal = 'none';
            }

            if (options) {
                // keep explicit trueDouble flag if provided (consumer can use it); grandFinal drives engine behavior
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

            // After stage creation, storage will contain participant records with the seeded names.
            // Update those participant records to include phone/email/membershipId and any metadata
            try {
                for (let i = 0; i < players.length; i++) {
                    const p: any = players[i];
                    const seedName = seedByIndex[i];

                    const updateData: any = {};
                    if (p.phone) updateData.phone = p.phone;
                    if (p.email) updateData.email = p.email;
                    if (p.membershipId) updateData.membershipId = p.membershipId;
                    if (p.effectiveRating !== undefined) updateData.effectiveRating = p.effectiveRating;
                    if (p.city) updateData.city = p.city;
                    if (p.state) updateData.state = p.state;
                    if (p.robustness !== undefined) updateData.robustness = p.robustness;

                    if (Object.keys(updateData).length > 0) {
                        try {
                            await this.storage.update('participant', { name: seedName }, updateData);
                        } catch (err) {
                            console.warn('Failed to update participant metadata for', seedName, err);
                        }
                    }
                }
            } catch (err) {
                console.warn('Error updating stored participant metadata:', err);
            }

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
            // Validate scores against stage settings (race limits).
            // Choose the correct race limit per-match:
            // - If the match is a losers bracket match (group_id === 2) use raceLosers
            // - If the match is a Grand Final reset (GF round 2) treat it as losers-side and use raceLosers
            // - Otherwise use raceWinners
            const matches = await this.storage.select('match') as any[] || [];
            const matchRec = matches.find(m => m.id === matchId);
            let maxAllowed = 0;
            if (matchRec) {
                const stageId = matchRec.stage_id || matchRec.stageId || null;
                if (stageId) {
                    const stages = await this.storage.select('stage') as any[] || [];
                    const stage = stages.find((s: any) => s.id === stageId);
                    if (stage && stage.settings) {
                        const winnersMax = Number(stage.settings.raceWinners || 0) || 0;
                        const losersMax = Number(stage.settings.raceLosers || winnersMax) || 0;

                        // Determine if this match should be treated as losers-side.
                        let isLosersSide = false;
                        const rawGroupId = matchRec.group_id ?? matchRec.groupId;
                        const rawRoundId = matchRec.round_id ?? matchRec.roundId;

                        // Basic losers bracket detection
                        if (rawGroupId === 2) {
                            isLosersSide = true;
                        }

                        // Grand final reset detection: if stage has grandFinal === 'double' treat the
                        // highest round among GF matches as the reset (losers-side) when maxRound > 1
                        if (!isLosersSide) {
                            const grandFinalMode = stage.settings.grandFinal;
                            const stageTrueDouble = stage.settings.trueDouble || grandFinalMode === 'double';
                            if (stageTrueDouble) {
                                const gfMatches = matches.filter(m => (m.stage_id || m.stageId) === stageId && ((m.group_id || m.groupId) || 0) >= 3);
                                if (gfMatches.length > 0) {
                                    const maxRound = Math.max(...gfMatches.map(m => (m.round_id || m.roundId || 0) || 0));
                                    if (maxRound > 1 && (rawRoundId || 0) === maxRound) {
                                        isLosersSide = true;
                                    }
                                }
                            }
                        }

                        maxAllowed = isLosersSide ? losersMax : winnersMax;
                    }
                }
            }

            if (maxAllowed > 0) {
                if ((opponent1Score !== undefined && opponent1Score > maxAllowed) || (opponent2Score !== undefined && opponent2Score > maxAllowed)) {
                    throw new Error(`Score exceeds configured race limit of ${maxAllowed}`);
                }
            }

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

        return participants.map((p: Participant) => {
            // Attempt to match by membershipId (if participant has one and a player shares it), else fall back to exact name
            const matchByMembership = (p as any).membershipId ? players.find(player => (player as any).membershipId === (p as any).membershipId) : undefined;
            const matchByName = matchByMembership ? undefined : players.find(player => player.name === p.name);
            const phone = matchByMembership?.phone || matchByName?.phone || '';
            return { ...p, phone } as Participant;
        });
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