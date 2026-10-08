import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AllocationDatabase, CrewmateGame } from '../../lib/gameDatabase';
import { TeamActiveEffect } from '../../types';

interface CrewmateProps {
  roomName: string;
  activeSabotages: TeamActiveEffect[];
  toastMessage: string;
}

export default function Crewmate({
  roomName,
  activeSabotages,
  toastMessage,
}: CrewmateProps) {
  const [games, setGames] = useState<CrewmateGame[]>([]);

  useEffect(() => {
    setGames(AllocationDatabase.getCrewmateGames());
  }, []);

  return (
    <>
      <div className="role-banner" id="roleBanner">
        <div className="role-tag role-crewmate" id="roleTag">🛡️ ROLE: CREWMATE</div>
        <div className="role-desc" id="roleDesc">
          You are a loyal Crewmate team in {roomName}! Complete station missions, clear sabotages, and expose the Impostor.
        </div>
      </div>

      {toastMessage && (
        <div className="toast-feedback" id="actionToast">
          {toastMessage}
        </div>
      )}

      {activeSabotages.length > 0 && (
        <div className="sabotage-alert">
          <div>🚨 <strong>EMERGENCY: SECTOR SABOTAGE ACTIVE!</strong></div>
          {activeSabotages.map(effect => (
            <div key={effect.id} style={{ marginTop: '4px', fontSize: '11px' }}>
              • <strong>{effect.powerName}</strong> in effect! Active for {Math.max(1, Math.ceil((effect.expiresAt - Date.now()) / 1000))}s.
            </div>
          ))}
        </div>
      )}

      <div className="powers-section" id="powersSection">
        <div className="powers-header">
          <span id="powersHeaderTitle">Station Mini-Games Console</span>
          <span id="cooldownNotice" style={{ color: '#a1a1aa', fontWeight: 'normal' }}>Ready</span>
        </div>

        <Link
          to="/crewmate"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '12px',
            background: 'linear-gradient(135deg, rgba(31, 143, 255, 0.25), rgba(8, 14, 30, 0.9))',
            border: '2px solid #1f8fff',
            borderRadius: '10px',
            color: '#7fe3ff',
            fontFamily: "'Rajdhani', 'Chakra Petch', sans-serif",
            fontSize: '15px',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textDecoration: 'none',
            marginBottom: '10px',
            boxShadow: '0 0 16px rgba(31, 143, 255, 0.3)',
          }}
        >
          🚀 LAUNCH 3D CREWMATE TASK ARENA (WIRING · REACTOR · ASTEROIDS · CARD) →
        </Link>
        <div className="powers-grid" id="powersGrid">
          {games.map(game => (
            <Link
              key={game.id}
              to={game.route}
              className="power-btn"
              style={{ textDecoration: 'none' }}
            >
              <span className="power-btn-title">{game.icon} {game.title}</span>
              <span className="power-btn-desc">{game.description}</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
