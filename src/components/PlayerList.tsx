import * as React from 'react';
import { useState } from 'react';
import { Player } from '../types';

interface PlayerListProps {
    players: Player[];
    onPlayersChange: (players: Player[]) => void;
}

export const PlayerList: React.FC<PlayerListProps> = ({ players, onPlayersChange }: PlayerListProps) => {
    const [editIndex, setEditIndex] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [newName, setNewName] = useState('');
    const [newPhone, setNewPhone] = useState('');

    const startEdit = (idx: number) => {
        setEditIndex(idx);
        const player = players[idx];
        setEditName(player?.name || '');
        setEditPhone(player?.phone || '');
    };

    const saveEdit = () => {
        if (editIndex === null) return;
        const updated = players.slice();
        updated[editIndex] = { name: editName, phone: editPhone };
        onPlayersChange(updated);
        setEditIndex(null);
    };

    const removePlayer = (idx: number) => {
        const updated = players.filter((_, i) => i !== idx);
        onPlayersChange(updated);
    };

    const addPlayer = () => {
        if (!newName.trim()) return;
        onPlayersChange([...players, { name: newName.trim(), phone: newPhone.trim() }]);
        setNewName('');
        setNewPhone('');
    };

    return (
        <div>
            <ul style={{ padding: 0, listStyle: 'none' }}>
                {players.map((p: Player, i: number) => (
                    <li key={i} style={{ marginBottom: 8, display: 'flex', alignItems: 'center' }}>
                        {editIndex === i ? (
                            <>
                                <input value={editName} onChange={e => setEditName(e.target.value)} style={{ width: 120, marginRight: 8 }} />
                                <input value={editPhone} onChange={e => setEditPhone(e.target.value)} style={{ width: 120, marginRight: 8 }} />
                                <button onClick={saveEdit} style={{ marginRight: 4 }}>Save</button>
                                <button onClick={() => setEditIndex(null)}>Cancel</button>
                            </>
                        ) : (
                            <>
                                <span style={{ width: 120, display: 'inline-block' }}>{p.name}</span>
                                <span style={{ width: 120, display: 'inline-block', color: '#888' }}>{p.phone}</span>
                                <button onClick={() => startEdit(i)} style={{ marginLeft: 8, marginRight: 4 }}>Edit</button>
                                <button onClick={() => removePlayer(i)}>Remove</button>
                            </>
                        )}
                    </li>
                ))}
            </ul>
            <div style={{ marginTop: 16 }}>
                <input
                    placeholder="Name"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    style={{ width: 120, marginRight: 8 }}
                />
                <input
                    placeholder="Phone"
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    style={{ width: 120, marginRight: 8 }}
                />
                <button onClick={addPlayer}>Add Player</button>
            </div>
        </div>
    );
};
