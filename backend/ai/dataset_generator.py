import os
import json
import random
from typing import List, Dict, Any, Tuple
import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error, f1_score, confusion_matrix
from backend.ai.privacy import parse_conversation_transcript
from backend.ai.models import ConversationEvaluator

CATEGORIES = [
    "deep_personal_reflection",
    "technical_collaboration",
    "playful_humorous_banter",
    "supportive_empathetic",
    "casual_small_talk",
    "one_sided_monologue",
    "awkward_repetitive",
    "emotionally_intense_conflict",
    "comfortable_low_verbal"
]

TEMPLATES = {
    "deep_personal_reflection": [
        [
            ("A", "I've been thinking a lot about why I always feel restless when things are calm."),
            ("B", "That's such a vulnerable thing to notice. What do you think brings that up?"),
            ("A", "I think in my childhood, quiet meant something was about to go wrong. So I learned to stay on edge."),
            ("B", "That makes complete sense. In my own life, I realized I confused peace with emptiness for years."),
            ("A", "Exactly. How did you start letting yourself just enjoy peaceful moments without dread?"),
            ("B", "Honestly, practicing sitting with the discomfort and reminding myself that safety doesn't need to be loud.")
        ],
        [
            ("A", "Do you ever feel like you're living the life expected of you rather than the one you chose?"),
            ("B", "Constantly, especially over the last year. What part feels most mismatched for you?"),
            ("A", "I feel like I chose my career for stability and approval, but my creative side feels starved."),
            ("B", "I remember when I felt that way before switching paths. It took admitting to myself that security without joy wasn't enough."),
            ("A", "That hits home. How did you handle the fear of disappointing others?"),
            ("B", "By realizing that disappointing others is temporary, but abandoning yourself is chronic.")
        ]
    ],
    "technical_collaboration": [
        [
            ("A", "I'm optimizing the transformer inference latency, but batching is causing memory spikes."),
            ("B", "Are you using dynamic sequence length padding or fixed max length?"),
            ("A", "Dynamic padding with FlashAttention, but the KV cache is growing linearly with context."),
            ("B", "Have you tried PagedAttention or vLLM memory virtualization? That cut our memory overhead by 60%."),
            ("A", "That's brilliant. Did you need custom CUDA kernels or is the PyTorch binding sufficient?"),
            ("B", "The default PyTorch binding was fast enough for our 18 FPS target without manual CUDA code.")
        ],
        [
            ("A", "The Kalman filter for our sensor fusion is drifting during rapid angular acceleration."),
            ("B", "Is the covariance matrix Q tuned for high-frequency IMU noise?"),
            ("A", "I set Q high, but then the GPS corrections cause sharp discontinuous jumps."),
            ("B", "Try an Extended Kalman Filter with adaptive covariance based on the innovation residual."),
            ("A", "Good point! That would smooth out the GPS outliers while maintaining gyro responsiveness."),
            ("B", "Let's benchmark that on the synthetic flight logs and compare the RMSE.")
        ]
    ],
    "playful_humorous_banter": [
        [
            ("A", "I just spent 45 minutes debugging only to realize I commented out the main function haha!"),
            ("B", "Peak developer moment! Please tell me you didn't restart the computer three times first lol."),
            ("A", "I restarted the computer, reinstalled node_modules, and questioned all my life choices!"),
            ("B", "Haha! That calls for celebratory coffee. You've earned the Senior Debugger badge!"),
            ("A", "Only if the badge comes with automatic syntax correction and extra espresso!"),
            ("B", "Deal! Coffee is on me if your next build passes on the first try!")
        ]
    ],
    "supportive_empathetic": [
        [
            ("A", "I received the rejection email for the fellowship today. I'm feeling really discouraged."),
            ("B", "I am so sorry to hear that. I know how much heart and late nights you put into that application."),
            ("A", "It just feels like every time I get close, the door closes."),
            ("B", "It is completely valid to feel exhausted right now. Take all the time you need to breathe today."),
            ("A", "Thank you for being here. Just having someone listen without trying to fix it immediately helps so much."),
            ("B", "Always here for you. Whenever you're ready, we'll look at the next steps together, but today is for resting.")
        ]
    ],
    "casual_small_talk": [
        [
            ("A", "Hey, how was your weekend?"),
            ("B", "Pretty good, just ran a few errands and watched a movie. You?"),
            ("A", "Same here, did some laundry and grocery shopping. Pretty quiet."),
            ("B", "Yeah, nice to have a slow weekend sometimes."),
            ("A", "Definitely. Looking forward to the short week."),
            ("B", "Yeah, same here.")
        ]
    ],
    "one_sided_monologue": [
        [
            ("A", "So then I told him that the entire design system needs a revamp, and then I went to the store and bought three monitors, and then my cat jumped on the table, and after that I started writing a 50-page document on productivity."),
            ("B", "Oh wow."),
            ("A", "And that's not even all, because then I started reorganizing my bookshelves by color, which took another four hours, and then I called my cousin to explain my new workout routine."),
            ("B", "I see."),
            ("A", "And tomorrow I plan on doing the exact same thing starting at 5 AM!"),
            ("B", "Cool.")
        ]
    ],
    "awkward_repetitive": [
        [
            ("A", "Yeah."),
            ("B", "Yep."),
            ("A", "So yeah."),
            ("B", "Sure."),
            ("A", "Okay."),
            ("B", "Alright then.")
        ]
    ],
    "emotionally_intense_conflict": [
        [
            ("A", "You completely ignored what I asked you to do and ruined the entire presentation!"),
            ("B", "Stop shouting at me! You didn't give me any clear instructions until two hours before!"),
            ("A", "I sent you three emails last week! This is so frustrating and unprofessional!"),
            ("B", "I hate dealing with your constant blame games! I'm completely sick of this!"),
            ("A", "Then maybe you shouldn't be working on this project at all!"),
            ("B", "Fine by me! Figure it out yourself!")
        ]
    ],
    "comfortable_low_verbal": [
        [
            ("A", "The sunset over the lake is breathtaking today."),
            ("B", "It really is. The reflection on the water is so still."),
            ("A", "Peaceful."),
            ("B", "Very.")
        ]
    ]
}

