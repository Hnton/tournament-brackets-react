import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
// Resolve image asset via webpack so the dev server serves the correct path
const fargoLogo = require('../../assets/images/fargo-logo-circle.png');
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
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editIndex, setEditIndex] = useState<number | null>(null);
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

    // Compute disambiguator per-player so subsets keep more-specific disambiguation
    // even when other duplicates have different fields.
    // Strategy (per player p):
    // 1) If p.state is non-empty and no other player in the name-group has that same state -> (state)
    // 2) Else if within players sharing p.state, p.city is non-empty and unique -> (state, city)
    // 3) Else if within players sharing p.state & p.city, p.effectiveRating is unique -> (state, city, effectiveRating)
    // 4) Else if p.membershipId exists and is unique in the group -> (membershipId)
    // 5) Otherwise return empty string
    const computeDisambiguator = (p: Player) => {
        const nameKey = (p.name || '').toLowerCase();
        const group = players.filter(x => (x.name || '').toLowerCase() === nameKey);
        if (group.length <= 1) return '';

        const safe = (v: any) => (v === undefined || v === null) ? '' : String(v);

        // Helper: count occurrences for a projection over an array
        const counts = (arr: any[], fn: (x: any) => string) => {
            const m = new Map<string, number>();
            for (const it of arr) {
                const k = fn(it) || '';
                m.set(k, (m.get(k) || 0) + 1);
            }
            return m;
        };

        const state = safe((p as any).state);
        const city = safe((p as any).city);
        const rating = (p as any).effectiveRating !== undefined ? String((p as any).effectiveRating) : '';

        // Count states across whole name-group
        const stateCounts = counts(group, (x: any) => safe(x.state));
        // If this player's state is unique among the name-group and non-empty -> show (state)
        if (state && (stateCounts.get(state) || 0) === 1) {
            return `(${state})`;
        }

        // Otherwise, consider players that share this player's state (may be empty string)
        const sameStateGroup = group.filter(x => safe((x as any).state) === state);
        if (sameStateGroup.length > 1) {
            // count cities within this state-subgroup
            const cityCounts = counts(sameStateGroup, (x: any) => safe(x.city));
            if (city && (cityCounts.get(city) || 0) === 1) {
                const parts: string[] = [];
                if (state) parts.push(state);
                parts.push(city);
                return `(${parts.join(', ')})`;
            }

            // check rating uniqueness within same state+city
            const sameStateCityGroup = sameStateGroup.filter(x => safe((x as any).city) === city);
            if (sameStateCityGroup.length > 1) {
                const ratingCounts = counts(sameStateCityGroup, (x: any) => x.effectiveRating !== undefined ? String((x as any).effectiveRating) : '');
                if (rating && (ratingCounts.get(rating) || 0) === 1) {
                    const parts: string[] = [];
                    if (state) parts.push(state);
                    if (city) parts.push(city);
                    parts.push(rating);
                    return `(${parts.join(', ')})`;
                }
            }
        }

        // fallback: show membershipId if it uniquely identifies the player in the group
        const mid = safe((p as any).membershipId);
        if (mid) {
            const midCounts = counts(group, (x: any) => safe((x as any).membershipId));
            if ((midCounts.get(mid) || 0) === 1) return `(${mid})`;
        }

        return '';
    };

    // Highlight players with missing data. Return list of missing field keys.
    const getMissingFields = (p: Player) => {
        const keys: string[] = [];
        // check common fields that are useful to have
        if (!p.phone || !(p.phone || '').toString().trim()) keys.push('phone');
        if (!p.email || !(p.email || '').toString().trim()) keys.push('email');
        if (!p.membershipId || !(p.membershipId || '').toString().trim()) keys.push('membershipId');
        if (!((p as any).city) || !((p as any).city || '').toString().trim()) keys.push('city');
        if (!((p as any).state) || !((p as any).state || '').toString().trim()) keys.push('state');
        if ((p as any).effectiveRating === undefined || (p as any).effectiveRating === null || (p as any).effectiveRating === '') keys.push('effectiveRating');
        return keys;
    };

    const rowStyleFor = (p: Player) => {
        const missing = getMissingFields(p).length;
        if (missing === 0) return undefined;
        // 1 missing -> orange, 2+ missing -> soft red
        const orange = 'rgba(255, 159, 66, 0.08)';
        const red = 'rgba(255, 99, 71, 0.08)';
        return { background: missing === 1 ? orange : red } as React.CSSProperties;
    };

    // CSV upload handler: merge, dedupe by name, sanitize phone
    const handleCSVUpload = (uploaded: Player[]) => {
        const normalized = uploaded.map(p => ({ name: (p.name || '').trim(), phone: (p.phone || '').trim(), membershipId: (p as any).membershipId }));
        // detect duplicates against existing players using composite key (name|membershipId)
        const playerKey = (p: { name?: string; membershipId?: string | undefined }) => `${(p.name || '').toLowerCase()}|${(p as any).membershipId || ''}`;
        const existingKeys = new Set(players.map(p => playerKey(p)));
        const toAdd: Player[] = [];
        const skipped: string[] = [];

        normalized.forEach(p => {
            const key = (p.name || '').toLowerCase();
            if (!key) return;
            const composite = playerKey(p);
            if (existingKeys.has(composite)) {
                skipped.push(p.name + (p.membershipId ? ` (${p.membershipId})` : ''));
            } else {
                const cleanedPhone = p.phone ? p.phone.replace(/[^+0-9]/g, '') : '';
                const newPlayer: any = { name: p.name, phone: cleanedPhone };
                if ((p as any).membershipId) newPlayer.membershipId = (p as any).membershipId;
                toAdd.push(newPlayer);
                existingKeys.add(composite);
            }
        });

        if (skipped.length) {
            showToast(`Skipped ${skipped.length} duplicate player(s): ${skipped.join(', ')}`, 'error');
        }

        if (toAdd.length === 0) return;

        // merge newly allowed players with existing and keep unique by composite key (name|membershipId)
        const merged = [...players, ...toAdd];
        const map = new Map<string, Player>();
        merged.forEach(p => {
            const key = `${(p.name || '').toLowerCase()}|${(p as any).membershipId || ''}`;
            if (!p.name) return;
            const cleanedPhone = p.phone ? p.phone.replace(/[^+0-9]/g, '') : '';
            if (!map.has(key)) map.set(key, { name: p.name, phone: cleanedPhone, ...(p as any).membershipId ? { membershipId: (p as any).membershipId } : {} });
        });
        setPlayers(Array.from(map.values()));
    };

    const addManualPlayer = (p: Player) => {
        const name = (p.name || '').trim();
        if (!name) return;
        const cleanedPhone = (p.phone || '').trim().replace(/[^+0-9]/g, '');
        const effectiveRating = (p as any).effectiveRating;
        const robustness = (p as any).robustness;
        const city = (p as any).city;
        const state = (p as any).state;
        const membershipId = (p as any).membershipId;

        // build composite key using membershipId when present so same names with different IDs are allowed
        const makeKey = (nameStr: string, mid?: string | undefined) => `${(nameStr || '').toLowerCase()}|${mid || ''}`;
        const key = makeKey(name, membershipId);

        // synchronous duplicate check before updating state to avoid showing toast inside setState
        const existingKeys = new Set(players.map(x => makeKey(x.name, (x as any).membershipId)));
        if (existingKeys.has(key)) {
            showToast(`${name}${membershipId ? ` (${membershipId})` : ''} is already in the list and was not added.`, 'error');
            return;
        }

        setPlayers(prev => {
            const map = new Map(prev.map(x => [`${(x.name || '').toLowerCase()}|${(x as any).membershipId || ''}`, x]));
            map.set(key, { name, phone: cleanedPhone, ...(effectiveRating !== undefined ? { effectiveRating } : {}), ...(robustness !== undefined ? { robustness } : {}), ...(city ? { city } : {}), ...(state ? { state } : {}), ...(membershipId ? { membershipId } : {}) });
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

    const openEditModal = (idx: number) => {
        if (idx < 0 || idx >= players.length) return;
        setEditIndex(idx);
        setShowEditModal(true);
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
        // ensure new name is unique among other players using composite key (name|membershipId)
        const membershipId = (players[idx] as any).membershipId;
        const makeKey = (n: string, mid?: string | undefined) => `${n.toLowerCase()}|${mid || ''}`;
        const newKey = makeKey(name, membershipId);
        const duplicate = players.some((p, i) => i !== idx && makeKey(p.name || '', (p as any).membershipId) === newKey);
        if (duplicate) {
            showToast(`${name} conflicts with an existing player and was not saved.`, 'error');
            return;
        }

        setPlayers(prev => prev.map((p, i) => i === idx ? { name, phone, ...(p as any).membershipId ? { membershipId: (p as any).membershipId } : {}, ...(p as any).city ? { city: (p as any).city } : {}, ...(p as any).state ? { state: (p as any).state } : {}, ...(p as any).effectiveRating !== undefined ? { effectiveRating: (p as any).effectiveRating } : {}, ...(p as any).email ? { email: (p as any).email } : {}, ...(p as any).robustness !== undefined ? { robustness: (p as any).robustness } : {} } : p));
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

    // Precompute player list rows to keep JSX cleaner and avoid parser issues
    const playerListRows = players.map((p, i) => {
        const missing = getMissingFields(p);
        return (
            <div key={`${p.name}-${i}`} className="player-row" style={rowStyleFor(p)} title={missing.length ? `Missing: ${missing.join(', ')}` : undefined}>
                {editingIndex === i ? (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1 }}>
                        <input className="text-input" value={editingName} onChange={(e) => setEditingName(e.target.value)} />
                        <input className="text-input" value={editingPhone} onChange={(e) => setEditingPhone(e.target.value)} placeholder="Phone (optional)" />
                    </div>
                ) : (
                    <div className="player-meta" style={{ flex: 1 }} title={JSON.stringify((p as any).__raw || {})}>
                        <span className="player-name">{p.name}{computeDisambiguator(p) || ''}</span>
                        {typeof (p as any).effectiveRating === 'number' && (
                            <span className="player-rating"><img src={fargoLogo} alt="Fargo" />{(p as any).effectiveRating}</span>
                        )}
                        {/* robustness is kept in data but intentionally not shown in the UI */}
                        {p.phone && <span className="player-phone">{p.phone}</span>}
                        {p.email && <span className="player-email">{p.email}</span>}
                        {((p as any).city || (p as any).state) && <span className="player-location">{`${(p as any).city || ''}${(p as any).city && (p as any).state ? ', ' : ''}${(p as any).state || ''}`}</span>}
                        {(p as any).membershipId && <span className="player-membership">{(p as any).membershipId}</span>}
                    </div>
                )}

                {/* actions (edit/remove) */}
                <div style={{ display: 'flex', gap: 8 }}>
                    {editingIndex === i ? (
                        <>
                            <button className="secondary" onClick={() => saveEdit(i)}>Save</button>
                            <button onClick={cancelEdit}>Cancel</button>
                        </>
                    ) : (
                        <>
                            <button className="secondary" onClick={() => openEditModal(i)}>Edit</button>
                            <button onClick={() => removePlayerAt(i)}>Remove</button>
                        </>
                    )}
                </div>
            </div>
        );
    });

    const playerReviewRows = players.map((p, i) => {
        const missing = getMissingFields(p);
        return (
            <div key={`${p.name}-${i}`} className="review-player-row" style={rowStyleFor(p)} title={missing.length ? `Missing: ${missing.join(', ')}` : JSON.stringify((p as any).__raw || {})}>
                <span>{i + 1}. {p.name}{computeDisambiguator(p) || ''}</span>
                {typeof (p as any).effectiveRating === 'number' && (
                    <span className="player-rating"><img src={fargoLogo} alt="Fargo" />{(p as any).effectiveRating}</span>
                )}
                {/* robustness is kept in data but intentionally not shown in the UI */}
                {p.email && <span className="player-email">{p.email}</span>}
                {((p as any).city || (p as any).state) && <span className="player-location">{`${(p as any).city || ''}${(p as any).city && (p as any).state ? ', ' : ''}${(p as any).state || ''}`}</span>}
                {(p as any).membershipId && <span className="player-membership">{(p as any).membershipId}</span>}
            </div>
        );
    });

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

                {/* Add player modal (add) */}
                <AddPlayerModal open={showAddModal} onClose={() => setShowAddModal(false)} onAdd={(p) => { addManualPlayer(p); setShowAddModal(false); }} showToast={showToast} />

                {/* Edit player modal (edit existing) */}
                <AddPlayerModal
                    open={showEditModal}
                    onClose={() => { setShowEditModal(false); setEditIndex(null); }}
                    initial={editIndex !== null ? players[editIndex] : undefined}
                    onSave={(p) => {
                        if (editIndex === null) return;
                        setPlayers(prev => prev.map((pp, i) => i === editIndex ? { ...pp, ...p } : pp));
                        setShowEditModal(false);
                        setEditIndex(null);
                    }}
                    showToast={showToast}
                />

                {step === 2 && (
                    <div className="wizard-panel" style={availableHeight ? { height: availableHeight, maxHeight: availableHeight } : undefined}>
                        <div className="wizard-panel-inner">
                            <div className="wizard-body" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <label>Players ({players.length})</label>
                                    <button onClick={handleGenerateDemo} className="secondary">Demo</button>
                                </div>

                                <div className="players-list" ref={playersListRef}>
                                    {playerListRows}
                                </div>

                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                                    <button className="primary" onClick={() => setShowAddModal(true)}>Add Player</button>
                                    <div style={{ flex: 1 }} />
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
                                    {playerReviewRows}
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

    // Fargo suggestions
    const [suggestions, setSuggestions] = useState<Array<any>>([]);
    const [loading, setLoading] = useState(false);
    const searchTimerRef = useRef<number | null>(null);
    const lastQueryRef = useRef('');
    const lastSuggestionRef = useRef<any | null>(null);
    // refs for click-outside detection (close suggestions when clicking away from the name input)
    const containerRef = useRef<HTMLDivElement | null>(null);
    const nameInputRef = useRef<HTMLInputElement | null>(null);
    const suggestionsRef = useRef<HTMLDivElement | null>(null);

    // Debounced lookup when user types a name
    useEffect(() => {
        const q = name.trim();
        // clear previous timer
        if (searchTimerRef.current) {
            window.clearTimeout(searchTimerRef.current);
            searchTimerRef.current = null;
        }

        if (!q || q.length < 2) {
            setSuggestions([]);
            setLoading(false);
            return;
        }

        // debounce
        searchTimerRef.current = window.setTimeout(async () => {
            // avoid duplicate queries
            if (lastQueryRef.current === q) return;
            lastQueryRef.current = q;
            setLoading(true);
            setSuggestions([]);

            try {
                // build first/last name search terms
                const tokens = q.split(/\s+/).filter(Boolean);
                let first = tokens[0] || '';
                let last = tokens.length > 1 ? tokens.slice(1).join(' ') : '';

                // build the fargorate search URL; if we only have one token search firstName OR lastName
                let searchParam = '';
                if (first && last) {
                    searchParam = `firstName:${encodeURIComponent(first)} AND lastName:${encodeURIComponent(last)}`;
                } else {
                    // search both fields if only single token
                    const t = encodeURIComponent(first);
                    searchParam = `firstName:${t} OR lastName:${t}`;
                }

                const apiUrl = `https://api.fargorate.com/search?search=${searchParam}`;
                const payload = { url: apiUrl, player: q };

                let data = [] as any[];
                // Prefer preload bridge to avoid CSP issues in renderer
                const bridge = (window as any).api && (window as any).api.getFargoSuggestions;
                if (bridge) {
                    try {
                        data = await (window as any).api.getFargoSuggestions(q);
                    } catch (err: any) {
                        // If the preload bridge errors, don't attempt the renderer fetch
                        // which will also be blocked by CSP; surface a single toast and
                        // return an empty suggestions list.
                        console.error('getFargoSuggestions bridge error', err);
                        if (showToast) showToast(`Lookup error: ${err?.message || err}`, 'error');
                        setLoading(false);
                        setSuggestions([]);
                        return;
                    }
                } else {
                    // No bridge available: attempt renderer-side fetch (may hit CSP in web builds)
                    const resp = await fetch('https://us-central1-digital-pool.cloudfunctions.net/getFargoRating', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                    });

                    if (!resp.ok) {
                        throw new Error(`Lookup failed: ${resp.status}`);
                    }

                    data = await resp.json();
                }

                if (Array.isArray(data) && data.length) {
                    setSuggestions(data);
                } else {
                    setSuggestions([]);
                }
            } catch (err: any) {
                setSuggestions([]);
                if (showToast) showToast(`Lookup error: ${err?.message || err}`, 'error');
            } finally {
                setLoading(false);
            }
        }, 420) as unknown as number;

        return () => {
            if (searchTimerRef.current) {
                window.clearTimeout(searchTimerRef.current);
                searchTimerRef.current = null;
            }
        };
    }, [name]);

    // Close suggestions when user clicks outside the input / dropdown
    useEffect(() => {
        const handler = (ev: MouseEvent) => {
            const t = ev.target as Node | null;
            if (!t) return;
            const nameEl = nameInputRef.current;
            const sugEl = suggestionsRef.current;
            // if click is inside name input or inside suggestions list do nothing
            if ((nameEl && nameEl.contains(t)) || (sugEl && sugEl.contains(t))) return;
            // otherwise close suggestions
            if (suggestions && suggestions.length) setSuggestions([]);
            if (loading) setLoading(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [suggestions, loading]);

    const submit = () => {
        if (!name.trim()) return;
        const cleanedPhone = phone.trim().replace(/[^+0-9]/g, '');
        // basic phone validation: allow empty or digits with optional leading +
        if (cleanedPhone && !/^\+?[0-9]{4,15}$/.test(cleanedPhone)) {
            if (showToast) showToast('Please enter a valid phone number (digits, optional leading +).', 'error');
            return;
        }
        const payload: any = { name: name.trim(), phone: cleanedPhone };
        if (lastSuggestionRef.current) {
            const s = lastSuggestionRef.current;
            if (s.effectiveRating !== undefined) payload.effectiveRating = s.effectiveRating;
            if (s.robustness !== undefined) payload.robustness = s.robustness;
            if (s.city) payload.city = s.city;
            if (s.state) payload.state = s.state;
            if (s.membershipId) payload.membershipId = s.membershipId;
            // keep raw suggestion for tooltip/display
            payload.__raw = s.__raw || s;
            // reset the saved suggestion once consumed
            lastSuggestionRef.current = null;
        }
        onAdd(payload);
        setName(''); setPhone('');
        setSuggestions([]);
    };

    const pickSuggestion = (s: any) => {
        // build display name and populate the name field
        const full = `${s.firstName || ''}${s.firstName && s.lastName ? ' ' : ''}${s.lastName || ''}`.trim();
        setName(full);
        // prefill phone if the suggestion has it (not typical) and stash metadata
        // autofill phone and stash metadata including membershipId
        if (s.phone) setPhone(s.phone);
        lastSuggestionRef.current = {
            effectiveRating: s.effectiveRating ?? s.rating ?? undefined,
            robustness: s.robustness ?? (s.robustnessScore || undefined),
            city: s.city || s.town || undefined,
            state: s.state || undefined,
            membershipId: s.membershipId || s.readableId || s.id || undefined,
            // keep original raw payload for tooltip
            __raw: s,
        };
        // mark this query as the last one so the debounced effect doesn't re-run
        lastQueryRef.current = full;
        // optionally we could surface other fields; for now just fill name
        setSuggestions([]);
        setLoading(false);
    };

    return (
        <div ref={containerRef} style={{ position: 'relative' }} className="manual-add-panel">
            <input ref={nameInputRef} placeholder="Player name" value={name} onChange={(e) => setName(e.target.value)} />
            <input placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <button onClick={submit}>Add Player</button>

            {/* Suggestions dropdown */}
            {loading && <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', background: 'var(--bg-secondary)', padding: 8, zIndex: 3000 }}>Searching...</div>}

            {suggestions && suggestions.length > 0 && (
                <div ref={suggestionsRef} style={{ position: 'absolute', left: 0, right: 0, top: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-medium)', borderRadius: 6, marginTop: 6, zIndex: 3000, maxHeight: 260, overflow: 'auto' }}>
                    {suggestions.map((s, i) => (
                        <div key={s.id || i} style={{ padding: '8px 10px', borderBottom: '1px solid rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700 }}>{s.firstName} {s.lastName} {s.suffix ? ` ${s.suffix}` : ''}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{s.location || `${s.city || ''}${s.state ? ', ' + s.state : ''}`}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Rating: {s.effectiveRating}</div>
                            </div>
                            <div>
                                <button className="secondary" onClick={() => pickSuggestion(s)}>Select</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TournamentSetupWizard;

// Add player modal re-uses suggestion lookup logic but presents a full form
type AddPlayerModalProps = { open: boolean; onClose: () => void; onAdd?: (p: Player) => void; onSave?: (p: Player) => void; initial?: Player | undefined; showToast?: (message: string, type?: 'info' | 'error', ms?: number) => void };

const AddPlayerModal: React.FC<AddPlayerModalProps> = ({ open, onClose, onAdd, onSave, initial, showToast }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [city, setCity] = useState('');
    const [stateVal, setStateVal] = useState('');
    const [email, setEmail] = useState('');

    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const searchTimerRef = useRef<number | null>(null);
    const lastQueryRef = useRef('');
    const lastSuggestionRef = useRef<any | null>(null);

    useEffect(() => {
        if (!open) {
            setName(''); setPhone(''); setCity(''); setStateVal(''); setEmail(''); setSuggestions([]); lastSuggestionRef.current = null;
        } else if (initial) {
            // populate fields for edit
            setName(initial.name || '');
            setPhone(initial.phone || '');
            setCity((initial as any).city || '');
            setStateVal((initial as any).state || '');
            setEmail(initial.email || '');
            lastSuggestionRef.current = null;
        }
    }, [open]);

    useEffect(() => {
        const q = name.trim();
        if (searchTimerRef.current) { window.clearTimeout(searchTimerRef.current); searchTimerRef.current = null; }
        if (!q || q.length < 2) { setSuggestions([]); setLoading(false); return; }
        searchTimerRef.current = window.setTimeout(async () => {
            if (lastQueryRef.current === q) return;
            lastQueryRef.current = q;
            setLoading(true); setSuggestions([]);
            try {
                const tokens = q.split(/\s+/).filter(Boolean);
                let first = tokens[0] || '';
                let last = tokens.length > 1 ? tokens.slice(1).join(' ') : '';
                let searchParam = '';
                if (first && last) {
                    searchParam = `firstName:${encodeURIComponent(first)} AND lastName:${encodeURIComponent(last)}`;
                } else {
                    const t = encodeURIComponent(first);
                    searchParam = `firstName:${t} OR lastName:${t}`;
                }
                const apiUrl = `https://api.fargorate.com/search?search=${searchParam}`;
                // prefer preload bridge
                const bridge = (window as any).api && (window as any).api.getFargoSuggestions;
                let data: any[] = [];
                if (bridge) {
                    try { data = await (window as any).api.getFargoSuggestions(q); } catch (err: any) { console.error(err); if (showToast) showToast(`Lookup error: ${err?.message || err}`, 'error'); }
                } else {
                    const resp = await fetch('https://us-central1-digital-pool.cloudfunctions.net/getFargoRating', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: apiUrl, player: q }) });
                    if (resp.ok) data = await resp.json();
                }
                if (Array.isArray(data) && data.length) setSuggestions(data); else setSuggestions([]);
            } catch (err: any) { setSuggestions([]); if (showToast) showToast(`Lookup error: ${err?.message || err}`, 'error'); }
            finally { setLoading(false); }
        }, 420) as unknown as number;
        return () => { if (searchTimerRef.current) { window.clearTimeout(searchTimerRef.current); searchTimerRef.current = null; } };
    }, [name]);

    // click-outside handler for the modal suggestion dropdown
    const containerRef = useRef<HTMLDivElement | null>(null);
    const nameInputRefModal = useRef<HTMLInputElement | null>(null);
    const suggestionsRefModal = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        const handler = (ev: MouseEvent) => {
            const t = ev.target as Node | null;
            if (!t) return;
            const el = containerRef.current;
            const nameEl = nameInputRefModal.current;
            const sugEl = suggestionsRefModal.current;
            // if click is inside modal body and specifically inside name input or suggestions, do nothing
            if ((nameEl && nameEl.contains(t)) || (sugEl && sugEl.contains(t))) return;
            // otherwise close suggestions
            if (suggestions && suggestions.length) setSuggestions([]);
            if (loading) setLoading(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [suggestions, loading]);

    const pick = (s: any) => {
        const full = `${s.firstName || ''}${s.firstName && s.lastName ? ' ' : ''}${s.lastName || ''}`.trim();
        setName(full);
        if (s.city) setCity(s.city);
        if (s.state) setStateVal(s.state);
        if (s.phone) setPhone(s.phone);
        lastSuggestionRef.current = s;
        // Prevent the name-change debounced lookup from immediately re-firing
        lastQueryRef.current = full;
        setSuggestions([]);
        setLoading(false);
    };

    const submit = () => {
        if (!name.trim()) { if (showToast) showToast('Name is required', 'error'); return; }
        const cleanedPhone = phone.trim().replace(/[^+0-9]/g, '');
        if (cleanedPhone && !/^\+?[0-9]{4,15}$/.test(cleanedPhone)) { if (showToast) showToast('Please enter a valid phone number (digits, optional leading +).', 'error'); return; }
        const p: any = { name: name.trim(), phone: cleanedPhone, email: email.trim() || undefined, city: city.trim() || undefined, state: stateVal.trim() || undefined };
        if (lastSuggestionRef.current) {
            const s = lastSuggestionRef.current;
            if (s.effectiveRating !== undefined) p.effectiveRating = s.effectiveRating;
            if (s.robustness !== undefined) p.robustness = s.robustness;
            if (s.membershipId) p.membershipId = s.membershipId;
            p.__raw = s;
            lastSuggestionRef.current = null;
        }
        if (onSave) {
            onSave(p);
        } else if (onAdd) {
            onAdd(p);
        }
        onClose();
    };

    if (!open) return null;

    return (
        <div style={{ position: 'fixed', left: 0, right: 0, top: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000 }}>
            <div ref={containerRef} style={{ width: 520, background: 'var(--bg)', borderRadius: 8, padding: 16, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', maxHeight: '80%', overflow: 'auto' }}>
                <h3 style={{ marginTop: 0 }}>Add Player</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ position: 'relative' }}>
                        <input ref={nameInputRefModal} placeholder="Player name" value={name} onChange={(e) => setName(e.target.value)} />
                        {loading && <div style={{ position: 'absolute', right: 8, top: 8, fontSize: '0.85rem' }}>Searching...</div>}
                        {suggestions && suggestions.length > 0 && (
                            <div ref={suggestionsRefModal} style={{ position: 'absolute', left: 0, right: 0, top: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-medium)', borderRadius: 6, marginTop: 6, zIndex: 4100, maxHeight: 260, overflow: 'auto' }}>
                                {suggestions.map((s, i) => (
                                    <div key={s.id || i} style={{ padding: '8px 10px', borderBottom: '1px solid rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 700 }}>{s.firstName} {s.lastName} {s.suffix ? ` ${s.suffix}` : ''}</div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{s.location || `${s.city || ''}${s.state ? ', ' + s.state : ''}`}</div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Rating: {s.effectiveRating}</div>
                                        </div>
                                        <div>
                                            <button className="secondary" onClick={() => pick(s)}>Select</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <input placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
                    <div style={{ display: 'flex', gap: 8 }}>
                        <input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} style={{ flex: 1 }} />
                        <input placeholder="State" value={stateVal} onChange={(e) => setStateVal(e.target.value)} style={{ width: 120 }} />
                    </div>
                    <input placeholder="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} />

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button className="secondary" onClick={onClose}>Cancel</button>
                        <button onClick={submit}>Add Player</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
