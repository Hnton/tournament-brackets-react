// Brackets-manager compatible types
export interface Participant {
    id: number;
    tournament_id: number;
    name: string;
    phone?: string; // Custom field we'll maintain
}

export interface Match {
    id: number;
    number: number;
    stage_id: number;
    group_id: number;
    round_id: number;
    child_count: number;
    status: 'locked' | 'waiting' | 'ready' | 'running' | 'completed' | 'archived' | number;
    opponent1?: {
        id: number | null;
        score?: number;
        result?: 'win' | 'loss' | 'draw';
        forfeit?: boolean;
        position?: number;
    } | null;
    opponent2?: {
        id: number | null;
        score?: number;
        result?: 'win' | 'loss' | 'draw';
        forfeit?: boolean;
        position?: number;
    } | null;
    table?: number | undefined; // Table assignment (custom field)
}

export interface Stage {
    id: number;
    tournament_id: number;
    name: string;
    type: 'round_robin' | 'single_elimination' | 'double_elimination';
    number: number;
    settings: {
        size?: number;
        seedOrdering?: string[];
        balanceByes?: boolean;
        grandFinal?: 'none' | 'simple' | 'double';
        skipFirstRound?: boolean;
        consolationFinal?: boolean;
        matchesChildCount?: number;
        groupCount?: number;
    };
}

export interface Round {
    id: number;
    number: number;
    stage_id: number;
    group_id: number;
}

export interface Group {
    id: number;
    number: number;
    stage_id: number;
}

// Keep our custom types for UI purposes
export interface Player {
    name: string;
    phone: string;
}

// Legacy Match interface for backward compatibility during transition
export interface LegacyMatch {
    id: number;
    round: number;
    player1: Player | null;
    player2: Player | null;
    winner?: Player | null;
    score1?: number;
    score2?: number;
    table?: number | undefined;
    bracket?: 'winners' | 'losers' | 'finals';
    isGrandFinals?: boolean;
    isGrandFinalsReset?: boolean;
}

export interface TableSettings {
    name: string;
    doNotAutoAssign: boolean;
}

export interface TableSettingsMap {
    [key: number]: TableSettings;
}

export type TabType = 'bracket' | 'tables';
export type BracketType = 'single' | 'double';

// Types for the algorithmic double elimination bracket generation (legacy - kept for compatibility)
// These may be removed in future versions as the system migrates to brackets-manager

// Tournament data structure compatible with brackets-manager
export interface Tournament {
    id: number;
    name: string;
}

export interface BracketsData {
    stage: Stage[];
    group: Group[];
    round: Round[];
    match: Match[];
    match_game: any[];
    participant: Participant[];
}

export interface TournamentState {
    tournament?: Tournament;
    bracketsData?: BracketsData;
    players: Player[];
    tournamentStarted: boolean;
    tournamentComplete: boolean;
    tableCount: number;
    tableAssignments: (number | null)[];
    activeTab: TabType;
    globalAutoAssign: boolean;
    tableSettings: TableSettingsMap;
    bracketType: BracketType;
    // Keep legacy fields for transition
    matches: LegacyMatch[];
}