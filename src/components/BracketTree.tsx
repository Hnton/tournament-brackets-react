
import * as React from 'react';
import { Match } from '../types';

interface BracketTreeProps {
    matches: Match[];
    onMatchClick?: (match: Match) => void;
    connectRounds?: boolean;
}

function groupByRound(matches: Match[]) {
    const rounds: { [round: number]: Match[] } = {};
    matches.forEach(m => {
        if (!rounds[m.round]) rounds[m.round] = [];
        (rounds[m.round] ?? []).push(m);
    });
    return Object.entries(rounds)
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([round, ms]) => ({ round: Number(round), matches: ms }));
}


export const BracketTree: React.FC<BracketTreeProps> = ({ matches, onMatchClick, connectRounds }) => {
    const rounds = groupByRound(matches);
    const maxMatches = Math.max(...rounds.map(r => r.matches.length));
    const colWidth = `${Math.floor(100 / rounds.length)}%`;
    // Helper for flag emoji
    const getFlag = (name?: string) => name && name.includes('🇺🇸') ? '🇺🇸' : '';
    // Helper for trophy
    const trophy = '🏆';
    // Helper for BYE
    const isBye = (p: any) => p && (typeof p === 'string' && p.toLowerCase().includes('bye') || (typeof p === 'object' && p.name && p.name.toLowerCase().includes('bye')));
    return (
        <div style={{
            display: 'flex',
            width: '100%',
            minWidth: '100%',
            alignItems: 'flex-start',
            overflowX: 'auto',
            margin: 0,
            position: 'relative',
            justifyContent: 'center',
            background: '#0a1020',
            borderRadius: 0,
            boxShadow: '0 2px 16px #0008',
            padding: '0.5em 0 1em 0',
        }}>
            {rounds.map((r, roundIdx) => {
                const matchHeight = 100;
                const gap = connectRounds ? 8 : (maxMatches * matchHeight - r.matches.length * matchHeight) / 2;
                // Round label
                let roundLabel = roundIdx === rounds.length - 1 ? 'Final' : `Round ${r.round}`;
                if (rounds.length > 2 && roundIdx === 0) roundLabel = 'WB ROUND 1';
                if (rounds.length > 2 && roundIdx === rounds.length - 2) roundLabel = 'Semi';
                return (
                    <div key={r.round} style={{
                        width: colWidth,
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        minWidth: 220,
                        zIndex: 1,
                    }}>
                        <div style={{ background: '#007BFF', color: 'white', fontWeight: 'bold', marginBottom: 12, textAlign: 'center', fontSize: 18, borderRadius: 8, padding: '6px 0', width: '90%' }}>
                            {roundLabel}
                        </div>
                        <div style={{ marginTop: gap }} />
                        {r.matches.map((match, matchIdx) => {
                            const completed = match.winner;
                            const bye = isBye(match.player1) || isBye(match.player2);
                            const pending = !completed && !bye && match.player1 && match.player2;
                            let bg = bye ? '#444' : pending ? '#007BFF' : completed ? '#28A745' : '#222';
                            let border = bye ? '1.5px solid #888' : completed ? '2px solid #28A745' : pending ? '2px solid #007BFF' : '1.5px solid #333';
                            let color = bye ? '#bbb' : 'white';
                            return (
                                <div
                                    key={match.id}
                                    draggable={!!(match.player1 && match.player2 && !match.winner && !match.table)}
                                    onDragStart={e => {
                                        e.dataTransfer.setData('application/match-id', String(match.id));
                                    }}
                                    style={{
                                        border,
                                        borderRadius: 16,
                                        padding: 16,
                                        marginBottom: matchHeight / 2,
                                        background: bg,
                                        minHeight: matchHeight,
                                        width: 220,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        cursor: onMatchClick && match.player1 && match.player2 && !match.winner ? 'pointer' : 'default',
                                        opacity: match.table ? 0.5 : 1,
                                        position: 'relative',
                                        boxShadow: completed ? '0 0 16px #28A74588' : pending ? '0 0 12px #007BFF44' : '0 1px 4px #0002',
                                        fontSize: 16,
                                        transition: 'background 0.3s, box-shadow 0.3s',
                                        color,
                                    }}
                                    onClick={() => onMatchClick && match.player1 && match.player2 && !match.winner && onMatchClick(match)}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', fontWeight: 700, color: match.player1 && match.winner === match.player1 ? '#FFD700' : color }}>
                                        {getFlag(match.player1?.name)} {match.player1?.name || 'TBD'}
                                        {match.winner === match.player1 && <span style={{ marginLeft: 6 }}>{trophy}</span>}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', fontWeight: 700, color: match.player2 && match.winner === match.player2 ? '#FFD700' : color }}>
                                        {getFlag(match.player2?.name)} {match.player2?.name || 'TBD'}
                                        {match.winner === match.player2 && <span style={{ marginLeft: 6 }}>{trophy}</span>}
                                    </div>
                                    <div style={{ fontSize: 13, color: bye ? '#aaa' : '#fff', marginTop: 4 }}>
                                        {bye ? 'BYE - AUTO ADVANCE' : (match.score1 != null && match.score2 != null ? `Score: ${match.score1} - ${match.score2}` : pending ? 'Scheduled' : 'No score')}
                                    </div>
                                    {completed && !bye && <div style={{ fontSize: 12, color: '#fff', background: '#28A745', borderRadius: 6, padding: '2px 8px', marginTop: 4, fontWeight: 600 }}>COMPLETED</div>}
                                    {pending && <div style={{ fontSize: 12, color: '#fff', background: '#007BFF', borderRadius: 6, padding: '2px 8px', marginTop: 4, fontWeight: 600 }}>PENDING</div>}
                                    {bye && <div style={{ fontSize: 12, color: '#bbb', background: '#444', borderRadius: 6, padding: '2px 8px', marginTop: 4, fontWeight: 600 }}>BYE</div>}
                                    {/* Draw lines to next round */}
                                    {roundIdx < rounds.length - 1 && (
                                        <svg width="60" height={matchHeight} style={{ position: 'absolute', right: -60, top: 0, zIndex: 0 }}>
                                            <line x1="0" y1={matchHeight / 2} x2="60" y2={matchHeight / 2} stroke="white" strokeWidth="2" opacity="0.7" />
                                            {/* Vertical connector to next match */}
                                            <line
                                                x1="60"
                                                y1={matchHeight / 2}
                                                x2="60"
                                                y2={matchIdx % 2 === 0 ? matchHeight + matchHeight / 4 : -matchHeight / 4}
                                                stroke="white"
                                                strokeWidth="2"
                                                opacity="0.7"
                                            />
                                        </svg>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
};
