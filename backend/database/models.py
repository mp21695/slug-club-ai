from datetime import datetime
from typing import Optional, List
import uuid
from sqlalchemy import (
    Column,
    String,
    Float,
    Integer,
    DateTime,
    Boolean,
    ForeignKey,
    Text,
    JSON,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

def generate_uuid() -> str:
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    username = Column(String(100), default="default_user")
    privacy_mode = Column(Boolean, default=True)  # Zero retention of raw audio
    calibration_a = Column(Float, default=1.0)     # personal_score = a * model_score + b
    calibration_b = Column(Float, default=0.0)
    weight_overrides = Column(JSON, nullable=True) # e.g. {"engagement": 0.30, ...}
    created_at = Column(DateTime, default=datetime.utcnow)

    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")

class Session(Base):
    __tablename__ = "sessions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    input_type = Column(String(20), default="text")  # 'text', 'audio', 'live'
    title = Column(String(255), default="Ambient Hourglass Session")
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    state = Column(String(50), default="neutral")
    latest_score = Column(Float, default=0.50)
    smoothed_score = Column(Float, default=0.50)
    confidence = Column(Float, default=0.50)

    user = relationship("User", back_populates="sessions")
    turns = relationship("ConversationTurn", back_populates="session", cascade="all, delete-orphan", order_by="ConversationTurn.message_index")
    predictions = relationship("Prediction", back_populates="session", cascade="all, delete-orphan", order_by="Prediction.created_at")
    feedback = relationship("Feedback", back_populates="session", uselist=False, cascade="all, delete-orphan")

class ConversationTurn(Base):
    __tablename__ = "conversation_turns"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("sessions.id"), nullable=False)
    speaker_id = Column(String(50), default="A")
    text = Column(Text, nullable=False)
    sanitized_text = Column(Text, nullable=True)
    message_index = Column(Integer, default=0)
    audio_duration_sec = Column(Float, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    features = Column(JSON, nullable=True)

    session = relationship("Session", back_populates="turns")

class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("sessions.id"), nullable=False)
    turn_id = Column(String(36), ForeignKey("conversation_turns.id"), nullable=True)
    
    engagement = Column(Float, default=0.5)
    mutuality = Column(Float, default=0.5)
    positivity = Column(Float, default=0.5)
    depth = Column(Float, default=0.5)
    flow = Column(Float, default=0.5)
    
    overall = Column(Float, default=0.5)
    smoothed_overall = Column(Float, default=0.5)
    confidence = Column(Float, default=0.5)
    state = Column(String(50), default="neutral") # disconnected, neutral, engaged, meaningful, deep_moment, emotionally_intense, low_confidence
    
    reason_codes = Column(JSON, default=list)
    explanation = Column(Text, nullable=True)
    visual_params = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("Session", back_populates="predictions")

class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("sessions.id"), nullable=False, unique=True)
    user_rating = Column(Float, nullable=False) # 1.0 - 5.0 or normalized 0.0 - 1.0
    user_state = Column(String(50), nullable=True) # e.g. "meaningful", "pleasant", "neutral", "draining"
    optional_comment = Column(Text, nullable=True)
    predicted_score = Column(Float, nullable=False)
    prediction_delta = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("Session", back_populates="feedback")
