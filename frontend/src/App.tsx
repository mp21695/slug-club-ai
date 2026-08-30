import React, { useState, useEffect } from 'react';
import { MainLiveWidget } from './components/MainLiveWidget';
import { TestingLab } from './components/TestingLab';
import { FeedbackModal } from './components/FeedbackModal';
import { EvaluationResult } from './types';
import { STATE_CONFIGS } from './simulation/stateMapper';
import { Hourglass, Mic, FlaskConical, HeartHandshake, ShieldCheck, Sparkles } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'live' | 'lab'>('live');
  const [sessionId, setSessionId] = useState<string>('');
  const [isFeedbackOpen, setIsFeedbackOpen] = useState<boolean>(false);
  const [currentEvaluation, setCurrentEvaluation] = useState<EvaluationResult | null>({
    engagement: 0.5,
    mutuality: 0.5,
    positivity: 0.5,
    depth: 0.5,
    flow: 0.5,
    overall: 0.5,
    smoothed_overall: 0.5,
    confidence: 0.0,
    state: 'insufficient_data',
    reason_codes: ['insufficient_data'],
    explanation: 'A living digital hourglass that slows down when conversation feels meaningful.',
    visual_params: STATE_CONFIGS.insufficient_data,
  });

  const createFreshSession = async (): Promise<string> => {
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input_type: 'live', title: 'Live Hourglass Session' }),
      });
      const data = await res.json();
      setSessionId(data.session_id);
      return data.session_id;
    } catch (err) {
      console.error('Session creation failed:', err);
      const fallbackId = `session_${Date.now()}`;
      setSessionId(fallbackId);
      return fallbackId;
    }
  };

  useEffect(() => {
    createFreshSession();
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/sessions/${sessionId}`;

    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.evaluation) {
          setCurrentEvaluation(msg.evaluation);
        }
      };
    } catch (err) {
      // WS skipped in offline/test mode
    }

    return () => {
      if (ws) ws.close();
    };
  }, [sessionId]);

  const handleFeedbackSubmitted = (delta: number, calibration: any) => {
    console.log('Personal feedback calibrated:', delta, calibration);
  };

  return (
    <div className="min-h-screen bg-[#040906] text-slytherin-silverLight flex flex-col md:flex-row selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Slytherin Left Sidebar Navigation Pane */}
      <aside className="w-full md:w-64 lg:w-72 glass-sidebar p-6 flex flex-col justify-between shrink-0 min-h-screen">
        {/* Brand & Crest Header */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-900/60 to-teal-800/40 border border-emerald-500/40 flex items-center justify-center shadow-lg shadow-emerald-950/60">
              <Hourglass className="w-6 h-6 text-slytherin-emerald animate-pulse-slow" />
            </div>
            <div>
              <h1 className="font-serif text-base font-bold text-white tracking-wider flex items-center gap-1.5">
                <span>Slughorn’s</span>
              </h1>
              <p className="text-[11px] text-slytherin-emerald font-semibold uppercase tracking-widest font-serif">
                Hourglass AI
              </p>
            </div>
          </div>

          {/* Left Vertical Menu Items */}
          <nav className="space-y-2 pt-2">
            <button
              onClick={() => setActiveTab('live')}
              className={`w-full py-3 px-4 rounded-2xl font-serif text-xs font-semibold flex items-center gap-3 transition-all border ${
                activeTab === 'live'
                  ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50 shadow-lg shadow-emerald-950/50'
                  : 'bg-black/40 text-slytherin-silver border-transparent hover:bg-emerald-950/40 hover:text-white'
              }`}
            >
              <Mic className="w-4 h-4 text-emerald-400" />
              <span>Living Hourglass</span>
            </button>

            <button
              onClick={() => setActiveTab('lab')}
              className={`w-full py-3 px-4 rounded-2xl font-serif text-xs font-semibold flex items-center gap-3 transition-all border ${
                activeTab === 'lab'
                  ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50 shadow-lg shadow-emerald-950/50'
                  : 'bg-black/40 text-slytherin-silver border-transparent hover:bg-emerald-950/40 hover:text-white'
              }`}
            >
              <FlaskConical className="w-4 h-4 text-slytherin-gold" />
              <span>Testing & Chat Lab</span>
            </button>
          </nav>

          {/* House Slytherin / Potion Master Motto */}
          <div className="p-3.5 rounded-2xl bg-black/50 border border-emerald-500/15">
            <div className="flex items-center gap-1.5 text-slytherin-gold text-[11px] font-serif font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Slughorn's Law</span>
            </div>
            <p className="text-[11px] text-slytherin-silver italic leading-relaxed">
              "Time slows down when conversations are truly stimulating and genuine."
            </p>
          </div>
        </div>

        {/* Sidebar Footer Controls */}
        <div className="space-y-3 pt-6 border-t border-emerald-500/15">
          <button
            onClick={() => setIsFeedbackOpen(true)}
            className="w-full py-2.5 px-3 rounded-xl bg-emerald-950/60 text-slytherin-gold border border-slytherin-gold/30 hover:bg-emerald-900/60 text-xs font-serif font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <HeartHandshake className="w-4 h-4" />
            <span>Reflect on Session</span>
          </button>

          <div className="flex items-center gap-1.5 text-[10px] text-slytherin-silver/70">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Zero-retention local processing</span>
          </div>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 p-4 md:p-8 flex flex-col items-center justify-center min-h-screen overflow-y-auto">
        {activeTab === 'live' ? (
          <MainLiveWidget
            currentEvaluation={currentEvaluation}
            onEvaluationChange={(ev) => setCurrentEvaluation(ev)}
            onOpenFeedback={() => setIsFeedbackOpen(true)}
            sessionId={sessionId}
            onResetSession={createFreshSession}
          />
        ) : (
          <TestingLab
            currentEvaluation={currentEvaluation}
            onEvaluationChange={(ev) => setCurrentEvaluation(ev)}
            sessionId={sessionId}
            onOpenFeedback={() => setIsFeedbackOpen(true)}
          />
        )}
      </main>

      {/* Feedback Reflection Modal */}
      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        sessionId={sessionId}
        latestScore={currentEvaluation?.smoothed_overall ?? 0.5}
        onFeedbackSubmitted={handleFeedbackSubmitted}
      />
    </div>
  );
};

export default App;
