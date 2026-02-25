from deepface import DeepFace
import base64
import cv2
import numpy as np
from database import save_user, get_user
from scipy.spatial.distance import cosine

# Adjust threshold if needed (0.6–0.7 recommended)
THRESHOLD = 0.75


def base64_to_image(base64_string):
    try:
        imgdata = base64.b64decode(base64_string.split(',')[1])
        np_arr = np.frombuffer(imgdata, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        return img
    except Exception as e:
        print("Image conversion error:", str(e))
        return None


# =========================
# REGISTER FACE
# =========================
def register_face(username, image, details):
    try:
        img = base64_to_image(image)

        if img is None:
            return {"status": "invalid_image"}

        # Face detection enforced
        embedding = DeepFace.represent(
            img,
            model_name='Facenet',
            enforce_detection=True
        )[0]["embedding"]

        save_user(username, embedding, details)

        print("Registered:", username)
        return {"status": "registered"}

    except Exception as e:
        print("Registration Error:", str(e))
        return {"status": "face_not_detected"}


# =========================
# VERIFY FACE
# =========================
def verify_face(username, image):
    try:
        stored = get_user(username)

        if not stored:
            return {"status": "user_not_found"}

        img = base64_to_image(image)

        if img is None:
            return {"status": "invalid_image"}

        # Enforce real face detection
        new_embedding = DeepFace.represent(
            img,
            model_name='Facenet',
            enforce_detection=True
        )[0]["embedding"]

        # Calculate similarity
        distance = cosine(stored["embedding"], new_embedding)
        print("Distance:", distance)

        if distance < THRESHOLD:
            return {
                "status": "face_verified",
                "questions": stored["details"]
            }
        else:
            return {"status": "face_failed"}

    except Exception as e:
        print("Verification Error:", str(e))
        return {"status": "face_not_detected"}