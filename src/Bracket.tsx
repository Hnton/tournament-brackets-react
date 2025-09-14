import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Player } from './types';
import { Tooltip } from './components/Tooltip';

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

interface BracketProps {
    players: Player[];
    onMatchUpdate: (match: Match) => void;
    matches: Match[];
    onRemoveFromTable?: (match: Match) => void;
}

interface MatchCardProps {
    match: Match;
    onClick: () => void;
    isDisabled: boolean;
}

const MatchCard: React.FC<MatchCardProps> = ({ match, onClick, isDisabled }) => {
    const getMatchStatus = () => {
        if (match.winner) return 'completed';
        if (match.player1 && match.player2) return 'pending';
        return 'waiting';
    };

    const getCardClassName = () => {
        const status = getMatchStatus();
        const baseClass = 'match-card';

        if (isDisabled) return `${baseClass} disabled`;
        if (status === 'completed') return `${baseClass} completed`;
        if (match.table !== undefined) return `${baseClass} on-table`;
        if (status === 'pending') return `${baseClass} pending`;
        return baseClass;
    };

    const hasScore = match.score1 !== undefined && match.score2 !== undefined;

    const getTooltipContent = () => {
        if (match.winner) return `Winner: ${match.winner.name} - Click to edit score`;
        if (match.player1 && match.player2) {
            if (match.table !== undefined) {
                return `On Table ${match.table} - Click for options`;
            }
            return 'Click to enter score';
        }
        return 'Waiting for players';
    };

    return (
        <Tooltip content={getTooltipContent()}>
            <div
                className={getCardClassName()}
                onClick={isDisabled ? undefined : onClick}
                role="button"
                tabIndex={isDisabled ? -1 : 0}
                aria-label={`Match between ${match.player1?.name || 'TBD'} and ${match.player2?.name || 'TBD'}`}
                onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && !isDisabled) {
                        e.preventDefault();
                        onClick();
                    }
                }}
            >
                <div className="match-players">
                    <div className={`player-slot ${match.winner && match.player1 && match.winner.name === match.player1.name ? 'winner' : ''}`}>
                        <span className={`player-name ${!match.player1 ? 'tbd' : ''}`}>
                            {match.player1?.name || 'TBD'}
                        </span>
                        {hasScore && (
                            <span className="player-score">{match.score1}</span>
                        )}
                    </div>
                    <div className={`player-slot ${match.winner && match.player2 && match.winner.name === match.player2.name ? 'winner' : ''}`}>
                        <span className={`player-name ${!match.player2 ? 'tbd' : ''}`}>
                            {match.player2?.name || 'TBD'}
                        </span>
                        {hasScore && (
                            <span className="player-score">{match.score2}</span>
                        )}
                    </div>
                </div>

                <div className="match-info">
                    <span className="match-id">Match #{match.id}</span>
                    {match.table !== undefined && (
                        <span className="table-indicator" style={{
                            background: 'var(--accent-secondary)',
                            color: 'var(--text-inverse)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: 'var(--font-size-xs)',
                            fontWeight: 600
                        }}>
                            Table {match.table}
                        </span>
                    )}
                    <span className={`match-status ${getMatchStatus()}`}>
                        {getMatchStatus()}
                    </span>
                </div>
            </div>
        </Tooltip>
    );
};

interface ScoreModalProps {
    match: Match;
    onSubmit: (score1: number, score2: number) => void;
    onClose: () => void;
}

