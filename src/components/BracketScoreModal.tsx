import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Match, Participant } from '../types';

export interface BracketScoreModalProps {
    match: Match;
    participants: Participant[];
    onClose: () => void;
    onMatchUpdate: (matchId: number, opponent1Score: number, opponent2Score: number) => Promise<void>;
    // Race limits: maximum racks for winners/losers bracket (UI enforces max)
    raceWinners?: number;
    raceLosers?: number;
    // whether this stage uses true double elimination
    trueDouble?: boolean;
    // indicates this match is the grand-final reset (GF round 2)
    isGFReset?: boolean;
}

/**
 * ScoreModal component specifically for brackets-manager Match objects
 */
export const BracketScoreModal: React.FC<BracketScoreModalProps> = ({
    match,
    participants,
    onMatchUpdate,
    onClose,
    raceWinners,
    raceLosers,
    trueDouble,
    isGFReset
}) => {
    // Get participant names
    const participant1 = participants.find(p => p.id === match.opponent1?.id);
    const participant2 = participants.find(p => p.id === match.opponent2?.id);

    // Pre-populate with existing scores if editing
    const [score1, setScore1] = useState(match.opponent1?.score?.toString() || '');
    const [score2, setScore2] = useState(match.opponent2?.score?.toString() || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);

    const isEditing = match.opponent1?.score !== undefined && match.opponent2?.score !== undefined;

    // Check if either participant is null (BYE)
    const isByeMatch = !participant1?.name || !participant2?.name ||
        participant1?.name === null || participant2?.name === null;

    // compute max allowed score from provided props (renderer passes raceWinners/raceLosers)
    // If this match is on the losers side (group_id === 2) use raceLosers; otherwise use raceWinners.
    // Additionally, treat Grand Final round 2 (reset match) as a losers-side match so it uses raceLosers.
    const rawGroupId = match.group_id ?? (match as any).groupId;
    const rawRoundId = match.round_id ?? (match as any).roundId;
    const isGrandFinal = rawGroupId !== undefined && rawGroupId >= 3;
    // Prefer explicit isGFReset flag when provided by renderer; otherwise fall back to the
    // legacy heuristic of treating GF round 2 as a reset (losers-side).
    const isLosersMatch = (rawGroupId === 2) || Boolean(isGFReset) || (isGrandFinal && rawRoundId === 2);
    const winnersMax = propsToNumber(raceWinners);
    const losersMax = propsToNumber(raceLosers) || winnersMax; // fallback to winnersMax if not provided
    const maxAllowedScore = isLosersMatch ? losersMax : winnersMax;

    function propsToNumber(v: any) {
        if (v === undefined || v === null) return 0;
        const n = Number(v);
        return Number.isFinite(n) && n > 0 ? n : 0;
    }

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

        // Focus the first input/select
        const firstInput = modalRef.current?.querySelector('input, select') as HTMLInputElement | HTMLSelectElement | null;
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

        // Validate against max allowed score if configured
        if (maxAllowedScore > 0) {
            if (s1 > maxAllowedScore || s2 > maxAllowedScore) {
                alert(`Scores cannot exceed ${maxAllowedScore}.`);
                return;
            }
            // Ensure exactly one player has the race-winning score and the other is less
            const oneHasMax = (s1 === maxAllowedScore && s2 < maxAllowedScore) || (s2 === maxAllowedScore && s1 < maxAllowedScore);
            if (!oneHasMax) {
                alert(`One player must reach ${maxAllowedScore} and the other must be less than ${maxAllowedScore}.`);
                return;
            }
        }

        setIsSubmitting(true);
        try {
            await onMatchUpdate(match.id, s1, s2);
            onClose();
        } catch (error) {
            console.error('Error updating match:', error);
            alert('Failed to update match. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const hasValidScores = () => {
        const s1 = parseInt(score1, 10);
        const s2 = parseInt(score2, 10);
        return !isNaN(s1) && !isNaN(s2) && s1 !== s2;
    };

    const hasScores = () => {
        return score1.trim() !== '' && score2.trim() !== '';
    };

    const hasTie = () => {
        if (!hasScores()) return false;
        return parseInt(score1, 10) === parseInt(score2, 10);
    };

    // Don't show modal for BYE matches
    if (isByeMatch) {
        return null;
    }

    return (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div ref={modalRef} className="modal-content">
                <h3 id="modal-title" className="modal-header">
                    {isEditing ? 'Edit Match Score' : 'Enter Match Score'}
                </h3>

                <div className="match-info" style={{
                    marginBottom: 'var(--spacing-md)',
                    padding: 'var(--spacing-sm)',
                    backgroundColor: 'var(--color-background-secondary)',
                    borderRadius: 'var(--border-radius)'
                }}>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                        Match ID: {match.id} | Status: {match.status}
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="score-inputs">
                        <div className="score-input-row">
                            <label className="score-input-label" htmlFor="score1">
                                {participant1?.name || 'TBD'}
                            </label>
                            {maxAllowedScore > 0 ? (
                                <select id="score1" value={score1} onChange={(e) => setScore1(e.target.value)} disabled={isSubmitting}>
                                    <option value="">--</option>
                                    {Array.from({ length: maxAllowedScore + 1 }, (_, n) => {
                                        const disableMax = n === maxAllowedScore && score2 === String(maxAllowedScore);
                                        return <option key={n} value={String(n)} disabled={disableMax}>{n}</option>;
                                    })}
                                </select>
                            ) : (
                                <input
                                    id="score1"
                                    type="number"
                                    className="score-input"
                                    value={score1}
                                    onChange={(e) => setScore1(e.target.value)}
                                    placeholder="0"
                                    required
                                    disabled={isSubmitting}
                                    min="0"
                                />
                            )}
                        </div>

                        <div className="score-input-row">
                            <label className="score-input-label" htmlFor="score2">
                                {participant2?.name || 'TBD'}
                            </label>
                            {maxAllowedScore > 0 ? (
                                <select id="score2" value={score2} onChange={(e) => setScore2(e.target.value)} disabled={isSubmitting}>
                                    <option value="">--</option>
                                    {Array.from({ length: maxAllowedScore + 1 }, (_, n) => {
                                        const disableMax = n === maxAllowedScore && score1 === String(maxAllowedScore);
                                        return <option key={n} value={String(n)} disabled={disableMax}>{n}</option>;
                                    })}
                                </select>
                            ) : (
                                <input
                                    id="score2"
                                    type="number"
                                    className="score-input"
                                    value={score2}
                                    onChange={(e) => setScore2(e.target.value)}
                                    placeholder="0"
                                    required
                                    disabled={isSubmitting}
                                    min="0"
                                />
                            )}
                        </div>
                    </div>

                    {/* Show tie error message */}
                    {hasTie() && (
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
                                !hasValidScores()
                            }
                        >
                            {isSubmitting
                                ? (isEditing ? 'Updating...' : 'Submitting...')
                                : (isEditing ? 'Update Score' : 'Submit Score')
                            }
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

/**
 * Hook for managing bracket score modal
 */
export const useBracketScoreModal = () => {
    const [currentMatch, setCurrentMatch] = useState<Match | null>(null);

    const openModal = (match: Match) => {
        // brackets-manager uses numeric statuses:
        // 1 = locked, 2 = ready, 3 = running, 4 = completed
        // Only open modal for matches that can be scored (ready, running, or completed)
        if (match.status === 2 || match.status === 3 || match.status === 4 ||
            match.status === 'ready' || match.status === 'running' || match.status === 'completed') {
            setCurrentMatch(match);
        }
    };

    const closeModal = () => {
        setCurrentMatch(null);
    };

    return {
        currentMatch,
        openModal,
        closeModal,
        isOpen: currentMatch !== null
    };
};