TARGET_GROUND_TRUTHS = {
    "deep_personal_reflection": {"engagement": 0.88, "mutuality": 0.85, "positivity": 0.82, "depth": 0.90, "flow": 0.86, "overall": 0.86, "state": "meaningful"},
    "technical_collaboration": {"engagement": 0.85, "mutuality": 0.82, "positivity": 0.75, "depth": 0.78, "flow": 0.88, "overall": 0.82, "state": "engaged"},
    "playful_humorous_banter": {"engagement": 0.82, "mutuality": 0.80, "positivity": 0.92, "depth": 0.45, "flow": 0.85, "overall": 0.77, "state": "engaged"},
    "supportive_empathetic": {"engagement": 0.84, "mutuality": 0.78, "positivity": 0.88, "depth": 0.82, "flow": 0.82, "overall": 0.83, "state": "meaningful"},
    "casual_small_talk": {"engagement": 0.50, "mutuality": 0.55, "positivity": 0.55, "depth": 0.30, "flow": 0.60, "overall": 0.50, "state": "neutral"},
    "one_sided_monologue": {"engagement": 0.35, "mutuality": 0.15, "positivity": 0.40, "depth": 0.25, "flow": 0.30, "overall": 0.28, "state": "disconnected"},
    "awkward_repetitive": {"engagement": 0.15, "mutuality": 0.30, "positivity": 0.35, "depth": 0.10, "flow": 0.20, "overall": 0.22, "state": "disconnected"},
    "emotionally_intense_conflict": {"engagement": 0.70, "mutuality": 0.65, "positivity": 0.15, "depth": 0.45, "flow": 0.40, "overall": 0.45, "state": "emotionally_intense"},
    "comfortable_low_verbal": {"engagement": 0.60, "mutuality": 0.65, "positivity": 0.75, "depth": 0.65, "flow": 0.65, "overall": 0.65, "state": "neutral"}
}

