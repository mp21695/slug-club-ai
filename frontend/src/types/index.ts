export type SimulationState =
  | 'disconnected'
  | 'neutral'
  | 'engaged'
  | 'meaningful'
  | 'deep_moment'
  | 'emotionally_intense'
  | 'low_confidence'
  | 'insufficient_data';

export interface VisualParams {
  color: string;
  sand_speed: number;
  particle_density: number;
  glow_intensity: number;
  pause_probability: number;
  reverse_gravity: boolean;
  ambient_energy: number;
  display_name: string;
}

export interface EvaluationResult {
  engagement: number;
  mutuality: number;
  positivity: number;
  depth: number;
  flow: number;
  overall: number;
  smoothed_overall: number;
  confidence: number;
  state: SimulationState;
  reason_codes: string[];
  explanation: string;
  visual_params: VisualParams;
}

export interface ConversationTurn {
  speaker: string;
  text: string;
  sanitized_text?: string;
  message_index: number;
  timestamp?: string;
}

export interface SessionData {
  id: string;
  title: string;
  input_type: 'text' | 'audio' | 'live';
  started_at?: string;
  state: SimulationState;
  smoothed_score: number;
  confidence: number;
  turns: ConversationTurn[];
  latest_prediction?: EvaluationResult | null;
  feedback?: {
    user_rating: number;
    user_state?: string;
    optional_comment?: string;
  } | null;
}

export interface UserCalibration {
  a: number;
  b: number;
  weights: {
    engagement: number;
    mutuality: number;
    positivity: number;
    depth: number;
    flow: number;
  };
}
