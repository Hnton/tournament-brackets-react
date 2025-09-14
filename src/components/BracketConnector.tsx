import * as React from 'react';

interface BracketConnectorProps {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  strokeWidth?: number;
  className?: string;
}

export const BracketConnector: React.FC<BracketConnectorProps> = ({
  fromX,
  fromY,
  toX,
  toY,
  strokeWidth = 2,
  className = ''
}) => {
  // Calculate the middle point for the L-shaped connector
  const midX = fromX + (toX - fromX) / 2;

  // Create the path for an L-shaped bracket connector
  const pathData = `
    M ${fromX} ${fromY}
    L ${midX} ${fromY}
    L ${midX} ${toY}
    L ${toX} ${toY}
  `;

  return (
    <path
      d={pathData}
      fill="none"
      stroke="var(--border-medium)"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`bracket-connector ${className}`}
    />
  );
};

interface RoundConnectorProps {
  matches: Array<{
    id: number;
    position: { x: number; y: number };
  }>;
  nextRoundMatches: Array<{
    id: number;
    position: { x: number; y: number };
  }>;
  matchHeight: number;
  matchWidth: number;
}

export const RoundConnector: React.FC<RoundConnectorProps> = ({
  matches,
  nextRoundMatches,
  matchHeight,
  matchWidth
}) => {
  if (!nextRoundMatches.length) return null;

  return (
    <g className="round-connectors">
      {matches.map((match, index) => {
        const nextMatchIndex = Math.floor(index / 2);
        const nextMatch = nextRoundMatches[nextMatchIndex];
        
        if (!nextMatch) return null;

        // Calculate connection points
        const fromX = match.position.x + matchWidth;
        const fromY = match.position.y + matchHeight / 2;
        const toX = nextMatch.position.x;
        const toY = nextMatch.position.y + matchHeight / 2;

        return (
          <BracketConnector
            key={`connector-${match.id}-${nextMatch.id}`}
            fromX={fromX}
            fromY={fromY}
            toX={toX}
            toY={toY}
            className="animate-draw"
          />
        );
      })}
    </g>
  );
};

interface BracketSVGProps {
  width: number;
  height: number;
  children: React.ReactNode;
}

export const BracketSVG: React.FC<BracketSVGProps> = ({ width, height, children }) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="bracket-svg"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 1
      }}
    >
      <defs>
        <linearGradient id="connector-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--border-light)" />
          <stop offset="100%" stopColor="var(--border-medium)" />
        </linearGradient>
      </defs>
      {children}
    </svg>
  );
};