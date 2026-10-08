import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AdminAuthProvider } from './context/AdminAuthContext';

const AmongUsAdmin = lazy(() => import('./pages/AmongUsAdmin'));
const Login = lazy(() => import('./pages/Login'));
const Player = lazy(() => import('./pages/Player'));
const Wordle = lazy(() => import('./games/Wordle'));
const Emoji = lazy(() => import('./games/Emoji/Emoji'));
const MemeDecoder = lazy(() => import('./games/MemeDecoder/App'));
const MonkeyType = lazy(() => import('./games/MonkeyType/App'));
const Pacman = lazy(() => import('./games/Pacman/App'));
const CrewmateArena = lazy(() => import('./games/crewmate/CrewmateArena'));
const ImposterArena = lazy(() => import('./games/imposter/ImposterArena'));

export default function App() {
  return (
    <AdminAuthProvider>
      <Router>
        <Suspense
          fallback={
            <div className="min-h-screen bg-black flex items-center justify-center font-mono text-xs text-zinc-400">
              <div className="p-4 border border-zinc-800 bg-zinc-950 flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>SYNCHRONIZING NEXUS TERMINAL...</span>
              </div>
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/player" element={<Player />} />
            <Route path="/admin" element={<AmongUsAdmin />} />
            <Route path="/dashboard" element={<AmongUsAdmin />} />
            <Route path="/games/wordle" element={<Wordle />} />
            <Route path="/games/emoji" element={<Emoji />} />
            <Route path="/games/memedecoder" element={<MemeDecoder />} />
            <Route path="/games/monkeytype" element={<MonkeyType />} />
            <Route path="/games/pacman" element={<Pacman />} />
            <Route path="/crewmate" element={<CrewmateArena />} />
            <Route path="/imposter" element={<ImposterArena />} />
            <Route path="/games/crewmate" element={<CrewmateArena />} />
            <Route path="/games/imposter" element={<ImposterArena />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </AdminAuthProvider>
  );
}
