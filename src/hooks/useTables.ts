import * as React from 'react';
import { autoAssignMatches, assignMatchToTable, removeMatchFromTable, updateTableSettings } from '../services/tableManager';

export default function useTables(initialCount = 1) {
    const [tableCount, setTableCount] = React.useState<number>(initialCount);
    const [tableAssignments, setTableAssignments] = React.useState<(number | null)[]>([]);
    const [globalAutoAssign, setGlobalAutoAssign] = React.useState<boolean>(true);
    const [tableSettings, setTableSettings] = React.useState<{ [key: number]: { name: string, doNotAutoAssign: boolean } }>({
        1: { name: 'Stream', doNotAutoAssign: false }
    });

    // Keep assignments array in sync with tableCount
    React.useEffect(() => {
        setTableAssignments(prev => {
            const newAssignments = [...prev];
            while (newAssignments.length < tableCount) newAssignments.push(null);
            if (newAssignments.length > tableCount) return newAssignments.slice(0, tableCount);
            return newAssignments;
        });
    }, [tableCount]);

    const autoAssign = React.useCallback((matches: any[] | undefined) => {
        if (!matches) return;
        setTableAssignments(prev => autoAssignMatches(matches, prev, tableCount, tableSettings, globalAutoAssign));
    }, [tableCount, tableSettings, globalAutoAssign]);

    const assignToTable = React.useCallback((matchId: number, tableIndex: number) => {
        setTableAssignments(prev => assignMatchToTable(prev, matchId, tableIndex));
    }, []);

    const removeFromTable = React.useCallback((tableIndex: number) => {
        setTableAssignments(prev => removeMatchFromTable(prev, tableIndex));
    }, []);

    const updateSettings = React.useCallback((tableNumber: number, updates: Partial<{ name: string; doNotAutoAssign: boolean; }>) => {
        setTableSettings(prev => updateTableSettings(prev, tableNumber, updates));
    }, []);

    const addTable = React.useCallback(() => setTableCount(prev => prev + 1), []);

    const removeTable = React.useCallback(() => setTableCount(prev => Math.max(1, prev - 1)), []);

    return {
        tableCount,
        tableAssignments,
        globalAutoAssign,
        setGlobalAutoAssign,
        tableSettings,
        setTableSettings: updateSettings,
        autoAssign,
        assignToTable,
        removeFromTable,
        addTable,
        removeTable,
        setTableAssignments,
        setTableCount
    };
}
