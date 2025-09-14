import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { PlayerUpload } from './components/PlayerUpload';
import { PlayerList } from './components/PlayerList';
import { Bracket } from './components/Bracket';
import { TableAssignment } from './components/TableAssignment';
import { ScoreModal } from './components/ScoreModal';
import { Player, Match, TableSettings, TournamentState, BracketType, DoubleBracketState } from './types';
import { getDefaultTableName, shuffleArray, generateDemoPlayers, isBye } from './utils';
import { generateSingleElim, generateDemoTournament, updateMatchWithScore, generateDoubleElim, flattenDoubleBracket, updateDoubleElimMatch, generateDemoDoubleElim } from './services/tournamentLogic';
import { autoAssignMatches, assignMatchToTable, removeMatchFromTable, updateTableSettings } from './services/tableManager';



const App = () => {
    const [players, setPlayers] = useState<Player[]>([]);
    const [matches, setMatches] = useState<Match[]>([]);
    const [tournamentStarted, setTournamentStarted] = useState(false);
    const [tournamentComplete, setTournamentComplete] = useState(false);
    const [tableCount, setTableCount] = useState(1);
    const [tableAssignments, setTableAssignments] = useState<(number | null)[]>([]);
    const [activeTab, setActiveTab] = useState<'bracket' | 'tables'>('bracket');
    const [globalAutoAssign, setGlobalAutoAssign] = useState(true);
    const [tableSettings, setTableSettings] = useState<{ [key: number]: { name: string, doNotAutoAssign: boolean } }>({
        1: { name: 'Stream', doNotAutoAssign: false }
    });
    const [bracketType, setBracketType] = useState<BracketType>('single');
    const [doubleBracket, setDoubleBracket] = useState<DoubleBracketState | null>(null);

    const [tableScoreModal, setTableScoreModal] = useState<Match | null>(null);

    // Initialize table assignments array based on table count
    useEffect(() => {
        setTableAssignments(prev => {
            const newAssignments = [...prev];
            // Expand array if needed
            while (newAssignments.length < tableCount) {
                newAssignments.push(null);
            }
            // Shrink array if needed
            if (newAssignments.length > tableCount) {
                return newAssignments.slice(0, tableCount);
            }
            return newAssignments;
        });
    }, [tableCount, tournamentStarted]);

    // Migrate table 1 name from old naming to new "Stream" naming
    useEffect(() => {
        if (tableSettings[1]?.name === 'Table 1') {
            setTableSettings(prev => ({
                ...prev,
                [1]: { name: 'Stream', doNotAutoAssign: prev[1]?.doNotAutoAssign || false }
            }));
        }
    }, [tableSettings]);



    // Initialize table assignments array when tournament starts or table count changes
    useEffect(() => {
        if (!tournamentStarted) return;

        // Only initialize the array structure, don't auto-assign matches
        // The new auto-assign system will handle match assignments respecting exclusions
        setTableAssignments(prev => {
            const newAssignments = [...prev];
            // Ensure array is the right length
            while (newAssignments.length < tableCount) {
                newAssignments.push(null);
            }
            // Trim if too long
            if (newAssignments.length > tableCount) {
                return newAssignments.slice(0, tableCount);
            }
            return newAssignments;
        });
    }, [tableCount, tournamentStarted]);


    // Generate single elimination bracket with automatic byes


    // Create demo tournament with example results
    const createDemoTournament = () => {
        const demoPlayers = generateDemoPlayers();

        if (bracketType === 'double') {
            // Generate 64-player double elimination demo with populated results
            const demoMatches = generateDemoDoubleElim(demoPlayers);
            setMatches(demoMatches);

            // Extract the bracket structure from flattened matches
            const winners = demoMatches.filter(m => m.bracket === 'winners');
            const losers = demoMatches.filter(m => m.bracket === 'losers');
            const finals = demoMatches.filter(m => m.bracket === 'finals');

            setDoubleBracket({
                winnersMatches: winners,
                losersMatches: losers,
                finalsMatches: finals,
                winnersChampion: null,
                losersChampion: null
            });
        } else {
            const demoMatches = generateDemoTournament(demoPlayers);
            setMatches(demoMatches);
            setDoubleBracket(null);
        }

        // Set 64 players for demo
        const finalPlayers = bracketType === 'double' ?
            Array.from({ length: 64 }, (_, i) => ({
                name: `Player ${i + 1}`,
                phone: `555-${String(i + 1).padStart(4, '0')}`
            })) : demoPlayers;

        setPlayers(finalPlayers);
        setTournamentStarted(true);
    };

    const startTournament = () => {
        if (bracketType === 'double') {
            const newDoubleBracket = generateDoubleElim(players);
            setDoubleBracket(newDoubleBracket);
            setMatches(flattenDoubleBracket(newDoubleBracket));
        } else {
            setMatches(generateSingleElim(players));
            setDoubleBracket(null);
        }
        setTournamentStarted(true);
    };

    // Table/match movement logic
    const moveMatchToTable = (match: Match, tableId?: number) => {
        setMatches(prev => prev.map(m => m.id === match.id ? { ...m, table: tableId } : m));
    };
    // Return match to waiting
    const returnMatchToWaiting = (match: Match) => {
        // Remove from table assignments
        const tableIndex = tableAssignments.findIndex(assignment => assignment === match.id);
        if (tableIndex !== -1) {
            setTableAssignments(removeMatchFromTable(tableAssignments, tableIndex));
        }
        // Also remove table property from match for backward compatibility
        setMatches(prev => prev.map(m => m.id === match.id ? { ...m, table: undefined } : m));
    };


    // Always compute waiting matches from matches state (single elimination only)
    // Exclude BYE matches from waiting list and matches currently assigned to tables

    const waitingMatches = matches.filter(m =>
        !tableAssignments.includes(m.id) &&
        !m.winner &&
        m.player1 &&
        m.player2 &&
        !isBye(m.player1) &&
        !isBye(m.player2)
    );

    // Table management functions
    const addTable = () => {
        const newTableNumber = tableCount + 1;
        setTableCount(prev => prev + 1);
        setTableSettings(prev => ({
            ...prev,
            [newTableNumber]: { name: `Table ${newTableNumber}`, doNotAutoAssign: false }
        }));
    };

    const removeTable = () => {
        if (tableCount <= 1) return;

        // Check if the last table has a match assigned
        const lastTableMatch = matches.find(m => m.table === tableCount);
        if (lastTableMatch) {
            const confirmRemove = window.confirm(
                `Table ${tableCount} has an active match (${lastTableMatch.player1?.name} vs ${lastTableMatch.player2?.name}). ` +
                'The match will be returned to the waiting list. Continue?'
            );

            if (!confirmRemove) return;

            // Move the match back to waiting before removing the table
            returnMatchToWaiting(lastTableMatch);
        }

        setTableCount(prev => prev - 1);
        // Remove table settings for the removed table
        setTableSettings(prev => {
            const newSettings = { ...prev };
            delete newSettings[tableCount];
            return newSettings;
        });
    };



    // Table settings functions
    const renameTable = (tableNumber: number, newName: string) => {
        setTableSettings(updateTableSettings(tableSettings, tableNumber, { name: newName }));
    };



    // Table score modal functions - use imported ScoreModal functionality
    const handleTableScoreSubmit = (match: Match, score1: number, score2: number, winner: Player | null) => {
        // Create updated match with scores and winner
        const updatedMatch = { ...match, score1, score2, winner };

        if (bracketType === 'double' && doubleBracket) {
            // Use double elimination update logic
            console.log('🎯 Updating double elimination match:', {
                matchId: updatedMatch.id,
                winner: updatedMatch.winner?.name,
                bracket: updatedMatch.bracket,
                round: updatedMatch.round
            });
            const updatedBracket = updateDoubleElimMatch(
                updatedMatch,
                doubleBracket,
                (isComplete) => setTournamentComplete(isComplete)
            );
            console.log('📊 Updated bracket state:', {
                winnersMatches: updatedBracket.winnersMatches.length,
                losersMatches: updatedBracket.losersMatches.length,
                finalsMatches: updatedBracket.finalsMatches.length
            });
            setDoubleBracket(updatedBracket);
            setMatches(flattenDoubleBracket(updatedBracket));
        } else {
            // Use single elimination update logic
            const updatedMatches = updateMatchWithScore(
                matches,
                updatedMatch,
                (isComplete) => setTournamentComplete(isComplete)
            );
            setMatches(updatedMatches);
        }

        // Remove the match from table assignments when completed
        if (winner) {
            const tableIndex = tableAssignments.findIndex(assignment => assignment === match.id);
            if (tableIndex !== -1) {
                setTableAssignments(removeMatchFromTable(tableAssignments, tableIndex));
            }
        }

        setTableScoreModal(null);
    };

    const toggleTableDoNotAutoAssign = (tableNumber: number) => {
        setTableSettings(prev => ({
            ...prev,
            [tableNumber]: {
                name: prev[tableNumber]?.name || getDefaultTableName(tableNumber),
                doNotAutoAssign: !(prev[tableNumber]?.doNotAutoAssign || false)
            }
        }));
    };

    // Auto-assign function for individual tables
    const autoAssignToTable = (tableNumber: number) => {
        const tableIndex = tableNumber - 1;
        if (tableAssignments[tableIndex] !== null) return; // Table is occupied

        const waitingMatch = waitingMatches[0]; // Get first waiting match
        if (waitingMatch) {
            setTableAssignments(assignMatchToTable(tableAssignments, waitingMatch.id, tableIndex));
        }
    };

    // Auto-assign effect for tables with global auto-assign enabled and not individually excluded
    React.useEffect(() => {
        if (!tournamentStarted || !globalAutoAssign) return;

        // Check each table that should auto-assign (global enabled + not individually excluded)
        for (let tableNumber = 1; tableNumber <= tableCount; tableNumber++) {
            const tableIndex = tableNumber - 1;
            const settings = tableSettings[tableNumber];

            // Initialize settings if they don't exist
            if (!settings) {
                setTableSettings(prev => ({
                    ...prev,
                    [tableNumber]: { name: getDefaultTableName(tableNumber), doNotAutoAssign: false }
                }));
                continue; // Skip this iteration to let the state update
            }

            // Auto-assign if global is enabled AND table is not marked "do not auto assign"
            if (!settings.doNotAutoAssign && tableAssignments[tableIndex] === null && waitingMatches.length > 0) {
                autoAssignToTable(tableNumber);
                break; // Only assign one at a time to prevent conflicts
            }
        }
    }, [matches, tableAssignments, tableSettings, tournamentStarted, waitingMatches.length, globalAutoAssign]);



    // Table management view component
    const TableManagementView = () => (
        <div className="table-management-container" style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            padding: 'var(--spacing-md)'
        }}>
            <h1 className="app-title" style={{ textAlign: 'center', marginBottom: 'var(--spacing-lg)' }}>
                Table Management
            </h1>

            {/* Waiting Matches - Horizontal on Left */}
            <div className="waiting-matches-section" style={{
                marginBottom: 'var(--spacing-lg)',
                padding: 'var(--spacing-md)',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-lg)',
                border: '2px solid var(--accent-primary)'
            }}>
                <h3 style={{ color: 'var(--text-primary)', marginBottom: 'var(--spacing-md)' }}>
                    Waiting Matches ({waitingMatches.length})
                </h3>
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 'var(--spacing-sm)',
                    minHeight: '60px'
                }}>
                    {waitingMatches.length === 0 ? (
                        <div style={{
                            color: 'var(--text-muted)',
                            fontStyle: 'italic',
                            padding: 'var(--spacing-md)'
                        }}>
                            No matches waiting
                        </div>
                    ) : (
                        waitingMatches.map(match => {
                            const availableTables = tableAssignments
                                .map((assignment, index) => assignment === null ? index + 1 : null)
                                .filter(table => table !== null);

                            return (
                                <div key={match.id} className="waiting-match-card" style={{
                                    background: 'var(--bg-tertiary)',
                                    padding: 'var(--spacing-sm)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-primary)',
                                    minWidth: '200px',
                                    textAlign: 'center',
                                    position: 'relative',
                                    transition: 'all var(--transition-fast)'
                                }}>
                                    <div className="waiting-match-players" style={{
                                        fontWeight: 600,
                                        color: 'var(--text-primary)',
                                        fontSize: 'clamp(var(--font-size-xs), 2vw, var(--font-size-sm))',
                                        marginBottom: 'var(--spacing-xs)'
                                    }}>
                                        Match #{match.id}
                                    </div>
                                    <div className="waiting-match-round" style={{
                                        color: 'var(--text-secondary)',
                                        fontSize: 'clamp(var(--font-size-xs), 1.5vw, var(--font-size-xs))',
                                        marginBottom: availableTables.length > 0 ? 'var(--spacing-xs)' : 0,
                                        wordBreak: 'break-word',
                                        lineHeight: 1.2
                                    }}>
                                        {match.player1?.name} vs {match.player2?.name}
                                    </div>
                                    {availableTables.length > 0 && (
                                        <div style={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            gap: '2px',
                                            justifyContent: 'center',
                                            marginTop: 'var(--spacing-xs)'
                                        }}>
                                            {availableTables.slice(0, 3).map(tableNum => (
                                                <button
                                                    key={tableNum}
                                                    onClick={() => setTableAssignments(assignMatchToTable(tableAssignments, match.id, (tableNum as number) - 1))}
                                                    className="quick-assign-button"
                                                    title={`Assign to ${tableNum === 1 ? 'Stream' : `Table ${tableNum - 1}`}`}
                                                >
                                                    {tableNum === 1 ? 'S' : `T${tableNum - 1}`}
                                                </button>
                                            ))}
                                            {availableTables.length > 3 && (
                                                <span style={{
                                                    fontSize: '10px',
                                                    color: 'var(--text-muted)',
                                                    padding: '2px'
                                                }}>
                                                    +{availableTables.length - 3}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Table Controls */}
            <div className="table-controls" style={{
                display: 'flex',
                gap: 'var(--spacing-md)',
                marginBottom: 'var(--spacing-lg)',
                justifyContent: 'center',
                alignItems: 'center',
                flexWrap: 'wrap'
            }}>
                <button onClick={addTable} className="primary">
                    ➕ Add Table
                </button>
                <button onClick={removeTable} disabled={tableCount <= 1}>
                    ➖ Remove Table
                </button>

                {/* Global Auto-Assign Toggle */}
                <label
                    className={`global-auto-assign-toggle ${globalAutoAssign ? 'active' : ''}`}
                >
                    <input
                        type="checkbox"
                        checked={globalAutoAssign}
                        onChange={() => setGlobalAutoAssign(!globalAutoAssign)}
                        className="global-auto-assign-checkbox"
                    />
                    🎯 Global Auto-Assign
                </label>

                <div style={{
                    color: 'var(--text-primary)',
                    fontWeight: 600,
                    padding: '0 var(--spacing-md)',
                    textAlign: 'center'
                }}>
                    {tableCount} Table{tableCount !== 1 ? 's' : ''} • {waitingMatches.length} Waiting
                </div>
            </div>

            {/* Tables Grid */}
            <div className="tables-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: 'var(--spacing-lg)',
                flex: 1
            }}>
                {Array.from({ length: tableCount }, (_, i) => {
                    const tableNumber = i + 1;
                    const assignedMatchId = tableAssignments[i];
                    const assignedMatch = assignedMatchId ? matches.find(m => m.id === assignedMatchId) : null;

                    return (
                        <div key={tableNumber} className="table-card" style={{
                            background: assignedMatch ? 'var(--accent-secondary)' : 'var(--bg-secondary)',
                            border: `2px solid ${assignedMatch ? 'var(--accent-primary)' : 'var(--border-primary)'}`,
                            borderRadius: 'var(--radius-lg)',
                            padding: 'var(--spacing-md)',
                            textAlign: 'center',
                            minHeight: '200px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between'
                        }}>
                            {/* Table Header with Name and Controls */}
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 'var(--spacing-xs)',
                                marginBottom: 'var(--spacing-sm)'
                            }}>
                                <input
                                    key={`table-${tableNumber}-${tableSettings[tableNumber]?.name || getDefaultTableName(tableNumber)}`}
                                    type="text"
                                    defaultValue={tableSettings[tableNumber]?.name || getDefaultTableName(tableNumber)}
                                    onBlur={(e) => {
                                        const newName = e.target.value.trim();
                                        const defaultName = tableSettings[tableNumber]?.name || getDefaultTableName(tableNumber);
                                        if (newName && newName !== defaultName) {
                                            renameTable(tableNumber, newName);
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            const newName = e.currentTarget.value.trim();
                                            if (newName) {
                                                renameTable(tableNumber, newName);
                                            }
                                            e.currentTarget.blur();
                                        } else if (e.key === 'Escape') {
                                            e.preventDefault();
                                            // Reset to original value
                                            e.currentTarget.value = tableSettings[tableNumber]?.name || getDefaultTableName(tableNumber);
                                            e.currentTarget.blur();
                                        }
                                    }}
                                    onFocus={(e) => {
                                        // Select all text for easy editing
                                        e.target.select();
                                    }}
                                    className="table-name-input"
                                    style={{
                                        color: assignedMatch ? 'var(--text-inverse)' : 'var(--text-primary)'
                                    }}
                                    placeholder="Table Name"
                                />
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    gap: 'var(--spacing-xs)'
                                }}>
                                    <label
                                        className="table-exclusion-label"
                                        style={{
                                            color: assignedMatch ? 'var(--text-inverse)' : 'var(--text-secondary)'
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={tableSettings[tableNumber]?.doNotAutoAssign || false}
                                            onChange={() => toggleTableDoNotAutoAssign(tableNumber)}
                                            className="table-exclusion-checkbox"
                                        />
                                        🚫 Exclude from auto-assign
                                    </label>
                                </div>
                            </div>

                            {assignedMatch ? (
                                <div>
                                    <div style={{
                                        color: 'var(--text-inverse)',
                                        fontWeight: 600,
                                        marginBottom: 'var(--spacing-sm)',
                                        fontSize: 'var(--font-size-lg)'
                                    }}>
                                        Match #{assignedMatch.id}
                                    </div>
                                    <div style={{
                                        color: 'var(--text-inverse)',
                                        marginBottom: 'var(--spacing-md)'
                                    }}>
                                        {assignedMatch.player1?.name} vs {assignedMatch.player2?.name}
                                    </div>
                                    <div style={{
                                        display: 'flex',
                                        gap: 'var(--spacing-sm)',
                                        justifyContent: 'center'
                                    }}>
                                        <button
                                            onClick={() => setTableScoreModal(assignedMatch)}
                                            style={{
                                                background: 'var(--bg-primary)',
                                                color: 'var(--text-primary)',
                                                border: 'none',
                                                padding: 'var(--spacing-xs) var(--spacing-sm)',
                                                borderRadius: 'var(--radius-md)',
                                                cursor: 'pointer',
                                                fontSize: 'var(--font-size-xs)'
                                            }}
                                        >
                                            📊 Score
                                        </button>
                                        <button
                                            onClick={() => setTableAssignments(removeMatchFromTable(tableAssignments, i))}
                                            style={{
                                                background: 'var(--bg-primary)',
                                                color: 'var(--text-primary)',
                                                border: 'none',
                                                padding: 'var(--spacing-xs) var(--spacing-sm)',
                                                borderRadius: 'var(--radius-md)',
                                                cursor: 'pointer',
                                                fontSize: 'var(--font-size-xs)'
                                            }}
                                        >
                                            🔄 Remove
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    <div style={{
                                        color: 'var(--text-muted)',
                                        marginBottom: 'var(--spacing-md)',
                                        fontStyle: 'italic'
                                    }}>
                                        {globalAutoAssign && !tableSettings[tableNumber]?.doNotAutoAssign ? 'Auto-assigning...' : 'Available'}
                                    </div>
                                    {waitingMatches.length > 0 && (tableSettings[tableNumber]?.doNotAutoAssign || !globalAutoAssign) && (
                                        <button
                                            onClick={() => autoAssignToTable(tableNumber)}
                                            className="table-manual-assign-button"
                                        >
                                            📌 Assign Next Match
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );

    return (
        <div className="app-container">
            {/* Main Content Area */}
            <div className="main-content" style={{ width: '100%' }}>
                <h1 className="app-title">React Tournament Bracket Manager</h1>
                {!tournamentStarted && (
                    <div className="setup-section">
                        <PlayerUpload onPlayersParsed={setPlayers} />
                        <h2 style={{ color: 'var(--text-primary)', margin: 'var(--spacing-lg) 0 var(--spacing-md) 0' }}>Players</h2>
                        <PlayerList players={players} onPlayersChange={setPlayers} />

                        <div className="bracket-type-selection" style={{
                            margin: 'var(--spacing-lg) 0',
                            padding: 'var(--spacing-md)',
                            background: 'var(--surface-elevated)',
                            borderRadius: 'var(--radius-lg)',
                            border: '1px solid var(--border-color)'
                        }}>
                            <h3 style={{ color: 'var(--text-primary)', margin: '0 0 var(--spacing-md) 0', fontSize: 'var(--font-size-md)' }}>
                                Tournament Type
                            </h3>
                            <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--spacing-sm)',
                                    color: 'var(--text-primary)',
                                    cursor: 'pointer',
                                    fontSize: 'var(--font-size-sm)'
                                }}>
                                    <input
                                        type="radio"
                                        name="bracketType"
                                        value="single"
                                        checked={bracketType === 'single'}
                                        onChange={(e) => setBracketType(e.target.value as BracketType)}
                                    />
                                    <span>
                                        <strong>Single Elimination</strong>
                                        <br />
                                        <span style={{ color: 'var(--text-muted)' }}>One loss eliminates</span>
                                    </span>
                                </label>
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--spacing-sm)',
                                    color: 'var(--text-primary)',
                                    cursor: 'pointer',
                                    fontSize: 'var(--font-size-sm)'
                                }}>
                                    <input
                                        type="radio"
                                        name="bracketType"
                                        value="double"
                                        checked={bracketType === 'double'}
                                        onChange={(e) => setBracketType(e.target.value as BracketType)}
                                    />
                                    <span>
                                        <strong>Double Elimination</strong>
                                        <br />
                                        <span style={{ color: 'var(--text-muted)' }}>Two losses to eliminate</span>
                                    </span>
                                </label>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 'var(--spacing-md)', justifyContent: 'center', alignItems: 'center' }}>
                            <button className="primary" onClick={startTournament} disabled={players.length < 2}>
                                Start Tournament
                            </button>
                            <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>or</span>
                            <button
                                onClick={createDemoTournament}
                                style={{
                                    background: 'var(--accent-secondary)',
                                    color: 'var(--text-inverse)',
                                    border: 'none',
                                    borderRadius: 'var(--radius-md)',
                                    padding: 'var(--spacing-sm) var(--spacing-md)',
                                    fontSize: 'var(--font-size-sm)',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all var(--transition-fast)'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = 'var(--accent-primary)'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'var(--accent-secondary)'}
                            >
                                🎯 View Demo Bracket
                            </button>
                        </div>
                    </div>
                )}
                {tournamentComplete && (
                    <div className="tournament-complete-banner">
                        <h2>🏆 Tournament Complete! 🏆</h2>
                        <p>
                            Champion: {(() => {
                                if (bracketType === 'double') {
                                    // For double elimination, check Grand Finals Reset first, then Grand Finals
                                    const grandFinalsReset = matches.find(m => m.isGrandFinalsReset && m.winner);
                                    if (grandFinalsReset) return grandFinalsReset.winner?.name || 'Unknown';

                                    const grandFinals = matches.find(m => m.isGrandFinals && m.winner);
                                    if (grandFinals) return grandFinals.winner?.name || 'Unknown';

                                    return 'Unknown';
                                } else {
                                    // For single elimination, find winner of highest round
                                    return matches.find(m => m.winner && m.round === Math.max(...matches.map(match => match.round)))?.winner?.name || 'Unknown';
                                }
                            })()}
                        </p>
                    </div>
                )}

                {/* Tab Navigation */}
                {tournamentStarted && (
                    <div className="tab-navigation" style={{
                        display: 'flex',
                        justifyContent: 'center',
                        marginBottom: 'var(--spacing-lg)',
                        borderBottom: '2px solid var(--border-primary)'
                    }}>
                        <button
                            onClick={() => setActiveTab('bracket')}
                            style={{
                                background: activeTab === 'bracket' ? 'var(--accent-primary)' : 'transparent',
                                color: activeTab === 'bracket' ? 'var(--text-inverse)' : 'var(--text-primary)',
                                border: 'none',
                                padding: 'var(--spacing-md) var(--spacing-lg)',
                                borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                                cursor: 'pointer',
                                fontSize: 'var(--font-size-md)',
                                fontWeight: 600,
                                marginRight: 'var(--spacing-xs)'
                            }}
                        >
                            🏆 Tournament Bracket
                        </button>
                        <button
                            onClick={() => setActiveTab('tables')}
                            style={{
                                background: activeTab === 'tables' ? 'var(--accent-primary)' : 'transparent',
                                color: activeTab === 'tables' ? 'var(--text-inverse)' : 'var(--text-primary)',
                                border: 'none',
                                padding: 'var(--spacing-md) var(--spacing-lg)',
                                borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                                cursor: 'pointer',
                                fontSize: 'var(--font-size-md)',
                                fontWeight: 600
                            }}
                        >
                            🎯 Table Management ({waitingMatches.length} waiting)
                        </button>
                    </div>
                )}

                {/* Tab Content */}
                {tournamentStarted && activeTab === 'bracket' && (
                    <Bracket
                        players={players}
                        matches={matches}
                        onRemoveFromTable={returnMatchToWaiting}
                        bracketType={bracketType}
                        onMatchUpdate={(updatedMatch) => {
                            // Remove match from table assignments if it now has a winner
                            if (updatedMatch.winner) {
                                const tableIndex = tableAssignments.findIndex(assignment => assignment === updatedMatch.id);
                                if (tableIndex !== -1) {
                                    setTableAssignments(prev => {
                                        const newAssignments = [...prev];
                                        newAssignments[tableIndex] = null;
                                        return newAssignments;
                                    });
                                }
                            }

                            if (bracketType === 'double' && doubleBracket) {
                                // Use double elimination update logic
                                const updatedBracket = updateDoubleElimMatch(
                                    updatedMatch,
                                    doubleBracket,
                                    (isComplete) => setTournamentComplete(isComplete)
                                );
                                setDoubleBracket(updatedBracket);
                                setMatches(flattenDoubleBracket(updatedBracket));
                            } else {
                                // Use single elimination update logic
                                setMatches(prevMatches => {
                                    const originalMatch = prevMatches.find(m => m.id === updatedMatch.id);
                                    if (!originalMatch) return prevMatches;

                                    let newMatches = [...prevMatches];

                                    // Update the match itself (ensure table property is cleared if match is completed)
                                    const matchUpdate = updatedMatch.winner ? { ...updatedMatch, table: undefined } : updatedMatch;
                                    newMatches = newMatches.map(m => m.id === updatedMatch.id ? matchUpdate : m);

                                    // If this is an edit of a completed match, we need to handle cascade effects
                                    const maxRound = Math.max(...newMatches.map(m => m.round));
                                    if (originalMatch.winner && originalMatch.round < maxRound) {
                                        // Only clear the specific path affected by the old winner, not all subsequent rounds
                                        const clearAffectedPath = (matchId: number, currentRound: number) => {
                                            if (currentRound >= maxRound) return;

                                            const thisRoundMatches = newMatches.filter(m => m.round === currentRound);
                                            const thisMatchIndex = thisRoundMatches.findIndex(m => m.id === matchId);
                                            const nextRoundMatches = newMatches.filter(m => m.round === currentRound + 1);
                                            const nextMatchIndex = Math.floor(thisMatchIndex / 2);
                                            const nextMatch = nextRoundMatches[nextMatchIndex];

                                            if (nextMatch) {
                                                // Determine if this match's winner was in slot 1 or 2 of the next match
                                                const isFirstSlot = (thisMatchIndex % 2) === 0;
                                                const wasInNextMatch = isFirstSlot ?
                                                    (nextMatch.player1 && nextMatch.player1.name === originalMatch.winner?.name) :
                                                    (nextMatch.player2 && nextMatch.player2.name === originalMatch.winner?.name);

                                                if (wasInNextMatch) {
                                                    // Clear this player from the next match
                                                    const updatedNextMatch: Match = {
                                                        ...nextMatch,
                                                        player1: isFirstSlot ? null : nextMatch.player1,
                                                        player2: !isFirstSlot ? null : nextMatch.player2,
                                                        winner: null
                                                    };
                                                    // Remove scores if match no longer has a winner
                                                    delete updatedNextMatch.score1;
                                                    delete updatedNextMatch.score2;

                                                    newMatches = newMatches.map(m => m.id === nextMatch.id ? updatedNextMatch : m);

                                                    // Continue clearing the path if this match had a winner
                                                    if (nextMatch.winner) {
                                                        clearAffectedPath(nextMatch.id, currentRound + 1);
                                                    }
                                                }
                                            }
                                        };

                                        // Start clearing from the edited match
                                        clearAffectedPath(originalMatch.id, originalMatch.round);
                                    }

                                    // Now advance the new winner through the bracket (if there is one)
                                    if (updatedMatch.winner && updatedMatch.round < maxRound) {
                                        const advanceWinner = (matchId: number, winner: Player, currentRound: number) => {
                                            if (currentRound >= maxRound) return;

                                            const thisRoundMatches = newMatches.filter(m => m.round === currentRound);
                                            const thisMatchIndex = thisRoundMatches.findIndex(m => m.id === matchId);
                                            const nextRoundMatches = newMatches.filter(m => m.round === currentRound + 1);
                                            const nextMatchIndex = Math.floor(thisMatchIndex / 2);
                                            const nextMatch = nextRoundMatches[nextMatchIndex];

                                            if (nextMatch) {
                                                const isFirstSlot = (thisMatchIndex % 2) === 0;
                                                const updatedNextMatch = {
                                                    ...nextMatch,
                                                    player1: isFirstSlot ? winner : nextMatch.player1,
                                                    player2: !isFirstSlot ? winner : nextMatch.player2,
                                                };
                                                newMatches = newMatches.map(m => m.id === nextMatch.id ? updatedNextMatch : m);
                                            }
                                        };

                                        advanceWinner(updatedMatch.id, updatedMatch.winner, updatedMatch.round);
                                    }

                                    // Check if tournament is complete
                                    if (updatedMatch.winner && updatedMatch.round === maxRound) {
                                        setTournamentComplete(true);
                                    } else {
                                        // Check if tournament was complete but now isn't (due to editing)
                                        const finalMatch = newMatches.find(m => m.round === maxRound);
                                        if (!finalMatch?.winner) {
                                            setTournamentComplete(false);
                                        }
                                    }

                                    return newMatches;
                                });
                            }
                        }}
                    />
                )}

                {tournamentStarted && activeTab === 'tables' && (
                    <TableManagementView />
                )}

                {/* Score Modal */}
                {tableScoreModal && (
                    <ScoreModal
                        match={tableScoreModal}
                        onSubmit={(score1: number, score2: number) => {
                            let winner = null;
                            if (score1 > score2) winner = tableScoreModal.player1;
                            else if (score2 > score1) winner = tableScoreModal.player2;
                            handleTableScoreSubmit(tableScoreModal, score1, score2, winner);
                        }}
                        onClose={() => setTableScoreModal(null)}
                    />
                )}
            </div>
        </div>
    );
};

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
}
