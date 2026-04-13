from flask import Flask, render_template, request, jsonify, redirect, url_for, session
import sqlite3
import smtplib
from email.mime.text import MIMEText
import joblib
import numpy as np
import random

app = Flask(__name__)
app.secret_key = "secret123"

# ===== LOAD MODEL =====
try:
    model = joblib.load("model.pkl")
    print("✅ Model loaded successfully")
except Exception as e:
    model = None
    print("⚠️ Model not loaded, using score-based prediction.", e)


# ===== DATABASE INIT =====
def init_db():
    conn = sqlite3.connect("mental_health.db")
    c = conn.cursor()

    c.execute("""
        CREATE TABLE IF NOT EXISTS results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_email TEXT,
            risk_level TEXT,
            score INTEGER,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS mood (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            emotion TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.commit()
    conn.close()


init_db()


# ===== ROUTES =====
@app.route("/")
def home():
    return render_template("index.html")


@app.route("/login", methods=["POST"])
def login():
    email = request.form.get("email")
    password = request.form.get("password")

    if email and password:
        session["user"] = email
        return redirect(url_for("dashboard"))

    return "Invalid Login"


@app.route("/dashboard")
def dashboard():
    if "user" not in session:
        return redirect(url_for("home"))
    return render_template("dashboard.html")


@app.route("/survey")
def survey():
    if "user" not in session:
        return redirect(url_for("home"))
    return render_template("survey.html")


@app.route("/result")
def result():
    if "user" not in session:
        return redirect(url_for("home"))
    return render_template("result.html")


@app.route("/admin")
def admin():
    conn = sqlite3.connect("mental_health.db")
    c = conn.cursor()

    c.execute("""
        SELECT student_email, risk_level, score, timestamp
        FROM results
        ORDER BY timestamp DESC
    """)
    results = c.fetchall()

    conn.close()
    return render_template("admin.html", results=results)


# ===== PREDICTION =====
@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()

    if not data or "features" not in data:
        return jsonify({"error": "No features provided"}), 400

    features = data["features"]
    score = sum(features)

    # Default score-based logic
    risk_level = "HIGH" if score > 44 else "MODERATE" if score > 25 else "LOW"

    # Optional model use
    if model:
        try:
            features_array = np.array(features).reshape(1, -1)
            prediction = model.predict(features_array)

            pred = str(prediction[0]).upper()
            if pred in ["HIGH", "LOW", "MODERATE"]:
                risk_level = pred
            elif pred in ["1", "0"]:
                risk_level = "HIGH" if int(pred) == 1 else "LOW"
        except Exception as e:
            print("⚠️ Model prediction failed, using score-based logic:", e)

    student_email = session.get("user", "unknown@email.com")

    conn = sqlite3.connect("mental_health.db")
    c = conn.cursor()
    c.execute("""
        INSERT INTO results (student_email, risk_level, score)
        VALUES (?, ?, ?)
    """, (student_email, risk_level, score))
    conn.commit()
    conn.close()

    return jsonify({"risk_level": risk_level})


# ===== EMAIL ALERT =====
@app.route("/send-alert", methods=["POST"])
def send_alert():
    data = request.get_json()

    guardian_email = data.get("guardianEmail")
    guardian_name = data.get("guardianName")
    score = data.get("score")

    if not guardian_email or not guardian_name:
        return jsonify({"status": "error", "message": "Guardian details missing"}), 400

    # REPLACE THESE
    sender_email = "japneetkaur781@gmail.com"
    sender_password = "dlkh jsvq veul dyqu"

    message = f"""
Dear {guardian_name},

This is an alert from the Student Mental Health Early Warning System.

The student may be experiencing high stress.

Stress Score: {score}

Please check on them and provide support if needed.

Regards,
Mental Health Early Warning System
"""

    msg = MIMEText(message)
    msg["Subject"] = "Mental Health Alert"
    msg["From"] = sender_email
    msg["To"] = guardian_email

    try:
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(sender_email, sender_password)
        server.sendmail(sender_email, guardian_email, msg.as_string())
        server.quit()
        print("✅ Email sent successfully")
        return jsonify({"status": "email sent"})
    except Exception as e:
        print("❌ Email Error:", e)
        return jsonify({"status": "error", "message": str(e)}), 500


# ===== CHATBOT =====
def detect_emotion(text):
    text = text.lower()

    if any(w in text for w in ["sad", "cry", "lonely", "upset", "hurt"]):
        return "sad"
    elif any(w in text for w in ["stress", "pressure", "tired", "exhausted"]):
        return "stressed"
    elif any(w in text for w in ["anxious", "nervous", "panic", "overthinking"]):
        return "anxious"
    elif any(w in text for w in ["happy", "good", "great", "excited"]):
        return "happy"
    elif any(w in text for w in ["angry", "frustrated", "mad"]):
        return "angry"
    else:
        return "neutral"


def chatbot_response(emotion):
    responses = {
        "sad": [
            "I’m really sorry you're feeling like this. I’m here for you.",
            "It sounds like something is bothering you. You can talk about it."
        ],
        "stressed": [
            "That sounds like a lot. Please take a small break and breathe.",
            "You may be carrying too much pressure right now."
        ],
        "anxious": [
            "Let’s slow down together. Take a deep breath.",
            "It’s okay to feel anxious sometimes. Try to ground yourself."
        ],
        "happy": [
            "That’s wonderful to hear.",
            "I’m glad you’re feeling better."
        ],
        "angry": [
            "It’s okay to feel angry. Try to pause before reacting.",
            "You seem frustrated. A short break may help."
        ],
        "neutral": [
            "I’m listening. Tell me more.",
            "You can share how you’re feeling."
        ]
    }

    reply = random.choice(responses.get(emotion, responses["neutral"]))

    if emotion == "anxious":
        reply += "\n\nBreathe in... hold... breathe out slowly."
    if emotion == "stressed":
        reply += "\n\nTake a 5 minute break. You deserve it."
    if emotion == "sad":
        reply += "\n\nTalking to someone you trust might help."

    return reply


@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    text = data.get("text", "")

    emotion = detect_emotion(text)
    reply = chatbot_response(emotion)

    conn = sqlite3.connect("mental_health.db")
    c = conn.cursor()
    c.execute("INSERT INTO mood (emotion) VALUES (?)", (emotion,))
    conn.commit()
    conn.close()

    return jsonify({"reply": reply})


@app.route("/mood-data")
def mood_data():
    conn = sqlite3.connect("mental_health.db")
    c = conn.cursor()
    c.execute("SELECT emotion, COUNT(*) FROM mood GROUP BY emotion")
    data = c.fetchall()
    conn.close()
    return jsonify(data)


if __name__ == "__main__":
    app.run(debug=True)