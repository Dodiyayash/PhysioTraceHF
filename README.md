 HEAD
# PhysioTrace AI - Real-Time Posture & Exercise Coach 🧘‍♂️⚡

PhysioTrace AI is a high-performance real-time posture monitor and exercise coach built for the browser. It combines local 30+ FPS GPU joint landmark detection using MediaPipe with intelligent biomechanical analysis and asynchronous Gemma AI coaching.

---

## 🌟 Key Features

1. **Fast-Loop Real-Time Tracking (Browser, 30+ FPS, <20ms Latency)**
   - **MediaPipe PoseLandmarker Lite** running in VIDEO mode on GPU.
   - 5 Joint Angle calculations: Neck forward tilt, Trunk slouch lean, Shoulder tilt asymmetry, Knee flexion, and Elbow angle.
   - Exponential Moving Average (EMA, alpha 0.3) + 2-sample hysteresis for flicker-free alerts.
   - Dynamic Posture Score ring (Green ≥80, Amber 60-79, Red <60).
   - Mirrored Skeleton Overlay with color-coded bones and live degree labels.

2. **4 Exercise / Posture Modes**
   - **Desk Posture**: Continuous slouch & neck angle monitoring.
   - **Squat**: State machine hysteresis (Knee <105° down, >158° up = 1 rep).
   - **Shoulder Raise**: Arm elevation & range of motion rep tracking.
   - **Neck Stretch**: Timed isometric hold tracking (2.5s hold).

3. **Audio & Visual Alerts**
   - Local `speechSynthesis` voice feedback triggered when posture breaks >1.5s (with 6s cooldown and mute toggle).
   - Breached joint pulse animations and smooth color ring transitions.

4. **Slow-Loop Gemma AI Coaching (Every 6 Seconds)**
   - Express server (`/api/coach`) with dynamic model discovery (automatically selecting the newest Gemma model from Gemini API `v1beta/models`).
   - Asynchronous execution that **never blocks** the 30+ FPS camera loop.
   - Defensive JSON parsing with automatic rule-based offline fallback if API key is missing or request times out.
   - Actionable 1-sentence fixes, corrective exercises (Chin Tucks, Wall Angels, Thoracic Extensions), and safety disclaimer.

5. **Session Analytics & Export**
   - 2-Minute live score sparkline history.
   - Calibration mode (3-second countdown to save custom upright baseline).
   - Session summary modal with average score, time spent in bad posture, and total reps.
   - One-click JSON & CSV session report downloads.

6. **Clinical Wellness Design System**
   - Soft deep teal-ink dark theme (default) and clean light theme with toggle.
   - Accessible WCAG AA compliance, responsive desktop/tablet/mobile layout.
   - Built-in Demo Mode with synthetic pose sequence for presentations without camera.

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Open `.env` and add your Google Gemini API key:
```env
PORT=3000
GOOGLE_API_KEY=your_gemini_api_key_here
GEMMA_MODEL=
```

### 3. Start Server & Web App
```bash
npm start
```
Open your browser and navigate to: `http://localhost:3000`

---

## 🎬 2-Minute Presentation Demo Script

1. **Introduction (0:00 - 0:20)**
   - Open `http://localhost:3000`. Show the clean welcome modal.
   - Click **Try Demo Mode** (or **Start Camera**).
   - Point out the 65% camera stage, the floating live posture score ring (100), and the status pill ("Demo Mode" / "Tracking").

2. **Good Posture Baseline & Live Angles (0:20 - 0:40)**
   - Highlight the right sidebar showing live angles (Neck 10°, Trunk 8°, Shoulder 0°, Knee 175°).
   - Note the green color coding on the ring and skeleton bones.

3. **Slouch Detection & Speech Alert (0:40 - 1:10)**
   - Watch the synthetic loop or lean forward into a slouch.
   - Show the instant visual reaction: score ring turns coral red (drops to ~55), affected neck/trunk bones highlight red, and joint pulses.
   - Listen to the voice alert: *"Correction: Neck Forward Tilt"*.
   - Point out the Real-Time Coach card updating with actionable advice.

4. **Exercise Mode & Rep Counter (1:10 - 1:35)**
   - Select **Mode: Squats** from the top right dropdown.
   - Watch the rep counter overlay increment as knee angle bends below 105° and returns above 158°.

5. **Session Summary & Report Download (1:35 - 2:00)**
   - Click **End Session**.
   - Show the summary modal detailing Average Posture Score, Time in Slouch, Reps Completed, and Top Improvement Recommendations.
   - Click **Download CSV** to inspect the exported analytics report.

---

## 🧪 Running Tests

### Unit Tests
```bash
npm run test:unit
```
### Server Tests
```bash
npm run test:server
```
### Browser End-to-End & Accessibility Tests
```bash
npx playwright test
```
=======
# PhysioTrace
 2a424a47b7296fd85074a2a6445e89ee47090c47
