import React, { useEffect, useState } from 'react';
import { UserCalibration, SessionData } from '../types';
import { Sliders, Shield, RefreshCw, Trash2, TrendingUp, Sparkles } from 'lucide-react';

interface CalibrationDashboardProps {
  onSessionSelect?: (sessionId: string) => void;
}

export const CalibrationDashboard: React.FC<CalibrationDashboardProps> = ({ onSessionSelect }) => {
  const [calibration, setCalibration] = useState<UserCalibration | null>(null);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [clearedMsg, setClearedMsg] = useState<string>('');

  const fetchCalibrationAndSessions = async () => {
    setIsLoading(true);
    try {
      const [calRes, sessRes] = await Promise.all([
        fetch('/api/user/calibration'),
        fetch('/api/sessions'),
      ]);
      const calData = await calRes.json();
      const sessData = await sessRes.json();
      setCalibration(calData);
      setSessions(sessData);
    } catch (err) {
      console.error('Failed to load calibration data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCalibrationAndSessions();
  }, []);

  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Purge all stored session data? This respects zero-retention privacy.')) return;
    try {
      for (const s of sessions) {
        await fetch(`/api/sessions/${s.id}`, { method: 'DELETE' });
      }
      setSessions([]);
      setClearedMsg('All local conversation data purged.');
      setTimeout(() => setClearedMsg(''), 3000);
    } catch (err) {
      console.error('Purge failed:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif-magic text-2xl text-white font-bold tracking-wide flex items-center gap-2">
            <Sliders className="w-6 h-6 text-amber-400" />
            Personal Calibration & Privacy
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            View your custom time-slowing curve, dimension weights, and local data controls.
          </p>
        </div>

        <button
          onClick={fetchCalibrationAndSessions}
          disabled={isLoading}
          className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-all border border-white/10"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {clearedMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs text-center">
          {clearedMsg}
        </div>
      )}

      {/* Calibration Formula Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-white/10">
          <div className="flex items-center gap-2 mb-2 text-slate-400 text-xs font-semibold uppercase">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>Calibration Curve</span>
          </div>
          <p className="text-lg font-bold text-white font-mono">
            y = {calibration ? calibration.a.toFixed(2) : '1.00'} · Q + {calibration ? (calibration.b >= 0 ? `+${calibration.b.toFixed(2)}` : calibration.b.toFixed(2)) : '0.00'}
          </p>
          <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
            Adjusts raw model scores based on your accumulated post-session reflection history.
          </p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-white/10 md:col-span-2">
          <div className="flex items-center justify-between mb-3 text-slate-400 text-xs font-semibold uppercase">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Dimension Sensitivity Weights</span>
            </div>
            <span className="text-[10px] text-slate-500">Adaptive Preference Model</span>
          </div>

          <div className="grid grid-cols-5 gap-2 text-center">
            {[
              { key: 'engagement', label: 'Engagement', weight: calibration?.weights.engagement ?? 0.30, color: 'bg-emerald-500' },
              { key: 'mutuality', label: 'Mutuality', weight: calibration?.weights.mutuality ?? 0.25, color: 'bg-teal-500' },
              { key: 'positivity', label: 'Positivity', weight: calibration?.weights.positivity ?? 0.20, color: 'bg-amber-500' },
              { key: 'depth', label: 'Depth', weight: calibration?.weights.depth ?? 0.15, color: 'bg-indigo-500' },
              { key: 'flow', label: 'Flow', weight: calibration?.weights.flow ?? 0.10, color: 'bg-cyan-500' },
            ].map((d) => (
              <div key={d.key} className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 flex flex-col items-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 truncate">{d.label}</span>
                <span className="text-sm font-bold text-white mt-1">{(d.weight * 100).toFixed(0)}%</span>
                <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
                  <div className={`h-full ${d.color}`} style={{ width: `${d.weight * 100 * 2.5}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Session History & Data Retention Table */}
      <div className="glass-panel p-5 rounded-2xl border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Local Session Memory ({sessions.length})
            </h3>
          </div>

          {sessions.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="py-1.5 px-3 rounded-lg text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Purge All Memory</span>
            </button>
          )}
        </div>

        {sessions.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            No local sessions recorded yet. Start an active session or paste a conversation to begin.
          </div>
        ) : (
          <div className="divide-y divide-white/5 max-h-60 overflow-y-auto pr-1">
            {sessions.map((s) => (
              <div
                key={s.id}
                onClick={() => onSessionSelect && onSessionSelect(s.id)}
                className="py-3 px-2 flex items-center justify-between hover:bg-slate-800/40 rounded-xl cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <div>
                    <p className="text-xs font-semibold text-slate-200">{s.title || 'Untitled Session'}</p>
                    <p className="text-[10px] text-slate-400">
                      {s.started_at ? new Date(s.started_at).toLocaleDateString() : 'Recent'} • {s.input_type}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-xs font-bold text-amber-400">
                      {Math.round(s.smoothed_score * 100)}%
                    </span>
                    <span className="text-[10px] text-slate-400 block capitalize">{s.state}</span>
                  </div>

                  <button
                    onClick={(e) => handleDeleteSession(s.id, e)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
