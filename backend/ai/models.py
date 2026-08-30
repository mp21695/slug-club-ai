import math
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
import torch
import torch.nn as nn
from backend.ai.text_features import extract_text_features
from backend.ai.audio_features import extract_audio_features

# Visual state thresholds and palettes
STATE_CONFIGS = {
    "disconnected": {
        "color": "#6B7280",      # Dim grey-green / muted
        "sand_speed": 2.2,
        "particle_density": 0.6,
        "glow_intensity": 0.2,
        "pause_probability": 0.0,
        "reverse_gravity": False,
        "ambient_energy": 0.3,
        "display_name": "Disconnected"
    },
    "neutral": {
        "color": "#86EFAC",      # Pale soft green
        "sand_speed": 1.0,
        "particle_density": 0.8,
        "glow_intensity": 0.4,
        "pause_probability": 0.02,
        "reverse_gravity": False,
        "ambient_energy": 0.5,
        "display_name": "Neutral"
    },
    "engaged": {
        "color": "#10B981",      # Bright emerald green
        "sand_speed": 0.6,
        "particle_density": 1.0,
        "glow_intensity": 0.7,
        "pause_probability": 0.08,
        "reverse_gravity": False,
        "ambient_energy": 0.7,
        "display_name": "Engaged"
    },
    "meaningful": {
        "color": "#F59E0B",      # Warm golden amber
        "sand_speed": 0.25,
        "particle_density": 1.2,
        "glow_intensity": 0.9,
        "pause_probability": 0.25,
        "reverse_gravity": False,
        "ambient_energy": 0.85,
        "display_name": "Meaningful"
    },
    "deep_moment": {
        "color": "#FBBF24",      # Radiant celestial gold & cyan highlight
        "sand_speed": 0.05,
        "particle_density": 1.4,
        "glow_intensity": 1.0,
        "pause_probability": 0.70,
        "reverse_gravity": True,
        "ambient_energy": 1.0,
        "display_name": "Deep Moment"
    },
    "emotionally_intense": {
        "color": "#EF4444",      # Ruby red & violet tint
        "sand_speed": 1.5,
        "particle_density": 1.1,
        "glow_intensity": 0.85,
        "pause_probability": 0.05,
        "reverse_gravity": False,
        "ambient_energy": 0.95,
        "display_name": "Emotionally Intense"
    },
    "low_confidence": {
        "color": "#94A3B8",      # Soft sage mist
        "sand_speed": 1.0,
        "particle_density": 0.75,
        "glow_intensity": 0.35,
        "pause_probability": 0.0,
        "reverse_gravity": False,
        "ambient_energy": 0.4,
        "display_name": "Ambient Resting"
    },
    "insufficient_data": {
        "color": "#94A3B8",
        "sand_speed": 1.0,
        "particle_density": 0.7,
        "glow_intensity": 0.3,
        "pause_probability": 0.0,
        "reverse_gravity": False,
        "ambient_energy": 0.3,
        "display_name": "Awaiting Data"
    }
}

