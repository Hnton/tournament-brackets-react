import { Match, TableSettings, TableSettingsMap } from '../types';
import { getDefaultTableName, isBye } from '../utils';

/**
 * Get all matches that are waiting to be assigned to tables
 */
export const getWaitingMatches = (
    matches: Match[],
    tableAssignments: (number | null)[]
): Match[] => {
    return matches.filter(m =>
        !tableAssignments.includes(m.id) &&
        !m.winner &&
        m.player1 &&
        m.player2 &&
        !isBye(m.player1) &&
        !isBye(m.player2)
    );
};

/**
 * Get available (empty) table numbers
 */
export const getAvailableTables = (
    tableAssignments: (number | null)[],
    tableCount: number
): number[] => {
    const availableTables: number[] = [];
    for (let i = 0; i < tableCount; i++) {
        if (tableAssignments[i] === null) {
            availableTables.push(i + 1); // Convert to 1-based table numbers
        }
    }
    return availableTables;
};

/**
 * Auto-assign matches to tables based on settings
 */
export const autoAssignMatches = (
    matches: Match[],
    tableAssignments: (number | null)[],
    tableCount: number,
    tableSettings: TableSettingsMap,
    globalAutoAssign: boolean
): (number | null)[] => {
    if (!globalAutoAssign) return tableAssignments;

    const waitingMatches = getWaitingMatches(matches, tableAssignments);
    const newAssignments = [...tableAssignments];

    // Find available tables that should auto-assign
    for (let tableNumber = 1; tableNumber <= tableCount; tableNumber++) {
        const tableIndex = tableNumber - 1;
        const settings = tableSettings[tableNumber];

        // Skip if table is occupied or excluded from auto-assign
        if (newAssignments[tableIndex] !== null || settings?.doNotAutoAssign) {
            continue;
        }

        // Assign first available waiting match
        if (waitingMatches.length > 0) {
            const waitingMatch = waitingMatches.shift(); // Remove from waiting list
            if (waitingMatch) {
                newAssignments[tableIndex] = waitingMatch.id;
            }
        }
    }

    return newAssignments;
};

/**
 * Assign a specific match to a specific table
 */
export const assignMatchToTable = (
    tableAssignments: (number | null)[],
    matchId: number,
    tableIndex: number
): (number | null)[] => {
    const newAssignments = [...tableAssignments];
    newAssignments[tableIndex] = matchId;
    return newAssignments;
};

/**
 * Remove a match from a table
 */
export const removeMatchFromTable = (
    tableAssignments: (number | null)[],
    tableIndex: number
): (number | null)[] => {
    const newAssignments = [...tableAssignments];
    newAssignments[tableIndex] = null;
    return newAssignments;
};

/**
 * Initialize or resize table assignments array
 */
export const resizeTableAssignments = (
    currentAssignments: (number | null)[],
    newTableCount: number
): (number | null)[] => {
    const newAssignments = [...currentAssignments];

    // Expand array if needed
    while (newAssignments.length < newTableCount) {
        newAssignments.push(null);
    }

    // Shrink array if needed
    if (newAssignments.length > newTableCount) {
        return newAssignments.slice(0, newTableCount);
    }

    return newAssignments;
};

/**
 * Create or update table settings
 */
export const updateTableSettings = (
    currentSettings: TableSettingsMap,
    tableNumber: number,
    updates: Partial<TableSettings>
): TableSettingsMap => {
    const currentTableSettings = currentSettings[tableNumber] || {
        name: getDefaultTableName(tableNumber),
        doNotAutoAssign: false
    };

    return {
        ...currentSettings,
        [tableNumber]: {
            ...currentTableSettings,
            ...updates
        }
    };
};

/**
 * Initialize table settings for a new table
 */
export const initializeTableSettings = (
    currentSettings: TableSettingsMap,
    tableNumber: number
): TableSettingsMap => {
    if (currentSettings[tableNumber]) {
        return currentSettings; // Already initialized
    }

    return updateTableSettings(currentSettings, tableNumber, {});
};

/**
 * Remove table settings for a deleted table
 */
export const removeTableSettings = (
    currentSettings: TableSettingsMap,
    tableNumber: number
): TableSettingsMap => {
    const newSettings = { ...currentSettings };
    delete newSettings[tableNumber];
    return newSettings;
};

/**
 * Toggle auto-assign setting for a specific table
 */
export const toggleTableAutoAssign = (
    currentSettings: TableSettingsMap,
    tableNumber: number
): TableSettingsMap => {
    return updateTableSettings(currentSettings, tableNumber, {
        doNotAutoAssign: !(currentSettings[tableNumber]?.doNotAutoAssign || false)
    });
};

/**
 * Rename a table
 */
export const renameTable = (
    currentSettings: TableSettingsMap,
    tableNumber: number,
    newName: string
): TableSettingsMap => {
    return updateTableSettings(currentSettings, tableNumber, {
        name: newName.trim()
    });
};

/**
 * Check if a table has an active match and get match details
 */
export const getTableMatch = (
    matches: Match[],
    tableAssignments: (number | null)[],
    tableIndex: number
): Match | null => {
    const assignedMatchId = tableAssignments[tableIndex];
    if (!assignedMatchId) return null;

    return matches.find(m => m.id === assignedMatchId) || null;
};

/**
 * Find which table a match is assigned to
 */
export const findMatchTable = (
    tableAssignments: (number | null)[],
    matchId: number
): number | null => {
    const tableIndex = tableAssignments.findIndex(assignment => assignment === matchId);
    return tableIndex !== -1 ? tableIndex : null;
};

/**
 * Migrate old table settings to new naming convention
 */
export const migrateTableSettings = (
    currentSettings: TableSettingsMap
): TableSettingsMap => {
    if (currentSettings[1]?.name === 'Table 1') {
        return updateTableSettings(currentSettings, 1, {
            name: 'Stream'
        });
    }
    return currentSettings;
};