import re
import math
from typing import List, Dict, Any

# 1. Tiered Positive Lexicons
HIGH_POSITIVE_WORDS = {
    "love", "amazing", "wonderful", "fantastic", "awesome", "joy", "brilliant",
    "inspiring", "sweet", "sweetheart", "treasured", "grateful", "cherish"
}

POSITIVE_WORDS = {
    "great", "good", "glad", "happy", "fun", "exciting", "excited", "warm", "kind",
    "appreciate", "thank", "thanks", "helpful", "beautiful", "haha", "cool",
    "fascinating", "enjoy", "enjoyed", "nice", "perfect", "interesting", "vulnerable",
    "peace", "peaceful", "resonates", "meaningful", "empathy", "presence", "aligned",
    "safety", "comfort", "valid", "support", "proud", "sorry", "apologize", "apologies",
    "forgive", "understand", "agreed", "together"
}

# 2. Tiered Negative / Conflict Lexicons
HIGH_HOSTILITY_WORDS = {
    "hate", "shouting", "screaming", "furious", "ruined", "disaster", "hostile",
    "disgusting", "terrible", "awful", "horrible", "toxic", "unprofessional"
}

MODERATE_NEGATIVE_WORDS = {
    "frustrating", "frustrated", "annoyed", "annoying", "draining", "exhausted",
    "painful", "pointless", "useless", "disappointed", "sick", "blame", "blaming"
}

MILD_NEGATIVE_WORDS = {
    "boring", "bored", "tired", "ignored", "bad", "difficult", "hard", "struggled", "messy"
}

# 3. Explicit Conflict Phrase Patterns (Requiring high confidence of tension)
CONFLICT_PHRASES = [
    r"\b(stop (shouting|screaming|blaming|yelling))\b",
    r"\b(sick (and tired|of this|of you))\b",
    r"\b(shut up)\b",
    r"\b(figure it out yourself)\b",
    r"\b(hate dealing with)\b",
    r"\b(completely ruined)\b",
    r"\b(constant blame)\b",
    r"\b(fed up)\b",
    r"\b(don't care anymore)\b"
]

# 4. Apology & Conciliatory Patterns
APOLOGY_PATTERNS = [
    r"\b(i'm sorry|i am sorry|sorry|my bad|i apologize|please forgive me|let's calm down|didn't mean to)\b"
]

BACKCHANNEL_PATTERNS = [
    r"\b(yeah|yep|yes|right|totally|exactly|makes sense|got it|for sure|i see|wow|oh nice|true|indeed|absolutely|agreed)\b"
]

REFLECTION_PATTERNS = [
    r"\bi (feel|felt|think|thought|noticed|realized|remember|believe|learned|found|confused|struggled|chose)\b",
    r"\bin my (experience|view|opinion|mind|childhood|life|values)\b",
    r"\bto be honest\b",
    r"\bpersonally\b",
    r"\bwhat made me\b",
    r"\bmeaningful\b",
    r"\bvulnerable\b",
    r"\bresonates\b",
    r"\breflecting\b",
    r"\bpresence\b"
]

ELABORATION_PATTERNS = [
    r"\bbecause\b", r"\bfor example\b", r"\bfor instance\b", r"\bsince\b",
    r"\bwhich means\b", r"\bin order to\b", r"\bthat reminds me\b", r"\bon the other hand\b",
    r"\bso that\b", r"\bespecially\b"
]

