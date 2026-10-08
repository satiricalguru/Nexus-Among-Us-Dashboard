import React from 'react';
import { Link } from 'react-router-dom';
import { Team } from '../../types';

export interface ImpostorPower {
  name: string;
  title: string;
  desc: string;
  targetRequired: boolean;
}

export const IMPOSTOR_POWERS: ImpostorPower[] = [
  {
    name: 'Sabotage Lights',
    title: '⚡ Sabotage Lights',
    desc: 'Kill power to sector lighting to cause room darkness',
    targetRequired: false,
  },
  {
    name: 'Door Lockdown',
    title: '🚪 Door Lockdown',
    desc: 'Seal sector doors & freeze target crewmate squad for 40s',
    targetRequired: true,
  },
  {
    name: 'Comms Blackout',
    title: '📻 Comms Blackout',
    desc: 'Disrupt radio signals and clue deciphering for target squad',
    targetRequired: true,
  },
  {
    name: 'Terminal Freeze',
    title: '❄️ Terminal Freeze',
    desc: 'Freeze target crewmate team terminal, disabling all actions for 40s',
    targetRequired: true,
  },
  {
    name: 'Fake Task Signal',
    title: '🎭 Fake Task Signal',
    desc: 'Broadcast fraudulent completion to fool crewmates',
    targetRequired: false,
  },
  {
    name: 'Fake Clue Inject',
    title: '🧩 Fake Clue Inject',
    desc: 'Transmit corrupted forensic clue decipher to confuse target crewmates',
    targetRequired: true,
  },
];

interface ImposterProps {
  roomName: string;
  targetTeams: Team[];
  selectedTargetId: string;
  toastMessage: string;
  cooldowns: Record<string, number>;
  onSelectTarget: (teamId: string) => void;
  onTriggerPower: (power: ImpostorPower) => void;
}

export default function Imposter({
  roomName,
  targetTeams,
  selectedTargetId,
  toastMessage,
  cooldowns,
  onSelectTarget,
  onTriggerPower,
}: ImposterProps) {
  const isCoolingDown = Object.values(cooldowns).some(seconds => seconds > 0);

  return (
    <>
      <div className="role-banner" id="roleBanner">
        <div className="role-tag role-impostor" id="roleTag">⚡ ROLE: COVERT IMPOSTOR</div>
        <div className="role-desc" id="roleDesc">
          You are the covert Impostor team in {roomName}! Deceive the crewmates, trigger room sabotages, and target enemy squads.
        </div>
      </div>

      {toastMessage && (
        <div className="toast-feedback" id="actionToast">
          {toastMessage}
        </div>
      )}

      <div className="target-box">
        <div className="target-header">
          <span>🎯 Select Target Crewmate Squad:</span>
          <span style={{ color: '#a1a1aa', fontWeight: 'normal', fontSize: '10px' }}>
            {targetTeams.length} Targets in Sector
          </span>
        </div>
        {targetTeams.length > 0 ? (
          <div className="target-chips">
            {targetTeams.map(team => {
              const code = team.teamCode || team.id;
              const isSelected = selectedTargetId === code || selectedTargetId === team.id;
              return (
                <button
                  key={team.id}
                  type="button"
                  className={`target-chip ${isSelected ? 'active' : ''}`}
                  onClick={() => onSelectTarget(code)}
                >
                  <span>{team.name}</span>
                  <span style={{ opacity: 0.7 }}>[{code}]</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div style={{ fontSize: '11px', color: '#71717a' }}>
            No active crewmate teams currently detected in sector.
          </div>
        )}
      </div>

      <div className="powers-section" id="powersSection">
        <div className="powers-header">
          <span id="powersHeaderTitle">Impostor Sabotage Console</span>
          <span id="cooldownNotice" style={{ color: '#a1a1aa', fontWeight: 'normal' }}>
            {isCoolingDown ? 'Cooldown Active' : 'Ready'}
          </span>
        </div>

        <Link
          to="/imposter"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '12px',
            background: 'linear-gradient(135deg, rgba(255, 30, 45, 0.25), rgba(20, 0, 4, 0.9))',
            border: '2px solid #ff1e2d',
            borderRadius: '10px',
            color: '#ff8a8a',
            fontFamily: "'Rajdhani', 'Chakra Petch', sans-serif",
            fontSize: '15px',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textDecoration: 'none',
            marginBottom: '10px',
            boxShadow: '0 0 16px rgba(255, 30, 45, 0.3)',
          }}
        >
          ⚡ LAUNCH 3D SABOTAGE ARENA (ORBITING TEAMS · LIVE SABOTAGE · RADAR) →
        </Link>
        <div className="powers-grid" id="powersGrid">
          {IMPOSTOR_POWERS.map(power => {
            const cooldown = cooldowns[power.name] || 0;
            return (
              <button
                key={power.name}
                className="power-btn"
                disabled={cooldown > 0}
                onClick={() => onTriggerPower(power)}
                data-power={power.name}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <span className="power-btn-title">
                    {cooldown > 0 ? `${power.name} (${cooldown}s)` : power.title}
                  </span>
                  <span className={`power-scope-badge ${power.targetRequired ? 'scope-targeted' : 'scope-room'}`}>
                    {power.targetRequired ? '🎯 Targeted' : '🌐 Room'}
                  </span>
                </div>
                <span className="power-btn-desc">{power.desc}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
