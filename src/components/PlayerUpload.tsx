import * as React from 'react';
import { useRef } from 'react';
import { Player } from '../types';

interface PlayerUploadProps {
    onPlayersParsed: (players: Player[]) => void;
}

export const PlayerUpload: React.FC<PlayerUploadProps> = ({ onPlayersParsed }) => {
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const lines = text.split(/\r?\n/).filter(Boolean);
            const players: Player[] = lines.map(line => {
                const [nameRaw, phoneRaw] = line.split(',');
                const name = (nameRaw || '').trim();
                const phone = (phoneRaw || '').trim();
                return { name, phone };
            });
            onPlayersParsed(players);
        };
        reader.readAsText(file);
    };

    return (
        <div style={{ margin: '1em 0' }}>
            <input
                type="file"
                accept=".csv"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: 'block', marginBottom: '1em' }}
            />
            <small>CSV format: name,phone</small>
        </div>
    );
};


