import os
import json
import base64
from datetime import datetime
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from backend.database.db import init_db, get_db
from backend.database.models import User, Session, ConversationTurn, Prediction, Feedback
from backend.ai.privacy import sanitize_text, parse_conversation_transcript
from backend.ai.models import ConversationEvaluator, STATE_CONFIGS
from backend.ai.calibration import PersonalCalibrationEngine
from backend.ai.dataset_generator import generate_benchmark_dataset, evaluate_model_on_dataset

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(
    title="Slughorn's Hourglass API",
    description="Multimodal AI Conversation Understanding & Ambient Hourglass Simulation Engine",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

evaluator = ConversationEvaluator()
calibration_engine = PersonalCalibrationEngine()

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, session_id: str, websocket: WebSocket):
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        self.active_connections[session_id].append(websocket)

    def disconnect(self, session_id: str, websocket: WebSocket):
        if session_id in self.active_connections:
            if websocket in self.active_connections[session_id]:
                self.active_connections[session_id].remove(websocket)
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]

    async def broadcast(self, session_id: str, message: dict):
        if session_id in self.active_connections:
            for connection in self.active_connections[session_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass

ws_manager = ConnectionManager()

# Pydantic Schemas
class CreateSessionRequest(BaseModel):
    input_type: str = "text"
    title: Optional[str] = "Hourglass Session"

class TextTurnRequest(BaseModel):
    speaker: str = "A"
    text: str

class TranscriptPasteRequest(BaseModel):
    raw_transcript: str

class FeedbackRequest(BaseModel):
    user_rating: float = Field(..., ge=0.0, le=5.0)
    user_state: Optional[str] = None
    optional_comment: Optional[str] = None

@app.get("/")
async def root():
    return {
        "status": "online",
        "app": "Slughorn's Hourglass Backend",
        "version": "1.0.0",
        "states": list(STATE_CONFIGS.keys())
    }

# 1. Sessions CRUD
@app.post("/sessions")
async def create_session(req: CreateSessionRequest, db: AsyncSession = Depends(get_db)):
    session = Session(
        input_type=req.input_type,
        title=req.title,
        latest_score=0.50,
        smoothed_score=0.50,
        confidence=0.50,
        state="neutral"
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return {"session_id": session.id, "title": session.title, "state": session.state}

@app.get("/sessions")
async def list_sessions(db: AsyncSession = Depends(get_db)):
    stmt = select(Session).order_by(Session.started_at.desc()).limit(25)
    result = await db.execute(stmt)
    sessions = result.scalars().all()
    return [{
        "id": s.id,
        "title": s.title,
        "input_type": s.input_type,
        "started_at": s.started_at.isoformat() if s.started_at else None,
        "latest_score": s.latest_score,
        "smoothed_score": s.smoothed_score,
        "confidence": s.confidence,
        "state": s.state
    } for s in sessions]

@app.get("/sessions/{session_id}")
async def get_session(session_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(Session).where(Session.id == session_id)
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    stmt_turns = select(ConversationTurn).where(ConversationTurn.session_id == session_id).order_by(ConversationTurn.message_index)
    res_turns = await db.execute(stmt_turns)
    turns = res_turns.scalars().all()
    
    stmt_pred = select(Prediction).where(Prediction.session_id == session_id).order_by(Prediction.created_at.desc()).limit(1)
    res_pred = await db.execute(stmt_pred)
    latest_pred = res_pred.scalar_one_or_none()
    
    stmt_feedback = select(Feedback).where(Feedback.session_id == session_id)
    res_feedback = await db.execute(stmt_feedback)
    fb = res_feedback.scalar_one_or_none()
    
    return {
        "session_id": session.id,
        "title": session.title,
        "input_type": session.input_type,
        "started_at": session.started_at.isoformat() if session.started_at else None,
        "state": session.state,
        "smoothed_score": session.smoothed_score,
        "confidence": session.confidence,
        "turns": [{
            "speaker": t.speaker_id,
            "text": t.text,
            "sanitized_text": t.sanitized_text,
            "message_index": t.message_index
        } for t in turns],
        "latest_prediction": {
            "engagement": latest_pred.engagement if latest_pred else 0.5,
            "mutuality": latest_pred.mutuality if latest_pred else 0.5,
            "positivity": latest_pred.positivity if latest_pred else 0.5,
            "depth": latest_pred.depth if latest_pred else 0.5,
            "flow": latest_pred.flow if latest_pred else 0.5,
            "overall": latest_pred.overall if latest_pred else 0.5,
            "smoothed_overall": latest_pred.smoothed_overall if latest_pred else 0.5,
            "confidence": latest_pred.confidence if latest_pred else 0.5,
            "state": latest_pred.state if latest_pred else "neutral",
            "reason_codes": latest_pred.reason_codes if latest_pred else [],
            "explanation": latest_pred.explanation if latest_pred else ""
        } if latest_pred else None,
        "feedback": {
            "user_rating": fb.user_rating,
            "user_state": fb.user_state,
            "optional_comment": fb.optional_comment
        } if fb else None
    }

@app.delete("/sessions/{session_id}")
async def delete_session(session_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(Session).where(Session.id == session_id)
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    await db.delete(session)
    await db.commit()
    return {"status": "deleted", "session_id": session_id}

# 2. Text Turn Analysis & Transcript Paste
@app.post("/sessions/{session_id}/text")
async def add_text_turn(session_id: str, req: TextTurnRequest, db: AsyncSession = Depends(get_db)):
    stmt = select(Session).where(Session.id == session_id)
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    sanitized = sanitize_text(req.text)
    
    stmt_turns = select(ConversationTurn).where(ConversationTurn.session_id == session_id).order_by(ConversationTurn.message_index)
    res_turns = await db.execute(stmt_turns)
    all_turns = list(res_turns.scalars().all())
    
    turn = ConversationTurn(
        session_id=session_id,
        speaker_id=req.speaker,
        text=req.text,
        sanitized_text=sanitized,
        message_index=len(all_turns)
    )
    db.add(turn)
    await db.commit()
    await db.refresh(turn)
    
    turns_payload = [{
        "speaker": t.speaker_id,
        "text": t.text,
        "sanitized_text": t.sanitized_text,
        "message_index": t.message_index
    } for t in all_turns] + [{
        "speaker": turn.speaker_id,
        "text": turn.text,
        "sanitized_text": turn.sanitized_text,
        "message_index": turn.message_index
    }]
    
    eval_result = evaluator.evaluate(
        turns=turns_payload,
        prev_smoothed_score=session.smoothed_score
    )
    
    pred = Prediction(
        session_id=session_id,
        turn_id=turn.id,
        engagement=eval_result["engagement"],
        mutuality=eval_result["mutuality"],
        positivity=eval_result["positivity"],
        depth=eval_result["depth"],
        flow=eval_result["flow"],
        overall=eval_result["overall"],
        smoothed_overall=eval_result["smoothed_overall"],
        confidence=eval_result["confidence"],
        state=eval_result["state"],
        reason_codes=eval_result["reason_codes"],
        explanation=eval_result["explanation"],
        visual_params=eval_result["visual_params"]
    )
    db.add(pred)
    
    session.latest_score = eval_result["overall"]
    session.smoothed_score = eval_result["smoothed_overall"]
    session.confidence = eval_result["confidence"]
    session.state = eval_result["state"]
    await db.commit()
    
    await ws_manager.broadcast(session_id, {
        "type": "turn_update",
        "turn": {
            "speaker": turn.speaker_id,
            "text": turn.text,
            "message_index": turn.message_index
        },
        "evaluation": eval_result
    })
    
    return eval_result

@app.post("/sessions/{session_id}/transcript")
async def import_transcript(session_id: str, req: TranscriptPasteRequest, db: AsyncSession = Depends(get_db)):
    stmt = select(Session).where(Session.id == session_id)
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    parsed_turns = parse_conversation_transcript(req.raw_transcript)
    if not parsed_turns:
        raise HTTPException(status_code=400, detail="Could not parse any conversation turns from transcript.")
        
    await db.execute(delete(ConversationTurn).where(ConversationTurn.session_id == session_id))
    
    for t in parsed_turns:
        turn = ConversationTurn(
            session_id=session_id,
            speaker_id=t["speaker"],
            text=t["text"],
            sanitized_text=t["sanitized_text"],
            message_index=t["message_index"]
        )
        db.add(turn)
    await db.commit()
    
    eval_result = evaluator.evaluate(
        turns=parsed_turns,
        prev_smoothed_score=0.50
    )
    
    pred = Prediction(
        session_id=session_id,
        engagement=eval_result["engagement"],
        mutuality=eval_result["mutuality"],
        positivity=eval_result["positivity"],
        depth=eval_result["depth"],
        flow=eval_result["flow"],
        overall=eval_result["overall"],
        smoothed_overall=eval_result["smoothed_overall"],
        confidence=eval_result["confidence"],
        state=eval_result["state"],
        reason_codes=eval_result["reason_codes"],
        explanation=eval_result["explanation"],
        visual_params=eval_result["visual_params"]
    )
    db.add(pred)
    session.latest_score = eval_result["overall"]
    session.smoothed_score = eval_result["smoothed_overall"]
    session.confidence = eval_result["confidence"]
    session.state = eval_result["state"]
    await db.commit()
    
    return {
        "turns_imported": len(parsed_turns),
        "evaluation": eval_result
    }

# 3. Audio Chunk Upload / Processing
@app.post("/sessions/{session_id}/audio")
async def process_audio(
    session_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Session).where(Session.id == session_id)
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    audio_bytes = await file.read()
    
    stmt_turns = select(ConversationTurn).where(ConversationTurn.session_id == session_id).order_by(ConversationTurn.message_index)
    res_turns = await db.execute(stmt_turns)
    turns = [{
        "speaker": t.speaker_id,
        "text": t.text,
        "sanitized_text": t.sanitized_text,
        "message_index": t.message_index
    } for t in res_turns.scalars().all()]
    
    eval_result = evaluator.evaluate(
        turns=turns,
        audio_bytes=audio_bytes,
        prev_smoothed_score=session.smoothed_score
    )
    
    pred = Prediction(
        session_id=session_id,
        engagement=eval_result["engagement"],
        mutuality=eval_result["mutuality"],
        positivity=eval_result["positivity"],
        depth=eval_result["depth"],
        flow=eval_result["flow"],
        overall=eval_result["overall"],
        smoothed_overall=eval_result["smoothed_overall"],
        confidence=eval_result["confidence"],
        state=eval_result["state"],
        reason_codes=eval_result["reason_codes"],
        explanation=eval_result["explanation"],
        visual_params=eval_result["visual_params"]
    )
    db.add(pred)
    session.latest_score = eval_result["overall"]
    session.smoothed_score = eval_result["smoothed_overall"]
    session.confidence = eval_result["confidence"]
    session.state = eval_result["state"]
    await db.commit()
    
    await ws_manager.broadcast(session_id, {
        "type": "audio_update",
        "evaluation": eval_result
    })
    
    return eval_result

# 4. User Feedback & Personal Calibration
@app.post("/sessions/{session_id}/feedback")
async def submit_feedback(session_id: str, req: FeedbackRequest, db: AsyncSession = Depends(get_db)):
    stmt = select(Session).where(Session.id == session_id)
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    norm_rating = req.user_rating / 5.0 if req.user_rating > 1.0 else req.user_rating
    delta = norm_rating - session.smoothed_score
    
    stmt_fb = select(Feedback).where(Feedback.session_id == session_id)
    res_fb = await db.execute(stmt_fb)
    fb = res_fb.scalar_one_or_none()
    
    if fb:
        fb.user_rating = norm_rating
        fb.user_state = req.user_state
        fb.optional_comment = req.optional_comment
        fb.prediction_delta = delta
    else:
        fb = Feedback(
            session_id=session_id,
            user_rating=norm_rating,
            user_state=req.user_state,
            optional_comment=req.optional_comment,
            predicted_score=session.smoothed_score,
            prediction_delta=delta
        )
        db.add(fb)
    await db.commit()
    
    stmt_all_fb = select(Feedback)
    res_all_fb = await db.execute(stmt_all_fb)
    feedbacks = res_all_fb.scalars().all()
    
    pairs = [{"predicted_score": f.predicted_score, "user_score": f.user_rating} for f in feedbacks]
    new_a, new_b, weights = calibration_engine.update_from_feedback_history(pairs)
    
    return {
        "status": "feedback_recorded",
        "prediction_delta": round(delta, 3),
        "calibration": {
            "a": round(new_a, 3),
            "b": round(new_b, 3),
            "total_feedbacks": len(feedbacks)
        }
    }

@app.get("/user/calibration")
async def get_calibration():
    return {
        "a": round(calibration_engine.a, 3),
        "b": round(calibration_engine.b, 3),
        "weights": calibration_engine.weights
    }

# 5. Dataset Benchmark Evaluation Runner
@app.post("/datasets/benchmark")
async def run_benchmark(samples_per_category: int = 10):
    dataset = generate_benchmark_dataset(samples_per_category=samples_per_category)
    metrics = evaluate_model_on_dataset(dataset)
    return {
        "status": "completed",
        "metrics": metrics
    }

# 6. Real-Time WebSocket Endpoint
@app.websocket("/ws/sessions/{session_id}")
async def websocket_session(websocket: WebSocket, session_id: str):
    await ws_manager.connect(session_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            msg_type = payload.get("type", "text_turn")
            
            if msg_type == "text_turn":
                speaker = payload.get("speaker", "A")
                text = payload.get("text", "")
                turns = payload.get("context_turns", [{"speaker": speaker, "text": text}])
                prev_smooth = payload.get("prev_smoothed_score", 0.50)
                
                result = evaluator.evaluate(turns=turns, prev_smoothed_score=prev_smooth)
                await websocket.send_json({
                    "type": "score_update",
                    "evaluation": result
                })
            elif msg_type == "audio_chunk":
                audio_b64 = payload.get("audio_b64", "")
                prev_smooth = payload.get("prev_smoothed_score", 0.50)
                try:
                    audio_bytes = base64.b64decode(audio_b64)
                except Exception:
                    audio_bytes = None
                
                result = evaluator.evaluate(turns=[], audio_bytes=audio_bytes, prev_smoothed_score=prev_smooth)
                await websocket.send_json({
                    "type": "audio_score_update",
                    "evaluation": result
                })
    except WebSocketDisconnect:
        ws_manager.disconnect(session_id, websocket)
    except Exception:
        ws_manager.disconnect(session_id, websocket)
