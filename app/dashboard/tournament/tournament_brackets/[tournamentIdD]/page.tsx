//@ts-nocheck
"use client";

import React, { useEffect, useState } from "react";
import {
  SingleEliminationBracket,
  Match,
  SVGViewer,
} from "@g-loot/react-tournament-brackets";
import { useWindowSize } from "@uidotdev/usehooks";
import "../brackets.css";

// Define types for fetched match data
interface Participant {
  id: string;
  name: string;
  isWinner: boolean;
  status: "PENDING" | "PLAYED";
  resultText: "WON" | "LOST" | "CHAMPION" | "RUNNER-UP" | null;
}

interface MatchData {
  id: number;
  name: string;
  nextMatchId: number | null;
  tournamentRoundText: string;
  startTime: string;
  state: "PENDING" | "IN_PROGRESS" | "DONE";
  participants: Participant[];
  score?: [number | null, number | null]; // Scores for Team 1 and Team 2
}

// Transform match data to the format expected by react-tournament-brackets
const add_placeholder = (matches: MatchData[]): MatchData[] => {
  const transformedMatches = [...matches];
  const totalTeams = matches.length * 2; // Total teams based on the initial matches
  const totalRounds = Math.log2(totalTeams); // Calculate total rounds needed
  let matchId = transformedMatches.length + 1; // Start match IDs for placeholders after existing matches

  for (let round = 1; round < totalRounds; round++) {
    const matchesInRound = Math.pow(2, totalRounds - round - 1); // Calculate number of matches in the current round
    const previousRoundMatches = transformedMatches.filter(
      (m) => m.tournamentRoundText === `Round ${round}`
    );

    for (let i = 0; i < matchesInRound; i++) {
      const match: MatchData = {
        id: matchId,
        name: `Match ${matchId}`,
        nextMatchId: null,
        tournamentRoundText: `Round ${round + 1}`,
        startTime: "",
        state: "PENDING",
        participants: [
          { id: "", name: "TBD", isWinner: false, status: "PENDING", resultText: null },
          { id: "", name: "TBD", isWinner: false, status: "PENDING", resultText: null },
        ],
        score: [null, null],
      };

      // Link the previous matches to the current match as nextMatchId
      const previousMatch1 = previousRoundMatches[i * 2];
      const previousMatch2 = previousRoundMatches[i * 2 + 1];

      if (previousMatch1) previousMatch1.nextMatchId = match.id;
      if (previousMatch2) previousMatch2.nextMatchId = match.id;

      transformedMatches.push(match);
      matchId++;
    }
  }

  return transformedMatches;
};

const transformMatchData = (match: MatchData) => {
  const [team1, team2] = match.participants;

  return {
    id: match.id,
    name: match.name,
    nextMatchId: match.nextMatchId,
    tournamentRoundText: match.name,
    startTime: match.startTime,
    state: match.state,
    participants: [
      {
        id: team1?.id || "unknown",
        name: team1?.name || "TBD",
        isWinner: team1?.isWinner || false,
        status: team1?.status || "PENDING",
        resultText: team1?.resultText || null,
      },
      {
        id: team2?.id || "unknown",
        name: team2?.name || "TBD",
        isWinner: team2?.isWinner || false,
        status: team2?.status || "PENDING",
        resultText: team2?.resultText || null,
      },
    ],
  };
};

const TournamentBracket = ({
  params,
}: {
  params: { tournamentIdD: string };
}) => {
  const [clientReady, setClientReady] = useState(false);
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { tournamentIdD } = params;

  useEffect(() => {
    setClientReady(true);

    const fetchMatches = async () => {
      try {
        const response = await fetch(`/api/get_matches/${tournamentIdD}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch matches: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.matches || !Array.isArray(data.matches)) {
          throw new Error("Invalid match data received");
        }

        // Sort matches for correct bracket rendering
        const sortedMatches = data.matches.sort(
          (a: MatchData, b: MatchData) => {
            const roundOrder = {
              Final: 4,
              "Semi-Final": 3,
              "Quarter-Final": 2,
              "Round 1": 1,
            };

            const aRoundValue =
              roundOrder[a.tournamentRoundText as keyof typeof roundOrder] || 0;
            const bRoundValue =
              roundOrder[b.tournamentRoundText as keyof typeof roundOrder] || 0;

            return aRoundValue === bRoundValue
              ? a.id - b.id
              : aRoundValue - bRoundValue;
          }
        );

        setMatches(sortedMatches);
      } catch (error) {
        console.error("Error fetching matches:", error);
        setError(
          error instanceof Error ? error.message : "An error occurred"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [tournamentIdD]);

  const size = useWindowSize();
  const { width, height } = size;
  const finalWidth = Math.max((width ?? 0) - 500, 500);
  const finalHeight = Math.max((height ?? 0) - 100, 500);
  
  if (!clientReady) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading tournament bracket...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  if (!matches.length) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">No matches available for this tournament.</div>
      </div>
    );
  }
  const transformed_matches = [transformMatchData(matches[0])];
  for (let i = 1; i < matches.length; i++) {
    transformed_matches.push(transformMatchData(matches[i]));
  }
const final_matches = add_placeholder(transformed_matches);
console.log(transformed_matches);

  return (
    <div className="p-5 bg-transparent">
      <h1 className="text-2xl font-bold mb-6 text-white text-center uppercase">
        Tournament Bracket
      </h1>
      <SingleEliminationBracket
        matches={final_matches}
        matchComponent={Match}
        svgWrapper={({ children, ...props }) => (
          <SVGViewer
            width={finalWidth}
            height={finalHeight}
            {...props}
          >
            {children}
          </SVGViewer>
        )}
      />
    </div>
  );
};

export default TournamentBracket;