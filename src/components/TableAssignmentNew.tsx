import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Match, Participant } from '../types';
import { getUserFriendlyRoundNumber } from '../utils';

// TUNABLE: Increase >1 to make Losers Bracket matches more aggressive (higher priority)
// Decrease <1 to make losers less aggressive. Default 1.05 gives a modest boost to LB.
const LB_AGGRESSIVENESS = 1.25;

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