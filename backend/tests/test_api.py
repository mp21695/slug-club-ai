import pytest
import asyncio
from fastapi.testclient import TestClient
from backend.main import app
from backend.database.db import init_db

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    asyncio.run(init_db())

client = TestClient(app)

def test_root_endpoint():
    res = client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "online"
    assert "meaningful" in data["states"]

def test_create_and_query_session():
    res = client.post("/sessions", json={"input_type": "text", "title": "Test Session"})
    assert res.status_code == 200
    session_id = res.json()["session_id"]
    
    turns = [
        "Hey! How is your day going?",
        "Pretty exciting! I just finished the multimodal particle animation.",
        "That is awesome! How does the glowing particle trail look?",
        "It looks magical! The golden amber glow slows down smoothly."
    ]
    for i, t in enumerate(turns):
        spk = "A" if i % 2 == 0 else "B"
        t_res = client.post(f"/sessions/{session_id}/text", json={"speaker": spk, "text": t})
        assert t_res.status_code == 200
        data = t_res.json()
        assert "overall" in data
        assert "confidence" in data
        
    get_res = client.get(f"/sessions/{session_id}")
    assert get_res.status_code == 200
    sess_data = get_res.json()
    assert len(sess_data["turns"]) == 4
    
    fb_res = client.post(f"/sessions/{session_id}/feedback", json={
        "user_rating": 4.5,
        "user_state": "meaningful",
        "optional_comment": "Time really slowed down during the visual demo!"
    })
    assert fb_res.status_code == 200
    assert "calibration" in fb_res.json()

def test_transcript_paste():
    res = client.post("/sessions", json={"input_type": "text", "title": "Transcript Session"})
    session_id = res.json()["session_id"]
    
    transcript = """Alex: Let's discuss the core mission of our project.
Maya: I believe it's about helping people become more present in their conversations.
Alex: Exactly. Making connection visible changes how we listen.
Maya: When you see the hourglass pause, it invites you to stay in the moment."""
    
    paste_res = client.post(f"/sessions/{session_id}/transcript", json={"raw_transcript": transcript})
    assert paste_res.status_code == 200
    data = paste_res.json()
    assert data["turns_imported"] == 4
    assert data["evaluation"]["overall"] >= 0.58
