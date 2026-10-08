import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AllocationDatabase } from '../lib/gameDatabase';
import { supabase } from '../lib/supabase';
import Crewmate from '../games/crewmate/Crewmate';
import Imposter, { IMPOSTOR_POWERS, ImpostorPower } from '../games/imposter/Imposter';
import { Team, TeamActiveEffect } from '../types';
import './Player.css';

interface PlayerSession {
  teamId: string;
  phone?: string;
  playerName?: string;
  teamName?: string;
  isImpostor?: boolean;
  assignedRoom?: string;
  eventStatus?: string;
  currentRound?: string | number;
}

export default function Player() {
  const navigate = useNavigate();

  // Step 1: Immediate Synchronous Render from localStorage (0ms delay)
  const [session, setSession] = useState<PlayerSession | null>(() => {
    try {
      const raw = localStorage.getItem('nexus_player_session');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [statusText, setStatusText] = useState('LIVE • CONNECTED');
  const [toastMessage, setToastMessage] = useState('');
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});

  // Target team selection for Impostor powers
  const [targetTeams, setTargetTeams] = useState<Team[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');

  // Active sabotage effects for crewmates
  const [activeSabotages, setActiveSabotages] = useState<TeamActiveEffect[]>([]);

  // Ensure body background is pitch black (#000000)
  useEffect(() => {
    const originalBg = document.body.style.backgroundColor;
    const originalColor = document.body.style.color;
    const originalOverflow = document.body.style.overflow;

    document.body.style.backgroundColor = '#000000';
    document.body.style.color = '#ffffff';
    document.body.style.overflow = 'auto';

    return () => {
      document.body.style.backgroundColor = originalBg;
      document.body.style.color = originalColor;
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Initialize default demo session if accessing directly without login
  useEffect(() => {
    if (!session) {
      const defaultDemoSession: PlayerSession = {
        teamId: 'NX-T1',
        phone: '+91 98333 44556',
        playerName: 'Devansh Joshi (Demo)',
        teamName: 'Cyber Phantoms',
        isImpostor: false,
        assignedRoom: 'Room 1 (Command Hub)',
        eventStatus: 'active',
        currentRound: 1,
      };
      localStorage.setItem('nexus_player_session', JSON.stringify(defaultDemoSession));
      setSession(defaultDemoSession);
    }
  }, [session]);

  // Toast message auto-dismiss
  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(''), 4000);
    return () => clearTimeout(t);
  }, [toastMessage]);

  // Refresh target teams & crewmate status
  const refreshGameContext = () => {
    if (!session) return;
    const allTeams = AllocationDatabase.getTeams();
    const myTeamId = session.teamId?.toUpperCase();

    // 1. If Impostor, find target crewmate teams
    if (session.isImpostor) {
      const crewmates = allTeams.filter(
        t => !t.isImpostor && t.teamCode?.toUpperCase() !== myTeamId && t.id?.toUpperCase() !== myTeamId
      );

      // Prioritize same room
      const sameRoom = crewmates.filter(
        t =>
          t.assignedRoomId === session.assignedRoom ||
          t.assignedRoomName === session.assignedRoom ||
          t.assignedRoom === session.assignedRoom
      );

      const available = sameRoom.length > 0 ? sameRoom : crewmates;
      setTargetTeams(available);

      if (!selectedTargetId && available.length > 0) {
        setSelectedTargetId(available[0].teamCode || available[0].id);
      }
    } else {
      // 2. If Crewmate, check active sabotage effects
      const myTeam = allTeams.find(
        t => t.teamCode?.toUpperCase() === myTeamId || t.id?.toUpperCase() === myTeamId
      );
      if (myTeam) {
        const now = Date.now();
        const active = (myTeam.activeEffects || []).filter(e => e.expiresAt > now);
        setActiveSabotages(active);
      }
    }
  };

  useEffect(() => {
    refreshGameContext();
    const interval = setInterval(refreshGameContext, 2500);
    return () => clearInterval(interval);
  }, [session, selectedTargetId]);

  // Background sync with API or Supabase
  useEffect(() => {
    if (!session) return;

    let isRefreshing = false;
    const API_BASE = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

    async function syncSession() {
      if (isRefreshing) return;
      isRefreshing = true;

      try {
        const currentRaw = localStorage.getItem('nexus_player_session');
        if (!currentRaw) return;
        const creds = JSON.parse(currentRaw);

        let updated = false;

        // Option 1: Backend API
        try {
          const res = await fetch(`${API_BASE}/teams/session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              teamId: creds.teamId,
              phone: creds.phone,
              playerName: creds.playerName,
            }),
          });
          const result = await res.json().catch(() => null);
          if (res.ok && result?.success && result?.data) {
            const d = result.data;
            const updatedSession: PlayerSession = {
              teamId: d.team?.teamCode || creds.teamId,
              phone: d.player?.phone || creds.phone,
              playerName: d.player?.name || creds.playerName,
              teamName: d.team?.name || creds.teamName,
              isImpostor: Boolean(d.team?.isImpostor),
              assignedRoom: d.team?.assignedRoom || creds.assignedRoom,
              eventStatus: d.eventSession?.status || creds.eventStatus || 'active',
              currentRound: d.eventSession?.currentRound ?? creds.currentRound ?? 1,
            };
            setSession(updatedSession);
            localStorage.setItem('nexus_player_session', JSON.stringify(updatedSession));
            setStatusText(`EVENT ${(d.eventSession?.status || 'ACTIVE').toUpperCase()}`);
            updated = true;
          }
        } catch {
          // Backend offline - silent fallback
        }

        // Option 2: Direct Supabase Cloud
        if (!updated && supabase) {
          try {
            const { data: teamRecord } = await supabase
              .from('teams')
              .select('*')
              .or(`team_code.ilike.${creds.teamId},badge_code.ilike.${creds.teamId}`)
              .limit(1)
              .single();

            if (teamRecord) {
              const updatedSession: PlayerSession = {
                ...creds,
                teamName: teamRecord.name,
                isImpostor: Boolean(teamRecord.is_impostor),
                assignedRoom: teamRecord.assigned_room || teamRecord.assigned_room_name || creds.assignedRoom || 'Room 1 (Command Hub)',
                eventStatus: teamRecord.status || creds.eventStatus || 'active',
              };
              setSession(updatedSession);
              localStorage.setItem('nexus_player_session', JSON.stringify(updatedSession));
              setStatusText('LIVE • CONNECTED');
              updated = true;
            }
          } catch (sbEx) {
            console.warn('Supabase session background check:', sbEx);
          }
        }
      } catch (err) {
        console.warn('Failed background session check:', err);
      } finally {
        isRefreshing = false;
      }
    }

    syncSession();
    const interval = setInterval(syncSession, 5000);
    return () => clearInterval(interval);
  }, []);

  const isImpostor = Boolean(session?.isImpostor);
  const teamName = session?.teamName || session?.teamId || 'Cyber Phantoms';
  const playerName = session?.playerName || 'Operative';
  const teamId = session?.teamId || 'NX-T1';
  const roomName = session?.assignedRoom || 'Room 1 (Command Hub)';
  const eventStatus = session?.eventStatus || 'active';
  const round = session?.currentRound ?? '1';

  const handleTriggerPower = (power: ImpostorPower) => {
    if (cooldowns[power.name] && cooldowns[power.name] > 0) return;

    let targetTeamObj = targetTeams.find(
      t => t.teamCode === selectedTargetId || t.id === selectedTargetId
    );
    if (power.targetRequired && !targetTeamObj && targetTeams.length > 0) {
      targetTeamObj = targetTeams[0];
      setSelectedTargetId(targetTeamObj.teamCode || targetTeamObj.id);
    }

    if (power.targetRequired && !targetTeamObj) {
      setToastMessage('⚠️ No target crewmate squad available in sector.');
      return;
    }

    const targetIdToSend = power.targetRequired && targetTeamObj
      ? (targetTeamObj.teamCode || targetTeamObj.id)
      : undefined;

    // Trigger power in AllocationDatabase
    const result = AllocationDatabase.triggerPower(teamId, power.name, targetIdToSend);

    const actionMsg = power.targetRequired && targetTeamObj
      ? `🎯 IMPOSTOR POWER: ${power.name} activated on ${targetTeamObj.name} (${targetTeamObj.teamCode || targetTeamObj.id})!`
      : `⚡ IMPOSTOR POWER: ${power.name} activated room-wide in ${roomName}!`;

    setToastMessage(result?.message || actionMsg);

    // 10 second visual cooldown
    setCooldowns(prev => ({ ...prev, [power.name]: 10 }));
    const cdInterval = setInterval(() => {
      setCooldowns(prev => {
        const nextVal = (prev[power.name] || 1) - 1;
        if (nextVal <= 0) {
          clearInterval(cdInterval);
          const copy = { ...prev };
          delete copy[power.name];
          return copy;
        }
        return { ...prev, [power.name]: nextVal };
      });
    }, 1000);
  };

  const handleToggleRole = () => {
    if (!session) return;
    const newIsImpostor = !session.isImpostor;
    const updated: PlayerSession = {
      ...session,
      isImpostor: newIsImpostor,
      teamId: newIsImpostor ? 'NX-IMPOSTOR' : 'NX-T1',
      teamName: newIsImpostor ? 'Shadow Syndicate' : 'Cyber Phantoms',
      playerName: newIsImpostor ? 'Red Impostor (Demo)' : 'Devansh Joshi (Demo)',
      assignedRoom: newIsImpostor ? 'Reactor' : 'Room 1 (Command Hub)',
    };
    setSession(updated);
    localStorage.setItem('nexus_player_session', JSON.stringify(updated));
    setToastMessage(`Switched role to ${newIsImpostor ? 'IMPOSTOR' : 'CREWMATE'}`);
  };

  const handleLogout = () => {
    localStorage.removeItem('nexus_player_session');
    navigate('/', { replace: true });
  };

  return (
    <div className="player-container">
      <div className="container">
        <div className="header-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div className="brand">Nexus • Among Us</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleToggleRole}
              style={{
                background: isImpostor ? 'rgba(216, 52, 63, 0.2)' : 'rgba(79, 179, 162, 0.2)',
                border: isImpostor ? '1px solid #d8343f' : '1px solid #4fb3a2',
                color: isImpostor ? '#ff8a8a' : '#4fb3a2',
                borderRadius: '4px',
                padding: '4px 10px',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '11px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
              title="Click to toggle between Impostor and Crewmate demo roles"
            >
              🔄 SWITCH TO {isImpostor ? 'CREWMATE' : 'IMPOSTOR'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/crewmate')}
              style={{
                background: 'rgba(31, 143, 255, 0.15)',
                border: '1px solid #1f8fff',
                color: '#7fe3ff',
                borderRadius: '4px',
                padding: '4px 10px',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '11px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
              title="Open 3D Crewmate Task Arena"
            >
              🪐 CREWMATE ARENA
            </button>
            <button
              type="button"
              onClick={() => navigate('/imposter')}
              style={{
                background: 'rgba(255, 30, 45, 0.15)',
                border: '1px solid #ff1e2d',
                color: '#ff8a8a',
                borderRadius: '4px',
                padding: '4px 10px',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '11px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
              title="Open 3D Imposter Sabotage Arena"
            >
              ☢ IMPOSTER ARENA
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin')}
              style={{
                background: 'rgba(111, 180, 232, 0.1)',
                border: '1px solid #3f3f46',
                color: '#a9d8f5',
                borderRadius: '4px',
                padding: '4px 10px',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              ⚙️ ADMIN
            </button>
            <div className="status-badge" id="connStatus">{statusText}</div>
          </div>
        </div>

        <div className="main-card">
          <div className="dev-badge">Gameplay Terminal</div>

          <h1 className="main-title">Gameplay Terminal</h1>

          <p className="main-desc">
            Your team allocation, player role, and live event status are synchronized with the NEXUS operations database.
          </p>

          {isImpostor ? (
            <Imposter
              roomName={roomName}
              targetTeams={targetTeams}
              selectedTargetId={selectedTargetId}
              toastMessage={toastMessage}
              cooldowns={cooldowns}
              onSelectTarget={setSelectedTargetId}
              onTriggerPower={handleTriggerPower}
            />
          ) : (
            <Crewmate
              roomName={roomName}
              activeSabotages={activeSabotages}
              toastMessage={toastMessage}
            />
          )}

          {/* Team Allocation Info */}
          <div className="team-info-box" id="infoBox">
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Assigned Team</span>
                <span className="info-value" id="valTeamName">{teamName}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Player</span>
                <span className="info-value" id="valPlayerName">{playerName}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Official Team ID</span>
                <div><span className="info-tag" id="valTeamCode">{teamId}</span></div>
              </div>
              <div className="info-item">
                <span className="info-label">Event Session</span>
                <span className="info-value" id="valSessionStatus">{eventStatus}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Allocated Room</span>
                <span className="info-value" id="valRoomName">{roomName}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Current Round</span>
                <span className="info-value" id="valRound">{round}</span>
              </div>
            </div>
          </div>

          <div className="actions">
            <button className="btn btn-outline" id="btnLogout" type="button" onClick={handleLogout}>
              Log Out
            </button>
            <button className="btn btn-outline" type="button" onClick={() => navigate('/')}>
              Portal Home
            </button>
          </div>
        </div>

        <div className="footer-note">
          Nexus Operations • System Authenticated
        </div>
      </div>
    </div>
  );
}