def generate_benchmark_dataset(samples_per_category: int = 50) -> List[Dict[str, Any]]:
    """
    Generates a 450-sample benchmark dataset with dialogue turns and ground-truth targets.
    """
    dataset = []
    
    for cat in CATEGORIES:
        templates = TEMPLATES[cat]
        gt = TARGET_GROUND_TRUTHS[cat]
        
        for i in range(samples_per_category):
            base_turns = random.choice(templates)
            # Add minor variations
            turns = []
            for spk, txt in base_turns:
                turns.append({
                    "speaker": spk,
                    "text": txt,
                    "sanitized_text": txt,
                    "message_index": len(turns)
                })
                
            # Add slight ground truth noise (±0.03) for realistic variance
            noisy_gt = {}
            for k in ["engagement", "mutuality", "positivity", "depth", "flow", "overall"]:
                noisy_gt[k] = float(np.clip(gt[k] + random.uniform(-0.03, 0.03), 0.0, 1.0))
            noisy_gt["state"] = gt["state"]
            
            sample = {
                "id": f"{cat}_{i+1:03d}",
                "category": cat,
                "turns": turns,
                "ground_truth": noisy_gt
            }
            dataset.append(sample)
            
    random.seed(42)
    random.shuffle(dataset)
    return dataset

def evaluate_model_on_dataset(dataset: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Evaluates the model against dataset ground truths and computes MAE, RMSE, and Macro-F1.
    """
    evaluator = ConversationEvaluator()
    
    y_true_scores = {k: [] for k in ["engagement", "mutuality", "positivity", "depth", "flow", "overall"]}
    y_pred_scores = {k: [] for k in ["engagement", "mutuality", "positivity", "depth", "flow", "overall"]}
    
    y_true_states = []
    y_pred_states = []
    
    for sample in dataset:
        turns = sample["turns"]
        gt = sample["ground_truth"]
        
        result = evaluator.evaluate(turns)
        
        for k in y_true_scores.keys():
            y_true_scores[k].append(gt[k])
            y_pred_scores[k].append(result[k] if k != "overall" else result["overall"])
            
        y_true_states.append(gt["state"])
        y_pred_states.append(result["state"])
        
    metrics = {}
    for k in y_true_scores.keys():
        mae = mean_absolute_error(y_true_scores[k], y_pred_scores[k])
        rmse = np.sqrt(mean_squared_error(y_true_scores[k], y_pred_scores[k]))
        metrics[f"{k}_mae"] = round(float(mae), 4)
        metrics[f"{k}_rmse"] = round(float(rmse), 4)
        
    macro_f1 = f1_score(y_true_states, y_pred_states, average="macro", zero_division=0)
    metrics["state_macro_f1"] = round(float(macro_f1), 4)
    metrics["total_samples"] = len(dataset)
    
    return metrics

if __name__ == "__main__":
    print("Generating 450-sample Slughorn benchmark dataset...")
    data = generate_benchmark_dataset(samples_per_category=50)
    
    # 70/15/15 split
    n_total = len(data)
    n_train = int(0.70 * n_total)
    n_val = int(0.15 * n_total)
    
    train_set = data[:n_train]
    val_set = data[n_train:n_train+n_val]
    test_set = data[n_train+n_val:]
    
    print(f"Dataset split: Train={len(train_set)}, Val={len(val_set)}, Test={len(test_set)}")
    
    # Evaluate on Test Set
    test_metrics = evaluate_model_on_dataset(test_set)
    print("\n--- Test Set Evaluation Results ---")
    for k, v in test_metrics.items():
        print(f"  {k}: {v}")
