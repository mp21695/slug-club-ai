import React, { useState } from 'react';
import { X, Sparkles, Check } from 'lucide-react';

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
  const [rating, setRating] = useState<number>(Math.round(latestScore * 5) || 3);
  const [selectedTag, setSelectedTag] = useState<string>('meaningful');
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedDelta, setSubmittedDelta] = useState<number | null>(null);

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
          optional_comment: comment || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSubmittedDelta(data.prediction_delta);
        onFeedbackSubmitted(data.prediction_delta, data.updated_calibration);
        setTimeout(() => {
          setSubmittedDelta(null);
          onClose();
        }, 1200);
      }
    } catch (err) {
      console.error('Feedback failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const TAGS = [
    { id: 'meaningful', label: 'MEANINGFUL (SLOW)' },
    { id: 'engaged', label: 'ENGAGED / FUN' },
    { id: 'neutral', label: 'STEADY / NEUTRAL' },
    { id: 'disconnected', label: 'DULL / ONE-SIDED' },
    { id: 'intense', label: 'HEATED / FRICTION' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 font-mono select-none">
      <div className="pixel-panel w-full max-w-md p-6 relative animate-fade-in border-4 border-pixel-gold">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-pixel-border">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-pixel-gold" />
            <h3 className="font-pixel text-xs text-pixel-gold tracking-wider">
              SESSION_CALIBRATION
            </h3>
          </div>
          <button
            onClick={onClose}
            className="pixel-btn p-1 text-pixel-textMuted hover:text-pixel-textMain"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submittedDelta !== null ? (
          <div className="py-10 text-center space-y-3">
            <Check className="w-8 h-8 text-pixel-emeraldBright mx-auto animate-bounce" />
            <p className="font-pixel text-xs text-pixel-emeraldBright">
              CALIBRATION_SAVED
            </p>
            <p className="text-xs text-pixel-textMuted font-mono">
              Delta Offset: {submittedDelta > 0 ? `+${submittedDelta.toFixed(3)}` : submittedDelta.toFixed(3)}
            </p>
          </div>
        ) : (
          <div className="space-y-4 pt-4">
            <div>
              <label className="font-pixel text-[10px] text-pixel-textMuted block mb-1">
                RATE CONVERSATION DEPTH (1-5):
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    onClick={() => setRating(val)}
                    className={`py-2 text-xs font-pixel ${
                      rating === val
                        ? 'pixel-btn-gold text-pixel-void shadow-pixel-sm'
                        : 'pixel-btn text-pixel-textMuted'
                    }`}
                  >
                    ★ {val}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="font-pixel text-[10px] text-pixel-textMuted block mb-1">
                TRUE CONVERSATIONAL STATE:
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                {TAGS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTag(t.id)}
                    className={`py-1.5 px-2.5 text-left text-[10px] font-pixel transition-all ${
                      selectedTag === t.id
                        ? 'bg-pixel-void text-pixel-gold border-2 border-pixel-gold'
                        : 'bg-pixel-void text-pixel-textMuted border border-pixel-border hover:text-pixel-textMain'
                    }`}
                  >
                    &gt; {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="font-pixel text-[10px] text-pixel-textMuted block mb-1">
                OPTIONAL NOTES:
              </label>
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Personal notes on how the sand flowed..."
                className="w-full bg-pixel-void border-2 border-pixel-border px-3 py-2 text-xs text-pixel-textMain focus:outline-none focus:border-pixel-gold font-mono"
              />
            </div>

            <div className="flex gap-2 pt-2 border-t-2 border-pixel-border">
              <button
                onClick={onClose}
                className="pixel-btn flex-1 py-2.5 text-[10px] font-pixel"
              >
                CANCEL
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="pixel-btn-primary flex-1 py-2.5 text-[10px] font-pixel"
              >
                {isSubmitting ? 'SAVING...' : 'UPDATE_MODEL'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
