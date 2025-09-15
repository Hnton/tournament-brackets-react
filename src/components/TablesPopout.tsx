import * as React from 'react';
import { useEffect, useState } from 'react';
import { BracketsData, Match, Participant } from '../types';
import { getUserFriendlyRoundNumber } from '../utils';

const STORAGE_KEY = 'tournament:bracketsData';

const TablesPopout: React.FC = () => {
    const [data, setData] = useState<BracketsData | null>(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            console.error('Failed to parse table data from storage', e);
            return null;
        }
    });

    useEffect(() => {
        const onStorage = (e: StorageEvent) => {
            if (e.key !== STORAGE_KEY) return;
            try {
                const newData = e.newValue ? JSON.parse(e.newValue) : null;
                setData(newData);
            } catch (err) {
                console.error('Failed to parse updated table data from storage', err);
            }
        };

        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    if (!data) {
        return (
            <div style={{ padding: 24 }}>
                <h3>No tournament data available</h3>
                <p>Open the tournament in the main window and start it to initialize table data.</p>
            </div>
        );
    }

    // Partition matches into winners (group_id === 1) and losers (group_id === 2)
    const assignedMatches = data.match.filter(m => m.table !== null && m.table !== undefined) as Match[];

    const isReadyStatus = (status: any) => {
        if (typeof status === 'number') return status === 2; // numeric legacy mapping
        return status === 'ready' || status === 'waiting' || status === 'running';
    };

    const waitingMatches = data.match.filter(m => {
        const isNotAssigned = m.table === null || m.table === undefined;
        const isReady = isReadyStatus(m.status);
        const hasPlayers = m.opponent1 && m.opponent2 && m.opponent1.id != null && m.opponent2.id != null;
        return isNotAssigned && isReady && hasPlayers;
    }) as Match[];

    // Sort waiting matches for deterministic ordering
    waitingMatches.sort((a, b) => (a.round_id || 0) - (b.round_id || 0) || (a.number || 0) - (b.number || 0));

    const getPlayerName = (pObj: any) => {
        if (!pObj || pObj.id == null) return 'TBD';
        const participant = data.participant.find(pt => pt.id === pObj.id);
        return participant ? participant.name : `#${pObj.id}`;
    };

    const winnersAssigned = assignedMatches.filter(m => m.group_id === 1);
    const losersAssigned = assignedMatches.filter(m => m.group_id === 2);
    const winnersWaiting = waitingMatches.filter(m => m.group_id === 1);
    const losersWaiting = waitingMatches.filter(m => m.group_id === 2);

    return (
        <div style={{ width: '100vw', height: '100vh', padding: 12, boxSizing: 'border-box', overflow: 'auto' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                <h2>Tables — Winners / Losers</h2>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 8 }}>
                    {/* Winners Column */}
                    <div>
                        <h3>Winners Bracket</h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {winnersAssigned.length === 0 && winnersWaiting.length === 0 && (
                                <div style={{ padding: 12, border: '1px solid #ddd', borderRadius: 8 }}>No winners-bracket matches</div>
                            )}

                            {winnersAssigned.map(match => {
                                const t = typeof match.table === 'number' ? match.table : 0;
                                const displayLabel = t === 1 ? 'Stream' : `Table ${Math.max(0, t - 1)}`;
                                return (
                                    <div key={match.id} style={{ padding: 12, border: '1px solid var(--border-light)', borderRadius: 8, background: 'var(--bg-secondary)' }}>
                                        <div style={{ fontWeight: 700 }}>{displayLabel} — {getPlayerName(match.opponent1)} vs {getPlayerName(match.opponent2)}</div>
                                        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)' }}>{getUserFriendlyRoundNumber(match, data.match)}</div>
                                    </div>
                                );
                            })}

                            {winnersWaiting.map(match => (
                                <div key={match.id} style={{ padding: 12, border: '1px solid var(--border-light)', borderRadius: 8, background: 'var(--bg-primary)' }}>
                                    <div style={{ fontWeight: 700 }}>{getPlayerName(match.opponent1)} vs {getPlayerName(match.opponent2)}</div>
                                    <div style={{ marginTop: 6, fontSize: 13, color: 'var(--text-secondary)' }}>{getUserFriendlyRoundNumber(match, data.match)} • Match #{match.number}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Losers Column */}
                    <div>
                        <h3>Losers Bracket</h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {losersAssigned.length === 0 && losersWaiting.length === 0 && (
                                <div style={{ padding: 12, border: '1px solid #ddd', borderRadius: 8 }}>No losers-bracket matches</div>
                            )}

                            {losersAssigned.map(match => {
                                const t = typeof match.table === 'number' ? match.table : 0;
                                const displayLabel = t === 1 ? 'Stream' : `Table ${Math.max(0, t - 1)}`;
                                return (
                                    <div key={match.id} style={{ padding: 12, border: '1px solid var(--border-light)', borderRadius: 8, background: 'var(--bg-secondary)' }}>
                                        <div style={{ fontWeight: 700 }}>{displayLabel} — {getPlayerName(match.opponent1)} vs {getPlayerName(match.opponent2)}</div>
                                        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)' }}>{getUserFriendlyRoundNumber(match, data.match)}</div>
                                    </div>
                                );
                            })}

                            {losersWaiting.map(match => (
                                <div key={match.id} style={{ padding: 12, border: '1px solid var(--border-light)', borderRadius: 8, background: 'var(--bg-primary)' }}>
                                    <div style={{ fontWeight: 700 }}>{getPlayerName(match.opponent1)} vs {getPlayerName(match.opponent2)}</div>
                                    <div style={{ marginTop: 6, fontSize: 13, color: 'var(--text-secondary)' }}>{getUserFriendlyRoundNumber(match, data.match)} • Match #{match.number}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TablesPopout;
