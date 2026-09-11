import React, { useState } from 'react';
import { HourglassCanvas } from '../simulation/HourglassCanvas';
import { EvaluationResult, ConversationTurn, SimulationState } from '../types';
import { STATE_CONFIGS } from '../simulation/stateMapper';
import {
  Send,
  Sparkles,
  FileText,
  MessageSquare,
  RotateCcw,
  ChevronRight,
  UploadCloud,
  Terminal
} from 'lucide-react';

interface TestingLabProps {
  currentEvaluation: EvaluationResult | null;
  onEvaluationChange: (evalResult: EvaluationResult) => void;
  sessionId: string;
  onOpenFeedback: () => void;
}

const PRESET_SCENARIOS: Record<string, { title: string; desc: string; turns: { speaker: string; text: string }[] }> = {
  deep_connection: {
    title: 'CARTRIDGE: MEANINGFUL_DEPTH',
    desc: 'Personal disclosure, reflective listening',
    turns: [
      { speaker: 'Speaker_A', text: "I've been reflecting on what truly makes our work feel meaningful." },
      { speaker: 'Speaker_B', text: "I love that question. In your experience, when do you feel most aligned?" },
      { speaker: 'Speaker_A', text: "When we build things that help people connect deeply and feel understood." },
      { speaker: 'Speaker_B', text: "That resonates completely with my own values. How can we weave more of that in?" },
      { speaker: 'Speaker_A', text: "By prioritizing presence and empathy over rush and superficial metrics." }
    ]
  },
  heated_conflict: {
    title: 'CARTRIDGE: HEATED_CONFLICT',
    desc: 'Tension, accusations, frustration',
    turns: [
      { speaker: 'Speaker_A', text: "You completely ruined the project and I hate dealing with this!" },
      { speaker: 'Speaker_B', text: "Stop shouting at me! You didn't give me any clear instructions!" },
      { speaker: 'Speaker_A', text: "I sent three emails! This is so frustrating and unprofessional!" },
      { speaker: 'Speaker_B', text: "I hate your constant blame games! Figure it out yourself!" }
    ]
  },
  apology_reconcile: {
    title: 'CARTRIDGE: APOLOGY_REPAIR',
    desc: 'De-escalation and reconciliation',
    turns: [
      { speaker: 'Speaker_B', text: "I am really sorry, please forgive me, let us calm down." },
      { speaker: 'Speaker_A', text: "Thank you, I appreciate you apologizing. Let's work on this together." }
    ]
  },
  playful_banter: {
    title: 'CARTRIDGE: PLAYFUL_BANTER',
    desc: 'Humor, jokes, positive excitement',
    turns: [
      { speaker: 'Speaker_A', text: "I spent 45 minutes debugging only to realize I commented out main haha!" },
      { speaker: 'Speaker_B', text: "Peak developer moment! Please tell me you didn't restart the PC first lol." },
      { speaker: 'Speaker_A', text: "I restarted twice and reinstalled node_modules haha!" },
      { speaker: 'Speaker_B', text: "Coffee is on me today, you earned the Senior Debugger award!" }
    ]
  },
  one_sided: {
    title: 'CARTRIDGE: ONE_SIDED_DULL',
    desc: 'Monologue and flat one-word replies',
    turns: [
      { speaker: 'Speaker_A', text: "So then I told him that the design system needs a revamp, and then I bought three monitors, and then my cat jumped on the desk..." },
      { speaker: 'Speaker_B', text: "Oh." },
      { speaker: 'Speaker_A', text: "And then I reorganized my bookshelves by color for four hours!" },
      { speaker: 'Speaker_B', text: "Cool." }
    ]
  }
};

