import pytest
from backend.ai.privacy import sanitize_text, parse_conversation_transcript
from backend.ai.text_features import extract_text_features
from backend.ai.audio_features import extract_audio_features
from backend.ai.models import ConversationEvaluator
from backend.ai.calibration import PersonalCalibrationEngine
import numpy as np

def test_privacy_sanitizer():
    raw = "Hey reach me at alice@example.com or call 555-123-4567 or visit https://secret.ai @alice"
    clean = sanitize_text(raw)
    assert "[EMAIL]" in clean
    assert "[PHONE]" in clean
    assert "[LINK]" in clean
    assert "[USER]" in clean
    assert "alice@example.com" not in clean

def test_transcript_parser():
    transcript = """Alice: I finished the model architecture today!
Bob: That is fantastic! Did you test it on edge devices?
Alice: Yes, it reached 18 FPS with 80% accuracy.
Bob: Wow, that's really impressive work!"""
    turns = parse_conversation_transcript(transcript)
    assert len(turns) == 4
    assert turns[0]["speaker"] == "Speaker_A"
    assert turns[1]["speaker"] == "Speaker_B"
    assert "FPS" in turns[2]["text"]

def test_text_feature_extraction():
    turns = [
        {"speaker": "A", "text": "I feel like I've been struggling to find deep focus lately.", "sanitized_text": "I feel like I've been struggling to find deep focus lately."},
        {"speaker": "B", "text": "I completely understand that. What do you think is triggering the distraction?", "sanitized_text": "I completely understand that. What do you think is triggering the distraction?"},
        {"speaker": "A", "text": "In my experience, too much context switching between meetings and coding.", "sanitized_text": "In my experience, too much context switching between meetings and coding."},
        {"speaker": "B", "text": "That makes so much sense. How can we protect your afternoon blocks?", "sanitized_text": "That makes so much sense. How can we protect your afternoon blocks?"}
    ]
    feats = extract_text_features(turns)
    assert feats["turn_count"] == 4
    assert feats["speaker_count"] == 2
    assert feats["turn_balance"] > 0.8
    assert feats["question_density"] > 0.3
    assert feats["depth_score"] > 0.3
    assert feats["flow_score"] > 0.4

def test_cold_start_fallback():
    evaluator = ConversationEvaluator()
    short_turns = [{"speaker": "A", "text": "Hi"}]
    res = evaluator.evaluate(short_turns)
    assert res["state"] == "insufficient_data"
    assert res["confidence"] == 0.0

def test_deep_moment_scoring():
    evaluator = ConversationEvaluator()
    deep_turns = [
        {"speaker": "A", "text": "I've been reflecting on what truly makes our work feel meaningful."},
        {"speaker": "B", "text": "I love that question. In your experience, when do you feel most aligned?"},
        {"speaker": "A", "text": "When we build things that help people connect deeply and feel understood."},
        {"speaker": "B", "text": "That resonates completely with my own values. How can we weave more of that in?"},
        {"speaker": "A", "text": "By prioritizing presence and empathy over rush and superficial metrics."}
    ]
    res = evaluator.evaluate(deep_turns, prev_smoothed_score=0.85)
    assert res["overall"] > 0.65
    assert res["state"] in ["meaningful", "deep_moment", "engaged"]
    assert res["confidence"] > 0.50

def test_personal_calibration_engine():
    engine = PersonalCalibrationEngine()
    pairs = [
        {"predicted_score": 0.50, "user_score": 0.70},
        {"predicted_score": 0.60, "user_score": 0.80},
        {"predicted_score": 0.70, "user_score": 0.90},
        {"predicted_score": 0.40, "user_score": 0.60}
    ]
    a, b, weights = engine.update_from_feedback_history(pairs)
    calibrated = engine.calibrate_score(0.50)
    assert calibrated > 0.55