const ScoreModal: React.FC<ScoreModalProps> = ({ match, onSubmit, onClose }) => {
    // Pre-populate with existing scores if editing
    const [score1, setScore1] = useState(match.score1?.toString() || '');
    const [score2, setScore2] = useState(match.score2?.toString() || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);
    const isEditing = match.winner !== undefined && match.score1 !== undefined && match.score2 !== undefined;

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
                <h3 id="modal-title" className="modal-header">
                    {isEditing ? 'Edit Match Score' : 'Enter Match Score'}
                </h3>

                <form onSubmit={handleSubmit}>
                    <div className="score-inputs">
                        <div className="score-input-row">
                            <label className="score-input-label" htmlFor="score1">
                                {match.player1?.name}
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
                                {match.player2?.name}
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
                            {isSubmitting ? (isEditing ? 'Updating...' : 'Submitting...') : (isEditing ? 'Update Score' : 'Submit Score')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

interface TableMatchModalProps {
    match: Match;
    onSubmitScore: () => void;
    onRemoveFromTable: () => void;
    onClose: () => void;
}

const TableMatchModal: React.FC<TableMatchModalProps> = ({ match, onSubmitScore, onRemoveFromTable, onClose }) => {
    const modalRef = useRef<HTMLDivElement>(null);

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

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    return (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="table-match-modal-title">
            <div ref={modalRef} className="modal-content">
                <h3 id="table-match-modal-title" className="modal-header">Match on Table {match.table}</h3>

                <div style={{ padding: 'var(--spacing-lg)', textAlign: 'center' }}>
                    <div style={{
                        background: 'var(--bg-tertiary)',
                        padding: 'var(--spacing-md)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 'var(--spacing-lg)'
                    }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--spacing-sm)' }}>
                            {match.player1?.name} vs {match.player2?.name}
                        </div>
                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                            Match #{match.id} • Table {match.table}
                        </div>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-lg)' }}>
                        What would you like to do with this match?
                    </p>
                </div>

                <div className="modal-actions" style={{ flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                    <button type="button" className="primary" onClick={onSubmitScore} style={{ width: '100%' }}>
                        📊 Submit Score
                    </button>
                    <button type="button" onClick={onRemoveFromTable} style={{ width: '100%' }}>
                        🔄 Remove from Table
                    </button>
                    <button type="button" onClick={onClose} style={{ width: '100%', marginTop: 'var(--spacing-sm)' }}>
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export const Bracket: React.FC<BracketProps> = ({ players, onMatchUpdate, matches, onRemoveFromTable }) => {
    const [scoreModal, setScoreModal] = useState<Match | null>(null);
    const [tableMatchModal, setTableMatchModal] = useState<Match | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Group matches by round
    const matchesByRound = React.useMemo(() => {
        const rounds: { [round: number]: Match[] } = {};
        matches.forEach(match => {
            if (!rounds[match.round]) rounds[match.round] = [];
            rounds[match.round]!.push(match);
        });
        return rounds;
    }, [matches]);

    const rounds = Object.keys(matchesByRound)
        .map(Number)
        .sort((a, b) => a - b);

    const getRoundName = (round: number, totalRounds: number) => {
        const roundsFromEnd = totalRounds - round + 1;
        if (roundsFromEnd === 1) return 'Final';
        if (roundsFromEnd === 2) return 'Semifinals';
        if (roundsFromEnd === 3) return 'Quarterfinals';
        return `Round ${round}`;
    };

    const openScoreModal = (match: Match) => {
        if (!match.player1 || !match.player2) return;

        // If match is on a table (and not yet completed), show table match modal with both options
        if (match.table !== undefined && !match.winner) {
            setTableMatchModal(match);
            return;
        }

        setScoreModal(match);
    };

    const submitScore = (score1: number, score2: number) => {
        if (!scoreModal) return;

        let winner: Player | null = null;
        if (score1 > score2) winner = scoreModal.player1;
        else if (score2 > score1) winner = scoreModal.player2;

        onMatchUpdate({
            ...scoreModal,
            score1,
            score2,
            winner
        });

        setScoreModal(null);
    };

    const handleRemoveFromTable = () => {
        if (!tableMatchModal || !onRemoveFromTable) return;
        onRemoveFromTable(tableMatchModal);
        setTableMatchModal(null);
    };

    const handleSubmitScoreFromTable = () => {
        if (!tableMatchModal) return;
        setTableMatchModal(null);
        setScoreModal(tableMatchModal);
    };

    const isMatchDisabled = (match: Match) => {
        return !match.player1 || !match.player2;
    };

    return (
        <div className="container">
            <h1 style={{
                fontSize: 'var(--font-size-3xl)',
                fontWeight: 700,
                textAlign: 'center',
                marginBottom: 'var(--spacing-lg)',
                color: 'var(--text-primary)'
            }}>
                Tournament Bracket
            </h1>

            <div className="bracket-container" ref={containerRef}>
                <div className="bracket-grid" style={{
                    gridTemplateColumns: `repeat(${rounds.length}, 280px)`,
                    gap: '20px',
                    justifyContent: 'start'
                }}>
                    {rounds.map((round, roundIndex) => {
                        const roundMatches = matchesByRound[round] || [];

                        return (
                            <div key={round} className="bracket-round" style={{ position: 'relative' }}>
                                <div className="round-header">
                                    {getRoundName(round, rounds.length)}
                                </div>

                                {roundMatches.map((match) => (
                                    <MatchCard
                                        key={match.id}
                                        match={match}
                                        onClick={() => openScoreModal(match)}
                                        isDisabled={isMatchDisabled(match)}
                                    />
                                ))}
                            </div>
                        );
                    })}
                </div>


            </div>

            {scoreModal && (
                <ScoreModal
                    match={scoreModal}
                    onSubmit={submitScore}
                    onClose={() => setScoreModal(null)}
                />
            )}

            {tableMatchModal && (
                <TableMatchModal
                    match={tableMatchModal}
                    onSubmitScore={handleSubmitScoreFromTable}
                    onRemoveFromTable={handleRemoveFromTable}
                    onClose={() => setTableMatchModal(null)}
                />
            )}
        </div>
    );
};
