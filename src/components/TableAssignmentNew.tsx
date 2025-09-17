import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Match, Participant } from '../types';
import { getUserFriendlyRoundNumber } from '../utils';

// TUNABLE: Increase >1 to make Losers Bracket matches more aggressive (higher priority)
// Decrease <1 to make losers less aggressive. Default 1.05 gives a modest boost to LB.
const LB_AGGRESSIVENESS = 1.25;

interface TableAssignmentProps {
    tables: number;
    matches: Match[];
    onMoveMatch: (match: Match, tableId?: number) => void;
    onReturnToWaiting: (match: Match) => void;
    waitingMatches: Match[];
    onSubmitScore: (match: Match, score1: number, score2: number) => void;
    // Reuse shared bracket score modal by opening it via this callback
    onOpenScoreModal?: (match: Match) => void;
    onAddTable: () => void;
    onRemoveTable: () => void;
    participants: Participant[];
    allMatches?: Match[]; // All tournament matches for proper round calculation
}

export const TableAssignmentNew: React.FC<TableAssignmentProps> = ({
    tables,
    matches,
    onMoveMatch,
    onReturnToWaiting,
    waitingMatches,
    onSubmitScore,
    onAddTable,
    onRemoveTable,
    participants,
    allMatches,
    onOpenScoreModal
}) => {
    // score modal is handled by the shared BracketScoreModal in the renderer
    // selected table per waiting match id
    const [selectedTableByMatch, setSelectedTableByMatch] = React.useState<Record<number, number | null>>({});

    const setSelectedTable = (matchId: number, tableId: number | null) => {
        setSelectedTableByMatch(prev => ({ ...prev, [matchId]: tableId }));
    };

    // If a match is present in waitingMatches (returned to waiting), clear any selected table
    useEffect(() => {
        if (!waitingMatches || waitingMatches.length === 0) return;
        let changed = false;
        const next = { ...selectedTableByMatch };
        waitingMatches.forEach(m => {
            if (next[m.id] != null) {
                next[m.id] = null;
                changed = true;
            }
        });
        if (changed) setSelectedTableByMatch(next);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [waitingMatches]);

    // Clear any selectedTable if the table becomes occupied by another match
    useEffect(() => {
        const occupiedTables = new Set(matches.filter(mm => mm.table != null).map(mm => mm.table as number));
        const next = { ...selectedTableByMatch };
        let changed = false;
        Object.keys(next).forEach(k => {
            const mid = parseInt(k, 10);
            const tid = next[mid];
            if (tid != null && occupiedTables.has(tid)) {
                next[mid] = null;
                changed = true;
            }
        });
        if (changed) setSelectedTableByMatch(next);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [matches]);

    // Use shared utility for friendly round labels
    const friendlyRound = (m: Match) => getUserFriendlyRoundNumber(m, allMatches);

    // Parse friendly round into structured info for scoring
    const parseFriendlyRound = (m: Match) => {
        const label = friendlyRound(m) || '';
        const wbMatch = label.match(/^WB Round\s*(\d+)/i);
        if (wbMatch) return { bracket: 'WB', roundNum: parseInt(String(wbMatch[1]), 10) };
        const lbMatch = label.match(/^LB Round\s*(\d+)/i);
        if (lbMatch) return { bracket: 'LB', roundNum: parseInt(String(lbMatch[1]), 10) };
        if (/finals/i.test(label)) return { bracket: 'F', roundNum: null };
        // If friendly label cannot be determined, return unknown and no roundNum to avoid using internal ids
        return { bracket: 'UNK', roundNum: null };
    };

    // Calculate priority score for a match based on double elimination tournament flow
    const getMatchPriority = (match: Match): number => {
        const { group_id } = match;
        const parsed = parseFriendlyRound(match);
        const r = parsed.roundNum ?? 0;

        if (group_id === 1) {
            // Winners Bracket Priority — use friendly WB numbering
            return 10000 - (r * 100);
        } else if (group_id === 2) {
            // Losers Bracket Priority — use friendly LB numbering
            if (r === 1) {
                return Math.round(9900 * LB_AGGRESSIVENESS); // Just below WB1
            } else if (r % 2 === 0) {
                const correspondingWBRound = (r / 2) + 1;
                return Math.round((10000 - (correspondingWBRound * 100) - 10) * LB_AGGRESSIVENESS);
            } else {
                const correspondingWBRound = Math.ceil(r / 2);
                return Math.round((10000 - (correspondingWBRound * 100) - 50) * LB_AGGRESSIVENESS);
            }
        } else {
            if (group_id === 3) {
                return 15000 - (r || 0);
            }
            return 14000 - (r || 0);
        }
    };

    /*
     * DOUBLE ELIMINATION TOURNAMENT FLOW ALGORITHM
     * 
     * This algorithm implements optimal match assignment following these principles:
     * 
     * 1. WINNERS BRACKET PRIORITY: WB matches form the foundation - they must progress to unlock LB matches
     * 2. PARALLEL EXECUTION: LB matches can run simultaneously with WB matches when dependencies allow
     * 3. DEPENDENCY MANAGEMENT: LB matches only become available after their WB dependencies complete
     * 
     * PRIORITY ORDER (for any tournament size):
     * 1. Grand Finals - Highest priority when available
     * 2. Winners Bracket - Foundation matches, prioritized by round (WB1 → WB2 → WB3...)
     * 3. Parallel Losers Bracket - LB matches that can run alongside WB matches
     * 4. Sequential Losers Bracket - LB matches that must wait for WB completion
     * 
     * PARALLEL EXECUTION RULES:
     * - LB1 must wait for WB1 to complete (needs WB1 losers)
     * - LB2 can run parallel with WB2 (has WB1 losers vs LB1 winners)
     * - LB3 must wait for WB2 to complete (needs WB2 losers)  
     * - LB4 can run parallel with WB3 (has WB2 losers vs LB3 winners)
     * - Pattern: Even LB rounds can run parallel, odd LB rounds must wait
     * 
     * This maximizes table utilization while respecting tournament dependencies.
     */

    // Get all currently assigned matches to understand tournament state
    const getAssignedMatchesByBracket = () => {
        const assigned = matches.filter(m => m.table !== null && m.table !== undefined);
        return {
            wb: assigned.filter(m => m.group_id === 1),
            lb: assigned.filter(m => m.group_id === 2),
            gf: assigned.filter(m => m.group_id >= 3)
        };
    };

    // Advanced priority function following double elimination tournament flow
    const getOptimalMatch = (availableMatches: Match[]): Match | null => {
        if (availableMatches.length === 0) return null;
        const assignedMatches = getAssignedMatchesByBracket();

        // Build a set of participant IDs currently playing to avoid double-assigning a player
        const currentlyPlaying = new Set<number>();
        const assigned = matches.filter(m => m.table !== null && m.table !== undefined);
        assigned.forEach(a => {
            if (a.opponent1 && a.opponent1.id != null) currentlyPlaying.add(a.opponent1.id);
            if (a.opponent2 && a.opponent2.id != null) currentlyPlaying.add(a.opponent2.id);
        });

        // Exclude any available matches where one of the opponents is already playing
        const filteredAvailable = availableMatches.filter(m => {
            const o1 = m.opponent1 && m.opponent1.id != null ? m.opponent1.id : null;
            const o2 = m.opponent2 && m.opponent2.id != null ? m.opponent2.id : null;
            if (o1 !== null && currentlyPlaying.has(o1)) return false;
            if (o2 !== null && currentlyPlaying.has(o2)) return false;
            return true;
        });

        const usableMatches = filteredAvailable.length > 0 ? filteredAvailable : availableMatches;

        // Group usable matches
        const gfMatches = usableMatches.filter(m => m.group_id >= 3);
        const wbMatches = usableMatches.filter(m => m.group_id === 1);
        const lbMatches = usableMatches.filter(m => m.group_id === 2);

        // (debug instrumentation removed)

        // If grand finals available, choose the highest priority GF
        if (gfMatches.length > 0) {
            // Use existing priority function for finals
            const sortedGF = gfMatches.sort((a, b) => getMatchPriority(b) - getMatchPriority(a));
            return sortedGF[0] || null;
        }

        // Heuristic scoring: higher score = higher priority
        const scoreMatch = (m: Match) => {
            const parsed = parseFriendlyRound(m);
            const rr = parsed.roundNum ?? 0;
            // base values
            if (m.group_id === 1) {
                // Winners: earlier friendly rounds higher priority
                return 80000 - (rr) * 1000 - (m.number || 0);
            }

            if (m.group_id === 2) {
                // Losers using friendly LB numbering
                if (rr === 1) return Math.round((20000 - (m.number || 0)) * LB_AGGRESSIVENESS);

                if (rr % 2 === 0) {
                    const correspondingWBRound = (rr / 2) + 1;
                    const wbInPlayOrWaiting = assignedMatches.wb.some(x => {
                        const p = parseFriendlyRound(x);
                        return p.bracket === 'WB' && p.roundNum === correspondingWBRound;
                    }) || wbMatches.some(x => {
                        const p = parseFriendlyRound(x);
                        return p.bracket === 'WB' && p.roundNum === correspondingWBRound;
                    });
                    if (wbInPlayOrWaiting) {
                        return Math.round((79000 - correspondingWBRound * 1000 - (m.number || 0)) * LB_AGGRESSIVENESS);
                    }
                    return Math.round((40000 - (rr) * 100) * LB_AGGRESSIVENESS);
                }

                const correspondingWBRound = Math.ceil(rr / 2);
                const wbInPlay = assignedMatches.wb.some(x => {
                    const p = parseFriendlyRound(x);
                    return p.bracket === 'WB' && p.roundNum === correspondingWBRound;
                });
                return Math.round(((wbInPlay ? 70000 : 30000) - (rr) * 100 - (m.number || 0)) * LB_AGGRESSIVENESS);
            }

            return 0;
        };

        // Build scored list and pick highest score
        const scored = usableMatches.map(m => ({ m, score: scoreMatch(m) }));
        // sort using score first, then friendly round number, then match number
        scored.sort((a, b) => {
            const diff = (b.score || 0) - (a.score || 0);
            if (diff !== 0) return diff;
            const aRound = parseFriendlyRound(a.m).roundNum || 0;
            const bRound = parseFriendlyRound(b.m).roundNum || 0;
            const roundDiff = aRound - bRound;
            if (roundDiff !== 0) return roundDiff;
            return (a.m.number || 0) - (b.m.number || 0);
        });

        return scored[0] ? scored[0].m : null;
    };

    // Manual assign function with proper double elimination priority
    const handleAssignNext = (tableId: number) => {
        // Re-check occupancy before assigning
        const occupied = matches.some(mm => mm.table === tableId);
        if (occupied) {
            // Best-effort: notify via console and do nothing. UI buttons are disabled where appropriate.
            console.warn(`Table ${tableId} is occupied; cannot assign next.`);
            return;
        }

        const nextMatch = getOptimalMatch(waitingMatches);
        if (nextMatch) {
            console.log(`Assigning match #${nextMatch.number} (${friendlyRound(nextMatch)}) to table ${tableId}`);
            onMoveMatch(nextMatch, tableId);
        } else {
            console.log(`No optimal match found for table ${tableId}`);
        }
    };

    // Helper function to get participant name by ID
    const getParticipantName = (participantId: number | null | undefined): string => {
        if (!participantId) return 'TBD';
        const participant = participants.find(p => p.id === participantId);
        return participant?.name || 'TBD';
    };

    // Helper function to get table name
    const getTableName = (tableId: number): string => {
        if (tableId === 1) {
            return 'Stream Table';
        }
        return `Table ${tableId - 1}`;
    };


    return (
        <div className="table-assignment-container">
            {/* Debug panel removed to clean up the Tables tab UI */}
            {/* Waiting Matches Section */}
            <div className="waiting-matches-header-section">
                {(() => {
                    // Separate matches by group (Winners vs Losers bracket vs Grand Finals)
                    const winnersBracketMatches = waitingMatches.filter(m => m.group_id === 1);
                    const losersBracketMatches = waitingMatches.filter(m => m.group_id === 2);
                    const grandFinalsMatches = waitingMatches.filter(m => m.group_id >= 3);

                    return (
                        <>
                            {/* Winners Bracket Matches */}
                            {winnersBracketMatches.length > 0 && (
                                <div className="bracket-section">
                                    <div className="waiting-matches-header">
                                        <h3 className="waiting-matches-title">
                                            🏆 Winners Bracket
                                        </h3>
                                        <span className="matches-count-badge">
                                            {winnersBracketMatches.length}
                                        </span>
                                    </div>

                                    <div className="waiting-matches-horizontal">
                                        {winnersBracketMatches.map((match) => {
                                            return (
                                                <div
                                                    key={match.id}
                                                    className="waiting-match-card winners-bracket"
                                                >
                                                    <div className="waiting-match-players">
                                                        {getParticipantName(match.opponent1?.id)}
                                                        <span className="waiting-match-vs"> vs </span>
                                                        {getParticipantName(match.opponent2?.id)}
                                                    </div>
                                                    <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                            <select
                                                                value={selectedTableByMatch[match.id] ?? ''}
                                                                onChange={(e) => setSelectedTable(match.id, e.target.value ? parseInt(e.target.value, 10) : null)}
                                                                aria-label={`Select table for match ${match.number}`}
                                                            >
                                                                <option value="">Pick table...</option>
                                                                {Array.from({ length: tables }).map((_, ti) => {
                                                                    const tnum = ti + 1;
                                                                    const occupied = matches.some(mm => mm.table === tnum);
                                                                    return (
                                                                        <option key={tnum} value={tnum} disabled={occupied}>{tnum === 1 ? 'Stream' : `Table ${tnum - 1}`}</option>
                                                                    );
                                                                })}
                                                            </select>
                                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                <button
                                                                    className="table-action-btn assign-specific-btn"
                                                                    onClick={() => {
                                                                        const tid = selectedTableByMatch[match.id];
                                                                        if (!tid) return;
                                                                        const occupied = matches.some(mm => mm.table === tid);
                                                                        if (occupied) {
                                                                            // If occupied, clear selection and don't assign
                                                                            setSelectedTable(match.id, null);
                                                                            console.warn(`Table ${tid} became occupied; assignment cancelled.`);
                                                                            return;
                                                                        }
                                                                        onMoveMatch(match, tid);
                                                                    }}
                                                                    disabled={!selectedTableByMatch[match.id]}
                                                                >
                                                                    Assign
                                                                </button>
                                                                {selectedTableByMatch[match.id] != null && (
                                                                    matches.some(mm => mm.table === selectedTableByMatch[match.id]) ? (
                                                                        <div style={{ color: 'var(--accent-error)', fontSize: 'var(--font-size-xs)', marginTop: 4 }}>
                                                                            Table occupied — selection cleared
                                                                        </div>
                                                                    ) : null
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="waiting-match-details">
                                                        Match #{match.number} • {friendlyRound(match)}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Losers Bracket Matches */}
                            {losersBracketMatches.length > 0 && (
                                <div className="bracket-section">
                                    <div className="waiting-matches-header">
                                        <h3 className="waiting-matches-title">
                                            💔 Losers Bracket
                                        </h3>
                                        <span className="matches-count-badge">
                                            {losersBracketMatches.length}
                                        </span>
                                    </div>

                                    <div className="waiting-matches-horizontal">
                                        {losersBracketMatches.map((match) => {
                                            return (
                                                <div
                                                    key={match.id}
                                                    className="waiting-match-card losers-bracket"
                                                >
                                                    <div className="waiting-match-players">
                                                        {getParticipantName(match.opponent1?.id)}
                                                        <span className="waiting-match-vs"> vs </span>
                                                        {getParticipantName(match.opponent2?.id)}
                                                    </div>
                                                    <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                                                        <select
                                                            value={selectedTableByMatch[match.id] ?? ''}
                                                            onChange={(e) => setSelectedTable(match.id, e.target.value ? parseInt(e.target.value, 10) : null)}
                                                            aria-label={`Select table for match ${match.number}`}
                                                        >
                                                            <option value="">Pick table...</option>
                                                            {Array.from({ length: tables }).map((_, ti) => {
                                                                const tnum = ti + 1;
                                                                const occupied = matches.some(mm => mm.table === tnum);
                                                                return (
                                                                    <option key={tnum} value={tnum} disabled={occupied}>{tnum === 1 ? 'Stream' : `Table ${tnum - 1}`}</option>
                                                                );
                                                            })}
                                                        </select>
                                                        <button
                                                            className="table-action-btn assign-specific-btn"
                                                            onClick={() => {
                                                                const tid = selectedTableByMatch[match.id];
                                                                if (tid) onMoveMatch(match, tid);
                                                            }}
                                                            disabled={!selectedTableByMatch[match.id]}
                                                        >
                                                            Assign
                                                        </button>
                                                    </div>
                                                    <div className="waiting-match-details">
                                                        Match #{match.number} • {friendlyRound(match)}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Grand Finals Matches */}
                            {grandFinalsMatches.length > 0 && (
                                <div className="bracket-section">
                                    <div className="waiting-matches-header">
                                        <h3 className="waiting-matches-title">
                                            👑 Grand Finals
                                        </h3>
                                        <span className="matches-count-badge">
                                            {grandFinalsMatches.length}
                                        </span>
                                    </div>

                                    <div className="waiting-matches-horizontal">
                                        {grandFinalsMatches.map((match) => {
                                            return (
                                                <div
                                                    key={match.id}
                                                    className="waiting-match-card grand-finals"
                                                >
                                                    <div className="waiting-match-players">
                                                        {getParticipantName(match.opponent1?.id)}
                                                        <span className="waiting-match-vs"> vs </span>
                                                        {getParticipantName(match.opponent2?.id)}
                                                    </div>
                                                    <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                                                        <select
                                                            value={selectedTableByMatch[match.id] ?? ''}
                                                            onChange={(e) => setSelectedTable(match.id, e.target.value ? parseInt(e.target.value, 10) : null)}
                                                            aria-label={`Select table for match ${match.number}`}
                                                        >
                                                            <option value="">Pick table...</option>
                                                            {Array.from({ length: tables }).map((_, ti) => {
                                                                const tnum = ti + 1;
                                                                const occupied = matches.some(mm => mm.table === tnum);
                                                                return (
                                                                    <option key={tnum} value={tnum} disabled={occupied}>{tnum === 1 ? 'Stream' : `Table ${tnum - 1}`}</option>
                                                                );
                                                            })}
                                                        </select>
                                                        <button
                                                            className="table-action-btn assign-specific-btn"
                                                            onClick={() => {
                                                                const tid = selectedTableByMatch[match.id];
                                                                if (tid) onMoveMatch(match, tid);
                                                            }}
                                                            disabled={!selectedTableByMatch[match.id]}
                                                        >
                                                            Assign
                                                        </button>
                                                    </div>
                                                    <div className="waiting-match-details">
                                                        Match #{match.number} • {friendlyRound(match)}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Show message if no waiting matches */}
                            {waitingMatches.length === 0 && (
                                <div className="bracket-section">
                                    <div className="waiting-matches-header">
                                        <h3 className="waiting-matches-title">
                                            Waiting Matches
                                        </h3>
                                        <span className="matches-count-badge">
                                            0
                                        </span>
                                    </div>

                                    <div className="waiting-matches-horizontal">
                                        <div className="no-waiting-matches">
                                            <span className="no-waiting-matches-icon">⏳</span>
                                            No matches waiting for table assignment
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    );
                })()}
            </div>

            {/* Tables Section */}
            <div className="tables-main-section">
                <div className="tables-main-header">
                    <h3 className="tables-main-title">
                        Tables ({tables})
                    </h3>
                    <div className="table-controls">

                        <button
                            onClick={onAddTable}
                            className="table-control-btn add-table-btn"
                            disabled={tables >= 100}
                        >
                            + Add Table
                        </button>
                        <button
                            onClick={onRemoveTable}
                            disabled={tables <= 1}
                            className="table-control-btn remove-table-btn"
                        >
                            - Remove Table
                        </button>
                    </div>
                </div>

                <div className="tables-grid">
                    {Array.from({ length: tables }).map((_, i) => {
                        const tableId = i + 1;
                        const assignedMatch = matches.find(m => m.table === tableId);

                        return (
                            <div
                                key={tableId}
                                className={`table-assignment-card ${assignedMatch ? 'occupied' : ''}`}
                            >
                                <div className="table-card-header">
                                    <h4 className="table-card-title">{getTableName(tableId)}</h4>
                                    <span className="table-card-number">{tableId === 1 ? 'S' : tableId - 1}</span>
                                </div>

                                <div className="table-card-content">
                                    {assignedMatch ? (
                                        <div className="table-match-display">
                                            <div className="table-match-players">
                                                {getParticipantName(assignedMatch.opponent1?.id)}
                                                <span className="table-match-vs"> vs </span>
                                                {getParticipantName(assignedMatch.opponent2?.id)}
                                            </div>
                                            <div className="table-match-round">
                                                Match #{assignedMatch.number} • {friendlyRound(assignedMatch)}
                                            </div>

                                            <div className="table-actions">
                                                <button
                                                    onClick={() => onOpenScoreModal ? onOpenScoreModal(assignedMatch) : undefined}
                                                    className="table-action-btn score-match-btn"
                                                >
                                                    Enter Score
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        onReturnToWaiting(assignedMatch);
                                                        // clear any selected table for this match so the dropdown reflects it's waiting
                                                        setSelectedTable(assignedMatch.id, null);
                                                    }}
                                                    className="table-action-btn return-match-btn"
                                                >
                                                    Return to Waiting
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="table-empty-state">
                                            <div>🏓</div>
                                            <div>Table Available</div>
                                            {waitingMatches.length > 0 ? (
                                                <button
                                                    onClick={() => handleAssignNext(tableId)}
                                                    className="table-action-btn manual-assign-btn"
                                                    style={{ marginTop: 'var(--spacing-md)' }}
                                                    title="Assign next waiting match to this table"
                                                >
                                                    Assign Next
                                                </button>
                                            ) : (
                                                <div style={{
                                                    marginTop: 'var(--spacing-md)',
                                                    fontSize: 'var(--font-size-sm)',
                                                    color: 'var(--text-secondary)',
                                                    textAlign: 'center'
                                                }}>
                                                    No matches waiting
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Score handling moved to the shared BracketScoreModal rendered by renderer.tsx */}
        </div>
    );
};

export default TableAssignmentNew;