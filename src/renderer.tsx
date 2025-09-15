import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { PlayerUpload } from './components/PlayerUpload';
import { PlayerList } from './components/PlayerList';
import BracketsViewer from './components/BracketsViewer';
import BracketsPopout from './components/BracketsPopout';
import TableAssignmentNew from './components/TableAssignmentNew';
import { BracketScoreModal, useBracketScoreModal } from './components/BracketScoreModal';
import {
    Player,
    Match,
    TableSettings,
    TournamentState,
    BracketType,
    BracketsData,
    Tournament,
    Participant
} from './types';
import { getDefaultTableName, shuffleArray, generateDemoPlayers, isBye } from './utils';
import TournamentService from './services/tournamentService';
import {
    autoAssignMatches,
    assignMatchToTable,
    removeMatchFromTable,
    updateTableSettings,
    getTableMatch
} from './services/tableManager';

const App = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const popoutParam = urlParams.get('popout');
    const isBracketsPopout = popoutParam === 'bracket';
    const isTablesPopout = popoutParam === 'tables';
    // Tournament service instance
    const [tournamentService] = useState(() => new TournamentService());

    // State
    const [players, setPlayers] = useState<Player[]>([]);
    const [bracketsData, setBracketsData] = useState<BracketsData | null>(null);
    const [tournamentStarted, setTournamentStarted] = useState(false);
    const [tournamentComplete, setTournamentComplete] = useState(false);
    const [tableCount, setTableCount] = useState(1);
    const [tableAssignments, setTableAssignments] = useState<(number | null)[]>([]);
    const [activeTab, setActiveTab] = useState<'bracket' | 'tables'>('bracket');
    const [globalAutoAssign, setGlobalAutoAssign] = useState(true);
    const [tableSettings, setTableSettings] = useState<{ [key: number]: { name: string, doNotAutoAssign: boolean } }>({
        1: { name: 'Stream', doNotAutoAssign: false }
    });
    const [bracketType, setBracketType] = useState<BracketType>('double');
    const [tournamentName, setTournamentName] = useState<string>('');

    // Modal state
    const bracketScoreModal = useBracketScoreModal();

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

    // Auto-assign matches to tables
    useEffect(() => {
        if (!tournamentStarted || !globalAutoAssign) return;

        if (bracketsData?.match) {
            setTableAssignments(prev =>
                autoAssignMatches(
                    bracketsData.match,
                    prev,
                    tableCount,
                    tableSettings,
                    globalAutoAssign
                )
            );
        }
    }, [bracketsData?.match, tableCount, globalAutoAssign, tableSettings, tournamentStarted]);

    // Keep a copy of the latest brackets data in localStorage so popout windows stay in sync
    useEffect(() => {
        try {
            if (bracketsData) {
                localStorage.setItem('tournament:bracketsData', JSON.stringify(bracketsData));
            }
        } catch (e) {
            console.error('Failed to persist bracketsData to localStorage', e);
        }
    }, [bracketsData]);

    // Persist table assignments and related view data so a tables popout can read it
    useEffect(() => {
        try {
            const tablesPayload = {
                tableAssignments,
                participants: bracketsData?.participant || [],
                matches: bracketsData?.match || []
            };
            localStorage.setItem('tournament:tablesData', JSON.stringify(tablesPayload));
        } catch (e) {
            console.error('Failed to persist tablesData to localStorage', e);
        }
    }, [tableAssignments, bracketsData?.participant, bracketsData?.match]);

    // Handle CSV upload
    const handleCSVUpload = (uploadedPlayers: Player[]) => {
        setPlayers(uploadedPlayers);
        console.log('Players uploaded:', uploadedPlayers);
    };

    // Handle player list changes
    const handlePlayersChange = (updatedPlayers: Player[]) => {
        setPlayers(updatedPlayers);
    };

    // Start tournament
    const startTournament = async () => {
        if (players.length === 0) {
            alert('Please add some players first.');
            return;
        }

        if (players.length < 2) {
            alert('At least 2 players are required to start a tournament.');
            return;
        }

        try {
            console.log('Starting tournament with players:', players);

            // Randomize players before starting tournament
            const shuffledPlayers = shuffleArray(players);
            console.log('Players after shuffling:', shuffledPlayers);

            // Create tournament based on bracket type
            const bracketTypeMap = {
                'single': 'single_elimination' as const,
                'double': 'double_elimination' as const
            };

            const data = await tournamentService.createTournament(
                shuffledPlayers,
                bracketTypeMap[bracketType],
                tournamentName
            );

            setBracketsData(data);
            setTournamentStarted(true);
            setTournamentComplete(false);

            console.log('Tournament started with data:', data);
        } catch (error) {
            console.error('Error starting tournament:', error);
            alert('Error starting tournament. Please try again.');
        }
    };



    // Handle match update (new system)
    const handleMatchUpdate = async (matchId: number, opponent1Score?: number, opponent2Score?: number) => {
        try {
            let opponent1Result: 'win' | 'loss' | 'draw' | undefined;
            let opponent2Result: 'win' | 'loss' | 'draw' | undefined;

            // Determine results based on scores
            if (opponent1Score !== undefined && opponent2Score !== undefined) {
                if (opponent1Score > opponent2Score) {
                    opponent1Result = 'win';
                    opponent2Result = 'loss';
                } else if (opponent2Score > opponent1Score) {
                    opponent1Result = 'loss';
                    opponent2Result = 'win';
                } else {
                    opponent1Result = 'draw';
                    opponent2Result = 'draw';
                }
            }

            await tournamentService.updateMatch(
                matchId,
                opponent1Score,
                opponent2Score,
                opponent1Result,
                opponent2Result
            );

            // Refresh tournament data
            const updatedData = await tournamentService.getTournamentData();
            setBracketsData(updatedData);

            // Check if tournament is complete
            const isComplete = await tournamentService.isTournamentComplete();
            setTournamentComplete(isComplete);

            console.log('Match updated:', { matchId, opponent1Score, opponent2Score });
        } catch (error) {
            console.error('Error updating match:', error);
            alert('Error updating match. Please try again.');
        }
    };

    // Handle match click from brackets viewer
    const handleBracketMatchClick = (match: any) => {
        // Skip BYE matches or invalid matches
        if (!match || !match.id) {
            return;
        }

        // Check if this is a BYE match (one or both opponents are null/undefined)
        const hasValidOpponents = match.opponent1 && match.opponent2 &&
            match.opponent1.id && match.opponent2.id;

        if (!hasValidOpponents) {
            return;
        }

        // Convert the match object to our Match type and open bracket score modal
        const bracketMatch: Match = {
            id: match.id,
            number: match.number || 0,
            stage_id: match.stage_id || match.stageId || 0,
            group_id: match.group_id || match.groupId || 0,
            round_id: match.round_id || match.roundId || 0,
            child_count: match.child_count || match.childCount || 0,
            status: match.status || 'waiting',
            opponent1: match.opponent1 || null,
            opponent2: match.opponent2 || null
        };

        bracketScoreModal.openModal(bracketMatch);
    };

    // Handle table actions
    const handleAssignToTable = (matchId: number, tableIndex: number) => {
        setTableAssignments(prev => assignMatchToTable(prev, matchId, tableIndex));
    };

    const handleRemoveFromTable = (tableIndex: number) => {
        setTableAssignments(prev => removeMatchFromTable(prev, tableIndex));
    };

    const handleTableSettingsUpdate = (tableNumber: number, updates: Partial<TableSettings>) => {
        setTableSettings(prev => updateTableSettings(prev, tableNumber, updates));
    };

    // Handle bracket match score update
    const handleBracketMatchUpdate = async (matchId: number, opponent1Score: number, opponent2Score: number) => {
        try {
            // Determine results based on scores
            const opponent1Result = opponent1Score > opponent2Score ? 'win' : 'loss';
            const opponent2Result = opponent2Score > opponent1Score ? 'win' : 'loss';

            // Store current table assignments before updating
            const currentTableAssignments = new Map<number, number>();
            if (bracketsData?.match) {
                bracketsData.match.forEach(match => {
                    if (match.table !== null && match.table !== undefined) {
                        currentTableAssignments.set(match.id, match.table);
                    }
                });
            }

            // Update the match via tournament service
            await tournamentService.updateMatch(matchId, opponent1Score, opponent2Score, opponent1Result, opponent2Result);

            // Refresh the brackets data
            const updatedData = await tournamentService.getTournamentData();

            // Restore table assignments except for the completed match
            const restoredMatches = updatedData.match.map(match => {
                // Don't restore table assignment for the completed match
                if (match.id === matchId) {
                    return { ...match, table: undefined };
                }
                // Restore table assignment for other matches
                const tableId = currentTableAssignments.get(match.id);
                return tableId !== undefined ? { ...match, table: tableId } : match;
            });

            setBracketsData({
                ...updatedData,
                match: restoredMatches
            });
        } catch (error) {
            console.error('Error updating bracket match:', error);
            throw error;
        }
    };

    // Generate demo tournament
    const generateDemo = () => {
        const demoPlayers = generateDemoPlayers();
        setPlayers(demoPlayers);
    };

    // Table assignment handlers
    const handleMoveMatch = async (match: Match, tableId?: number) => {
        try {
            if (bracketsData) {
                const updatedMatches = bracketsData.match.map(m =>
                    m.id === match.id
                        ? { ...m, table: tableId || undefined }
                        : m
                );
                setBracketsData({
                    ...bracketsData,
                    match: updatedMatches
                });
            }
        } catch (error) {
            console.error('Error moving match:', error);
        }
    };

    const handleReturnToWaiting = async (match: Match) => {
        try {
            if (bracketsData) {
                const updatedMatches = bracketsData.match.map(m =>
                    m.id === match.id
                        ? { ...m, table: undefined }
                        : m
                );
                setBracketsData({
                    ...bracketsData,
                    match: updatedMatches
                });
            }
        } catch (error) {
            console.error('Error returning match to waiting:', error);
        }
    };

    const handleRemoveTable = () => {
        if (tableCount <= 1) return; // Can't remove if only 1 table

        try {
            if (bracketsData) {
                // Find matches assigned to the highest numbered table (the one being removed)
                const tableToRemove = tableCount;
                const matchesOnRemovedTable = bracketsData.match.filter(m => m.table === tableToRemove);

                // Show confirmation if there are matches on the table being removed
                if (matchesOnRemovedTable.length > 0) {
                    const matchDetails = matchesOnRemovedTable.map(m => {
                        const p1Name = bracketsData.participant.find(p => p.id === m.opponent1?.id)?.name || 'TBD';
                        const p2Name = bracketsData.participant.find(p => p.id === m.opponent2?.id)?.name || 'TBD';
                        return `Match #${m.number}: ${p1Name} vs ${p2Name}`;
                    }).join('\n');

                    const confirmed = confirm(
                        `Table ${tableToRemove} has ${matchesOnRemovedTable.length} match(es) assigned:\n\n${matchDetails}\n\nRemoving this table will return these matches to waiting. Continue?`
                    );

                    if (!confirmed) {
                        return; // User cancelled
                    }
                }

                // Return those matches to waiting by setting their table to undefined
                const updatedMatches = bracketsData.match.map(m =>
                    m.table === tableToRemove
                        ? { ...m, table: undefined }
                        : m
                );

                // Update the bracket data
                setBracketsData({
                    ...bracketsData,
                    match: updatedMatches
                });

                // Log the action for debugging
                if (matchesOnRemovedTable.length > 0) {
                    console.log(`Removed table ${tableToRemove}, returned ${matchesOnRemovedTable.length} matches to waiting`);
                }
            }

            // Reduce table count
            setTableCount(prev => Math.max(1, prev - 1));
        } catch (error) {
            console.error('Error removing table:', error);
            alert('Error removing table. Please try again.');
        }
    };

    const handleTableScore = async (match: Match, score1: number, score2: number) => {
        try {
            // Use the same logic as bracket match scoring
            await handleBracketMatchUpdate(match.id, score1, score2);
        } catch (error) {
            console.error('Error updating table score:', error);
        }
    };

    // Get current matches for table assignment
    const getCurrentMatches = (): Match[] => {
        return bracketsData?.match || [];
    };

    // Get table match
    const getActiveTableMatch = (tableIndex: number): Match | null => {
        if (bracketsData?.match) {
            return getTableMatch(bracketsData.match, tableAssignments, tableIndex);
        }
        return null;
    };

    if (isBracketsPopout) {
        // If opened as a popout, render the standalone bracket popout view
        return <BracketsPopout />;
    }

    if (isTablesPopout) {
        const TablesPopout = require('./components/TablesPopout').default;
        return <TablesPopout />;
    }

    return (
        <div className="app-container">
            <div className="header">
                <div className="header-content">
                    <div className="header-title">
                        <h1>🏆 {tournamentName || 'Tournament Brackets'}</h1>
                        {!tournamentStarted && players.length > 0 && (
                            <p className="header-subtitle">
                                {players.length} player{players.length !== 1 ? 's' : ''} ready
                            </p>
                        )}
                        {tournamentStarted && bracketsData && (
                            <p className="header-subtitle">
                                {bracketsData.participant?.length || 0} participants • {bracketsData.match?.length || 0} matches
                            </p>
                        )}
                    </div>

                    <div className="header-controls">
                        {/* tournament setup controls appear here when not started */}
                        {!tournamentStarted && (
                            <div className="tournament-setup-controls">
                                <div className="tournament-name-input">
                                    <label htmlFor="tournament-name">Tournament Name</label>
                                    <input
                                        id="tournament-name"
                                        type="text"
                                        value={tournamentName}
                                        onChange={(e) => setTournamentName(e.target.value)}
                                        placeholder="Enter tournament name..."
                                        className="text-input"
                                    />
                                </div>

                                <div className="bracket-type-selector">
                                    <label htmlFor="bracket-type">Tournament Type</label>
                                    <select
                                        id="bracket-type"
                                        value={bracketType}
                                        onChange={(e) => setBracketType(e.target.value as BracketType)}
                                        className="select-input"
                                    >
                                        <option value="single">Single Elimination</option>
                                        <option value="double">Double Elimination</option>
                                    </select>
                                </div>

                                <div className="action-buttons">
                                    <button onClick={generateDemo} className="secondary-btn">
                                        <span className="btn-icon">🎲</span>
                                        Generate Demo
                                    </button>
                                    <button
                                        onClick={startTournament}
                                        className="primary-btn"
                                        disabled={players.length < 2}
                                    >
                                        <span className="btn-icon">🚀</span>
                                        Start Tournament
                                        {players.length < 2 && (
                                            <span className="btn-note">(Need 2+ players)</span>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Popout button positioned absolutely in header */}
                    {tournamentStarted && bracketsData && (
                        <div className="popout-control">
                            <button
                                className="primary"
                                onClick={() => {
                                    try {
                                        localStorage.setItem('tournament:bracketsData', JSON.stringify(bracketsData));
                                    } catch (e) {
                                        console.error('Failed to store brackets data for popout', e);
                                    }
                                    const url = `${window.location.origin}${window.location.pathname}?popout=bracket`;
                                    window.open(url, '_blank', 'width=1200,height=800');
                                }}
                            >
                                Popout Bracket
                            </button>

                            <button
                                style={{ marginLeft: 8 }}
                                className="secondary"
                                onClick={() => {
                                    try {
                                        // Ensure tablesData is seeded for the tables popout to read
                                        const tablesPayload = {
                                            tableAssignments,
                                            participants: bracketsData.participant || [],
                                            matches: bracketsData.match || []
                                        };
                                        localStorage.setItem('tournament:tablesData', JSON.stringify(tablesPayload));
                                    } catch (e) {
                                        console.error('Failed to store tables data for popout', e);
                                    }
                                    const url = `${window.location.origin}${window.location.pathname}?popout=tables`;
                                    window.open(url, '_blank', 'width=700,height=800');
                                }}
                            >
                                Popout Tables
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {!tournamentStarted ? (
                <div className="setup-container">
                    <div className="setup-header">
                        <h2>Setup Your Tournament</h2>
                        <p>Upload a CSV file or add players manually to get started</p>
                    </div>

                    <div className="setup-content">
                        <div className="upload-section">
                            <PlayerUpload onPlayersParsed={handleCSVUpload} />
                        </div>

                        <div className="divider">
                            <span>or</span>
                        </div>

                        <div className="players-section">
                            <PlayerList
                                players={players}
                                onPlayersChange={handlePlayersChange}
                            />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="tournament-container">
                    <div className="tournament-tabs">
                        <button
                            className={`tournament-tab ${activeTab === 'bracket' ? 'active' : ''}`}
                            onClick={() => setActiveTab('bracket')}
                        >
                            <span className="tab-icon">🏆</span>
                            Tournament Bracket
                        </button>
                        <button
                            className={`tournament-tab ${activeTab === 'tables' ? 'active' : ''}`}
                            onClick={() => setActiveTab('tables')}
                        >
                            <span className="tab-icon">🏓</span>
                            Tables ({tableCount})
                        </button>
                    </div>

                    <div className="tab-content">
                        {activeTab === 'bracket' && (
                            <div className="bracket-tab">
                                {bracketsData ? (
                                    <BracketsViewer
                                        data={bracketsData}
                                        onMatchClick={handleBracketMatchClick}
                                    />
                                ) : (
                                    <div>No tournament data available</div>
                                )}
                            </div>
                        )}

                        {activeTab === 'tables' && (
                            <div className="tables-tab">
                                {bracketsData ? (
                                    <TableAssignmentNew
                                        tables={tableCount}
                                        matches={bracketsData.match.filter(m => m.table !== null && m.table !== undefined)}
                                        waitingMatches={bracketsData.match.filter(m => {
                                            // Filter out BYE matches and only include ready matches that aren't assigned to tables
                                            const isNotAssignedToTable = (m.table === null || m.table === undefined);
                                            const isReadyMatch = m.status === 2; // Ready status
                                            const hasValidOpponents = m.opponent1 && m.opponent2 &&
                                                m.opponent1.id !== null && m.opponent2.id !== null;
                                            return isNotAssignedToTable && isReadyMatch && hasValidOpponents;
                                        })}
                                        allMatches={bracketsData.match}
                                        onMoveMatch={handleMoveMatch}
                                        onReturnToWaiting={handleReturnToWaiting}
                                        onSubmitScore={handleTableScore}
                                        onAddTable={() => setTableCount(prev => prev + 1)}
                                        onRemoveTable={handleRemoveTable}
                                        participants={bracketsData.participant}
                                    />
                                ) : (
                                    <div>No tournament data available</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {bracketScoreModal.isOpen && bracketScoreModal.currentMatch && bracketsData && (
                <BracketScoreModal
                    match={bracketScoreModal.currentMatch}
                    participants={bracketsData.participant}
                    onClose={bracketScoreModal.closeModal}
                    onMatchUpdate={handleBracketMatchUpdate}
                />
            )}

            {tournamentComplete && (
                <div className="tournament-complete">
                    <h2>🏆 Tournament Complete! 🏆</h2>
                </div>
            )}
        </div>
    );
};

// Initialize React
const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
} else {
    console.error('Root container not found');
}