class MultimodalFusionNet(nn.Module):
    def __init__(self, text_dim: int = 18, audio_dim: int = 10, hidden_dim: int = 32):
        super().__init__()
        self.text_encoder = nn.Sequential(
            nn.Linear(text_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.1)
        )
        self.audio_encoder = nn.Sequential(
            nn.Linear(audio_dim, hidden_dim // 2),
            nn.ReLU(),
            nn.Dropout(0.1)
        )
        self.fusion = nn.Sequential(
            nn.Linear(hidden_dim + hidden_dim // 2, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, 6),
            nn.Sigmoid()
        )

    def forward(self, x_text: torch.Tensor, x_audio: torch.Tensor) -> torch.Tensor:
        h_t = self.text_encoder(x_text)
        h_a = self.audio_encoder(x_audio)
        fused = torch.cat([h_t, h_a], dim=-1)
        return self.fusion(fused)

class ConversationEvaluator:
    def __init__(self):
        self.fusion_model = MultimodalFusionNet()
        self.fusion_model.eval()

    def generate_reason_codes(self, scores: Dict[str, float], text_feats: Dict[str, float], audio_feats: Dict[str, float], is_conflict: bool) -> Tuple[List[str], str]:
        codes = []
        descriptions = []
        
        if is_conflict:
            codes.append("emotionally_intense_arousal")
            descriptions.append("high emotional intensity and conversational friction")
            return codes, "The conversation appears emotionally intense."
            
        if scores["mutuality"] >= 0.70:
            codes.append("balanced_turn_taking")
            descriptions.append("balanced, mutual participation")
        elif scores["mutuality"] < 0.35 and text_feats.get("speaker_count", 0) > 1:
            codes.append("asymmetric_contributions")
            descriptions.append("one-sided flow")
            
        if text_feats.get("follow_up_ratio", 0) > 0.2:
            codes.append("curious_follow_up_questions")
            descriptions.append("attentive follow-up questions")
        elif scores["engagement"] >= 0.70:
            codes.append("high_engagement")
            descriptions.append("active, engaged responses")
            
        if scores["positivity"] >= 0.75:
            codes.append("warm_positive_tone")
            descriptions.append("warm and supportive emotional tone")
            
        if scores["depth"] >= 0.65:
            codes.append("reflective_depth")
            descriptions.append("reflective and meaningful exploration")
            
        if scores["flow"] >= 0.70:
            codes.append("seamless_conversational_flow")
            descriptions.append("continuous conversational rhythm")
            
        if not descriptions:
            descriptions.append("steady conversational presence")
            codes.append("steady_dialogue")
            
        explanation = f"The interaction appears with {descriptions[0]}." if len(descriptions) == 1 else f"The interaction appears with {descriptions[0]} and {descriptions[1]}."
        return codes, explanation

    def compute_rule_based_scores(self, text_feats: Dict[str, float], audio_feats: Dict[str, float], single_speaker: bool) -> Dict[str, float]:
        # 1. Engagement (E)
        e_text = 0.30 * text_feats["length_quality"] + 0.25 * text_feats["question_density"] + 0.25 * text_feats["follow_up_ratio"] + 0.20 * text_feats["backchannel_density"]
        e_text = min(1.0, max(0.1, e_text * 1.5))
        e_audio = 0.5 * audio_feats["arousal"] + 0.5 * audio_feats["speech_rate"]
        engagement = min(1.0, max(0.0, 0.7 * e_text + 0.3 * e_audio if audio_feats["duration_sec"] > 0 else e_text))
        
        # 2. Mutuality (M)
        if single_speaker:
            mutuality = 0.50
        else:
            mutuality = min(1.0, max(0.0, 0.55 * text_feats["turn_balance"] + 0.45 * text_feats["word_balance"]))
            
        # 3. Positivity (P) - Dynamic blend of global (35%) and recency-weighted valence (65%)
        global_p = text_feats["valence_score"]
        recent_p = text_feats["recent_valence"]
        combined_val = 0.35 * global_p + 0.65 * recent_p
        
        p_text = 0.70 * combined_val + 0.30 * min(1.0, text_feats["positivity_ratio"] * 10.0)
        p_audio = audio_feats["valence_acoustic"]
        positivity = min(1.0, max(0.0, 0.65 * p_text + 0.35 * p_audio if audio_feats["duration_sec"] > 0 else p_text))
        
        # 4. Depth (D)
        depth = min(1.0, max(0.0, text_feats["depth_score"] * 1.6))
        
        # 5. Flow (F)
        f_text = min(1.0, text_feats["flow_score"] * 1.15)
        f_audio = 1.0 - audio_feats["pause_ratio"] if audio_feats["duration_sec"] > 0 else 0.5
        flow = min(1.0, max(0.0, 0.7 * f_text + 0.3 * f_audio if audio_feats["duration_sec"] > 0 else f_text))
        
        return {
            "engagement": float(engagement),
            "mutuality": float(mutuality),
            "positivity": float(positivity),
            "depth": float(depth),
            "flow": float(flow)
        }

    def evaluate(
        self,
        turns: List[Dict[str, Any]],
        audio_bytes: Optional[bytes] = None,
        model_tier: str = "v1",
        weight_overrides: Optional[Dict[str, float]] = None,
        prev_smoothed_score: float = 0.50
    ) -> Dict[str, Any]:
        text_feats = extract_text_features(turns)
        audio_feats = extract_audio_features(audio_bytes=audio_bytes)
        
        turn_count = len(turns)
        audio_dur = audio_feats["duration_sec"]
        num_speakers = text_feats["speaker_count"]
        single_speaker = (num_speakers <= 1)
        
        # Cold Start Guardrail
        if turn_count < 3 and audio_dur < 10.0:
            return {
                "engagement": 0.5,
                "mutuality": 0.5,
                "positivity": 0.5,
                "depth": 0.5,
                "flow": 0.5,
                "overall": 0.5,
                "smoothed_overall": prev_smoothed_score,
                "confidence": 0.0,
                "state": "insufficient_data",
                "reason_codes": ["insufficient_data"],
                "explanation": "Awaiting conversation turns to gauge the atmosphere...",
                "visual_params": STATE_CONFIGS["insufficient_data"]
            }
            
        is_poor_snr = (audio_dur >= 1.0 and audio_feats["snr_db"] < 8.0)
        scores = self.compute_rule_based_scores(text_feats, audio_feats, single_speaker)
        
        if single_speaker:
            weights = weight_overrides or {"engagement": 0.40, "mutuality": 0.0, "positivity": 0.30, "depth": 0.20, "flow": 0.10}
        else:
            weights = weight_overrides or {"engagement": 0.30, "mutuality": 0.25, "positivity": 0.20, "depth": 0.15, "flow": 0.10}
            
        w_sum = sum(weights.values())
        raw_overall = sum(scores[k] * (weights[k] / max(1e-5, w_sum)) for k in ["engagement", "mutuality", "positivity", "depth", "flow"])
        raw_overall = min(1.0, max(0.0, raw_overall))
        
        # Confidence
        base_confidence = min(0.95, 0.55 + 0.06 * (turn_count - 2) + (0.1 if audio_dur > 15 else 0.0))
        if single_speaker:
            base_confidence *= 0.80
        if is_poor_snr:
            base_confidence *= 0.60
        confidence = float(max(0.1, min(0.95, base_confidence)))
        
        # Low Confidence Fallback
        if confidence < 0.40:
            state = "low_confidence"
            explanation = "Model is uncertain; maintaining a steady neutral flow."
            reason_codes = ["low_confidence_fallback"]
            smoothed_overall = 0.8 * prev_smoothed_score + 0.2 * 0.50
            return {
                **scores,
                "overall": float(raw_overall),
                "smoothed_overall": float(smoothed_overall),
                "confidence": float(confidence),
                "state": state,
                "reason_codes": reason_codes,
                "explanation": explanation,
                "visual_params": STATE_CONFIGS[state]
            }
            
        # Responsive Smoothing: When a sharp shift occurs (e.g. conflict), respond faster (0.5 weight instead of 0.2)
        recent_conflict = text_feats.get("recent_conflict_score", 0.0)
        recent_val = text_feats.get("recent_valence", 0.5)
        
        is_conflict = (recent_conflict >= 1.2 and recent_val < 0.38) or (audio_feats["arousal"] > 0.75 and recent_val < 0.32)
        
        smoothing_factor = 0.45 if is_conflict or abs(raw_overall - prev_smoothed_score) > 0.30 else 0.20
        smoothed_overall = float((1.0 - smoothing_factor) * prev_smoothed_score + smoothing_factor * raw_overall)
        
        # State Decision Logic
        if is_conflict:
            state = "emotionally_intense"
        elif (smoothed_overall > 0.80 or raw_overall > 0.82) and confidence >= 0.55:
            state = "deep_moment" if smoothed_overall > 0.85 else "meaningful"
        elif smoothed_overall > 0.70 or raw_overall > 0.72:
            state = "meaningful"
        elif smoothed_overall > 0.52:
            state = "engaged"
        elif smoothed_overall > 0.32:
            state = "neutral"
        else:
            state = "disconnected"
            
        reason_codes, explanation = self.generate_reason_codes(scores, text_feats, audio_feats, is_conflict)
        
        return {
            "engagement": round(scores["engagement"], 3),
            "mutuality": round(scores["mutuality"], 3),
            "positivity": round(scores["positivity"], 3),
            "depth": round(scores["depth"], 3),
            "flow": round(scores["flow"], 3),
            "overall": round(raw_overall, 3),
            "smoothed_overall": round(smoothed_overall, 3),
            "confidence": round(confidence, 3),
            "state": state,
            "reason_codes": reason_codes,
            "explanation": explanation,
            "visual_params": STATE_CONFIGS[state]
        }
