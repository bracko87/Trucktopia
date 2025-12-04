/**
 * GameTimeController.tsx
 *
 * Small developer UI for inspecting and controlling the central game clock.
 *
 * Responsibilities:
 * - Show current in-game time (Berlin wall-clock and UTC)
 * - Allow setting an absolute in-game datetime
 * - Allow applying an offset relative to real time
 * - Advance time manually (minutes/hours/days)
 * - Start/stop automatic advancement with a speed multiplier
 *
 * This is intended as a debugging helper only and is mounted in the app debug area.
 */

import React, { useEffect, useState } from 'react';
import { Play, Pause, RefreshCcw, Clock, Calendar, FastForward, RotateCw } from 'lucide-react';
import {
  GAME_CLOCK_EVENT,
  nowUtcMs,
  setGameNowMs,
  setGameOffsetMs,
  advanceGameMs,
  startClock,
  stopClock,
  getState,
  setSpeed,
} from '../../utils/gameClock';
import { GAME_TIMEZONE, getTimeZoneOffsetMs } from '../../utils/gameTime';

/**
 * formatBerlin
 * @description Format epoch ms into Europe/Berlin wall-clock readable string.
 * @param ms epoch ms
 */
function formatBerlin(ms: number) {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: GAME_TIMEZONE,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(ms));
  } catch {
    return new Date(ms).toISOString();
  }
}

/**
 * formatUtc
 * @description Human-friendly UTC string.
 */
function formatUtc(ms: number) {
  try {
    return new Date(ms).toISOString();
  } catch {
    return String(ms);
  }
}

/**
 * GameTimeController Component
 * @description Debug UI to inspect and control the game's authoritative time.
 */
