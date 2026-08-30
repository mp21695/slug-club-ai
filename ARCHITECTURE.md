# 🏛️ Technical Architecture: Slughorn’s Hourglass AI

This document provides an in-depth breakdown of the multimodal signal processing, linguistic feature engineering, scoring models, and particle simulation dynamics powering **Slughorn’s Hourglass**.

---

## 1. Mathematical Scoring Formulation

The overall time-slowing score $Q \in [0, 1]$ is computed from 5 orthogonal dimensions:

$$\mathbf{Q} = w_E E + w_M M + w_P P + w_D D + w_F F$$

Where:
* $E \in [0, 1]$: **Engagement Score**
* $M \in [0, 1]$: **Mutuality / Connection Balance Score**
* $P \in [0, 1]$: **Emotional Positivity Score**
* $D \in [0, 1]$: **Conversational Depth Score**
* $F \in [0, 1]$: **Conversational Flow & Continuity Score**

Default starting weights:
$$\mathbf{w} = [w_E=0.30,\, w_M=0.25,\, w_P=0.20,\, w_D=0.15,\, w_F=0.10]$$

---

## 2. Linguistic Feature Extraction Pipeline

### A. Mutuality ($M$) & Entropy
Mutuality represents symmetry of participation. For $K$ speakers with turn counts $t_k$ and word totals $w_k$:

$$H_{\text{turns}} = -\sum_{k=1}^K p_k \log p_k, \quad p_k = \frac{t_k}{\sum t_i}$$
$$\text{Balance}_{\text{turns}} = \frac{H_{\text{turns}}}{\log K}$$

$$\text{Mutuality} = 0.55 \cdot \text{Balance}_{\text{turns}} + 0.45 \cdot \text{Balance}_{\text{words}}$$

*If a single speaker is detected ($K=1$), mutuality weight $w_M$ is dynamically set to $0.0$ and redistributed across $E, P, D$.*

### B. Recency-Weighted Sliding Window & Emotional Valence ($P$)
To avoid dilution over long conversations and allow instantaneous response to real-time mood shifts (e.g. heated friction $\to$ apology $\to$ resumed conflict):

$$\text{Weight}(turn_i) = \gamma^{N - 1 - i}, \quad \gamma = 0.75$$

$$P_{\text{recent}} = \frac{\sum_{i=1}^N \gamma^{N - 1 - i} \cdot \text{PosWeight}(turn_i)}{\sum_{i=1}^N \gamma^{N - 1 - i} \cdot (\text{PosWeight}(turn_i) + \text{NegWeight}(turn_i)) + \epsilon}$$

$$P_{\text{blended}} = 0.35 \cdot P_{\text{global}} + 0.65 \cdot P_{\text{recent}}$$

---

## 3. Acoustic Signal Processing (DSP) Pipeline

When audio chunks (3–5 seconds) are streamed from the microphone:

```
Raw Audio Buffer (16 kHz WAV/PCM)
       ↓
Dynamic Noise Floor Estimation (10th percentile energy)
       ↓
Frame Segmentation (25ms Hamming window, 10ms hop)
       ↓
┌─────────────────────────────────────────────────────────────┐
│ 1. RMS Energy:          Loudness & Vocal Dynamics           │
│ 2. Autocorrelation F0:  Fundamental Frequency & Pitch Var   │
│ 3. Energy Envelope:     Syllable Rate / Pace (syllables/s)  │
│ 4. Silence Threshold:   Speech-to-Pause Ratio               │
│ 5. Spectral Centroid:   Center of Mass of FFT Magnitudes    │
│ 6. SNR (dB):            Signal-to-Noise Ratio Estimation    │
└─────────────────────────────────────────────────────────────┘
       ↓
Volatile Memory Wiping (Zero-Retention Security)
```

---

## 4. Exponential Smoothing Filter & Particle Physics

Raw quality scores are smoothed before driving the Canvas physics:

$$Q_t^{\text{smooth}} = (1 - \alpha) Q_{t-1}^{\text{smooth}} + \alpha Q_t$$

Where:
* Standard transitions: $\alpha = 0.20$ (gradual ambient drift)
* Sudden conflict or major shift: $\alpha = 0.45$ (responsive transition)

### Particle Dynamics & Anti-Gravity:
In the HTML5 Canvas engine, each particle position $\mathbf{x} = (x, y)$ is governed by:

$$\mathbf{v}_{t+1} = \mathbf{v}_t + \mathbf{g}(Q_t^{\text{smooth}}) \cdot \text{speed\_mult} + \mathbf{f}_{\text{funnel}}$$
$$\mathbf{x}_{t+1} = \mathbf{x}_t + \mathbf{v}_{t+1}$$

* When $Q_t^{\text{smooth}} > 0.88$ (**Deep Moment**): The gravity vector $\mathbf{g}$ reverses ($\mathbf{g} < 0$), causing particles to drift upwards in a glowing golden nebula.

---

## 5. Personal Calibration Engine

Post-session user reflection ratings $(Q_{\text{model}}, Y_{\text{user}})$ are used to fit a personalized affine calibration:

$$\hat{Y}_{\text{personal}} = a \cdot Q_{\text{model}} + b$$

Solved via L2-regularized Ridge Regression towards baseline prior $(a=1.0, b=0.0)$:

$$\mathbf{w}^* = (\mathbf{X}^T \mathbf{X} + \lambda \mathbf{I})^{-1} (\mathbf{X}^T \mathbf{y} + \lambda [1, 0]^T)$$

---

## 6. SQLite Database Schema

* `users`: `id`, `privacy_mode`, `calibration_a`, `calibration_b`, `weight_overrides`, `created_at`
* `sessions`: `id`, `user_id`, `input_type`, `title`, `started_at`, `state`, `smoothed_score`, `confidence`
* `conversation_turns`: `id`, `session_id`, `speaker_id`, `text`, `sanitized_text`, `message_index`, `timestamp`
* `predictions`: `id`, `session_id`, `engagement`, `mutuality`, `positivity`, `depth`, `flow`, `overall`, `confidence`, `state`, `reason_codes`
* `feedback`: `id`, `session_id`, `user_rating`, `user_state`, `optional_comment`, `prediction_delta`
