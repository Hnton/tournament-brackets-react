import { useRef } from 'react';
import TournamentService from '../services/tournamentService';

export default function useTournamentService(): TournamentService {
    const ref = useRef<TournamentService | null>(null);
    if (!ref.current) {
        ref.current = new TournamentService();
    }
    return ref.current;
}