export const TestingLab: React.FC<TestingLabProps> = ({
  currentEvaluation,
  onEvaluationChange,
  sessionId,
  onOpenFeedback,
}) => {
  const [tab, setTab] = useState<'type' | 'presets' | 'paste'>('type');
  const [inputText, setInputText] = useState<string>('');
  const [speaker, setSpeaker] = useState<string>('Speaker_A');
  const [pasteText, setPasteText] = useState<string>('');
  const [turns, setTurns] = useState<ConversationTurn[]>([]);

  const handleSendTurn = async (textToSend?: string, spk?: string) => {
    const text = textToSend || inputText;
    const currentSpk = spk || speaker;
    if (!text.trim() || !sessionId) return;

    try {
      const res = await fetch(`/api/sessions/${sessionId}/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speaker: currentSpk, text }),
      });
      if (res.ok) {
        const data: EvaluationResult = await res.json();
        onEvaluationChange(data);
        setTurns((prev) => [...prev, { speaker: currentSpk, text, message_index: prev.length }]);
        setInputText('');
        setSpeaker(currentSpk === 'Speaker_A' ? 'Speaker_B' : 'Speaker_A');
      }
    } catch (err) {
      console.error('Turn send failed:', err);
    }
  };

  const handleApplyPreset = async (key: string) => {
    const preset = PRESET_SCENARIOS[key];
    if (!preset) return;

    for (const t of preset.turns) {
      await handleSendTurn(t.text, t.speaker);
    }
  };

  const handlePasteAnalyze = async () => {
    if (!pasteText.trim() || !sessionId) return;
    try {
      const res = await fetch(`/api/sessions/${sessionId}/transcript`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_transcript: pasteText }),
      });
      if (res.ok) {
        const data = await res.json();
        onEvaluationChange(data.evaluation);
      }
    } catch (err) {
      console.error('Paste analyze failed:', err);
    }
  };

  const handleReset = () => {
    setTurns([]);
    onEvaluationChange({
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
      explanation: 'Awaiting dialogue signals to illuminate the hourglass...',
      visual_params: STATE_CONFIGS.insufficient_data,
    });
  };

  const renderPixelMeter = (val: number, maxBlocks: number = 10) => {
    const filled = Math.round(val * maxBlocks);
    return '■'.repeat(filled) + '□'.repeat(maxBlocks - filled);
  };

  const state: SimulationState = currentEvaluation?.state || 'neutral';
  const visualParams = currentEvaluation?.visual_params || STATE_CONFIGS[state];
  const smoothedScore = currentEvaluation?.smoothed_overall ?? 0.5;

  return (
    <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 items-start font-mono animate-fade-in py-1">
      {/* Left Column: Input Test Console (7 Cols) */}
      <div className="lg:col-span-7 space-y-4">
        {/* Pixel Tab Switcher */}
        <div className="flex items-center gap-2 p-1.5 bg-pixel-charcoal border-2 border-pixel-border">
          {[
            { id: 'type', label: '01. TYPE TURNS', icon: MessageSquare },
            { id: 'presets', label: '02. PRESETS', icon: Sparkles },
            { id: 'paste', label: '03. PASTE TEXT', icon: FileText },
          ].map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id as any)}
                className={`flex-1 py-2 px-2 text-[10px] font-pixel transition-all ${
                  active
                    ? 'pixel-btn-gold text-pixel-void shadow-pixel-sm'
                    : 'pixel-btn text-pixel-textMuted hover:text-pixel-textMain'
                }`}
              >
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Type Turn-by-Turn */}
        {tab === 'type' && (
          <div className="pixel-panel p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b-2 border-pixel-border">
              <div>
                <h3 className="font-pixel text-xs text-pixel-gold tracking-wider">
                  DIALOGUE_SIMULATOR
                </h3>
                <p className="text-[11px] text-pixel-textMuted mt-0.5">Input turns to observe dynamic state transitions.</p>
              </div>

              <button
                onClick={handleReset}
                className="pixel-btn px-2.5 py-1 text-[10px] font-pixel text-pixel-ruby flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>CLEAR</span>
              </button>
            </div>

            {/* Message Stream */}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {turns.length === 0 ? (
                <div className="text-center py-12 text-pixel-textMuted text-xs italic bg-pixel-void border border-pixel-border">
                  &gt; Terminal idle. Enter dialogue turn below or load a preset.
                </div>
              ) : (
                turns.map((t, i) => {
                  const isA = t.speaker === 'Speaker_A';
                  return (
                    <div
                      key={i}
                      className={`p-3 text-xs border-2 shadow-pixel-sm ${
                        isA
                          ? 'bg-pixel-void border-pixel-emerald text-pixel-emeraldBright'
                          : 'bg-pixel-slate border-pixel-border text-pixel-textMain'
                      }`}
                    >
                      <span className="font-pixel text-[9px] block mb-1 opacity-75">
                        {isA ? '[ SPEAKER_A ]' : '[ SPEAKER_B ]'}
                      </span>
                      <p className="font-mono leading-relaxed">{t.text}</p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input Bar */}
            <div className="flex items-center gap-2 pt-2 border-t-2 border-pixel-border">
              <button
                onClick={() => setSpeaker((p) => (p === 'Speaker_A' ? 'Speaker_B' : 'Speaker_A'))}
                className="pixel-btn px-3 py-2 text-[10px] font-pixel text-pixel-gold"
              >
                {speaker === 'Speaker_A' ? 'SPK_A' : 'SPK_B'}
              </button>
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendTurn()}
                placeholder="Type next conversation turn..."
                className="flex-1 bg-pixel-void border-2 border-pixel-border px-3 py-2 text-xs text-pixel-textMain focus:outline-none focus:border-pixel-gold font-mono"
              />
              <button
                onClick={() => handleSendTurn()}
                className="pixel-btn-primary p-2.5"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Preset Cartridges */}
        {tab === 'presets' && (
          <div className="pixel-panel p-5 space-y-3">
            <h3 className="font-pixel text-xs text-pixel-gold tracking-wider">
              SCENARIO_CARTRIDGES
            </h3>
            <p className="text-[11px] text-pixel-textMuted">Inject simulated test dialogues directly into the AI pipeline.</p>

            <div className="grid grid-cols-1 gap-2.5 pt-1">
              {Object.entries(PRESET_SCENARIOS).map(([k, p]) => (
                <button
                  key={k}
                  onClick={() => handleApplyPreset(k)}
                  className="p-3 bg-pixel-void border-2 border-pixel-border hover:border-pixel-gold text-left transition-all group flex items-center justify-between"
                >
                  <div>
                    <span className="font-pixel text-xs text-pixel-textBright group-hover:text-pixel-gold">{p.title}</span>
                    <p className="text-[11px] text-pixel-textMuted mt-1">{p.desc}</p>
                  </div>
                  <span className="font-pixel text-[10px] text-pixel-gold opacity-80 group-hover:opacity-100">&gt; RUN</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Paste Transcript */}
        {tab === 'paste' && (
          <div className="pixel-panel p-5 space-y-3">
            <h3 className="font-pixel text-xs text-pixel-gold tracking-wider">
              RAW_TRANSCRIPT_PARSER
            </h3>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={`Alex: I'm really excited about our progress today!\nSam: That's wonderful! What part did you finish?\nAlex: The multimodal AI hourglass simulation.`}
              rows={6}
              className="w-full bg-pixel-void border-2 border-pixel-border p-3 text-xs text-pixel-textMain focus:outline-none focus:border-pixel-gold font-mono leading-relaxed"
            />
            <button
              onClick={handlePasteAnalyze}
              className="pixel-btn-primary w-full py-2.5 text-xs font-pixel flex items-center justify-center gap-2"
            >
              <UploadCloud className="w-4 h-4" />
              <span>PARSE &amp; ANALYZE TRANSCRIPT</span>
            </button>
          </div>
        )}
      </div>

      {/* Right Column: Pixel Hourglass & Segmented 5-Head Gauges (5 Cols) */}
      <div className="lg:col-span-5 space-y-4">
        {/* Hourglass Reaction Display */}
        <div className="pixel-panel p-4 flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-2 pb-2 border-b-2 border-pixel-border">
            <span className="font-pixel text-[10px] text-pixel-textMuted">AI_REACTION</span>
            <span
              className="font-pixel text-[10px] px-2 py-0.5 bg-pixel-void border border-pixel-border"
              style={{ color: visualParams.color }}
            >
              {visualParams.display_name}
            </span>
          </div>

          <div className="my-1">
            <HourglassCanvas
              state={state}
              visualParams={visualParams}
              score={smoothedScore}
              width={160}
              height={230}
              interactive={false}
            />
          </div>

          <p className="text-[11px] text-pixel-textMain italic text-center min-h-[34px] flex items-center justify-center px-2 border-t-2 border-pixel-border pt-2">
            "{currentEvaluation?.explanation || 'Awaiting dialogue signals...'}"
          </p>
        </div>

        {/* 5 Quality Dimension Segmented Meters */}
        <div className="pixel-panel p-4 space-y-2.5">
          <div className="flex items-center justify-between pb-1.5 border-b-2 border-pixel-border">
            <span className="font-pixel text-[10px] text-pixel-gold">QUALITY_HEADS</span>
            <button onClick={onOpenFeedback} className="font-pixel text-[9px] text-pixel-textMuted hover:text-pixel-gold">
              [CALIBRATE]
            </button>
          </div>

          {[
            { label: 'ENGAGEMENT', val: currentEvaluation?.engagement ?? 0.5, color: 'text-pixel-emeraldBright' },
            { label: 'MUTUALITY', val: currentEvaluation?.mutuality ?? 0.5, color: 'text-pixel-emerald' },
            { label: 'POSITIVITY', val: currentEvaluation?.positivity ?? 0.5, color: 'text-pixel-gold' },
            { label: 'DEPTH', val: currentEvaluation?.depth ?? 0.5, color: 'text-pixel-amber' },
            { label: 'FLOW', val: currentEvaluation?.flow ?? 0.5, color: 'text-pixel-silver' },
          ].map((h) => (
            <div key={h.label} className="space-y-0.5">
              <div className="flex justify-between text-[10px]">
                <span className="text-pixel-textMuted font-pixel text-[9px]">{h.label}</span>
                <span className={`font-mono font-bold ${h.color}`}>{Math.round(h.val * 100)}%</span>
              </div>
              <div className="text-[11px] font-mono tracking-wider text-pixel-textMuted">
                <span className={h.color}>[ {renderPixelMeter(h.val, 16)} ]</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
