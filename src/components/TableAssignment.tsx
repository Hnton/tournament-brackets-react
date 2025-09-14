import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Match } from '../types';

interface ScoreModalProps {
    match: Match;
    onSubmit: (score1: number, score2: number) => void;
    onClose: () => void;
}

const ScoreModal: React.FC<ScoreModalProps> = ({ match, onSubmit, onClose }) => {
    const [score1, setScore1] = useState('');
    const [score2, setScore2] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
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
                            {isSubmitting ? 'Submitting...' : 'Submit Score'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

interface TableMatchModalProps {
    match: Match;
    tableName: string;
    onSubmitScore: () => void;
    onRemoveFromTable: () => void;
    onClose: () => void;
}

const TableMatchModal: React.FC<TableMatchModalProps> = ({ match, tableName, onSubmitScore, onRemoveFromTable, onClose }) => {
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
                <h3 id="table-match-modal-title" className="modal-header">Match on {tableName}</h3>

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
                            Match #{match.id} • {tableName}
                        </div>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-lg)' }}>
                        What would you like to do with this match?
                    </p>
                </div>

                <div className="modal-actions" style={{ flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                    {!match.winner && (
                        <button type="button" className="primary" onClick={onSubmitScore} style={{ width: '100%' }}>
                            📊 Submit Score
                        </button>
                    )}
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

interface TableAssignmentProps {
    tables: number;
    matches: Match[];
    onMoveMatch: (match: Match, tableId?: number) => void;
    onReturnToWaiting: (match: Match) => void;
    waitingMatches: Match[];
    onSubmitScore: (match: Match, score1: number, score2: number) => void;
    onAddTable: () => void;
    onRemoveTable: () => void;
}

export const TableAssignment: React.FC<TableAssignmentProps> = ({ tables, matches, onMoveMatch, onReturnToWaiting, waitingMatches, onSubmitScore, onAddTable, onRemoveTable }) => {
    const [waitingTableSelect, setWaitingTableSelect] = React.useState<{ [matchId: number]: string }>({});
    const [selectedMatch, setSelectedMatch] = React.useState<Match | null>(null);
    const [scoreModal, setScoreModal] = React.useState<Match | null>(null);
    const [tableNames, setTableNames] = React.useState<{ [tableId: number]: string }>({});
    const [autoAssign, setAutoAssign] = React.useState<{ [tableId: number]: boolean }>({});
    const [editingTableName, setEditingTableName] = React.useState<number | null>(null);
    const [masterAutoAssign, setMasterAutoAssign] = React.useState<boolean>(false);

    // Auto-assign logic and winner cleanup
    useEffect(() => {
        // Use a small delay to ensure match state is fully updated
        const timer = setTimeout(() => {
            // First, check for completed matches and remove them from tables
            // Completed matches won't appear in waitingMatches since they have winners
            const completedMatches = matches.filter(m => m.table && m.winner);
            completedMatches.forEach(match => {
                if (match.table) {
                    // Remove completed matches from table (they won't go to waiting due to having winners)
                    onReturnToWaiting(match);
                }
            });

            // Then, auto-assign waiting matches to available tables
            if (waitingMatches.length > 0) {
                const occupiedTables = new Set(matches.filter(m => m.table && !m.winner).map(m => m.table));
                const availableTable = Array.from({ length: tables }, (_, i) => i + 1)
                    .find(tableId => !occupiedTables.has(tableId) && autoAssign[tableId]);

                if (availableTable && waitingMatches[0]) {
                    const nextMatch = waitingMatches[0];
                    onMoveMatch(nextMatch, availableTable);
                }
            }
        }, 100); // Small delay to ensure state consistency

        return () => clearTimeout(timer);
    }, [autoAssign, waitingMatches, matches, tables, onMoveMatch, onReturnToWaiting]);

    const getTableName = (tableId: number) => {
        return tableNames[tableId] || `Table ${tableId}`;
    };

    const handleTableNameSubmit = (tableId: number, newName: string) => {
        if (newName.trim()) {
            setTableNames(prev => ({ ...prev, [tableId]: newName.trim() }));
        }
        setEditingTableName(null);
    };

    const handleMasterAutoAssign = (enabled: boolean) => {
        setMasterAutoAssign(enabled);
        // Set all tables to the same auto-assign state
        const newAutoAssign: { [tableId: number]: boolean } = {};
        for (let i = 1; i <= tables; i++) {
            newAutoAssign[i] = enabled;
        }
        setAutoAssign(newAutoAssign);
    };

    // Sync master toggle with individual table states
    React.useEffect(() => {
        const currentStates = Array.from({ length: tables }, (_, i) => autoAssign[i + 1] || false);
        const allEnabled = currentStates.length > 0 && currentStates.every(Boolean);
        setMasterAutoAssign(allEnabled);
    }, [autoAssign, tables]);

    return (
        <div style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                    Active Tables ({tables})
                </h2>
                <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                    <button
                        onClick={onAddTable}
                        disabled={tables >= 16}
                        style={{
                            fontSize: 'var(--font-size-xs)',
                            background: tables >= 16 ? 'var(--bg-tertiary)' : 'var(--accent-success)',
                            color: tables >= 16 ? 'var(--text-muted)' : 'var(--text-inverse)',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            padding: '4px 8px',
                            cursor: tables >= 16 ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px'
                        }}
                        title={tables >= 16 ? "Maximum 16 tables reached" : "Add new table"}
                    >
                        + Add Table
                    </button>
                    <button
                        onClick={onRemoveTable}
                        disabled={tables <= 1}
                        style={{
                            fontSize: 'var(--font-size-xs)',
                            background: tables <= 1 ? 'var(--bg-tertiary)' : 'var(--accent-error)',
                            color: tables <= 1 ? 'var(--text-muted)' : 'var(--text-inverse)',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            padding: '4px 8px',
                            cursor: tables <= 1 ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px'
                        }}
                        title={tables <= 1 ? "Cannot remove the last table" : "Remove the last table"}
                    >
                        - Remove
                    </button>
                </div>
            </div>

            {/* Master Auto-Assign Toggle */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 'var(--spacing-sm)',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                border: `2px solid ${masterAutoAssign ? 'var(--accent-secondary)' : 'var(--border-light)'}`,
                marginBottom: 'var(--spacing-md)',
                gap: 'var(--spacing-sm)'
            }}>
                <span style={{
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 600,
                    color: 'var(--text-primary)'
                }}>
                    🚀 Auto-Assign All Tables
                </span>
                <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-xs)',
                    cursor: 'pointer'
                }}>
                    <input
                        type="checkbox"
                        checked={masterAutoAssign}
                        onChange={(e) => handleMasterAutoAssign(e.target.checked)}
                        style={{
                            margin: 0,
                            scale: '1.2',
                            accentColor: 'var(--accent-secondary)'
                        }}
                    />
                    <span style={{
                        fontSize: 'var(--font-size-sm)',
                        color: masterAutoAssign ? 'var(--accent-secondary)' : 'var(--text-secondary)',
                        fontWeight: masterAutoAssign ? 600 : 400,
                        transition: 'color var(--transition-fast)'
                    }}>
                        {masterAutoAssign ? 'Enabled' : 'Disabled'}
                    </span>
                </label>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)' }}>
                {Array.from({ length: tables }).map((_, i) => {
                    const match = matches.find(m => m.table === i + 1);
                    const isTableOccupied = !!match;
                    return (
                        <div
                            key={i}
                            className="table-card"
                            style={{
                                background: 'var(--bg-secondary)',
                                border: `2px solid ${isTableOccupied ? 'var(--accent-success)' : (autoAssign[i + 1] ? 'var(--accent-secondary)' : 'var(--border-light)')}`,
                                borderRadius: 'var(--radius-md)',
                                padding: 'var(--spacing-sm)',
                                minHeight: '80px',
                                color: 'var(--text-primary)',
                                boxShadow: autoAssign[i + 1] && !isTableOccupied ? 'var(--shadow-lg), 0 0 0 1px rgba(99, 102, 241, 0.2)' : 'var(--shadow-sm)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative',
                                transition: 'all var(--transition-base)'
                            }}
                        >
                            {editingTableName === (i + 1) ? (
                                <input
                                    type="text"
                                    defaultValue={getTableName(i + 1)}
                                    style={{
                                        fontSize: 'var(--font-size-sm)',
                                        fontWeight: 600,
                                        textAlign: 'center',
                                        border: '1px solid var(--accent-primary)',
                                        borderRadius: 'var(--radius-sm)',
                                        padding: '2px 4px',
                                        marginBottom: 'var(--spacing-xs)',
                                        background: 'var(--bg-primary)',
                                        color: 'var(--text-primary)',
                                        width: '80px'
                                    }}
                                    autoFocus
                                    onBlur={(e) => handleTableNameSubmit(i + 1, e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleTableNameSubmit(i + 1, e.currentTarget.value);
                                        } else if (e.key === 'Escape') {
                                            setEditingTableName(null);
                                        }
                                    }}
                                />
                            ) : (
                                <div
                                    style={{
                                        fontWeight: 600,
                                        fontSize: 'var(--font-size-sm)',
                                        marginBottom: 'var(--spacing-xs)',
                                        color: 'var(--text-primary)',
                                        cursor: 'pointer',
                                        padding: '2px 4px',
                                        borderRadius: 'var(--radius-sm)',
                                        transition: 'background-color var(--transition-fast)'
                                    }}
                                    onClick={() => setEditingTableName(i + 1)}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    title="Click to rename"
                                >
                                    {getTableName(i + 1)}
                                </div>
                            )}

                            {/* Auto-assign toggle for each table */}
                            <div style={{
                                position: 'absolute',
                                top: 'var(--spacing-xs)',
                                right: 'var(--spacing-xs)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                background: autoAssign[i + 1] ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-tertiary)',
                                padding: '2px 6px',
                                borderRadius: 'var(--radius-sm)',
                                border: autoAssign[i + 1] ? '1px solid var(--accent-secondary)' : '1px solid var(--border-light)'
                            }}>
                                <input
                                    type="checkbox"
                                    checked={autoAssign[i + 1] || false}
                                    onChange={(e) => {
                                        setAutoAssign(prev => ({ ...prev, [i + 1]: e.target.checked }));
                                        // Update master toggle based on individual table states
                                        const newState = { ...autoAssign, [i + 1]: e.target.checked };
                                        const allEnabled = Array.from({ length: tables }, (_, j) => newState[j + 1]).every(Boolean);
                                        setMasterAutoAssign(allEnabled);
                                    }}
                                    style={{ margin: 0, scale: '0.7' }}
                                    title="Auto-assign matches to this table"
                                />
                                <span style={{
                                    fontSize: 'var(--font-size-xs)',
                                    color: autoAssign[i + 1] ? 'var(--accent-secondary)' : 'var(--text-secondary)',
                                    fontWeight: autoAssign[i + 1] ? 500 : 400
                                }}>
                                    Auto
                                </span>
                            </div>

                            {match ? (
                                <div
                                    style={{
                                        cursor: match.winner ? 'default' : 'pointer',
                                        padding: 'var(--spacing-xs)',
                                        borderRadius: 'var(--radius-sm)',
                                        transition: 'background-color var(--transition-fast)',
                                        opacity: match.winner ? 0.7 : 1
                                    }}
                                    onClick={() => !match.winner && setSelectedMatch(match)}
                                    onMouseEnter={(e) => !match.winner && (e.currentTarget.style.backgroundColor = 'rgba(0, 123, 255, 0.1)')}
                                    onMouseLeave={(e) => !match.winner && (e.currentTarget.style.backgroundColor = 'transparent')}
                                >
                                    <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, textAlign: 'center', marginBottom: 'var(--spacing-xs)' }}>
                                        {match.player1?.name || 'TBD'} vs {match.player2?.name || 'TBD'}
                                    </div>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-sm)', textAlign: 'center' }}>
                                        Match #{match.id}
                                    </div>
                                    {match.winner ? (
                                        <div>
                                            <div style={{
                                                fontSize: 'var(--font-size-xs)',
                                                color: 'var(--accent-success)',
                                                fontWeight: 600,
                                                padding: '2px 6px',
                                                background: 'rgba(34, 197, 94, 0.1)',
                                                borderRadius: '4px',
                                                marginBottom: 'var(--spacing-xs)',
                                                textAlign: 'center'
                                            }}>
                                                ✓ Winner: {match.winner.name}
                                            </div>
                                            <div style={{
                                                fontSize: 'var(--font-size-xs)',
                                                color: 'var(--accent-warning)',
                                                textAlign: 'center',
                                                fontStyle: 'italic'
                                            }}>
                                                🔄 Auto-removing...
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textAlign: 'center' }}>
                                            Click to score or remove
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>No match assigned</div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Waiting Matches Section */}
            <div style={{ marginTop: 'var(--spacing-lg)' }}>
                <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-sm)', color: 'var(--text-primary)' }}>
                    Waiting Matches ({waitingMatches.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                    {waitingMatches.map(match => {
                        const occupiedTables = new Set(matches.filter(m => m.table).map(m => m.table));
                        const selectedTable = waitingTableSelect[match.id] || '';
                        return (
                            <div
                                key={match.id}
                                style={{
                                    background: 'var(--bg-tertiary)',
                                    borderRadius: 'var(--radius-sm)',
                                    padding: 'var(--spacing-sm)',
                                    border: '1px solid var(--border-light)',
                                    fontSize: 'var(--font-size-xs)'
                                }}
                            >
                                <div style={{ fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                    {match.player1?.name || 'TBD'} vs {match.player2?.name || 'TBD'}
                                </div>
                                <div style={{ display: 'flex', gap: 'var(--spacing-xs)', alignItems: 'center', marginTop: 'var(--spacing-xs)' }}>
                                    <select
                                        style={{ fontSize: 'var(--font-size-xs)', borderRadius: 'var(--radius-sm)', padding: '2px 4px', flex: 1 }}
                                        value={selectedTable}
                                        onChange={e => setWaitingTableSelect(sel => ({ ...sel, [match.id]: e.target.value }))}
                                    >
                                        <option value="">Select Table</option>
                                        {Array.from({ length: tables }).map((_, j) => (
                                            <option key={j + 1} value={j + 1} disabled={occupiedTables.has(j + 1)}>
                                                {getTableName(j + 1)}{occupiedTables.has(j + 1) ? ' (Occupied)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        style={{
                                            fontSize: 'var(--font-size-xs)',
                                            background: 'var(--accent-primary)',
                                            color: 'var(--text-inverse)',
                                            border: 'none',
                                            borderRadius: 'var(--radius-sm)',
                                            padding: '4px 8px',
                                            cursor: 'pointer'
                                        }}
                                        disabled={!selectedTable}
                                        onClick={() => {
                                            if (selectedTable) {
                                                onMoveMatch(match, Number(selectedTable));
                                                setWaitingTableSelect(sel => ({ ...sel, [match.id]: '' }));
                                            }
                                        }}
                                    >
                                        Assign
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    {waitingMatches.length === 0 && (
                        <div style={{
                            padding: 'var(--spacing-md)',
                            textAlign: 'center',
                            color: 'var(--text-muted)',
                            fontSize: 'var(--font-size-sm)',
                            fontStyle: 'italic'
                        }}>
                            No matches waiting
                        </div>
                    )}
                </div>
            </div>

            {selectedMatch && (
                <TableMatchModal
                    match={selectedMatch}
                    tableName={getTableName(selectedMatch.table || 1)}
                    onSubmitScore={() => {
                        setScoreModal(selectedMatch);
                        setSelectedMatch(null);
                    }}
                    onRemoveFromTable={() => {
                        onReturnToWaiting(selectedMatch);
                        setSelectedMatch(null);
                    }}
                    onClose={() => setSelectedMatch(null)}
                />
            )}

            {scoreModal && (
                <ScoreModal
                    match={scoreModal}
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
