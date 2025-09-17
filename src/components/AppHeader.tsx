import * as React from 'react';

interface AppHeaderProps {
    tournamentName: string;
    tournamentStarted: boolean;
    playersCount: number;
    bracketsData: any | null;
    tableAssignments: (number | null)[];
}

const AppHeader: React.FC<AppHeaderProps> = ({ tournamentName, tournamentStarted, playersCount, bracketsData, tableAssignments }) => {
    return (
        <div className="header">
            <div className="header-content">
                <div className="header-title">
                    <h1>🏆 {tournamentName || 'Tournament Brackets'}</h1>
                    {!tournamentStarted && playersCount > 0 && (
                        <p className="header-subtitle">
                            {playersCount} player{playersCount !== 1 ? 's' : ''} ready
                        </p>
                    )}
                    {tournamentStarted && bracketsData && (
                        <p className="header-subtitle">
                            {bracketsData.participant?.length || 0} participants • {bracketsData.match?.length || 0} matches
                            {(() => {
                                const stageSettings = bracketsData.stage && bracketsData.stage[0] && (bracketsData.stage[0].settings as any);
                                const gt = stageSettings?.gameType || '';
                                const rw = stageSettings?.raceWinners || '';
                                const rl = stageSettings?.raceLosers || '';
                                return (
                                    <span style={{ display: 'block', marginTop: 4, fontSize: '0.9em', color: 'var(--text-secondary)' }}>
                                        {gt} • Race W: {rw} • Race L: {rl}
                                    </span>
                                );
                            })()}
                        </p>
                    )}
                </div>

                <div className="header-controls">
                    {/* left intentionally minimal */}
                </div>

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
    );
};

export default AppHeader;
