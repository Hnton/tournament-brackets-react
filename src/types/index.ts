export interface Player {
    name: string;
    phone: string;
}

export interface Match {
    id: number;
    round: number;
    player1: Player | null;
    player2: Player | null;
    winner?: Player | null;
    score1?: number;
    score2?: number;
    table?: number | undefined; // Table assignment (optional)
}

export interface TableSettings {
    name: string;
    doNotAutoAssign: boolean;
}

export interface TableSettingsMap {
    [key: number]: TableSettings;
}

export type TabType = 'bracket' | 'tables';

export interface TournamentState {
    players: Player[];
    matches: Match[];
    tournamentStarted: boolean;
    tournamentComplete: boolean;
    tableCount: number;
    tableAssignments: (number | null)[];
    activeTab: TabType;
    globalAutoAssign: boolean;
    tableSettings: TableSettingsMap;
}