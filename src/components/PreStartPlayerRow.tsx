import * as React from 'react';

interface PreStartPlayerRowProps {
    player: any;
    index: number;
    players: any[];
    setPlayers: (p: any[]) => void;
}

const PreStartPlayerRow: React.FC<PreStartPlayerRowProps> = ({ player, index, players, setPlayers }: PreStartPlayerRowProps) => {
    const [editing, setEditing] = React.useState<boolean>(false);
    const [phone, setPhone] = React.useState<string>(player.phone || '');

    const save = () => {
        const cleaned = (phone || '').trim().replace(/[^+0-9]/g, '');
        const updated = players.map((p: any, i: number) => i === index ? { ...p, phone: cleaned } : p);
        setPlayers(updated);
        setEditing(false);
    };

    return (
        <tr style={{ borderBottom: '1px solid var(--border)' }}>
            <td style={{ padding: 8 }}>{player.name}</td>
            <td style={{ padding: 8 }}>{editing ? <input value={phone} onChange={e => setPhone(e.target.value)} style={{ width: 140 }} /> : (player.phone || '')}</td>
            <td style={{ padding: 8 }}>{player.email || ''}</td>
            <td style={{ padding: 8 }}>{player.membershipId || ''}</td>
            <td style={{ padding: 8 }}>{player.city || ''}</td>
            <td style={{ padding: 8 }}>{player.state || ''}</td>
            <td style={{ padding: 8 }}>{player.effectiveRating ?? ''}</td>
            <td style={{ padding: 8 }}>{player.robustness ?? ''}</td>
            <td style={{ padding: 8 }}>{editing ? (<><button onClick={save} style={{ marginRight: 6 }}>Save</button><button onClick={() => { setEditing(false); setPhone(player.phone || ''); }}>Cancel</button></>) : (<button onClick={() => setEditing(true)}>Edit Phone</button>)}</td>
        </tr>
    );
};

export default PreStartPlayerRow;
