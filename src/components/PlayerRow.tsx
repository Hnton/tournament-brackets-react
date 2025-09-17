import * as React from 'react';
import TournamentService from '../services/tournamentService';

interface PlayerRowProps {
    participant: any;
    tournamentService: TournamentService;
    onSaved: () => Promise<void>;
}

const PlayerRow: React.FC<PlayerRowProps> = ({ participant, tournamentService, onSaved }: PlayerRowProps) => {
    const [editing, setEditing] = React.useState<boolean>(false);
    const [phone, setPhone] = React.useState<string>(participant.phone || '');
    const [saving, setSaving] = React.useState<boolean>(false);

    const save = async () => {
        setSaving(true);
        try {
            await tournamentService.getStorage().update('participant', { id: participant.id }, { phone: phone });
            await onSaved();
            setEditing(false);
        } catch (err) {
            console.error('Failed to save phone:', err);
            alert('Failed to save phone number.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <tr style={{ borderBottom: '1px solid var(--border)' }}>
            <td style={{ padding: 8 }}>{participant.name}</td>
            <td style={{ padding: 8 }}>
                {editing ? (
                    <input value={phone} onChange={e => setPhone(e.target.value)} style={{ width: 140 }} />
                ) : (
                    <span>{participant.phone || ''}</span>
                )}
            </td>
            <td style={{ padding: 8 }}>{(participant as any).email || ''}</td>
            <td style={{ padding: 8 }}>{(participant as any).membershipId || ''}</td>
            <td style={{ padding: 8 }}>{(participant as any).city || ''}</td>
            <td style={{ padding: 8 }}>{(participant as any).state || ''}</td>
            <td style={{ padding: 8 }}>{(participant as any).effectiveRating ?? ''}</td>
            <td style={{ padding: 8 }}>{(participant as any).robustness ?? ''}</td>
            <td style={{ padding: 8 }}>
                {editing ? (
                    <>
                        <button onClick={save} disabled={saving} style={{ marginRight: 6 }}>{saving ? 'Saving...' : 'Save'}</button>
                        <button onClick={() => { setEditing(false); setPhone(participant.phone || ''); }} disabled={saving}>Cancel</button>
                    </>
                ) : (
                    <button onClick={() => setEditing(true)}>Edit Phone</button>
                )}
            </td>
        </tr>
    );
};

export default PlayerRow;
