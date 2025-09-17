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
                // Support CSV formats with these columns (in order):
                // name, phone, email, membershipId, city, state, effectiveRating, robustness
                // email/membershipId/city/state/effectiveRating/robustness are optional
                const parts = line.split(',').map(p => p.trim());
                const name = parts[0] || '';
                const phone = parts[1] || '';
                const email = parts[2] || undefined;
                const membershipId = parts[3] || undefined;
                const city = parts[4] || undefined;
                const state = parts[5] || undefined;
                const effectiveRating = parts[6] !== undefined && parts[6] !== '' ? Number(parts[6]) : undefined;
                const robustness = parts[7] !== undefined && parts[7] !== '' ? Number(parts[7]) : undefined;
                const player: any = { name, phone };
                if (email) player.email = email;
                if (membershipId) player.membershipId = membershipId;
                if (city) player.city = city;
                if (state) player.state = state;
                if (effectiveRating !== undefined && !Number.isNaN(effectiveRating)) player.effectiveRating = effectiveRating;
                if (robustness !== undefined && !Number.isNaN(robustness)) player.robustness = robustness;
                return player as Player;
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
            <small>CSV format: name,phone,email,membershipId,city,state,effectiveRating,robustness</small>
        </div>
    );
};


