import * as React from 'react';
import { useEffect, useState } from 'react';
import BracketsViewer from './BracketsViewer';
import { BracketsData } from '../types';

const STORAGE_KEY = 'tournament:bracketsData';

const BracketsPopout: React.FC = () => {
    const [data, setData] = useState<BracketsData | null>(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            console.error('Failed to parse bracket data from storage', e);
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
                console.error('Failed to parse updated bracket data from storage', err);
            }
        };

        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    if (!data) {
        return (
            <div style={{ padding: 24 }}>
                <h3>No bracket data available for popout</h3>
                <p>Open the tournament in the main window and click "Popout Bracket" to initialize.</p>
            </div>
        );
    }

    return (
        // Full viewport container with scrolling enabled so large brackets are navigable
        <div style={{ width: '100vw', height: '100vh', padding: 12, boxSizing: 'border-box' }}>
            <div
                className="bracket-tab"
                style={{ width: '100%', height: '100%', overflow: 'auto', WebkitOverflowScrolling: 'touch' }}
            >
                {/* Use clear=true so the library clears any previous render and avoids duplicates */}
                <div style={{ minWidth: '100%', minHeight: '100%' }}>
                    <BracketsViewer data={data} clear={true} />
                </div>
            </div>
        </div>
    );
};

export default BracketsPopout;
