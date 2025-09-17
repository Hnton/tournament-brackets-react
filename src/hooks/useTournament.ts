import * as React from 'react';
import TournamentService from '../services/tournamentService';
import { Player, BracketsData, BracketType } from '../types';
import { shuffleArray, generateDemoPlayers } from '../utils';

interface StartConfig extends Partial<{
    players: Player[];
    bracketType: BracketType;
    tournamentName: string;
    description: string;
    gameType: string;
    trueDouble: boolean;
    raceWinners: number;
    raceLosers: number;
}> { }

export default function useTournament(tournamentService?: TournamentService) {
    const svc = tournamentService || new TournamentService();

    const [bracketsData, setBracketsData] = React.useState<BracketsData | null>(null);
    const [tournamentStarted, setTournamentStarted] = React.useState<boolean>(false);
    const [tournamentComplete, setTournamentComplete] = React.useState<boolean>(false);

    const [bracketType, setBracketType] = React.useState<BracketType>('double');
    const [tournamentName, setTournamentName] = React.useState<string>('');
    const [tournamentDescription, setTournamentDescription] = React.useState<string>('');
    const [gameType, setGameType] = React.useState<string>('Nine Ball');
    const [raceWinners, setRaceWinners] = React.useState<number>(7);
    const [raceLosers, setRaceLosers] = React.useState<number>(5);
    const [trueDouble, setTrueDouble] = React.useState<boolean>(true);

    const startTournament = React.useCallback(async (config?: StartConfig) => {
        const usePlayers = config?.players ?? [];
        const useBracketType = config?.bracketType ?? bracketType;
        const useTournamentName = config?.tournamentName ?? tournamentName;
        const useDescription = config?.description ?? tournamentDescription;
        const useGameType = config?.gameType ?? gameType;
        const useTrueDouble = config?.trueDouble ?? trueDouble;
        const useRaceWinners = config?.raceWinners ?? raceWinners;
        const useRaceLosers = config?.raceLosers ?? raceLosers;

        if (!usePlayers || usePlayers.length === 0) {
            throw new Error('No players provided');
        }

        const bracketTypeMap = {
            'single': 'single_elimination' as const,
            'double': 'double_elimination' as const
        };

        const shuffledPlayers = shuffleArray(usePlayers);

        const data = await svc.createTournament(
            shuffledPlayers,
            bracketTypeMap[useBracketType],
            useTournamentName,
            {
                description: useDescription,
                gameType: useGameType,
                trueDouble: useTrueDouble,
                raceWinners: useRaceWinners,
                raceLosers: useRaceLosers
            }
        );

        setTournamentName(useTournamentName || '');
        setTournamentDescription(useDescription || '');
        setGameType(useGameType || 'Nine Ball');
        setBracketType(useBracketType || 'double');
        setTrueDouble(Boolean(useTrueDouble));
        setRaceWinners(useRaceWinners || 7);
        setRaceLosers(useRaceLosers || 5);

        setBracketsData(data);
        setTournamentStarted(true);
        setTournamentComplete(false);

        return data;
    }, [svc, bracketType, tournamentName, tournamentDescription, gameType, trueDouble, raceWinners, raceLosers]);

    const updateMatch = React.useCallback(async (matchId: number, opponent1Score?: number, opponent2Score?: number, opponent1Result?: string, opponent2Result?: string) => {
        await svc.updateMatch(matchId, opponent1Score, opponent2Score, opponent1Result as any, opponent2Result as any);
        const updatedData = await svc.getTournamentData();
        setBracketsData(updatedData);
        const isComplete = await svc.isTournamentComplete();
        setTournamentComplete(isComplete);
        return updatedData;
    }, [svc]);

    const handleBracketMatchUpdate = React.useCallback(async (matchId: number, opponent1Score: number, opponent2Score: number) => {
        // Determine results
        const opponent1Result = opponent1Score > opponent2Score ? 'win' : 'loss';
        const opponent2Result = opponent2Score > opponent1Score ? 'win' : 'loss';

        // Save current table assignments
        const currentTableAssignments = new Map<number, number>();
        if (bracketsData?.match) {
            bracketsData.match.forEach(match => {
                if (match.table !== null && match.table !== undefined) {
                    currentTableAssignments.set(match.id, match.table);
                }
            });
        }

        await svc.updateMatch(matchId, opponent1Score, opponent2Score, opponent1Result as any, opponent2Result as any);

        const updatedData = await svc.getTournamentData();

        const restoredMatches = updatedData.match.map((match: any) => {
            if (match.id === matchId) {
                return { ...match, table: undefined };
            }
            const tableId = currentTableAssignments.get(match.id);
            return tableId !== undefined ? { ...match, table: tableId } : match;
        });

        setBracketsData({
            ...updatedData,
            match: restoredMatches
        });

        return updatedData;
    }, [svc, bracketsData]);

    const generateDemo = React.useCallback(() => {
        const demoPlayers = generateDemoPlayers();
        return demoPlayers;
    }, []);

    return {
        bracketsData,
        setBracketsData,
        tournamentStarted,
        setTournamentStarted,
        tournamentComplete,
        setTournamentComplete,
        bracketType,
        setBracketType,
        tournamentName,
        setTournamentName,
        tournamentDescription,
        setTournamentDescription,
        gameType,
        setGameType,
        raceWinners,
        setRaceWinners,
        raceLosers,
        setRaceLosers,
        trueDouble,
        setTrueDouble,
        startTournament,
        updateMatch,
        handleBracketMatchUpdate,
        generateDemo
    };
}
