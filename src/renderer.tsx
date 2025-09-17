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
import TournamentSetupWizard from './components/TournamentSetupWizard';
import PlayerRow from './components/PlayerRow';
import PreStartPlayerRow from './components/PreStartPlayerRow';
import PlayersTable from './components/PlayersTable';
import PlayersPanel from './components/PlayersPanel';
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
import useTournamentService from './hooks/useTournamentService';
import useTournament from './hooks/useTournament';
import AppHeader from './components/AppHeader';
import {
    autoAssignMatches,
    assignMatchToTable,
    removeMatchFromTable,
    updateTableSettings,
    getTableMatch
} from './services/tableManager';
import useTables from './hooks/useTables';

const App = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const popoutParam = urlParams.get('popout');
    const isBracketsPopout = popoutParam === 'bracket';
    const isTablesPopout = popoutParam === 'tables';
    // Tournament service instance
    const tournamentService = useTournamentService();

    // State
    const [players, setPlayers] = useState<Player[]>([]);
    const [activeTab, setActiveTab] = useState<'bracket' | 'tables' | 'players'>('bracket');

    // Table management
    const {
        tableCount,
        tableAssignments,
        globalAutoAssign,
        setGlobalAutoAssign,
        tableSettings,
        setTableSettings,
        autoAssign,
        assignToTable,
        removeFromTable,
        addTable,
        removeTable,
        setTableAssignments: setTableAssignmentsHook,
        setTableCount: setTableCountHook
    } = useTables(1);

    // Tournament logic moved into a hook
    const {
        bracketsData,
        setBracketsData,
        tournamentStarted,
        setTournamentStarted,
        tournamentComplete,
        setTournamentComplete,
        bracketType,
        setBracketType,
        tournamentName,
        setTournamentName,
        tournamentDescription,
        setTournamentDescription,
        gameType,
        setGameType,
        raceWinners,
        setRaceWinners,
        raceLosers,
        setRaceLosers,
        trueDouble,
        setTrueDouble,
        startTournament,
        updateMatch,
        handleBracketMatchUpdate,
        generateDemo
    } = useTournament(tournamentService);

    // Modal state
    const bracketScoreModal = useBracketScoreModal();

    // Prevent document-level scrolling while on the initial setup screen
    useEffect(() => {
        const prev = document.body.style.overflow;
        if (!tournamentStarted) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = prev || '';
        }
        return () => {
            document.body.style.overflow = prev || '';
        };
    }, [tournamentStarted]);

    // Auto-assign matches to tables whenever matches change
    useEffect(() => {
        if (!tournamentStarted || !globalAutoAssign) return;
        autoAssign(bracketsData?.match);
    }, [bracketsData?.match, tableCount, globalAutoAssign, tableSettings, tournamentStarted, autoAssign]);

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

    // Start tournament - accepts optional config so callers (wizard) can pass values directly
    type StartConfig = Partial<{
        players: Player[];
        bracketType: BracketType;
        tournamentName: string;
        description: string;
        gameType: string;
        trueDouble: boolean;
        raceWinners: number;
        raceLosers: number;
    }> | undefined;

    // startTournament is provided by useTournament hook



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
    const handleBracketMatchClick = (match: Partial<Match> | null | undefined) => {
        // Skip BYE matches or invalid matches
        if (!match || !match.id) {
            return;
        }

        // Check if this is a BYE match (one or both opponents are null/undefined)
        const hasValidOpponents = match.opponent1 && match.opponent2 &&
            (match.opponent1.id != null) && (match.opponent2.id != null);

        if (!hasValidOpponents) {
            return;
        }

        // Convert the match object to our Match type and open bracket score modal
        const mAny = match as any;
        const bracketMatch: Match = {
            id: mAny.id,
            number: mAny.number || 0,
            stage_id: mAny.stage_id ?? mAny.stageId ?? 0,
            group_id: mAny.group_id ?? mAny.groupId ?? 0,
            round_id: mAny.round_id ?? mAny.roundId ?? 0,
            child_count: mAny.child_count ?? mAny.childCount ?? 0,
            status: mAny.status ?? 'waiting',
            opponent1: mAny.opponent1 ?? null,
            opponent2: mAny.opponent2 ?? null
        };

        bracketScoreModal.openModal(bracketMatch);
    };

    // Handle table actions
    const handleAssignToTable = (matchId: number, tableIndex: number) => assignToTable(matchId, tableIndex);
    const handleRemoveFromTable = (tableIndex: number) => removeFromTable(tableIndex);
    const handleTableSettingsUpdate = (tableNumber: number, updates: Partial<TableSettings>) => setTableSettings(tableNumber, updates);

    // Handle bracket match score update
    // handleBracketMatchUpdate is provided by useTournament hook

    // generateDemo is provided by useTournament hook

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
        if (tableCount <= 1) return;

        if (bracketsData) {
            const tableToRemove = tableCount;
            const matchesOnRemovedTable = bracketsData.match.filter((m: any) => m.table === tableToRemove);

            if (matchesOnRemovedTable.length > 0) {
                const matchDetails = matchesOnRemovedTable.map((m: any) => {
                    const p1Name = bracketsData.participant.find((p: any) => p.id === m.opponent1?.id)?.name || 'TBD';
                    const p2Name = bracketsData.participant.find((p: any) => p.id === m.opponent2?.id)?.name || 'TBD';
                    return `Match #${m.number}: ${p1Name} vs ${p2Name}`;
                }).join('\n');

                const confirmed = confirm(
                    `Table ${tableToRemove} has ${matchesOnRemovedTable.length} match(es) assigned:\n\n${matchDetails}\n\nRemoving this table will return these matches to waiting. Continue?`
                );

                if (!confirmed) return;
            }

            const updatedMatches = bracketsData.match.map((m: any) => m.table === tableToRemove ? { ...m, table: undefined } : m);
            setBracketsData({ ...bracketsData, match: updatedMatches });
        }

        removeTable();
    };

    const handleTableScore = async (match: Match, score1: number, score2: number) => {
        try {
            await handleBracketMatchUpdate(match.id, score1, score2);
        } catch (error) {
            console.error('Error updating table score:', error);
        }
    };

    // Get current matches for table assignment
    const getCurrentMatches = (): Match[] => bracketsData?.match || [];

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
            <AppHeader
                tournamentName={tournamentName}
                tournamentStarted={tournamentStarted}
                playersCount={players.length}
                bracketsData={bracketsData}
                tableAssignments={tableAssignments}
            />

            {!tournamentStarted ? (
                <div className="setup-container">
                    <div className="setup-header">
                        <h2>Setup Your Tournament</h2>
                        <p>Configure tournament details, import or add players, then review & start</p>
                    </div>

                    <div className="setup-content">
                        <TournamentSetupWizard
                            inline
                            initialName={tournamentName}
                            initialBracketType={bracketType}
                            initialDescription={tournamentDescription}
                            initialGameType={gameType}
                            initialTrueDouble={trueDouble}
                            initialRaceWinners={raceWinners}
                            initialRaceLosers={raceLosers}
                            onStart={(config) => {
                                startTournament({
                                    players: config.players,
                                    bracketType: config.bracketType,
                                    tournamentName: config.name || undefined,
                                    description: config.description || undefined,
                                    gameType: config.gameType || undefined,
                                    trueDouble: config.trueDouble !== undefined ? Boolean(config.trueDouble) : undefined,
                                    raceWinners: config.raceWinners !== undefined ? config.raceWinners : undefined,
                                    raceLosers: config.raceLosers !== undefined ? config.raceLosers : undefined
                                } as StartConfig);
                            }}
                            onPlayersChange={(p: Player[]) => setPlayers(p)}
                            players={players}
                        />
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
                        <button
                            className={`tournament-tab ${activeTab === 'players' ? 'active' : ''}`}
                            onClick={() => setActiveTab('players')}
                        >
                            <span className="tab-icon">👥</span>
                            Players
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
                                        onOpenScoreModal={bracketScoreModal.openModal}
                                        onAddTable={() => addTable()}
                                        onRemoveTable={handleRemoveTable}
                                        participants={bracketsData.participant}
                                    />
                                ) : (
                                    <div>No tournament data available</div>
                                )}
                            </div>
                        )}

                        {activeTab === 'players' && (
                            <div className="players-tab">
                                <PlayersPanel
                                    bracketsData={bracketsData}
                                    players={players}
                                    setPlayers={setPlayers}
                                    tournamentService={tournamentService}
                                    setBracketsData={setBracketsData}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {bracketScoreModal.isOpen && bracketScoreModal.currentMatch && bracketsData && (
                (() => {
                    const cmatch = bracketScoreModal.currentMatch!;
                    const allMatches = bracketsData.match || [];
                    const stages = bracketsData.stage || [];
                    const stage = stages.find(s => s.id === cmatch.stage_id);
                    // Determine if this is the grand final reset by looking at GF matches for this stage and seeing if this match has the highest round_id
                    let isGFReset = false;
                    if (stage && stage.settings && (stage.settings.grandFinal === 'double' || trueDouble)) {
                        const gfMatches = allMatches.filter(m => m.stage_id === cmatch.stage_id && (m.group_id || 0) >= 3);
                        if (gfMatches.length > 0) {
                            const maxRound = Math.max(...gfMatches.map(m => (m.round_id || 0) || 0));
                            isGFReset = (cmatch.round_id || 0) === maxRound && maxRound > 1;
                        }
                    }

                    return (
                        <BracketScoreModal
                            match={cmatch}
                            participants={bracketsData.participant}
                            onClose={bracketScoreModal.closeModal}
                            onMatchUpdate={async (matchId: number, s1: number, s2: number) => { await handleBracketMatchUpdate(matchId, s1, s2); }}
                            raceWinners={raceWinners}
                            raceLosers={raceLosers}
                            trueDouble={trueDouble}
                            isGFReset={isGFReset}
                        />
                    );
                })()
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

// PlayerRow and PreStartPlayerRow were extracted to separate components under src/components/