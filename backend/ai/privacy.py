import re
from typing import List, Dict, Any, Tuple

# Pre-compiled regex patterns for privacy scrubbing
EMAIL_REGEX = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')
PHONE_REGEX = re.compile(r'(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b')
URL_REGEX = re.compile(r'https?://(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b[-a-zA-Z0-9()@:%_\+.~#?&//=]*')
HANDLE_REGEX = re.compile(r'@\w+')
IP_REGEX = re.compile(r'\b(?:\d{1,3}\.){3}\d{1,3}\b')

def sanitize_text(text: str) -> str:
    """
    Sanitizes raw conversational text by replacing private identifiers,
    emails, phone numbers, URLs, and handles with generic placeholders.
    """
    if not text:
        return ""
    
    scrubbed = text
    scrubbed = URL_REGEX.sub("[LINK]", scrubbed)
    scrubbed = EMAIL_REGEX.sub("[EMAIL]", scrubbed)
    scrubbed = PHONE_REGEX.sub("[PHONE]", scrubbed)
    scrubbed = HANDLE_REGEX.sub("[USER]", scrubbed)
    scrubbed = IP_REGEX.sub("[IP_ADDR]", scrubbed)
    
    return scrubbed.strip()

def parse_conversation_transcript(raw_text: str) -> List[Dict[str, Any]]:
    """
    Parses a pasted transcript from various formats (WhatsApp, Slack, standard transcripts)
    into structured turns: [{'speaker': 'A', 'text': '...', 'message_index': 0}, ...].
    """
    lines = raw_text.strip().split("\n")
    turns = []
    
    # Common format patterns:
    # 1. "Speaker A: message" or "Alice: message" or "[12:30] Bob: message"
    # 2. "A: message"
    # 3. WhatsApp format: "[10/05/24, 10:14:22] Alex: Hello" or "10/05/24, 10:14 - Alex: Hello"
    
    wa_pattern = re.compile(r'^(?:\[?[\d/\-.,\s:]+\]?\s*(?:-\s*)?)?([^:]+?):\s*(.+)$')
    
    speaker_map = {}
    current_speaker_idx = 0
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        match = wa_pattern.match(line)
        if match:
            raw_speaker = match.group(1).strip()
            msg = match.group(2).strip()
            
            # Map arbitrary name to standardized speaker label or keep clean name
            if raw_speaker not in speaker_map:
                speaker_id = f"Speaker_{chr(65 + (current_speaker_idx % 26))}" if len(speaker_map) < 26 else f"Speaker_{current_speaker_idx+1}"
                speaker_map[raw_speaker] = speaker_id
                current_speaker_idx += 1
                
            speaker = speaker_map[raw_speaker]
            sanitized = sanitize_text(msg)
            turns.append({
                "speaker": speaker,
                "text": msg,
                "sanitized_text": sanitized,
                "message_index": len(turns)
            })
        else:
            # If no colon prefix, attribute to alternating speaker or previous speaker
            speaker = "Speaker_A" if len(turns) % 2 == 0 else "Speaker_B"
            sanitized = sanitize_text(line)
            turns.append({
                "speaker": speaker,
                "text": line,
                "sanitized_text": sanitized,
                "message_index": len(turns)
            })
            
    return turns

def wipe_audio_buffer(buffer: bytearray) -> None:
    """
    Explicitly overwrites sensitive in-memory audio bytes for zero-retention mode.
    """
    for i in range(len(buffer)):
        buffer[i] = 0
