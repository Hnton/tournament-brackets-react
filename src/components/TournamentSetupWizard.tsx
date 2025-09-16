import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Player } from '../types';
import { generateDemoPlayers } from '../utils';
import { PlayerUpload } from './PlayerUpload';

type Props = {
    initialName?: string;
    initialBracketType?: 'single' | 'double';
    initialDescription?: string;
    initialGameType?: string;
    initialTrueDouble?: boolean;
    initialRaceWinners?: number;
    initialRaceLosers?: number;
    players?: Player[];
    onPlayersChange?: (players: Player[]) => void;
    onStart: (config: {
        name: string;
        description?: string;
        gameType: string;
        bracketType: 'single' | 'double';
        trueDouble?: boolean;
        raceWinners?: number;
        raceLosers?: number;
        players: Player[];
    }) => void;
    inline?: boolean;
};

export const TournamentSetupWizard: React.FC<Props> = ({ initialName = '', initialBracketType = 'double', initialDescription = '', initialGameType = 'Nine Ball', initialTrueDouble = true, initialRaceWinners = 7, initialRaceLosers = 5, players: initialPlayers = [], onPlayersChange, onStart, inline = false }) => {
    const [step, setStep] = useState<number>(1);
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const [availableHeight, setAvailableHeight] = useState<number | null>(null);
    const [compactMode, setCompactMode] = useState(false);

    // Step 1: meta
    const [name, setName] = useState(initialName);
    const [description, setDescription] = useState(initialDescription);
    const [gameType, setGameType] = useState(initialGameType);
    const [bracketType, setBracketType] = useState<'single' | 'double'>(initialBracketType);
    const [trueDouble, setTrueDouble] = useState(initialTrueDouble);
    const [raceWinners, setRaceWinners] = useState<number>(initialRaceWinners);
    const [raceLosers, setRaceLosers] = useState<number>(initialRaceLosers);

    // Step 2: players
    const [players, setPlayers] = useState<Player[]>(initialPlayers || []);
    // Local edit state for inline editing of players
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editingName, setEditingName] = useState('');
    const [editingPhone, setEditingPhone] = useState('');
    // lightweight non-blocking toast for user messages
    const [toast, setToast] = useState<{ message: string; type?: 'info' | 'error' } | null>(null);
    const toastTimerRef = useRef<number | null>(null);

    const showToast = (message: string, type: 'info' | 'error' = 'info', ms = 3500) => {
        setToast({ message, type });
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = window.setTimeout(() => {
            setToast(null);
            toastTimerRef.current = null;
        }, ms) as unknown as number;
    };

    useEffect(() => {
        return () => {
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        };
    }, []);

    // CSV upload handler: merge, dedupe by name, sanitize phone
    const handleCSVUpload = (uploaded: Player[]) => {
        const normalized = uploaded.map(p => ({ name: (p.name || '').trim(), phone: (p.phone || '').trim() }));
        // detect duplicates against existing players (case-insensitive)
        const existingKeys = new Set(players.map(p => (p.name || '').toLowerCase()));
        const toAdd: Player[] = [];
        const skipped: string[] = [];

        normalized.forEach(p => {
            const key = (p.name || '').toLowerCase();
            if (!key) return;
            if (existingKeys.has(key)) {
                skipped.push(p.name);
            } else {
                const cleanedPhone = p.phone ? p.phone.replace(/[^+0-9]/g, '') : '';
                toAdd.push({ name: p.name, phone: cleanedPhone });
                existingKeys.add(key);
            }
        });

        if (skipped.length) {
            showToast(`Skipped ${skipped.length} duplicate player(s): ${skipped.join(', ')}`, 'error');
        }

        if (toAdd.length === 0) return;

        // merge newly allowed players with existing and keep unique by lowercase name
        const merged = [...players, ...toAdd];
        const map = new Map<string, Player>();
        merged.forEach(p => {
            const key = (p.name || '').toLowerCase();
            if (!key) return;
            const cleanedPhone = p.phone ? p.phone.replace(/[^+0-9]/g, '') : '';
            if (!map.has(key)) map.set(key, { name: p.name, phone: cleanedPhone });
        });
        setPlayers(Array.from(map.values()));
    };

    const addManualPlayer = (p: Player) => {
        const name = (p.name || '').trim();
        if (!name) return;
        const key = name.toLowerCase();
        const cleanedPhone = (p.phone || '').trim().replace(/[^+0-9]/g, '');
        // synchronous duplicate check before updating state to avoid showing toast inside setState
        const existing = new Set(players.map(x => x.name.toLowerCase()));
        if (existing.has(key)) {
            showToast(`${name} is already in the list and was not added.`, 'error');
            return;
        }

        setPlayers(prev => {
            const map = new Map(prev.map(x => [x.name.toLowerCase(), x]));
            map.set(key, { name, phone: cleanedPhone });
            return Array.from(map.values());
        });
    };

    // ref to the scrollable players list so we can scroll to bottom on add
    const playersListRef = useRef<HTMLDivElement | null>(null);

    // whenever players change, scroll the container to the bottom so last-added is visible
    useEffect(() => {
        const el = playersListRef.current;
        if (el) {
            // scroll after next frame to ensure DOM updated
            requestAnimationFrame(() => {
                el.scrollTop = el.scrollHeight;
            });
        }
    }, [players.length]);

    // notify parent when players change
    useEffect(() => {
        if (onPlayersChange) onPlayersChange(players);
    }, [players.length]);

    const removePlayerAt = (idx: number) => {
        setPlayers(prev => prev.filter((_, i) => i !== idx));
        // reset editing state if the currently edited player was removed
        if (editingIndex === idx) {
            setEditingIndex(null);
            setEditingName('');
            setEditingPhone('');
        }
    };

    const startEdit = (idx: number) => {
        const p = players[idx];
        if (!p) return;
        setEditingIndex(idx);
        setEditingName(p.name || '');
        setEditingPhone(p.phone || '');
    };

    const cancelEdit = () => {
        setEditingIndex(null);
        setEditingName('');
        setEditingPhone('');
    };

    const saveEdit = (idx: number) => {
        const name = (editingName || '').trim();
        const phone = (editingPhone || '').trim().replace(/[^+0-9]/g, '');
        if (!name) {
            showToast('Player name cannot be empty', 'error');
            return;
        }
        // ensure new name is unique among other players (case-insensitive)
        const newKey = name.toLowerCase();
        const duplicate = players.some((p, i) => i !== idx && (p.name || '').toLowerCase() === newKey);
        if (duplicate) {
            showToast(`${name} conflicts with an existing player name and was not saved.`, 'error');
            return;
        }

        setPlayers(prev => prev.map((p, i) => i === idx ? { name, phone } : p));
        cancelEdit();
    };

    const handleGenerateDemo = () => {
        const demo = generateDemoPlayers();
        setPlayers(demo);
    };

    // Step 3: review & start
    const handleStart = () => {
        if (players.length < 2) {
            showToast('At least 2 players are required to start a tournament.', 'error');
            setStep(2);
            return;
        }

        onStart({
            name,
            description,
            gameType,
            bracketType,
            trueDouble,
            raceWinners,
            raceLosers,
            players
        });
    };

    const rootClass = `tournament-wizard ${inline ? 'inline-wizard' : 'modal-overlay'} compact-wizard ${compactMode ? 'compact-mode' : ''}`;
    const wrapperClass = inline ? 'wizard-inline-panel' : 'modal-fullwidth';

    // compute available height for the wizard so it fits correctly beneath the window titlebar
    useEffect(() => {
        let raf = 0 as number | null;
        let resizeTimer: number | null = null;

        const compute = () => {
            const rootEl = wrapperRef.current;
            if (!rootEl) return;
            const rect = rootEl.getBoundingClientRect();
            // margin to keep some breathing room and to account for window chrome
            const margin = 28;
            const height = Math.max(320, Math.floor(window.innerHeight - rect.top - margin));
            setAvailableHeight(height);
            setCompactMode(height < 520);
        };

        const onResize = () => {
            // debounce with RAF + small timeout
            if (raf) cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => {
                if (resizeTimer) window.clearTimeout(resizeTimer);
                resizeTimer = window.setTimeout(() => {
                    compute();
                    resizeTimer = null;
                }, 80) as unknown as number;
            }) as unknown as number;
        };

        compute();
        window.addEventListener('resize', onResize);

        return () => {
            if (raf) cancelAnimationFrame(raf);
            if (resizeTimer) window.clearTimeout(resizeTimer);
            window.removeEventListener('resize', onResize);
        };
    }, []);

    // prevent page scrolling while the modal/overlay wizard is active
    useEffect(() => {
        if (!inline) {
            document.body.classList.add('tournament-wizard-active');
        }
        return () => {
            document.body.classList.remove('tournament-wizard-active');
        };
    }, [inline]);

    return (
        <div className={rootClass}>
            <div ref={wrapperRef} className={wrapperClass}>
                <div className="wizard-header">
                    <div className="wizard-steps">
                        <div className={`wizard-step ${step === 1 ? 'active' : ''}`}>Details</div>
                        <div className={`wizard-step ${step === 2 ? 'active' : ''}`}>Players</div>
                        <div className={`wizard-step ${step === 3 ? 'active' : ''}`}>Review</div>
                    </div>

                    <div className="wizard-header-actions">
                        {step > 1 && (
                            <button className="secondary" onClick={() => setStep(step - 1)}>← Back</button>
                        )}

                        {step < 3 ? (
                            <button
                                className="primary"
                                onClick={() => setStep(step + 1)}
                            >
                                {step === 1 ? 'Next: Players →' : 'Next: Review →'}
                            </button>
                        ) : (
                            <button
                                className="primary"
                                onClick={handleStart}
                                disabled={!name.trim() || players.length < 2 || raceWinners < 1 || raceLosers < 1}
                            >
                                Start Tournament
                            </button>
                        )}
                    </div>
                </div>

                {step === 1 && (
                    <div className="wizard-panel" style={availableHeight ? { height: availableHeight, maxHeight: availableHeight } : undefined}>
                        <div className="wizard-panel-inner">
                            <div className="wizard-body details-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'center', gap: 12 }}>
                                <div>
                                    <label>Tournament Name</label>
                                    <input value={name} onChange={(e) => setName(e.target.value)} />
                                </div>

                                <div>
                                    <label>Short Description</label>
                                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
                                </div>

                                <div>
                                    <label>Game Type</label>
                                    <select value={gameType} onChange={(e) => setGameType(e.target.value)}>
                                        <option>Nine Ball</option>
                                        <option>Ten Ball</option>
                                        <option>Eight Ball</option>
                                        <option>One Pocket</option>
                                        <option>Bank Pool</option>
                                    </select>
                                </div>

                                <div>
                                    <label>Tournament Type</label>
                                    <select value={bracketType} onChange={(e) => setBracketType(e.target.value as any)}>
                                        <option value="single">Single Elimination</option>
                                        <option value="double">Double Elimination</option>
                                    </select>
                                </div>

                                {bracketType === 'double' && (
                                    <div>
                                        <label>True Double Elimination</label>
                                        <select value={trueDouble ? 'yes' : 'no'} onChange={(e) => setTrueDouble(e.target.value === 'yes')}>
                                            <option value="yes">Yes</option>
                                            <option value="no">No</option>
                                        </select>
                                    </div>
                                )}

                                <div className="race-pair">
                                    <div className="race-col">
                                        <label>Race (Winners)</label>
                                        <input className="race-input" type="number" min={1} value={raceWinners} onChange={(e) => setRaceWinners(parseInt(e.target.value || '1', 10))} />
                                    </div>

                                    <div className="race-col">
                                        <label>Race (Losers)</label>
                                        <input className="race-input" type="number" min={1} value={raceLosers} onChange={(e) => setRaceLosers(parseInt(e.target.value || '1', 10))} />
                                    </div>
                                </div>
                            </div>

                            <div className="wizard-actions">
                                {/* Back moved to header */}
                            </div>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="wizard-panel" style={availableHeight ? { height: availableHeight, maxHeight: availableHeight } : undefined}>
                        <div className="wizard-panel-inner">
                            <div className="wizard-body" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <label>Players ({players.length})</label>
                                    <button onClick={handleGenerateDemo} className="secondary">Demo</button>
                                </div>

                                <div className="players-list" ref={playersListRef}>
                                    {players.map((p, i) => (
                                        <div key={`${p.name}-${i}`} className="player-row">
                                            {editingIndex === i ? (
                                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1 }}>
                                                    <input className="text-input" value={editingName} onChange={(e) => setEditingName(e.target.value)} />
                                                    <input className="text-input" value={editingPhone} onChange={(e) => setEditingPhone(e.target.value)} placeholder="Phone (optional)" />
                                                </div>
                                            ) : (
                                                <div className="player-meta" style={{ flex: 1 }}>
                                                    <span className="player-name">{p.name}</span>
                                                    {p.phone && <span className="player-phone">{p.phone}</span>}
                                                </div>
                                            )}

                                            <div style={{ display: 'flex', gap: 8 }}>
                                                {editingIndex === i ? (
                                                    <>
                                                        <button className="secondary" onClick={() => saveEdit(i)}>Save</button>
                                                        <button onClick={cancelEdit}>Cancel</button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button className="secondary" onClick={() => startEdit(i)}>Edit</button>
                                                        <button onClick={() => removePlayerAt(i)}>Remove</button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="manual-add">
                                    <ManualAddPlayer onAdd={addManualPlayer} showToast={showToast} />
                                </div>

                                <div style={{ marginTop: 12 }}>
                                    <PlayerUpload onPlayersParsed={handleCSVUpload} />
                                </div>
                            </div>

                            {/* toast */}
                            {toast && (
                                <div className={`wizard-toast ${toast.type === 'error' ? 'error' : 'info'}`}>
                                    {toast.message}
                                </div>
                            )}

                            <div className="wizard-actions">
                                {/* Back moved to header */}
                            </div>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="wizard-panel" style={availableHeight ? { height: availableHeight, maxHeight: availableHeight } : undefined}>
                        <div className="wizard-panel-inner">
                            <div className="wizard-body" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                <h3>Review Tournament</h3>
                                <div><strong>Name:</strong> {name}</div>
                                {!name.trim() && (
                                    <div style={{ color: 'var(--accent-error)', marginTop: 6 }}>Tournament name is required.</div>
                                )}
                                <div><strong>Description:</strong> {description}</div>
                                <div><strong>Game:</strong> {gameType}</div>
                                <div><strong>Type:</strong> {bracketType} {bracketType === 'double' ? `(True double: ${trueDouble ? 'Yes' : 'No'})` : ''}</div>
                                <div><strong>Race (Winners):</strong> {raceWinners}</div>
                                <div><strong>Race (Losers):</strong> {raceLosers}</div>

                                <h4>Players ({players.length})</h4>
                                <div className="players-list-review">
                                    {players.map((p, i) => (
                                        <div key={`${p.name}-${i}`}>{i + 1}. {p.name}</div>
                                    ))}
                                </div>
                            </div>

                            <div className="wizard-actions">
                                {/* Back moved to header */}
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

type ManualAddPlayerProps = { onAdd: (p: Player) => void; showToast?: (message: string, type?: 'info' | 'error') => void };

const ManualAddPlayer: React.FC<ManualAddPlayerProps> = ({ onAdd, showToast }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');

    const submit = () => {
        if (!name.trim()) return;
        const cleanedPhone = phone.trim().replace(/[^+0-9]/g, '');
        // basic phone validation: allow empty or digits with optional leading +
        if (cleanedPhone && !/^\+?[0-9]{4,15}$/.test(cleanedPhone)) {
            if (showToast) showToast('Please enter a valid phone number (digits, optional leading +).', 'error');
            return;
        }
        onAdd({ name: name.trim(), phone: cleanedPhone });
        setName(''); setPhone('');
    };

    return (
        <div className="manual-add-panel">
            <input placeholder="Player name" value={name} onChange={(e) => setName(e.target.value)} />
            <input placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <button onClick={submit}>Add Player</button>
        </div>
    );
};

export default TournamentSetupWizard;
