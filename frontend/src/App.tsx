import React, { useState, useEffect } from 'react';
import { MainLiveWidget } from './components/MainLiveWidget';
import { TestingLab } from './components/TestingLab';
import { StandaloneWidgetView } from './components/StandaloneWidgetView';
import { FeedbackModal } from './components/FeedbackModal';
import { EvaluationResult } from './types';
import { STATE_CONFIGS } from './simulation/stateMapper';
import { Hourglass, Mic, FlaskConical, HeartHandshake, ShieldCheck, Sparkles, ExternalLink, Terminal } from 'lucide-react';

export const App: React.FC = () => {
  // Check if opened in standalone floating widget mode
  const urlParams = new URLSearchParams(window.location.search);
  const isStandaloneMode = urlParams.get('mode') === 'widget' || urlParams.get('standalone') === 'true';

  if (isStandaloneMode) {
    return <StandaloneWidgetView />;
  }

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
    explanation: 'Ambient pixel hourglass active // Sensing conversation...',
    visual_params: STATE_CONFIGS.insufficient_data,
  });

  const createFreshSession = async (): Promise<string> => {
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input_type: 'live', title: 'Pixel Studio Session' }),
      });
      const data = await res.json();
      setSessionId(data.session_id);
      return data.session_id;
    } catch (err) {
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
    } catch (err) {}

    return () => {
      if (ws) ws.close();
    };
  }, [sessionId]);

  const handlePopOutWidget = () => {
    const w = 220;
    const h = 300;
    const left = window.screen.width - w - 40;
    const top = 60;
    window.open(
      '/?mode=widget',
      'SlughornPixelHUD',
      `width=${w},height=${h},top=${top},left=${left},toolbar=no,menubar=no,status=no,resizable=yes`
    );
  };

  const handleFeedbackSubmitted = (delta: number, calibration: any) => {
    console.log('Feedback calibrated:', delta, calibration);
  };

  return (
    <div className="min-h-screen bg-pixel-void text-pixel-textMain flex flex-col md:flex-row font-mono select-none">
      {/* Retro Pixel-Art Left Sidebar Terminal */}
      <aside className="w-full md:w-64 lg:w-72 pixel-sidebar p-5 flex flex-col justify-between shrink-0 min-h-screen">
        {/* Brand & Terminal Crest Header */}
        <div className="space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b-2 border-pixel-border">
            <div className="w-10 h-10 bg-pixel-slate border-2 border-pixel-gold flex items-center justify-center shadow-pixel-sm">
              <Hourglass className="w-5 h-5 text-pixel-gold" />
            </div>
            <div>
              <h1 className="font-pixel text-xs font-bold text-pixel-textBright tracking-wider">
                SLUGHORN_AI
              </h1>
              <p className="font-pixel text-[9px] text-pixel-emeraldBright tracking-widest mt-0.5">
                v1.0 // PIXEL_LAB
              </p>
            </div>
          </div>

          {/* Vertical Mode Switcher */}
          <nav className="space-y-2 pt-1">
            <button
              onClick={() => setActiveTab('live')}
              className={`w-full py-2.5 px-3 text-[10px] font-pixel flex items-center gap-2.5 transition-all text-left ${
                activeTab === 'live'
                  ? 'pixel-btn-primary shadow-pixel-sm'
                  : 'pixel-btn text-pixel-textMuted hover:text-pixel-textMain'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>01. LIVING_HOURGLASS</span>
            </button>

            <button
              onClick={() => setActiveTab('lab')}
              className={`w-full py-2.5 px-3 text-[10px] font-pixel flex items-center gap-2.5 transition-all text-left ${
                activeTab === 'lab'
                  ? 'pixel-btn-gold text-pixel-void shadow-pixel-sm'
                  : 'pixel-btn text-pixel-textMuted hover:text-pixel-textMain'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>02. TESTING_CONSOLE</span>
            </button>

            {/* Pop Out Floating Mini HUD Action */}
            <button
              onClick={handlePopOutWidget}
              title="Launch floating chrome-free desktop pixel hourglass"
              className="w-full py-2 px-3 text-[10px] font-pixel flex items-center justify-between text-pixel-gold bg-pixel-void border-2 border-pixel-border hover:border-pixel-gold transition-all mt-1"
            >
              <span className="flex items-center gap-2">
                <ExternalLink className="w-3 h-3 text-pixel-gold" />
                <span>POPOUT_MINI_HUD</span>
              </span>
              <span className="text-[8px] px-1 py-0.2 bg-pixel-slate text-pixel-goldBright border border-pixel-border">
                POP
              </span>
            </button>
          </nav>

          {/* Slughorn's Law Retro Lore Box */}
          <div className="p-3 bg-pixel-void border-2 border-pixel-border space-y-1.5">
            <div className="flex items-center gap-1.5 text-pixel-gold text-[10px] font-pixel">
              <Sparkles className="w-3 h-3 text-pixel-gold" />
              <span>SLUGHORN'S_LAW</span>
            </div>
            <p className="text-[11px] text-pixel-textMuted italic leading-relaxed">
              "The sand runs according to the quality of conversation. If it is stimulating, it runs very slowly indeed..."
            </p>
          </div>
        </div>

        {/* Sidebar Footer Controls */}
        <div className="space-y-3 pt-4 border-t-2 border-pixel-border">
          <button
            onClick={() => setIsFeedbackOpen(true)}
            className="pixel-btn w-full py-2.5 text-[10px] font-pixel text-pixel-gold flex items-center justify-center gap-2"
          >
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>[ CALIBRATE_SESSION ]</span>
          </button>

          <div className="flex items-center gap-1.5 text-[9px] text-pixel-textMuted font-mono">
            <Terminal className="w-3 h-3 text-pixel-emeraldBright shrink-0" />
            <span>LOCAL_MEMORY // ZERO_RETENTION</span>
          </div>
        </div>
      </aside>

      {/* Main Content Terminal Pane */}
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
