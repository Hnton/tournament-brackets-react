import * as React from 'react';
import PlayerRow from './PlayerRow';
import PreStartPlayerRow from './PreStartPlayerRow';
import PlayersTable from './PlayersTable';
import TournamentService from '../services/tournamentService';

interface PlayersPanelProps {
    bracketsData: any | null;
    players: any[];
    setPlayers: (p: any[]) => void;
    tournamentService: TournamentService;
    setBracketsData: (d: any) => void;
}

const PlayersPanel: React.FC<PlayersPanelProps> = ({ bracketsData, players, setPlayers, tournamentService, setBracketsData }) => {
    if (bracketsData) {
        return (
            <PlayersTable caption="Players" subtitle="Edit phone numbers; other data is read-only.">
                {bracketsData.participant.map((p: any) => (
                    <PlayerRow
                        key={p.id}
                        participant={p}
                        tournamentService={tournamentService}
                        onSaved={async () => {
                            const updated = await tournamentService.getTournamentData();
                            setBracketsData(updated);
                        }}
                    />
                ))}
            </PlayersTable>
        );
    }

    return (
        <PlayersTable caption="Players (not started)" subtitle="These are the players you've added in the setup wizard. Start the tournament to promote them into participants.">
            {players && players.length > 0 ? players.map((p, i) => (
                <PreStartPlayerRow key={`${p.name}-${i}`} player={p} index={i} players={players} setPlayers={setPlayers} />
            )) : (
                <tr><td colSpan={9} style={{ padding: 12 }}>No players yet. Use the Setup wizard to add players.</td></tr>
            )}
        </PlayersTable>
    );
};

export default PlayersPanel;