const GameTimeController: React.FC = () => {
  const [state, setState] = useState(() => getState());
  const [inputIso, setInputIso] = useState(''); // user-provided ISO datetime or local-ish
  const [offsetTxt, setOffsetTxt] = useState('0'); // ms offset or minutes
  const [speedLocal, setSpeedLocal] = useState<number>(state.speed || 1);

  useEffect(() => {
    const handler = (ev: any) => setState(getState());
    window.addEventListener(GAME_CLOCK_EVENT, handler as EventListener);
    // also poll occasionally to keep UI synced with other changes
    const id = window.setInterval(() => setState(getState()), 1000);
    return () => {
      window.clearInterval(id);
      window.removeEventListener(GAME_CLOCK_EVENT, handler as EventListener);
    };
  }, []);

  // keep local speed in sync
  useEffect(() => {
    setSpeedLocal(state.speed ?? 1);
  }, [state.speed]);

  const applyAbsolute = () => {
    if (!inputIso) return;
    const parsed = Date.parse(inputIso);
    if (!Number.isFinite(parsed)) {
      // try treating plain date/time as Berlin wall-clock: create ISO with +01:00 (CET) for December (best effort)
      const tryIso = inputIso.trim().replace(' ', 'T');
      const parsed2 = Date.parse(tryIso);
      if (Number.isFinite(parsed2)) {
        setGameNowMs(parsed2);
        setInputIso('');
        return;
      }
      // fallback parse unsuccessful
      // try naive local interpretation by using Date constructor
      const d = new Date(inputIso);
      if (!Number.isNaN(d.getTime())) {
        setGameNowMs(d.getTime());
        setInputIso('');
        return;
      }
      // if still invalid, set nothing
      // eslint-disable-next-line no-alert
      alert('Could not parse provided datetime. Use ISO or browser-acceptable format.');
      return;
    }
    setGameNowMs(parsed);
    setInputIso('');
  };

  const applyOffsetMinutes = () => {
    const minutes = Number(offsetTxt);
    if (Number.isNaN(minutes)) {
      // eslint-disable-next-line no-alert
      alert('Provide minutes offset as a number (positive or negative)');
      return;
    }
    setGameOffsetMs(minutes * 60 * 1000);
    setOffsetTxt(String(minutes));
  };

  const clearOverride = () => {
    setGameNowMs(null);
    setGameOffsetMs(null);
  };

  const toggleRunning = () => {
    const s = getState();
    if (s.running) stopClock();
    else startClock();
    setState(getState());
  };

  const applySpeed = (mult: number) => {
    setSpeed(mult);
    setState(getState());
  };

  return (
    <div className="fixed bottom-6 left-6 z-50 max-w-xs w-full">
      <div className="bg-slate-800 rounded-lg border border-slate-700 shadow-lg p-3 text-sm">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-slate-300" />
          <div className="text-xs text-slate-400">Game Time</div>
          <div className="ml-auto text-xs text-slate-400">TZ: {GAME_TIMEZONE}</div>
        </div>

        <div className="mb-2">
          <div className="text-white font-medium">{formatBerlin(state.nowUtcMs)}</div>
          <div className="text-slate-400 text-xs">{formatUtc(state.nowUtcMs)}</div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <input
            className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white"
            placeholder="ISO or local datetime"
            value={inputIso}
            onChange={(e) => setInputIso(e.target.value)}
          />
          <button
            onClick={applyAbsolute}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded px-2 py-1 text-xs"
          >
            Set absolute
          </button>

          <input
            className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white"
            placeholder="Offset minutes"
            value={offsetTxt}
            onChange={(e) => setOffsetTxt(e.target.value)}
          />
          <button
            onClick={applyOffsetMinutes}
            className="bg-amber-600 hover:bg-amber-700 text-white rounded px-2 py-1 text-xs"
          >
            Set offset
          </button>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => { advanceGameMs(1000 * 60 * 15); }}
            title="Advance 15 minutes"
            className="bg-slate-700 hover:bg-slate-600 text-slate-200 rounded px-2 py-1 text-xs flex items-center gap-1"
          >
            <FastForward className="w-3 h-3" /> +15m
          </button>

          <button
            onClick={() => { advanceGameMs(1000 * 60 * 60); }}
            title="Advance 1 hour"
            className="bg-slate-700 hover:bg-slate-600 text-slate-200 rounded px-2 py-1 text-xs flex items-center gap-1"
          >
            +1h
          </button>

          <button
            onClick={() => { advanceGameMs(1000 * 60 * 60 * 24); }}
            title="Advance 1 day"
            className="bg-slate-700 hover:bg-slate-600 text-slate-200 rounded px-2 py-1 text-xs flex items-center gap-1"
          >
            +1d
          </button>

          <button
            onClick={clearOverride}
            title="Clear overrides"
            className="ml-auto bg-rose-600 hover:bg-rose-700 text-white rounded px-2 py-1 text-xs flex items-center gap-1"
          >
            <RefreshCcw className="w-3 h-3" /> Clear
          </button>
        </div>

        <div className="flex items-center gap-2 mb-1">
          <button
            onClick={toggleRunning}
            className="bg-slate-700 hover:bg-slate-600 text-slate-200 rounded px-2 py-1 text-xs flex items-center gap-1"
          >
            {state.running ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {state.running ? 'Running' : 'Start'}
          </button>

          <div className="flex items-center gap-1 ml-auto">
            <button onClick={() => applySpeed(1)} className={`px-2 py-1 rounded text-xs ${speedLocal === 1 ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-200'}`}>1x</button>
            <button onClick={() => applySpeed(10)} className={`px-2 py-1 rounded text-xs ${speedLocal === 10 ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-200'}`}>10x</button>
            <button onClick={() => applySpeed(60)} className={`px-2 py-1 rounded text-xs ${speedLocal === 60 ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-200'}`}>60x</button>
          </div>
        </div>

        <div className="text-xs text-slate-400">
          <div>Absolute override: {state.absoluteOverrideMs ? formatBerlin(state.absoluteOverrideMs) : 'none'}</div>
          <div>Offset (ms): {state.offsetMs ?? 'none'}</div>
          <div>Speed: {state.speed}x</div>
        </div>
      </div>
    </div>
  );
};

export default GameTimeController;