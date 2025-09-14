import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Match } from '../types';

export interface ScoreModalProps {
    match: Match;
    onSubmit: (score1: number, score2: number) => void;
    onClose: () => void;
}

/**
 * Reusable ScoreModal component for entering match scores
 */
export const ScoreModal: React.FC<ScoreModalProps> = ({ match, onSubmit, onClose }) => {
    // Pre-populate with existing scores if editing
    const [score1, setScore1] = useState(match.score1?.toString() || '');
    const [score2, setScore2] = useState(match.score2?.toString() || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);
    const isEditing = match.winner !== undefined && match.score1 !== undefined && match.score2 !== undefined;

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

    return (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div ref={modalRef} className="modal-content">
                <h3 id="modal-title" className="modal-header">
                    {isEditing ? 'Edit Match Score' : 'Enter Match Score'}
                </h3>

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
 * Hook for managing score submission logic
 */
export const useScoreModal = () => {
    const [currentMatch, setCurrentMatch] = useState<Match | null>(null);

    const openModal = (match: Match) => {
        setCurrentMatch(match);
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

/**
 * Validate score input
 */
export const validateScores = (score1: string, score2: string): {
    isValid: boolean;
    error?: string;
} => {
    const s1 = parseInt(score1, 10);
    const s2 = parseInt(score2, 10);

    if (score1.trim() === '' || score2.trim() === '') {
        return { isValid: false, error: 'Both scores are required' };
    }

    if (isNaN(s1) || isNaN(s2)) {
        return { isValid: false, error: 'Scores must be valid numbers' };
    }

    if (s1 < 0 || s2 < 0) {
        return { isValid: false, error: 'Scores cannot be negative' };
    }

    if (s1 === s2) {
        return { isValid: false, error: 'Scores cannot be tied - someone must win' };
    }

    return { isValid: true };
};

/**
 * Determine winner from scores
 */
export const determineWinner = (match: Match, score1: number, score2: number) => {
    if (score1 > score2) return match.player1;
    if (score2 > score1) return match.player2;
    return null; // Tie (should not happen with validation)
};