import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './CrewmateArena.css';

interface TeamData {
  id: number;
  name: string;
  score: number;
  color: string;
}

const COLORS = [
  '#ff3b3b', '#3b6bff', '#2ecc71', '#ffd23b', '#b04bff',
  '#ff8a2b', '#ff5fc8', '#22d3ee', '#a3e635', '#f5f5f5'
];

export default function CrewmateArena() {
  const navigate = useNavigate();

  // Audio Context & SFX Ref
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [muted, setMuted] = useState(false);

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const playTone = useCallback((f: number, d: number, type: OscillatorType = 'sine', v = 0.15, to: number | null = null, delay = 0) => {
    if (muted) return;
    const a = getAudioContext();
    if (!a) return;
    const t = a.currentTime + delay;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + d);
  }, [muted, getAudioContext]);

  const sfx = useRef({
    tap: () => playTone(520, 0.12, 'square', 0.08, 900),
    open: () => {
      playTone(300, 0.1, 'triangle', 0.12);
      playTone(450, 0.12, 'triangle', 0.12, null, 0.08);
    },
    boom: () => {
      playTone(160, 0.6, 'sawtooth', 0.25, 40);
      playTone(90, 0.8, 'square', 0.15, 30);
    },
    fix: () => [500, 700, 950].forEach((f, i) => playTone(f, 0.18, 'sine', 0.14, null, i * 0.1)),
    deny: () => {
      playTone(180, 0.2, 'square', 0.12);
      playTone(140, 0.25, 'square', 0.12, null, 0.15);
    },
    tick: () => playTone(1200, 0.03, 'square', 0.03),
  });

  // State: Teams
  const [teams, setTeams] = useState<TeamData[]>(() => {
    try {
      const saved = localStorage.getItem('imp_teams');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return ['Red Squad', 'Blue Crew', 'Green Gang', 'Yellow Ops', 'Purple Pack'].map((n, i) => ({
      id: i + 1,
      name: n,
      score: 50,
      color: COLORS[i % COLORS.length],
    }));
  });

  const saveTeams = (newTeams: TeamData[]) => {
    setTeams(newTeams);
    try {
      localStorage.setItem('imp_teams', JSON.stringify(newTeams));
    } catch {}
  };

  // Toast State
  const [toastText, setToastText] = useState('');
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastText(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToastText(''), 2200);
  }, []);

  // Selected Team Menu State
  const [selectedTeam, setSelectedTeam] = useState<TeamData | null>(null);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

  // Modals
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [newTeamName, setNewTeamName] = useState('');

  // Minigame Modal
  const [activeGameKey, setActiveGameKey] = useState<string | null>(null);
  const [completedGames, setCompletedGames] = useState<Record<string, boolean>>({});

  // Orbit Physics & Animation Refs
  const stageRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const angRef = useRef(0);
  const velRef = useRef(0.004);
  const tiltRef = useRef(0.5);
  const dragRef = useRef<{ x: number; y: number; moved: number; teamId?: number } | null>(null);
  const pausedRef = useRef(false);

  // Orbit Rendering Loop
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const loop = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const n = teams.length || 1;
      const cx = w / 2;
      const cy = h * 0.44;

      if (!dragRef.current && !pausedRef.current) {
        velRef.current += (0.004 - velRef.current) * 0.02;
      } else if (pausedRef.current && !dragRef.current) {
        velRef.current *= 0.9;
      }

      angRef.current += velRef.current;
      const Rx = Math.min(w * (w < 600 ? 0.36 : 0.4), 560);
      const Ry = Math.min(Rx * tiltRef.current, h * 0.34);
      const f = Math.max(0.55, Math.min(1, 7 / n));

      const teamEls = stage.querySelectorAll<HTMLElement>('.team-item');
      teamEls.forEach((el, i) => {
        const th = angRef.current + (i * 2 * Math.PI) / n;
        const s = Math.sin(th);
        const d = (s + 1) / 2;
        const x = cx + Math.cos(th) * Rx;
        const y = cy + s * Ry;
        const sc = f * (0.68 + 0.32 * d);

        el.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%) scale(${sc})`;
        el.style.opacity = `${0.5 + 0.5 * d}`;
        el.style.zIndex = `${Math.round(d * 100)}`;
      });

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [teams]);

  // Pointer drag events for orbit
  const handlePointerDown = (e: React.PointerEvent) => {
    getAudioContext();
    const target = (e.target as HTMLElement).closest('.team-item');
    const teamId = target ? Number((target as HTMLElement).dataset.id) : undefined;
    dragRef.current = { x: e.clientX, y: e.clientY, moved: 0, teamId };
    velRef.current = 0;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    dragRef.current.moved += Math.abs(dx) + Math.abs(dy);
    angRef.current += dx * 0.008;
    velRef.current = dx * 0.008;
    tiltRef.current = Math.max(0.15, Math.min(0.9, tiltRef.current + dy * 0.003));
    dragRef.current.x = e.clientX;
    dragRef.current.y = e.clientY;
    if (dragRef.current.moved > 40 && Math.random() < 0.08) {
      sfx.current.tick();
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const { moved, teamId } = dragRef.current;
    dragRef.current = null;
    if (moved < 10 && teamId) {
      const t = teams.find(x => x.id === teamId);
      if (t) {
        sfx.current.open();
        pausedRef.current = true;
        setSelectedTeam(t);
        setMenuPos({
          x: Math.max(8, Math.min(window.innerWidth - 240, e.clientX - 110)),
          y: Math.max(8, Math.min(window.innerHeight - 200, e.clientY + 12)),
        });
      }
    } else if (moved < 10) {
      closeTeamMenu();
    }
  };

  const closeTeamMenu = () => {
    setSelectedTeam(null);
    pausedRef.current = false;
  };

  const handleCheer = () => {
    if (!selectedTeam) return;
    sfx.current.fix();
    showToast(`👏 Cheered ${selectedTeam.name}!`);
    closeTeamMenu();
  };

  // Admin controls
  const handleAdminUnlock = () => {
    if (adminPin === '1234') {
      setAdminUnlocked(true);
      sfx.current.fix();
    } else {
      sfx.current.deny();
      showToast('Wrong PIN (Use 1234)');
    }
  };

  const handleAddTeam = () => {
    const name = newTeamName.trim();
    if (!name) return;
    const maxId = teams.length ? Math.max(...teams.map(t => t.id)) : 0;
    const newTeam: TeamData = {
      id: maxId + 1,
      name,
      score: 50,
      color: COLORS[teams.length % COLORS.length],
    };
    const updated = [...teams, newTeam];
    saveTeams(updated);
    setNewTeamName('');
    sfx.current.tap();
  };

  const handleScoreChange = (teamId: number, delta: number) => {
    sfx.current.tap();
    const updated = teams.map(t =>
      t.id === teamId ? { ...t, score: Math.max(0, t.score + delta) } : t
    );
    saveTeams(updated);
  };

  const handleDeleteTeam = (teamId: number) => {
    sfx.current.tap();
    const updated = teams.filter(t => t.id !== teamId);
    saveTeams(updated);
  };

  // Minigame completion
  const handleGameComplete = (gameKey: string) => {
    sfx.current.fix();
    setCompletedGames(prev => ({ ...prev, [gameKey]: true }));
    showToast(`✔ ${gameKey.toUpperCase()} TASK COMPLETED!`);
    setTimeout(() => {
      setActiveGameKey(null);
    }, 1200);
  };

  return (
    <div className="crewmate-arena-wrapper">
      <div className="bg-layer" />
      <div className="vig-layer" />
      <div className="dim-layer" />
      <div className="alarm-layer" />

      {/* Top action bar */}
      <div className="top-bar">
        <button
          type="button"
          className="btn-action lock-btn"
          onClick={() => {
            setAdminOpen(true);
            setAdminPin('');
            setAdminUnlocked(false);
          }}
        >
          🔒 Admin
        </button>

        <span style={{ flex: 1 }} />

        <button
          type="button"
          className="btn-action"
          onClick={() => setMuted(!muted)}
        >
          {muted ? '🔇' : '🔊'}
        </button>

        <button
          type="button"
          className="btn-action red"
          onClick={() => navigate('/player')}
        >
          ← Terminal
        </button>
      </div>

      {/* 3D Orbiting Stage */}
      <div
        className="stage-container"
        ref={stageRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {teams.map(t => (
          <div
            key={t.id}
            className="team-item"
            data-id={t.id}
            style={{ '--c': t.color } as React.CSSProperties}
          >
            <svg viewBox="0 0 44 52">
              <rect x="1" y="20" width="9" height="17" rx="4" fill={t.color} />
              <path
                d="M9 20a13 13 0 0 1 26 0v20a4 4 0 0 1-4 4h-5v-6h-8v6h-5a4 4 0 0 1-4-4z"
                fill={t.color}
              />
              <rect x="19" y="13" width="19" height="12" rx="6" fill="#a8e1f5" stroke="#1b3a4a" strokeWidth="1.5" />
              <rect x="24" y="15" width="9" height="3" rx="1.5" fill="#fff" opacity="0.7" />
            </svg>
            <div className="n">{t.name}</div>
            <div className="s">Score: {t.score}</div>
          </div>
        ))}
      </div>

      <div className="hint-bar">DRAG TO SPIN · TAP A TEAM TO CHEER</div>

      {/* Selected Team Info Menu */}
      {selectedTeam && (
        <div
          className="team-menu"
          style={{ left: `${menuPos.x}px`, top: `${menuPos.y}px`, display: 'block' }}
        >
          <h4>{selectedTeam.name}</h4>
          <div className="inf">Score: <b>{selectedTeam.score}</b></div>
          <div className="inf">
            Rank: <b>#{[...teams].sort((a, b) => b.score - a.score).findIndex(t => t.id === selectedTeam.id) + 1}</b> of {teams.length}
          </div>
          <button type="button" onClick={handleCheer}>
            👏 Cheer Team
          </button>
          <button type="button" className="x" onClick={closeTeamMenu}>
            Close
          </button>
        </div>
      )}

      {/* Toast Feedback */}
      <div className={`toast-bar ${toastText ? 'on' : ''}`}>
        {toastText}
      </div>

      {/* Home Dock: 4 Authentic Among Us Minigames */}
      <div className="home-dock">
        <div className="games-grid">
          <button
            type="button"
            className={`game-btn ${completedGames.wires ? 'done' : ''}`}
            onClick={() => {
              sfx.current.open();
              setActiveGameKey('wires');
            }}
          >
            <span>🔌</span>
            Wiring
          </button>

          <button
            type="button"
            className={`game-btn ${completedGames.simon ? 'done' : ''}`}
            onClick={() => {
              sfx.current.open();
              setActiveGameKey('simon');
            }}
          >
            <span>🧠</span>
            Reactor
          </button>

          <button
            type="button"
            className={`game-btn ${completedGames.blast ? 'done' : ''}`}
            onClick={() => {
              sfx.current.open();
              setActiveGameKey('blast');
            }}
          >
            <span>☄️</span>
            Asteroids
          </button>

          <button
            type="button"
            className={`game-btn ${completedGames.card ? 'done' : ''}`}
            onClick={() => {
              sfx.current.open();
              setActiveGameKey('card');
            }}
          >
            <span>💳</span>
            Swipe Card
          </button>
        </div>
      </div>

      {/* Minigame Modal */}
      {activeGameKey && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3>
              {activeGameKey === 'wires' && '🔌 Fix Wiring'}
              {activeGameKey === 'simon' && '🧠 Start Reactor'}
              {activeGameKey === 'blast' && '☄️ Clear Asteroids'}
              {activeGameKey === 'card' && '💳 Swipe Card'}
            </h3>

            {activeGameKey === 'wires' && (
              <WiresGame onDone={() => handleGameComplete('wires')} sfx={sfx.current} />
            )}
            {activeGameKey === 'simon' && (
              <SimonGame onDone={() => handleGameComplete('simon')} playTone={playTone} sfx={sfx.current} />
            )}
            {activeGameKey === 'blast' && (
              <BlastGame onDone={() => handleGameComplete('blast')} playTone={playTone} />
            )}
            {activeGameKey === 'card' && (
              <CardGame onDone={() => handleGameComplete('card')} sfx={sfx.current} />
            )}

            <button
              type="button"
              className="btn-action"
              style={{ marginTop: '14px' }}
              onClick={() => setActiveGameKey(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Admin Panel Modal */}
      {adminOpen && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3>🔒 Admin Console</h3>

            {!adminUnlocked ? (
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="password"
                  inputMode="numeric"
                  placeholder="Enter PIN (1234)"
                  value={adminPin}
                  onChange={e => setAdminPin(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdminUnlock()}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    background: '#0d1426',
                    color: '#fff',
                    border: '1px solid #556',
                    borderRadius: '9px',
                    padding: '8px',
                    font: '600 16px Rajdhani',
                  }}
                />
                <button type="button" className="btn-action red" onClick={handleAdminUnlock}>
                  Unlock
                </button>
              </div>
            ) : (
              <div>
                <b>TEAMS ({teams.length})</b>
                <div className="add-form">
                  <input
                    placeholder="New team name"
                    maxLength={18}
                    value={newTeamName}
                    onChange={e => setNewTeamName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddTeam()}
                  />
                  <button type="button" className="btn-action red" onClick={handleAddTeam}>
                    Add
                  </button>
                </div>

                <div className="admin-list">
                  {teams.map(t => (
                    <div
                      key={t.id}
                      className="row"
                      style={{ '--c': t.color } as React.CSSProperties}
                    >
                      <i />
                      <span>{t.name}</span>
                      <button type="button" className="btn-action" onClick={() => handleScoreChange(t.id, -10)}>
                        −10
                      </button>
                      <b>{t.score}</b>
                      <button type="button" className="btn-action" onClick={() => handleScoreChange(t.id, 10)}>
                        +10
                      </button>
                      <button type="button" className="btn-action" onClick={() => handleDeleteTeam(t.id)}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              className="btn-action"
              style={{ marginTop: '12px' }}
              onClick={() => setAdminOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// Sub-components: 4 Minigames
// ----------------------------------------------------

interface WiresProps {
  onDone: () => void;
  sfx: { tap: () => void; deny: () => void };
}

function WiresGame({ onDone, sfx }: WiresProps) {
  const colors = ['#f33', '#38f', '#3d6', '#fd3'];
  const [rightOrder] = useState(() => [0, 1, 2, 3].sort(() => Math.random() - 0.5));
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [connected, setConnected] = useState<Record<number, boolean>>({});

  const handleLeftClick = (i: number) => {
    if (connected[i]) return;
    sfx.tap();
    setSelectedLeft(i);
  };

  const handleRightClick = (i: number) => {
    if (connected[i] || selectedLeft === null) return;
    if (selectedLeft === i) {
      sfx.tap();
      const next = { ...connected, [i]: true };
      setConnected(next);
      setSelectedLeft(null);
      if (Object.keys(next).length === 4) {
        onDone();
      }
    } else {
      sfx.deny();
      setSelectedLeft(null);
    }
  };

  return (
    <div style={{ margin: '14px 0' }}>
      <p style={{ fontSize: '14px', opacity: 0.8, marginBottom: '12px' }}>
        Select wire on left, connect to matching wire on right
      </p>
      <div className="wr">
        <div>
          {colors.map((c, i) => (
            <button
              key={`left-${i}`}
              type="button"
              className={`wire ${selectedLeft === i ? 'sel' : ''}`}
              style={{ background: c, opacity: connected[i] ? 0.25 : 1 }}
              onClick={() => handleLeftClick(i)}
              disabled={connected[i]}
            />
          ))}
        </div>
        <div>
          {rightOrder.map(i => (
            <button
              key={`right-${i}`}
              type="button"
              className="wire"
              style={{ background: colors[i], opacity: connected[i] ? 0.25 : 1 }}
              onClick={() => handleRightClick(i)}
              disabled={connected[i]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface SimonProps {
  onDone: () => void;
  playTone: (f: number, d: number, type?: OscillatorType, v?: number) => void;
  sfx: { deny: () => void };
}

function SimonGame({ onDone, playTone, sfx }: SimonProps) {
  const colors = ['#f33', '#38f', '#3d6', '#fd3'];
  const [seq, setSeq] = useState<number[]>([]);
  const [activePad, setActivePad] = useState<number | null>(null);
  const [statusMsg, setStatusMsg] = useState('Watch sequence...');
  const [inputLocked, setInputLocked] = useState(true);
  const playerPosRef = useRef(0);

  const flashPad = useCallback((idx: number) => {
    setActivePad(idx);
    playTone(300 + idx * 130, 0.25, 'sine', 0.15);
    setTimeout(() => setActivePad(null), 250);
  }, [playTone]);

  const startNextRound = useCallback((currentSeq: number[]) => {
    const nextItem = Math.floor(Math.random() * 4);
    const updated = [...currentSeq, nextItem];
    setSeq(updated);
    playerPosRef.current = 0;
    setInputLocked(true);
    setStatusMsg('Watch...');

    updated.forEach((padIdx, k) => {
      setTimeout(() => flashPad(padIdx), k * 600 + 400);
    });

    setTimeout(() => {
      setInputLocked(false);
      setStatusMsg(`Your turn (${updated.length}/5)`);
    }, updated.length * 600 + 500);
  }, [flashPad]);

  useEffect(() => {
    startNextRound([]);
  }, [startNextRound]);

  const handlePadClick = (idx: number) => {
    if (inputLocked) return;
    flashPad(idx);

    if (idx !== seq[playerPosRef.current]) {
      setInputLocked(true);
      sfx.deny();
      setStatusMsg('Wrong! Restarting...');
      setTimeout(() => startNextRound([]), 900);
      return;
    }

    playerPosRef.current += 1;
    if (playerPosRef.current === seq.length) {
      if (seq.length >= 5) {
        onDone();
      } else {
        setInputLocked(true);
        setTimeout(() => startNextRound(seq), 700);
      }
    }
  };

  return (
    <div>
      <p style={{ margin: '8px 0', fontSize: '15px' }}>{statusMsg}</p>
      <div className="sg">
        {colors.map((c, i) => (
          <button
            key={`pad-${i}`}
            type="button"
            className={`pad ${activePad === i ? 'on' : ''}`}
            style={{ background: c }}
            onClick={() => handlePadClick(i)}
          />
        ))}
      </div>
    </div>
  );
}

interface BlastProps {
  onDone: () => void;
  playTone: (f: number, d: number, type?: OscillatorType, v?: number, to?: number) => void;
}

function BlastGame({ onDone, playTone }: BlastProps) {
  const [destroyed, setDestroyed] = useState(0);
  const [asteroid, setAsteroid] = useState<{ id: number; left: number; top: number } | null>(null);

  const spawnAsteroid = useCallback(() => {
    setAsteroid({
      id: Date.now(),
      left: Math.random() * 80,
      top: Math.random() * 75,
    });
  }, []);

  useEffect(() => {
    spawnAsteroid();
  }, [spawnAsteroid]);

  const handleClickAsteroid = () => {
    const nextCount = destroyed + 1;
    setDestroyed(nextCount);
    playTone(700 + nextCount * 40, 0.12, 'square', 0.08, 200);

    if (nextCount >= 10) {
      setAsteroid(null);
      onDone();
    } else {
      spawnAsteroid();
    }
  };

  return (
    <div>
      <p style={{ margin: '8px 0', fontSize: '15px' }}>
        Destroy 10 Asteroids: <b>{destroyed}</b> / 10
      </p>
      <div className="sky">
        {asteroid && (
          <button
            type="button"
            className="ast"
            style={{ left: `${asteroid.left}%`, top: `${asteroid.top}%` }}
            onClick={handleClickAsteroid}
          >
            ☄
          </button>
        )}
      </div>
    </div>
  );
}

interface CardProps {
  onDone: () => void;
  sfx: { deny: () => void };
}

function CardGame({ onDone, sfx }: CardProps) {
  const [cardLeft, setCardLeft] = useState(0);
  const [statusMsg, setStatusMsg] = useState('Swipe the card — not too fast, not too slow');
  const dragRef = useRef<{ startX: number; startTime: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    dragRef.current = { startX: e.clientX, startTime: Date.now() };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const maxLeft = 240; // max track distance
    const dx = e.clientX - dragRef.current.startX;
    setCardLeft(Math.max(0, Math.min(maxLeft, dx)));
  };

  const handlePointerUp = () => {
    if (!dragRef.current) return;
    const dt = Date.now() - dragRef.current.startTime;
    const maxLeft = 240;
    const isFullSwipe = cardLeft >= maxLeft - 30;
    dragRef.current = null;

    if (isFullSwipe && dt >= 500 && dt <= 1600) {
      setStatusMsg('Accepted ✔');
      onDone();
    } else {
      sfx.deny();
      setCardLeft(0);
      if (isFullSwipe) {
        setStatusMsg(dt < 500 ? 'Too fast. Try again.' : 'Too slow. Try again.');
      } else {
        setStatusMsg('Bad read. Swipe all the way across.');
      }
    }
  };

  return (
    <div>
      <p style={{ margin: '8px 0', fontSize: '14px' }}>{statusMsg}</p>
      <div
        className="trk"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="crd" style={{ left: `${cardLeft}px` }}>
          💳
        </div>
      </div>
    </div>
  );
}
