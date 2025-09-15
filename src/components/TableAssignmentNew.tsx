import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Match, Participant } from '../types';

interface ScoreModalProps {
    match: Match;
    onSubmit: (score1: number, score2: number) => void;
    onClose: () => void;
    participants: Participant[];
}

const ScoreModal: React.FC<ScoreModalProps> = ({ match, onSubmit, onClose, participants }) => {
    const [score1, setScore1] = React.useState('');
    const [score2, setScore2] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const modalRef = useRef<HTMLDivElement>(null);

    // Helper function to get participant name by ID
    const getParticipantName = (participantId: number | null | undefined): string => {
        if (!participantId) return 'TBD';
        const participant = participants.find(p => p.id === participantId);
        return participant?.name || 'TBD';
    };

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        const handleClickOutside = (e: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        document.addEventListener('mousedown', handleClickOutside);

        // Focus the first input
        const firstInput = modalRef.current?.querySelector('input');
        if (firstInput) firstInput.focus();

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const s1 = parseInt(score1, 10);
        const s2 = parseInt(score2, 10);

        if (isNaN(s1) || isNaN(s2)) {
            return;
        }

        // Prevent tied scores - someone must win
        if (s1 === s2) {
            return;
        }

        setIsSubmitting(true);
        try {
            onSubmit(s1, s2);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div ref={modalRef} className="modal-content">
                <h3 id="modal-title" className="modal-header">Enter Match Score</h3>

                <form onSubmit={handleSubmit}>
                    <div className="score-inputs">
                        <div className="score-input-row">
                            <label className="score-input-label" htmlFor="score1">
                                {getParticipantName(match.opponent1?.id)}
                            </label>
                            <input
                                id="score1"
                                type="number"
                                className="score-input"
                                value={score1}
                                onChange={(e) => setScore1(e.target.value)}
                                placeholder="0"
                                required
                                disabled={isSubmitting}
                            />
                        </div>

                        <div className="score-input-row">
                            <label className="score-input-label" htmlFor="score2">
                                {getParticipantName(match.opponent2?.id)}
                            </label>
                            <input
                                id="score2"
                                type="number"
                                className="score-input"
                                value={score2}
                                onChange={(e) => setScore2(e.target.value)}
                                placeholder="0"
                                required
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>

                    {/* Show tie error message */}
                    {score1.trim() !== '' && score2.trim() !== '' && parseInt(score1, 10) === parseInt(score2, 10) && (
                        <div className="tie-error" style={{
                            color: 'var(--accent-error)',
                            textAlign: 'center',
                            fontSize: 'var(--font-size-sm)',
                            margin: 'var(--spacing-sm) 0',
                            fontWeight: 500
                        }}>
                            ⚠️ Scores cannot be tied - someone must win!
                        </div>
                    )}

                    <div className="modal-actions">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="primary"
                            disabled={
                                isSubmitting ||
                                score1.trim() === '' ||
                                score2.trim() === '' ||
                                isNaN(parseInt(score1, 10)) ||
                                isNaN(parseInt(score2, 10)) ||
                                (score1.trim() !== '' && score2.trim() !== '' && parseInt(score1, 10) === parseInt(score2, 10))
                            }
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit Score'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

interface TableAssignmentProps {
    tables: number;
    matches: Match[];
    onMoveMatch: (match: Match, tableId?: number) => void;
    onReturnToWaiting: (match: Match) => void;
    waitingMatches: Match[];
    onSubmitScore: (match: Match, score1: number, score2: number) => void;
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
    allMatches
}) => {
    const [scoreModal, setScoreModal] = React.useState<Match | null>(null);

    // Helper function to get user-friendly round number for display
    const getUserFriendlyRoundNumber = (match: Match): string => {
        if (match.group_id === 1) {
            // Winners Bracket: round_id directly corresponds to WB round number
            return `WB Round ${match.round_id}`;
        } else if (match.group_id === 2) {
            // Losers Bracket: Calculate LB round number based on match distribution
            // Use allMatches if available, otherwise fall back to matches + waitingMatches
            const tournamentMatches = allMatches || [...matches, ...waitingMatches];
            const allLBMatches = tournamentMatches.filter(m => m.group_id === 2);
            const uniqueRoundIds = [...new Set(allLBMatches.map(m => m.round_id))].sort((a, b) => a - b);
            const lbRoundNumber = uniqueRoundIds.indexOf(match.round_id) + 1;
            return lbRoundNumber > 0 ? `LB Round ${lbRoundNumber}` : `Round ${match.round_id}`;
        } else {
            // Grand Finals or other special matches
            return `Finals`;
        }
    };

    // Calculate priority score for a match based on double elimination tournament flow
    const getMatchPriority = (match: Match): number => {
        const { group_id, round_id } = match;

        if (group_id === 1) {
            // Winners Bracket Priority
            // WB1 gets highest priority, then WB2, etc.
            // Base: 10000, subtract round to prioritize earlier rounds
            return 10000 - (round_id * 100);
        } else if (group_id === 2) {
            // Losers Bracket Priority
            // LB matches can run in parallel with WB matches of same "stage"
            // LB1 runs after WB1, LB2 can run with WB2, etc.

            if (round_id === 1) {
                // LB1: Must wait for WB1 to complete, but high priority after that
                return 9900; // Just below WB1
            } else if (round_id % 2 === 0) {
                // Even LB rounds (LB2, LB4, LB6...): Can run parallel with corresponding WB round
                // LB2 with WB2, LB4 with WB3, etc.
                const correspondingWBRound = (round_id / 2) + 1;
                return 10000 - (correspondingWBRound * 100) - 10; // Slightly below corresponding WB round
            } else {
                // Odd LB rounds (LB3, LB5, LB7...): Must wait for WB round to complete
                const correspondingWBRound = Math.ceil(round_id / 2);
                return 10000 - (correspondingWBRound * 100) - 50; // Below WB round but above next level
            }
        } else {
            // Grand Finals and special matches
            if (group_id === 3) {
                // Grand Final: Highest priority when ready
                return 15000 - round_id;
            } else {
                // Reset matches or other finals
                return 14000 - round_id;
            }
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

        // If nothing remains after filtering, fallback to original availableMatches (safe fallback)
        const usableMatches = filteredAvailable.length > 0 ? filteredAvailable : availableMatches;

        // Group usable matches by bracket and round
        const wbMatches = usableMatches.filter(m => m.group_id === 1);
        const lbMatches = usableMatches.filter(m => m.group_id === 2);
        const gfMatches = usableMatches.filter(m => m.group_id >= 3);

        // Priority 1: Grand Finals (when available, always highest priority)
        if (gfMatches.length > 0) {
            const sortedGF = gfMatches.sort((a, b) => getMatchPriority(b) - getMatchPriority(a));
            return sortedGF[0] || null;
        }

        // Priority 2: Winners Bracket (foundation of the tournament)
        if (wbMatches.length > 0) {
            const sortedWB = wbMatches.sort((a, b) => {
                // First by round (earlier rounds first)
                if (a.round_id !== b.round_id) {
                    return a.round_id - b.round_id;
                }
                // Then by match number within round
                return a.number - b.number;
            });

            // Check if we should prioritize WB over LB based on parallel execution rules
            const earliestWBRound = sortedWB[0]?.round_id;
            if (!earliestWBRound) return sortedWB[0] || null;

            // If there are LB matches that can run parallel with current WB round
            const parallelLBMatches = lbMatches.filter(lb => {
                if (lb.round_id === 1) return false; // LB1 must wait for WB1 to complete

                // Even LB rounds can run with WB rounds
                if (lb.round_id % 2 === 0) {
                    const correspondingWBRound = (lb.round_id / 2) + 1;
                    return correspondingWBRound === earliestWBRound;
                }
                return false;
            });

            // If we have parallel LB matches and tables available, consider both
            if (parallelLBMatches.length > 0) {
                // Prefer WB but allow LB to run in parallel
                // Check if current WB round is already being played
                const currentWBRoundInPlay = assignedMatches.wb.some(m => m.round_id === earliestWBRound);

                if (currentWBRoundInPlay && parallelLBMatches.length > 0) {
                    // WB round is already running, prioritize parallel LB matches
                    const sortedParallelLB = parallelLBMatches.sort((a, b) => a.number - b.number);
                    return sortedParallelLB[0] || null;
                }
            }

            return sortedWB[0] || null;
        }

        // Priority 3: Losers Bracket (when no WB matches available)
        if (lbMatches.length > 0) {
            const sortedLB = lbMatches.sort((a, b) => {
                // First by round (earlier rounds first)
                if (a.round_id !== b.round_id) {
                    return a.round_id - b.round_id;
                }
                // Then by match number within round
                return a.number - b.number;
            });

            return sortedLB[0] || null;
        }

        return null;
    };

    // Manual assign function with proper double elimination priority
    const handleAssignNext = (tableId: number) => {
        const nextMatch = getOptimalMatch(waitingMatches);
        if (nextMatch) {
            console.log(`Assigning match #${nextMatch.number} (Group ${nextMatch.group_id}, Round ${nextMatch.round_id}) to table ${tableId}`);
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
                                                    onClick={() => {
                                                        // Find first available table
                                                        const occupiedTables = new Set(
                                                            matches.filter(m => m.table !== null && m.table !== undefined).map(m => m.table as number)
                                                        );
                                                        const availableTable = Array.from({ length: tables }, (_, i) => i + 1)
                                                            .find(tableId => !occupiedTables.has(tableId));

                                                        if (availableTable) {
                                                            onMoveMatch(match, availableTable);
                                                        }
                                                    }}
                                                    title="Click to assign to first available table"
                                                >
                                                    <div className="waiting-match-players">
                                                        {getParticipantName(match.opponent1?.id)}
                                                        <span className="waiting-match-vs"> vs </span>
                                                        {getParticipantName(match.opponent2?.id)}
                                                    </div>
                                                    <div className="waiting-match-details">
                                                        Match #{match.number} • {getUserFriendlyRoundNumber(match)}
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
                                                    onClick={() => {
                                                        // Find first available table
                                                        const occupiedTables = new Set(
                                                            matches.filter(m => m.table !== null && m.table !== undefined).map(m => m.table as number)
                                                        );
                                                        const availableTable = Array.from({ length: tables }, (_, i) => i + 1)
                                                            .find(tableId => !occupiedTables.has(tableId));

                                                        if (availableTable) {
                                                            onMoveMatch(match, availableTable);
                                                        }
                                                    }}
                                                    title="Click to assign to first available table"
                                                >
                                                    <div className="waiting-match-players">
                                                        {getParticipantName(match.opponent1?.id)}
                                                        <span className="waiting-match-vs"> vs </span>
                                                        {getParticipantName(match.opponent2?.id)}
                                                    </div>
                                                    <div className="waiting-match-details">
                                                        Match #{match.number} • {getUserFriendlyRoundNumber(match)}
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
                                                    onClick={() => {
                                                        // Find first available table
                                                        const occupiedTables = new Set(
                                                            matches.filter(m => m.table !== null && m.table !== undefined).map(m => m.table as number)
                                                        );
                                                        const availableTable = Array.from({ length: tables }, (_, i) => i + 1)
                                                            .find(tableId => !occupiedTables.has(tableId));

                                                        if (availableTable) {
                                                            onMoveMatch(match, availableTable);
                                                        }
                                                    }}
                                                    title="Click to assign to first available table"
                                                >
                                                    <div className="waiting-match-players">
                                                        {getParticipantName(match.opponent1?.id)}
                                                        <span className="waiting-match-vs"> vs </span>
                                                        {getParticipantName(match.opponent2?.id)}
                                                    </div>
                                                    <div className="waiting-match-details">
                                                        Match #{match.number} • {getUserFriendlyRoundNumber(match)}
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
                                                Match #{assignedMatch.number} • {getUserFriendlyRoundNumber(assignedMatch)}
                                            </div>

                                            <div className="table-actions">
                                                <button
                                                    onClick={() => setScoreModal(assignedMatch)}
                                                    className="table-action-btn score-match-btn"
                                                >
                                                    Enter Score
                                                </button>
                                                <button
                                                    onClick={() => onReturnToWaiting(assignedMatch)}
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

            {/* Score Modal */}
            {scoreModal && (
                <ScoreModal
                    match={scoreModal}
                    participants={participants}
                    onSubmit={(score1, score2) => {
                        onSubmitScore(scoreModal, score1, score2);
                        setScoreModal(null);
                    }}
                    onClose={() => setScoreModal(null)}
                />
            )}
        </div>
    );
};

export default TableAssignmentNew;