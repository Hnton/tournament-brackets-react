import * as React from 'react';

type Props = {
    remainingMs: number;
    onClose?: () => void; // not used for expired state, but provided for completeness
    expired?: boolean;
};

export default function TrialModal({ remainingMs, expired }: Props) {
    if (!expired) {
        // show remaining time in a subtle banner
        const mins = Math.floor(remainingMs / 60000);
        const secs = Math.floor((remainingMs % 60000) / 1000);
        return (
            <div className="trial-banner">
                <strong>Trial mode:</strong> {mins}:{secs.toString().padStart(2, '0')} remaining
            </div>
        );
    }

    // Expired overlay that blocks the app
    return (
        <div className="trial-expired-overlay">
            <div className="trial-expired-card">
                <h2>Trial Expired</h2>
                <p>Your one-hour trial has ended.</p>
                <p>To receive another one-hour trial, please download the application again from the original distribution.</p>
                <p>If you believe this is an error, contact support.</p>
                <div style={{ marginTop: 12 }}>
                    <button onClick={() => window.close()}>Close Application</button>
                </div>
            </div>
            <style>{`
                .trial-expired-overlay {
                    position: fixed;
                    inset: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7));
                    z-index: 9999;
                    backdrop-filter: blur(3px);
                }
                .trial-expired-card {
                    background: #111317; /* dark card to avoid full white */
                    color: #e6eef8; /* light text */
                    padding: 28px;
                    border-radius: 10px;
                    max-width: 520px;
                    text-align: left;
                    box-shadow: 0 14px 40px rgba(0,0,0,0.6);
                }
                .trial-expired-card h2 {
                    margin: 0 0 8px 0;
                    color: #fff;
                }
                .trial-expired-card p {
                    margin: 6px 0;
                    line-height: 1.4;
                    color: #d6e6ff;
                }
                .trial-expired-card button {
                    background: #ff6b6b;
                    color: white;
                    border: none;
                    padding: 8px 12px;
                    border-radius: 6px;
                    cursor: pointer;
                }
                .trial-banner {
                    background: rgba(255,215,0,0.12);
                    border: 1px solid rgba(255,215,0,0.28);
                    color: #332d00;
                    padding: 8px 12px;
                    border-radius: 6px;
                    margin: 12px 0;
                    display: inline-block;
                }
            `}</style>
        </div>
    );
}
