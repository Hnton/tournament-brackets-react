// Simple trial service that uses localStorage to record the first-run timestamp.
// Trial duration is 1 hour (3600000 ms). If the stored timestamp is missing, the
// service will start the trial automatically on first call to startTrialIfMissing().

const STORAGE_KEY = 'app:trialStart';
const TRIAL_MS = 60 * 60 * 1000; // 1 hour

function nowMs(): number {
    return Date.now();
}

export function getTrialStart(): number | null {
    try {
        const v = localStorage.getItem(STORAGE_KEY);
        if (!v) return null;
        const parsed = parseInt(v, 10);
        if (Number.isNaN(parsed)) return null;
        return parsed;
    } catch (e) {
        // If localStorage isn't available, don't throw — treat as no trial started
        console.error('trialService.getTrialStart error', e);
        return null;
    }
}

export function startTrialIfMissing(): number {
    try {
        let ts = getTrialStart();
        if (!ts) {
            ts = nowMs();
            localStorage.setItem(STORAGE_KEY, String(ts));
        }
        return ts;
    } catch (e) {
        console.error('trialService.startTrialIfMissing error', e);
        const fallback = nowMs();
        try { localStorage.setItem(STORAGE_KEY, String(fallback)); } catch (e2) { }
        return fallback;
    }
}

export function isExpired(): boolean {
    const ts = getTrialStart();
    if (!ts) return false; // not started yet
    return (nowMs() - ts) >= TRIAL_MS;
}

export function getRemainingMs(): number {
    const ts = getTrialStart();
    if (!ts) return TRIAL_MS;
    const elapsed = nowMs() - ts;
    return Math.max(0, TRIAL_MS - elapsed);
}

// Convenience for development/testing to clear the trial (not used by app UI)
export function clearTrial(): void {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
        console.error('trialService.clearTrial error', e);
    }
}

export function formatRemaining(ms: number): string {
    const total = Math.max(0, Math.floor(ms / 1000));
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default {
    getTrialStart,
    startTrialIfMissing,
    isExpired,
    getRemainingMs,
    clearTrial,
    formatRemaining,
};