def extract_text_features(turns: List[Dict[str, Any]]) -> Dict[str, float]:
    """
    Extracts multi-turn conversational features with both global dialogue metrics
    and recency-weighted sliding window metrics for dynamic real-time responsiveness.
    """
    if not turns:
        return {
            "turn_count": 0.0,
            "speaker_count": 0.0,
            "turn_balance": 0.5,
            "word_balance": 0.5,
            "mean_word_count": 0.0,
            "length_quality": 0.5,
            "question_density": 0.0,
            "follow_up_ratio": 0.0,
            "backchannel_density": 0.0,
            "elaboration_density": 0.0,
            "valence_score": 0.5,
            "recent_valence": 0.5,
            "recent_conflict_score": 0.0,
            "positivity_ratio": 0.0,
            "negativity_ratio": 0.0,
            "excitement_ratio": 0.0,
            "reflection_density": 0.0,
            "depth_score": 0.5,
            "semantic_coherence": 0.5,
            "repetition_penalty": 0.0,
            "flow_score": 0.5
        }

    n_turns = len(turns)
    speaker_turns = {}
    speaker_words = {}
    
    all_words = []
    turn_word_counts = []
    question_count = 0
    follow_up_count = 0
    backchannel_count = 0
    elaboration_count = 0
    reflection_count = 0
    
    positive_weight_total = 0.0
    negative_weight_total = 0.0
    excitement_count = 0
    adjacent_overlaps = []

    # Recency weighting: exponential decay over the last 5 turns
    recent_window_size = min(5, n_turns)
    recent_turns = turns[-recent_window_size:]
    recent_pos_weight = 0.0
    recent_neg_weight = 0.0
    recent_conflict_points = 0.0
    recent_words_count = 0
    
    for i, turn in enumerate(turns):
        text = turn.get("sanitized_text") or turn.get("text", "")
        text_lower = text.lower()
        speaker = turn.get("speaker", "A")
        
        words = re.findall(r'\b[a-zA-Z0-9_\']+\b', text_lower)
        turn_len = len(words)
        turn_word_counts.append(turn_len)
        all_words.extend(words)
        
        speaker_turns[speaker] = speaker_turns.get(speaker, 0) + 1
        speaker_words[speaker] = speaker_words.get(speaker, 0) + turn_len
        
        # Questions & Follow-ups
        if "?" in text:
            question_count += 1
            if i > 0 and "?" not in (turns[i-1].get("sanitized_text") or turns[i-1].get("text", "")):
                follow_up_count += 1
                
        # Backchannels & Reflection & Elaboration
        for pattern in BACKCHANNEL_PATTERNS:
            if re.search(pattern, text_lower):
                backchannel_count += 1
                break
                
        for pattern in ELABORATION_PATTERNS:
            if re.search(pattern, text_lower):
                elaboration_count += 1
                break
                
        for pattern in REFLECTION_PATTERNS:
            if re.search(pattern, text_lower):
                reflection_count += 1
                break
                
        # Word-level sentiment scoring
        turn_pos_weight = 0.0
        turn_neg_weight = 0.0
        turn_conflict = 0.0
        
        for w in words:
            if w in HIGH_POSITIVE_WORDS:
                turn_pos_weight += 2.0
            elif w in POSITIVE_WORDS:
                turn_pos_weight += 1.0
            elif w in HIGH_HOSTILITY_WORDS:
                turn_neg_weight += 2.5
                turn_conflict += 1.5
            elif w in MODERATE_NEGATIVE_WORDS:
                turn_neg_weight += 1.0
                turn_conflict += 0.6
            elif w in MILD_NEGATIVE_WORDS:
                # Mild words only contribute fractional negative weight and zero conflict
                turn_neg_weight += 0.25
                
        for pattern in CONFLICT_PHRASES:
            if re.search(pattern, text_lower):
                turn_conflict += 2.5
                turn_neg_weight += 3.0
                break
                
        for pattern in APOLOGY_PATTERNS:
            if re.search(pattern, text_lower):
                turn_pos_weight += 3.0
                turn_conflict = max(0.0, turn_conflict - 2.0)
                break
                
        positive_weight_total += turn_pos_weight
        negative_weight_total += turn_neg_weight
        
        if "!" in text or re.search(r'\b(haha|lol|omg|wow)\b', text_lower) or any(c in text for c in "❤️✨🔥🎉👏😊😃"):
            excitement_count += 1
            
        # Semantic overlap with previous turn
        if i > 0:
            prev_words = set(re.findall(r'\b[a-zA-Z0-9_\']+\b', (turns[i-1].get("sanitized_text") or turns[i-1].get("text", "")).lower()))
            curr_words = set(words)
            stop = {"the", "a", "an", "and", "or", "to", "in", "is", "it", "of", "that", "this", "you", "i", "we", "my", "your", "are", "was", "for"}
            prev_content = prev_words - stop
            curr_content = curr_words - stop
            
            if prev_content and curr_content:
                jaccard = len(prev_content & curr_content) / len(prev_content | curr_content)
                overlap_score = min(1.0, jaccard * 2.5 + 0.3)
            else:
                overlap_score = 0.55
            adjacent_overlaps.append(overlap_score)
            
        # Recency weighting for the last few turns
        recency_index = n_turns - 1 - i
        if recency_index < recent_window_size:
            recency_decay = (0.75 ** recency_index)
            recent_pos_weight += turn_pos_weight * recency_decay
            recent_neg_weight += turn_neg_weight * recency_decay
            recent_conflict_points += turn_conflict * recency_decay
            recent_words_count += turn_len

    # Global Mutuality
    num_speakers = len(speaker_turns)
    if num_speakers <= 1:
        turn_balance = 0.5
        word_balance = 0.5
    else:
        total_turns = sum(speaker_turns.values())
        proportions = [count / total_turns for count in speaker_turns.values()]
        entropy = -sum(p * math.log(p) for p in proportions if p > 0)
        max_entropy = math.log(num_speakers) if num_speakers > 1 else 1.0
        turn_balance = max(0.0, min(1.0, entropy / max_entropy))
        
        total_w = sum(speaker_words.values())
        if total_w > 0:
            w_proportions = [count / total_w for count in speaker_words.values()]
            w_entropy = -sum(p * math.log(p) for p in w_proportions if p > 0)
            word_balance = max(0.0, min(1.0, w_entropy / max_entropy))
        else:
            word_balance = 0.5

    mean_w = sum(turn_word_counts) / max(1, n_turns)
    if mean_w < 3.0:
        length_quality = 0.25
    elif mean_w < 8.0:
        length_quality = 0.60
    elif mean_w <= 35.0:
        length_quality = 0.95
    else:
        length_quality = max(0.4, 1.0 - (mean_w - 35.0) / 70.0)
        
    q_density = question_count / max(1, n_turns)
    follow_up_ratio = follow_up_count / max(1, question_count) if question_count > 0 else 0.0
    backchannel_density = backchannel_count / max(1, n_turns)
    elaboration_density = elaboration_count / max(1, n_turns)
    reflection_density = reflection_count / max(1, n_turns)

    # Global Valence
    tot_sentiment = positive_weight_total + negative_weight_total
    if tot_sentiment > 0:
        raw_val = (positive_weight_total - negative_weight_total) / tot_sentiment
        valence_score = 0.5 + 0.5 * raw_val
    else:
        valence_score = 0.55
        
    # Recency-weighted Valence (critical for dynamic shifts like apology -> heated again)
    recent_tot = recent_pos_weight + recent_neg_weight
    if recent_tot > 0:
        recent_raw_val = (recent_pos_weight - recent_neg_weight) / recent_tot
        recent_valence = 0.5 + 0.5 * recent_raw_val
    else:
        recent_valence = 0.55
        
    # Depth
    ttr = len(set(all_words)) / max(1, len(all_words))
    depth_score = min(1.0, 0.40 * min(1.0, reflection_density * 2.2) + 0.30 * min(1.0, elaboration_density * 2.0) + 0.30 * ttr)

    # Flow
    mean_coherence = sum(adjacent_overlaps) / max(1, len(adjacent_overlaps)) if adjacent_overlaps else 0.65
    turn_texts = [t.get("text", "").strip().lower() for t in turns]
    repetition_ratio = 1.0 - (len(set(turn_texts)) / max(1, len(turn_texts)))
    repetition_penalty = min(1.0, repetition_ratio * 2.5)
    flow_score = max(0.0, min(1.0, 0.7 * mean_coherence + 0.3 * (1.0 - repetition_penalty)))

    return {
        "turn_count": float(n_turns),
        "speaker_count": float(num_speakers),
        "turn_balance": float(turn_balance),
        "word_balance": float(word_balance),
        "mean_word_count": float(mean_w),
        "length_quality": float(length_quality),
        "question_density": float(min(1.0, q_density)),
        "follow_up_ratio": float(min(1.0, follow_up_ratio)),
        "backchannel_density": float(min(1.0, backchannel_density)),
        "elaboration_density": float(min(1.0, elaboration_density)),
        "valence_score": float(max(0.0, min(1.0, valence_score))),
        "recent_valence": float(max(0.0, min(1.0, recent_valence))),
        "recent_conflict_score": float(recent_conflict_points),
        "positivity_ratio": float(positive_weight_total / max(1, len(all_words))),
        "negativity_ratio": float(negative_weight_total / max(1, len(all_words))),
        "excitement_ratio": float(min(1.0, excitement_count / max(1, n_turns))),
        "reflection_density": float(min(1.0, reflection_density)),
        "depth_score": float(max(0.0, min(1.0, depth_score))),
        "semantic_coherence": float(max(0.0, min(1.0, mean_coherence))),
        "repetition_penalty": float(repetition_penalty),
        "flow_score": float(flow_score)
    }
