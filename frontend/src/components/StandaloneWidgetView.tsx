import React, { useState, useEffect, useRef } from 'react';
import { HourglassCanvas } from '../simulation/HourglassCanvas';
import { EvaluationResult, SimulationState } from '../types';
import { STATE_CONFIGS } from '../simulation/stateMapper';

interface StandaloneWidgetViewProps {
  initialSessionId?: string;
}

export const StandaloneWidgetView: React.FC<StandaloneWidgetViewProps> = ({ initialSessionId }) => {
  const [sessionId, setSessionId] = useState<string>(initialSessionId || '');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [showContextMenu, setShowContextMenu] = useState<boolean>(false);

  const [currentEvaluation, setCurrentEvaluation] = useState<EvaluationResult | null>({
    engagement: 0.5,
    mutuality: 0.5,
    positivity: 0.5,
    depth: 0.5,
    flow: 0.5,
    overall: 0.5,
    smoothed_overall: 0.5,
    confidence: 0.0,
    state: 'neutral',
    reason_codes: ['neutral'],
    explanation: 'Ambient pixel artifact active',
    visual_params: STATE_CONFIGS.neutral,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recognitionRef = useRef<any>(null);
  const currentSessionIdRef = useRef<string>(sessionId);

  // Enable true native transparent body
  useEffect(() => {
    document.documentElement.classList.add('widget-mode');
    document.body.classList.add('widget-mode');
    return () => {
      document.documentElement.classList.remove('widget-mode');
      document.body.classList.remove('widget-mode');
    };
  }, []);

  useEffect(() => {
    currentSessionIdRef.current = sessionId;
  }, [sessionId]);

  const state: SimulationState = currentEvaluation?.state || 'neutral';
  const visualParams = currentEvaluation?.visual_params || STATE_CONFIGS[state];
  const smoothedScore = currentEvaluation?.smoothed_overall ?? 0.50;

  const createFreshSession = async (): Promise<string> => {
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input_type: 'live', title: 'Desktop Widget Session' }),
      });
      const data = await res.json();
      setSessionId(data.session_id);
      return data.session_id;
    } catch (err) {
      const fallbackId = `pixel_${Date.now()}`;
      setSessionId(fallbackId);
      return fallbackId;
    }
  };

  useEffect(() => {
    if (!sessionId) {
      createFreshSession();
    }
  }, []);

  // WebSocket connection
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

  // Spacebar and Escape keybindings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleToggleListening();
      } else if (e.key === 'Escape') {
        closeWidget();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isListening]);

  const closeWidget = () => {
    if ((window as any).require) {
      try {
        const { ipcRenderer } = (window as any).require('electron');
        ipcRenderer.send('window-close');
        return;
      } catch (e) {}
    }
    window.close();
  };

  const minimizeWidget = () => {
    if ((window as any).require) {
      try {
        const { ipcRenderer } = (window as any).require('electron');
        ipcRenderer.send('window-minimize');
        return;
      } catch (e) {}
    }
  };

  const startListening = async () => {
    try {
      const newSessionId = await createFreshSession();
      currentSessionIdRef.current = newSessionId;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = async (e) => {
        if (e.data.size > 0 && currentSessionIdRef.current) {
          const formData = new FormData();
          formData.append('file', e.data, 'chunk.wav');
          try {
            const res = await fetch(`/api/sessions/${currentSessionIdRef.current}/audio`, {
              method: 'POST',
              body: formData,
            });
            if (res.ok) {
              const evalResult: EvaluationResult = await res.json();
              setCurrentEvaluation(evalResult);
            }
          } catch (err) {}
        }
      };

      recorder.start(3000);

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        let activeSpeaker = 'Speaker_A';

        recognition.onresult = async (event: any) => {
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              const finalText = event.results[i][0].transcript.trim();
              if (finalText && currentSessionIdRef.current) {
                try {
                  const res = await fetch(`/api/sessions/${currentSessionIdRef.current}/text`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ speaker: activeSpeaker, text: finalText }),
                  });
                  if (res.ok) {
                    const evalResult: EvaluationResult = await res.json();
                    setCurrentEvaluation(evalResult);
                  }
                  activeSpeaker = activeSpeaker === 'Speaker_A' ? 'Speaker_B' : 'Speaker_A';
                } catch (err) {}
              }
            }
          }
        };

        recognition.onend = () => {
          if (isListening && recognitionRef.current) {
            try {
              recognition.start();
            } catch (err) {}
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
      }

      setIsListening(true);
    } catch (err) {
      console.warn('Microphone access unavailable or denied');
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsListening(false);
  };

  const handleToggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // CURSOR-OFFSET DRAGGING INTERACTION (Full Screen Reach)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only primary left-click
    setShowContextMenu(false);

    const startScreenX = e.screenX;
    const startScreenY = e.screenY;
    const clientX = e.clientX;
    const clientY = e.clientY;
    let isDragging = false;

    // Send drag start with cursor offset within window
    if ((window as any).require) {
      try {
        const { ipcRenderer } = (window as any).require('electron');
        ipcRenderer.send('window-drag-start', { mouseX: clientX, mouseY: clientY });
      } catch (err) {}
    }

    const onMouseMove = (moveEvent: MouseEvent) => {
      const totalMoved = Math.hypot(moveEvent.screenX - startScreenX, moveEvent.screenY - startScreenY);

      if (totalMoved > 3) {
        isDragging = true;
      }

      if (isDragging && (window as any).require) {
        try {
          const { ipcRenderer } = (window as any).require('electron');
          ipcRenderer.send('window-drag-move');
        } catch (err) {}
      }
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      if ((window as any).require) {
        try {
          const { ipcRenderer } = (window as any).require('electron');
          ipcRenderer.send('window-drag-end');
        } catch (err) {}
      }

      if (!isDragging) {
        // Quick click -> toggle listening
        handleToggleListening();
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowContextMenu((prev) => !prev);
  };

  return (
    <div
      onContextMenu={handleContextMenu}
      className="w-full h-full bg-transparent select-none flex items-center justify-center p-0 m-0 overflow-hidden"
    >
      {/* PURE FLOATING PIXEL HOURGLASS ARTIFACT (FULL-RANGE DRAGGABLE) */}
      <div
        onMouseDown={handleMouseDown}
        title={isListening ? 'Sensing active (Click to pause, Drag to move)' : 'Dormant (Click to sense, Drag to move)'}
        className="cursor-grab active:cursor-grabbing transition-transform duration-100 flex items-center justify-center"
      >
        <HourglassCanvas
          state={state}
          visualParams={visualParams}
          score={smoothedScore}
          width={140}
          height={200}
          interactive={false}
        />
      </div>

      {/* Optional Mini Right-Click Context Menu */}
      {showContextMenu && (
        <div
          className="absolute z-50 bg-[#0E1216] border-2 border-[#2A343C] shadow-pixel-md p-1 font-mono text-[10px] space-y-1"
        >
          <button
            onClick={() => {
              handleToggleListening();
              setShowContextMenu(false);
            }}
            className="w-full text-left px-2 py-1 hover:bg-[#171D22] text-[#E5B869] block"
          >
            {isListening ? '[■] PAUSE_STREAM' : '[■] START_STREAM'}
          </button>
          <button
            onClick={() => {
              minimizeWidget();
              setShowContextMenu(false);
            }}
            className="w-full text-left px-2 py-1 hover:bg-[#171D22] text-[#D0D7DA] block"
          >
            &gt; HIDE_WIDGET
          </button>
          <button
            onClick={() => {
              window.open('/', '_blank');
              setShowContextMenu(false);
            }}
            className="w-full text-left px-2 py-1 hover:bg-[#171D22] text-[#D0D7DA] block"
          >
            &gt; OPEN_STUDIO
          </button>
          <button
            onClick={() => closeWidget()}
            className="w-full text-left px-2 py-1 hover:bg-[#881337] text-[#FFE4E6] block"
          >
            &gt; CLOSE_WIDGET
          </button>
        </div>
      )}
    </div>
  );
};
