import React, { useState } from 'react';
import { HourglassCanvas } from '../simulation/HourglassCanvas';
import { EvaluationResult, SimulationState } from '../types';
import { STATE_CONFIGS } from '../simulation/stateMapper';
import { Mic, MicOff, Play, Pause, Square, Sparkles, MessageSquare, Maximize2, ShieldCheck, HeartHandshake } from 'lucide-react';

interface FloatingWidgetProps {
  currentEvaluation?: EvaluationResult | null;
  isRecording?: boolean;
  isActiveSession?: boolean;
  onToggleRecord?: () => void;
  onToggleSession?: () => void;
  onStopSession?: () => void;
  onOpenStudio?: () => void;
  onOpenFeedback?: () => void;
}

export const FloatingWidget: React.FC<FloatingWidgetProps> = ({
  currentEvaluation,
  isRecording = false,
  isActiveSession = false,
  onToggleRecord,
  onToggleSession,
  onStopSession,
  onOpenStudio,
  onOpenFeedback,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const state: SimulationState = currentEvaluation?.state || 'neutral';
  const visualParams = currentEvaluation?.visual_params || STATE_CONFIGS[state];
  const smoothedScore = currentEvaluation?.smoothed_overall ?? 0.50;
  const confidence = currentEvaluation?.confidence ?? 0.50;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ '--glow-color': visualParams.color } as React.CSSProperties}
      className="glass-widget rounded-3xl p-5 w-80 flex flex-col items-center relative transition-all duration-500 shadow-2xl border border-white/10 hover:border-white/20"
    >
      {/* Top Header Controls */}
      <div className="w-full flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full animate-pulse"
            style={{ backgroundColor: visualParams.color }}
          />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            {visualParams.display_name}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenStudio}
            title="Expand to Full Studio"
            className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Animated Hourglass Canvas */}
      <div className="my-1 py-1 flex items-center justify-center">
        <HourglassCanvas
          state={state}
          visualParams={visualParams}
          score={smoothedScore}
          width={200}
          height={290}
        />
      </div>

      {/* Atmospheric Reason / Status Summary */}
      <div className="w-full text-center mt-2 px-2 min-h-[38px] flex items-center justify-center">
        <p className="text-xs text-slate-300/90 italic line-clamp-2 leading-relaxed">
          {currentEvaluation?.explanation || "A living digital hourglass sensing conversational connection."}
        </p>
      </div>

      {/* Metrics Row: Connection Score & Confidence */}
      <div className="w-full grid grid-cols-2 gap-2 my-3 p-2 rounded-xl bg-slate-900/60 border border-white/5">
        <div className="flex flex-col items-center justify-center border-r border-white/5">
          <span className="text-[10px] uppercase font-bold text-slate-400">Time Slowing</span>
          <span className="text-base font-bold" style={{ color: visualParams.color }}>
            {Math.round(smoothedScore * 100)}%
          </span>
        </div>
        <div className="flex flex-col items-center justify-center">
          <span className="text-[10px] uppercase font-bold text-slate-400">Confidence</span>
          <span className="text-base font-bold text-slate-200">
            {confidence === 0 ? '—' : `${Math.round(confidence * 100)}%`}
          </span>
        </div>
      </div>

      {/* Quick Action Controls */}
      <div className="w-full flex items-center justify-between gap-2 pt-1 border-t border-white/5">
        <button
          onClick={onToggleSession}
          className={`flex-1 py-2 px-3 rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 transition-all shadow-md ${
            isActiveSession
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30'
              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
          }`}
        >
          {isActiveSession ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span>{isActiveSession ? 'Pause' : 'Start'}</span>
        </button>

        {onToggleRecord && (
          <button
            onClick={onToggleRecord}
            title={isRecording ? "Stop Live Mic" : "Start Live Voice"}
            className={`p-2 rounded-xl border transition-all ${
              isRecording
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
                : 'bg-slate-800/80 text-slate-300 border-white/10 hover:bg-slate-700'
            }`}
          >
            {isRecording ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>
        )}

        {onOpenFeedback && (
          <button
            onClick={onOpenFeedback}
            title="Reflect & Calibrate"
            className="p-2 rounded-xl bg-slate-800/80 text-amber-400 border border-white/10 hover:bg-slate-700 transition-colors"
          >
            <HeartHandshake className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Privacy Guarantee Pill */}
      <div className="mt-3 flex items-center gap-1 text-[10px] text-slate-400/80">
        <ShieldCheck className="w-3 h-3 text-emerald-400" />
        <span>Zero-retention local processing</span>
      </div>
    </div>
  );
};
