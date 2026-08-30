import React, { useState } from 'react';
import { EvaluationResult } from '../types';
import { Sparkles, X, Check, ArrowRight, HeartHandshake, Smile, Meh, Frown, Flame } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  latestScore: number;
  onFeedbackSubmitted: (delta: number, calibration: any) => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  sessionId,
  latestScore,
  onFeedbackSubmitted,
}) => {
  const [rating, setRating] = useState<number>(4.0);
  const [selectedTag, setSelectedTag] = useState<string>('meaningful');
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [resultDelta, setResultDelta] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_rating: rating,
          user_state: selectedTag,
          optional_comment: comment,
        }),
      });
      const data = await res.json();
      setResultDelta(data.prediction_delta);
      onFeedbackSubmitted(data.prediction_delta, data.calibration);
      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
        setResultDelta(null);
      }, 1400);
    } catch (err) {
      console.error('Feedback submit failed:', err);
      setIsSubmitting(false);
    }
  };

  const tags = [
    { id: 'meaningful', label: 'Made time slow down', icon: Sparkles, color: 'text-amber-400 border-amber-500/40 bg-amber-500/10' },
    { id: 'pleasant', label: 'Pleasant & engaging', icon: Smile, color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' },
    { id: 'neutral', label: 'Mostly neutral', icon: Meh, color: 'text-slate-400 border-slate-500/40 bg-slate-500/10' },
    { id: 'draining', label: 'Awkward / Draining', icon: Frown, color: 'text-rose-400 border-rose-500/40 bg-rose-500/10' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="glass-panel w-full max-w-md rounded-3xl p-6 relative border border-white/15 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-serif-magic text-xl text-white font-bold tracking-wide">
              Reflect on This Session
            </h3>
            <p className="text-xs text-slate-400">
              Help your hourglass calibrate to what meaningful connection feels like to you.
            </p>
          </div>
        </div>

        {resultDelta !== null ? (
          <div className="my-6 p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-center animate-bounce-short">
            <Check className="w-8 h-8 text-emerald-400 mx-auto mb-1" />
            <p className="text-sm font-semibold text-emerald-300">Calibration Profile Updated!</p>
            <p className="text-xs text-slate-300 mt-1">
              Feedback delta: {resultDelta >= 0 ? `+${resultDelta.toFixed(2)}` : resultDelta.toFixed(2)}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Predicted vs User Comparison */}
            <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-white/5 flex items-center justify-between">
              <div className="text-left">
                <span className="text-[11px] uppercase font-bold text-slate-400 block">AI Estimate</span>
                <span className="text-lg font-bold text-amber-400">{Math.round(latestScore * 100)}%</span>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-500" />
              <div className="text-right">
                <span className="text-[11px] uppercase font-bold text-slate-400 block">Your Perception</span>
                <span className="text-lg font-bold text-emerald-400">{Math.round((rating / 5) * 100)}%</span>
              </div>
            </div>

            {/* Quick Reflection Tag Picker */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">
                Did this conversation make time slow down?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {tags.map((t) => {
                  const Icon = t.icon;
                  const isSelected = selectedTag === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setSelectedTag(t.id);
                        if (t.id === 'meaningful') setRating(4.8);
                        if (t.id === 'pleasant') setRating(3.8);
                        if (t.id === 'neutral') setRating(2.5);
                        if (t.id === 'draining') setRating(1.0);
                      }}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                        isSelected ? t.color : 'bg-slate-900/40 border-white/5 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="text-xs font-medium leading-tight">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rating Slider (1 to 5) */}
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Rating Scale</span>
                <span className="font-bold text-amber-400">{rating.toFixed(1)} / 5.0</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="5.0"
                step="0.1"
                value={rating}
                onChange={(e) => setRating(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            {/* Optional Reflection Note */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Optional Reflection Note
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What moment stood out most during this exchange?"
                rows={2}
                className="w-full rounded-xl bg-slate-900/80 border border-white/10 p-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400 placeholder:text-slate-500 resize-none"
              />
            </div>

            {/* Submit Action */}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full py-3 rounded-2xl font-bold text-sm bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 hover:opacity-95 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSubmitting ? 'Calibrating...' : 'Save & Calibrate Hourglass'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
