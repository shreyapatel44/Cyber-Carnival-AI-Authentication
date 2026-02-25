from flask import Flask, request, jsonify
from flask_cors import CORS
from face_auth import register_face, verify_face
from database import init_db

app = Flask(__name__)
CORS(app)

# Initialize database when server starts
init_db()


# =========================
# REGISTER ROUTE
# =========================
@app.route('/register', methods=['POST'])
def register():
    try:
        data = request.json

        username = data.get('username')
        image = data.get('image')

        # Collect question answers
        details = {
            "color": data.get('color'),
            "pet": data.get('pet'),
            "number": data.get('number'),
            "hobby": data.get('hobby'),
            "flower": data.get('flower')
        }

        # Basic validation
        if not username or not image:
            return jsonify({
                "status": "error",
                "message": "Missing username or image"
            }), 400

        result = register_face(username, image, details)

        print("Registration successful for:", username)

        return jsonify(result)

    except Exception as e:
        print("Registration Error:", str(e))
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


# =========================
# LOGIN ROUTE
# =========================
@app.route('/login', methods=['POST'])
def login():
    try:
        data = request.json

        username = data.get('username')
        image = data.get('image')

        if not username or not image:
            return jsonify({
                "status": "error",
                "message": "Missing username or image"
            }), 400

        result = verify_face(username, image)

        print("Login attempt for:", username, "Result:", result["status"])

        return jsonify(result)

    except Exception as e:
        print("Login Error:", str(e))
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


# =========================
# CHECK USER (Optional Debug)
# =========================
@app.route('/check/<username>', methods=['GET'])
def check_user(username):
    from database import get_user

    user = get_user(username)

    if user:
        return jsonify({"status": "registered"})
    else:
        return jsonify({"status": "not_registered"})


# =========================
# RUN SERVER
# =========================
if __name__ == '__main__':
    app.run(debug=True)