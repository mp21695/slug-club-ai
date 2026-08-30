import numpy as np
from typing import List, Dict, Any, Tuple

class PersonalCalibrationEngine:
    """
    Manages individual user calibration profiles.
    Learns user preferences via:
    1. Linear regression: y_user = a * Q_model + b
    2. Dimension sensitivity adaptation: adjusting weights E, M, P, D, F based on user ratings.
    """
    def __init__(self, default_a: float = 1.0, default_b: float = 0.0):
        self.a = default_a
        self.b = default_b
        self.weights = {
            "engagement": 0.30,
            "mutuality": 0.25,
            "positivity": 0.20,
            "depth": 0.15,
            "flow": 0.10
        }

    def calibrate_score(self, model_score: float, custom_a: float = None, custom_b: float = None) -> float:
        """
        Applies linear calibration: personal_score = a * model_score + b
        Clamped to [0.0, 1.0].
        """
        a = custom_a if custom_a is not None else self.a
        b = custom_b if custom_b is not None else self.b
        calibrated = a * model_score + b
        return float(max(0.0, min(1.0, calibrated)))

    def update_from_feedback_history(
        self,
        feedback_pairs: List[Dict[str, float]],
        regularization_lambda: float = 0.1
    ) -> Tuple[float, float, Dict[str, float]]:
        """
        Fits a calibrated slope (a) and intercept (b) from a buffer of (predicted_score, user_score) feedback pairs.
        Uses L2 Regularized Ridge Regression toward prior (a=1.0, b=0.0).
        """
        if not feedback_pairs or len(feedback_pairs) < 2:
            return self.a, self.b, self.weights

        x = np.array([f["predicted_score"] for f in feedback_pairs], dtype=np.float64)
        y = np.array([f["user_score"] for f in feedback_pairs], dtype=np.float64)
        
        # Design matrix [x, 1]
        X = np.vstack([x, np.ones(len(x))]).T
        
        # Regularized least squares toward (1, 0)
        # (X^T X + lambda I) w = X^T y + lambda [1, 0]^T
        XTX = np.dot(X.T, X)
        XTy = np.dot(X.T, y)
        
        reg_matrix = regularization_lambda * np.eye(2)
        prior_target = regularization_lambda * np.array([1.0, 0.0])
        
        try:
            w = np.linalg.solve(XTX + reg_matrix, XTy + prior_target)
            new_a = float(np.clip(w[0], 0.4, 2.0))
            new_b = float(np.clip(w[1], -0.3, 0.3))
            
            self.a = new_a
            self.b = new_b
        except Exception:
            pass

        return self.a, self.b, self.weights
