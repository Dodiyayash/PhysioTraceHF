# 🧘 PhysioTrack

**Real-Time AI Posture & Physiotherapy Assistant**

PhysioTrack is a real-time posture detection and coaching web application that uses a laptop camera and AI to help users maintain better posture.

It detects body landmarks, analyzes posture, provides a live posture score, and gives visual and voice feedback when incorrect posture is detected.

## ✨ Features

* 📷 **Real-time posture detection** using MediaPipe
* 🦴 **Live skeleton overlay** on the camera feed
* 📊 **Live posture score** from 0–100
* 📐 **Posture angle analysis**
* 🚨 **Bad posture detection** with visual alerts
* 🎤 **Voice coaching** for posture correction
* 🤖 **Gemma AI Coach** for intelligent feedback
* 💻 **Front and side view support**
* 🏋️ **Exercise mode with rep counting**
* 📈 **Session summary and posture history**
* 🌐 **Offline coaching fallback**
* 🎨 **Dark and light themes**
* 📱 **Responsive interface**

## 🛠️ Technologies Used

* **HTML, CSS, JavaScript**
* **MediaPipe Pose Landmarker**
* **Google Gemma**
* **Web Speech API**
* **SVG**
* **Node.js / Express**
* **Playwright**
* **Vitest / Unit Testing**

## ⚙️ How It Works

```text
Camera
   ↓
MediaPipe Pose Detection
   ↓
Body Landmarks
   ↓
Posture Analysis
   ↓
Shared Posture Thresholds
   ↓
Score + Skeleton + Warnings
   ↓
Gemma AI Coach / Offline Coach
   ↓
Visual + Voice Feedback
```

## 🎯 Detection

PhysioTrack can analyze:

* Head / neck tilt
* Shoulder alignment
* Slouching
* Body posture
* Exercise movements
* Squat repetitions

The application uses a shared threshold configuration so that the **score, warnings, skeleton colors, gauges, and coaching feedback remain consistent**.

## 🏃 Exercise Mode

Exercise mode can detect movements and count repetitions.

For example:

```text
Start Squat
    ↓
Detect movement
    ↓
Check body position
    ↓
Count repetition
    ↓
Give posture feedback
```

## 🤖 AI Coaching

PhysioTrack uses **Gemma** to provide personalized posture suggestions.

If AI coaching is unavailable, the application uses an **offline coaching fallback**, so basic posture feedback can still work.

## 🔊 Voice Feedback

The application can provide spoken feedback such as:

* "Tracking started"
* "Good posture. Hold it there."
* Posture correction instructions
* Periodic positive feedback

Voice coaching can also be muted from the interface.

## 🔐 Privacy

Camera processing is designed for real-time posture detection.

API keys are kept **server-side** and are not exposed in the frontend.

> Never commit your `.env` file or API keys to GitHub.


## 📸 Demo
https://physiotracehf.vercel.app/ 

PhysioTrack provides:

* Welcome screen
* Calibration screen
* Live posture tracking
* Real-time score
* Skeleton visualization
* AI coaching
* Exercise mode
* Session summary

## 🌟 Why PhysioTrace AI?

Traditional posture monitoring often requires someone else to observe and correct the user.

PhysioTrace AI provides a simple alternative:

**Camera → Detect → Analyze → Explain → Correct**

It gives users immediate feedback while they are sitting, exercising, or practicing movements.

## 🔮 Future Improvements

* Personalized posture profiles
* More physiotherapy exercises
* Long-term posture analytics
* Mobile application
* More exercise detection
* Personalized AI rehabilitation plans

## 👩‍💻 Team

Built for **Hacktoberfest Hack Day Surat 2026**.
