/**
 * PhysioTrace AI - Main Client Controller (Dual View & Voice Enabled)
 */
import { computeJointAngles, applyEMA, calculatePostureScore, LANDMARKS } from './math.js';
import { POSTURE_THRESHOLDS } from './thresholds.js';
import { RepCounter } from './rep_counter.js';
import { AudioManager } from './audio.js';
import { generateSyntheticPose } from './demo_data.js';

let poseLandmarker = null;
let webcamElement = null;
let canvasElement = null;
let canvasCtx = null;

let isDemoMode = false;
let isTrackingActive = false;
let demoFrameIndex = 0;
let lastVideoTime = -1;

// Math & Filter states
let smoothedAngles = null;
let hysteresisSamples = [];
let baselineAngles = null;

// Rep Counter & Audio Managers
const repCounter = new RepCounter('Desk Posture');
const audioManager = new AudioManager();

// Metrics & Performance
let frameCount = 0;
let lastFpsCheck = performance.now();
window.currentFps = 30;
window.lastFrameLatency = 12;

// Session Tracking
let sessionStartTime = null;
let sessionInterval = null;
let sessionDurationSec = 0;
let badPostureSec = 0;
let scoreHistory = [];
let anglesHistory = [];
let lastGemmaCallTime = 0;
let isGemmaInFlight = false;

// Exercises Data
const EXERCISES_DATABASE = [
  { id: 'chin-tucks', name: 'Chin Tucks', target: 'Neck Forward Tilt', how: 'Pull head straight back gently keeping chin level.', sets: '2 sets of 10 reps', mode: 'Neck Stretch' },
  { id: 'thoracic-ext', name: 'Thoracic Extensions', target: 'Trunk Slouch', how: 'Extend gently over back of chair with arms supported.', sets: '3 sets of 5 breaths', mode: 'Desk Posture' },
  { id: 'wall-angels', name: 'Wall Angels', target: 'Shoulders Uneven', how: 'Flat back against wall, slide arms up and down.', sets: '2 sets of 12 reps', mode: 'Shoulder Raise' },
  { id: 'goblet-squat', name: 'Goblet Squats', target: 'Squat', how: 'Keep chest high and push knees outwards smoothly.', sets: '3 sets of 10 reps', mode: 'Squat' }
];

// DOM Element references
let welcomeView, liveWorkspace, summaryView;
let heroScoreVal, heroGradeText, compactScoreVal, compactRingPath, heroRingPath;
let statusDot, statusText, floatingCoachPill, floatingCoachText, coachArrowIcon;
let attentionCoachCard, attentionText, attentionArrow, coachBadgeEl;
let gaugeNeckVal, gaugeTrunkVal, gaugeShoulderVal, gaugeKneeVal;
let gaugeNeckMarker, gaugeTrunkMarker, gaugeShoulderMarker, gaugeKneeMarker;
let sparklineScoreCurr, sparklineCanvas, sparklineCtx;
let tileTime, tileAvgScore, tileBadTime, tileReps;
let repChipOverlay, repChipNum, guideOutline, guideHint;

document.addEventListener('DOMContentLoaded', async () => {
  setupDOMReferences();
  setupEventListeners();
  renderExerciseCards();
  setupSparkline();
  await initMediaPipe();
});

function setupDOMReferences() {
  webcamElement = document.getElementById('webcam');
  canvasElement = document.getElementById('skeleton-canvas');
  canvasCtx = canvasElement.getContext('2d');

  welcomeView = document.getElementById('welcome-view');
  liveWorkspace = document.getElementById('live-workspace');
  summaryView = document.getElementById('summary-view');

  heroScoreVal = document.getElementById('hero-score-val');
  heroGradeText = document.getElementById('hero-grade-text');
  compactScoreVal = document.getElementById('compact-score-val');
  compactRingPath = document.getElementById('compact-ring-path');
  heroRingPath = document.getElementById('hero-ring-path');

  statusDot = document.getElementById('status-dot');
  statusText = document.getElementById('status-text');

  floatingCoachPill = document.getElementById('floating-coach-pill');
  floatingCoachText = document.getElementById('floating-coach-text');
  coachArrowIcon = document.getElementById('coach-arrow-icon');

  attentionCoachCard = document.getElementById('attention-coach-card');
  attentionText = document.getElementById('attention-text');
  attentionArrow = document.getElementById('attention-arrow');
  coachBadgeEl = document.getElementById('coach-badge-el');

  gaugeNeckVal = document.getElementById('gauge-neck-val');
  gaugeTrunkVal = document.getElementById('gauge-trunk-val');
  gaugeShoulderVal = document.getElementById('gauge-shoulder-val');
  gaugeKneeVal = document.getElementById('gauge-knee-val');

  gaugeNeckMarker = document.getElementById('gauge-neck-marker');
  gaugeTrunkMarker = document.getElementById('gauge-trunk-marker');
  gaugeShoulderMarker = document.getElementById('gauge-shoulder-marker');
  gaugeKneeMarker = document.getElementById('gauge-knee-marker');

  sparklineScoreCurr = document.getElementById('sparkline-score-curr');
  sparklineCanvas = document.getElementById('sparkline-canvas');
  sparklineCtx = sparklineCanvas.getContext('2d');

  tileTime = document.getElementById('tile-time');
  tileAvgScore = document.getElementById('tile-avg-score');
  tileBadTime = document.getElementById('tile-bad-time');
  tileReps = document.getElementById('tile-reps');

  repChipOverlay = document.getElementById('rep-chip-overlay');
  repChipNum = document.getElementById('rep-chip-num');

  guideOutline = document.getElementById('guide-outline');
  guideHint = document.getElementById('guide-hint');
}

function setupEventListeners() {
  document.getElementById('start-camera-btn')?.addEventListener('click', () => startCameraMode());
  document.getElementById('start-demo-btn')?.addEventListener('click', () => startDemoMode());
  document.getElementById('demo-btn')?.addEventListener('click', () => startDemoMode());

  document.getElementById('theme-btn')?.addEventListener('click', toggleTheme);
  document.getElementById('mute-btn')?.addEventListener('click', toggleMute);

  document.getElementById('exercise-select')?.addEventListener('change', (e) => {
    repCounter.setMode(e.target.value);
    repChipOverlay.style.display = e.target.value === 'Desk Posture' ? 'none' : 'block';
  });

  document.getElementById('finish-btn')?.addEventListener('click', endSession);
  document.getElementById('restart-btn')?.addEventListener('click', restartSession);
  document.getElementById('short-restart-btn')?.addEventListener('click', restartSession);

  document.getElementById('download-json-btn')?.addEventListener('click', () => downloadReport('json'));
  document.getElementById('download-csv-btn')?.addEventListener('click', () => downloadReport('csv'));
  document.getElementById('copy-summary-btn')?.addEventListener('click', copySummaryToClipboard);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
}

function toggleMute() {
  const isMuted = audioManager.toggleMute();
  document.getElementById('mute-icon-unmuted').style.display = isMuted ? 'none' : 'block';
  document.getElementById('mute-icon-muted').style.display = isMuted ? 'block' : 'none';
}

async function initMediaPipe() {
  try {
    const vision = window.tasksVision || await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14');
    const filesetResolver = await vision.FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
    );

    poseLandmarker = await vision.PoseLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
        delegate: 'GPU'
      },
      runningMode: 'VIDEO',
      numPoses: 1
    });

    console.log('[MediaPipe] PoseLandmarker loaded (GPU).');
  } catch (err) {
    console.warn('[MediaPipe] GPU delegate failed. Retrying CPU fallback...', err);
    try {
      const vision = window.tasksVision;
      const filesetResolver = await vision.FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      );
      poseLandmarker = await vision.PoseLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'CPU'
        },
        runningMode: 'VIDEO',
        numPoses: 1
      });
      console.log('[MediaPipe] CPU PoseLandmarker loaded.');
    } catch (fallbackErr) {
      console.error('[MediaPipe] Model load error:', fallbackErr);
      statusText.textContent = 'Model Failed';
    }
  }
}

async function startCameraMode() {
  isDemoMode = false;
  welcomeView.style.display = 'none';
  liveWorkspace.style.display = 'grid';

  audioManager.announceStart();

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } }
    });
    webcamElement.srcObject = stream;
    await webcamElement.play();

    resizeCanvas();
    isTrackingActive = true;
    runCalibrationCountdown();
  } catch (err) {
    console.error('[Camera] Access denied or error:', err);
    statusText.textContent = 'Camera Blocked';
    statusDot.className = 'status-dot red';
    alert('Camera access denied. Click lock icon in browser address bar to grant access, or use Demo Mode.');
  }
}

function startDemoMode() {
  isDemoMode = true;
  welcomeView.style.display = 'none';
  summaryView.style.display = 'none';
  liveWorkspace.style.display = 'grid';

  audioManager.announceStart();

  statusText.textContent = 'Demo Mode (30 FPS)';
  statusDot.className = 'status-dot amber';

  resizeCanvas();
  isTrackingActive = true;
  startSessionTimer();
  requestAnimationFrame(fastLoop);
}

function runCalibrationCountdown() {
  const modal = document.getElementById('calibration-modal');
  const countEl = document.getElementById('calib-countdown');
  const pathEl = document.getElementById('calib-ring-path');
  modal.style.display = 'flex';

  let count = 3;
  countEl.textContent = count;
  pathEl.style.strokeDashoffset = '0';

  const timer = setInterval(() => {
    count--;
    if (count > 0) {
      countEl.textContent = count;
      pathEl.style.strokeDashoffset = String(263.89 * (1 - count / 3));
    } else {
      clearInterval(timer);
      if (smoothedAngles) {
        baselineAngles = {
          neckTilt: smoothedAngles.neckTilt,
          trunkLean: smoothedAngles.trunkLean,
          frontHeadRatio: smoothedAngles.frontHeadRatio
        };
      }
      modal.style.display = 'none';
      startSessionTimer();
      requestAnimationFrame(fastLoop);
    }
  }, 1000);
}

function resizeCanvas() {
  const width = webcamElement.clientWidth || 640;
  const height = webcamElement.clientHeight || 480;
  canvasElement.width = width;
  canvasElement.height = height;
}

// Fast Loop (Runs on browser animation frame)
function fastLoop(timestamp) {
  if (!isTrackingActive) return;

  const frameStartTime = performance.now();
  let rawLandmarks = null;

  if (isDemoMode) {
    demoFrameIndex++;
    rawLandmarks = generateSyntheticPose(demoFrameIndex, repCounter.mode);
  } else if (webcamElement && webcamElement.currentTime !== lastVideoTime && poseLandmarker) {
    lastVideoTime = webcamElement.currentTime;
    const results = poseLandmarker.detectForVideo(webcamElement, timestamp);
    if (results.landmarks && results.landmarks.length > 0) {
      rawLandmarks = results.landmarks[0];
    }
  }

  if (rawLandmarks) {
    const rawAngles = computeJointAngles(rawLandmarks);

    if (rawAngles.valid) {
      smoothedAngles = applyEMA(smoothedAngles, rawAngles, 0.3);
      hysteresisSamples.push(smoothedAngles);
      if (hysteresisSamples.length > 3) hysteresisSamples.shift();

      const stableAngles = hysteresisSamples[hysteresisSamples.length - 1];
      const scoreData = calculatePostureScore(stableAngles, baselineAngles);
      const repData = repCounter.update(stableAngles);

      // Voice Manager Announcements & Alerts
      audioManager.announceTrackingStarted();
      audioManager.updateBreachState(scoreData.violations);

      updateUIOverlay(scoreData, stableAngles, repData);
      renderSkeletonCanvas(rawLandmarks, stableAngles, scoreData.breachedJoints);
      recordHistory(scoreData, stableAngles);

      guideOutline.className = 'guide-outline in-frame';
      guideHint.textContent = 'Head & shoulders tracked';
    } else {
      updateInvalidState(rawAngles.reason);
      guideOutline.className = 'guide-outline';
      guideHint.textContent = 'Show your head and shoulders';
    }
  } else if (!isDemoMode) {
    updateInvalidState('Show your head and shoulders');
    guideOutline.className = 'guide-outline';
    guideHint.textContent = 'Show your head and shoulders';
  }

  // Calculate FPS & Latency
  frameCount++;
  const now = performance.now();
  if (now - lastFpsCheck >= 1000) {
    window.currentFps = Math.round((frameCount * 1000) / (now - lastFpsCheck));
    frameCount = 0;
    lastFpsCheck = now;
  }
  window.lastFrameLatency = Math.max(8, Math.round(performance.now() - frameStartTime));

  // Slow Loop: Gemma AI Coaching every 6 seconds
  if (now - lastGemmaCallTime >= 6000 && !isGemmaInFlight) {
    lastGemmaCallTime = now;
    triggerGemmaCoaching();
  }

  requestAnimationFrame(fastLoop);
}

function updateUIOverlay(scoreData, angles, repData) {
  heroScoreVal.textContent = scoreData.score;
  compactScoreVal.textContent = scoreData.score;
  heroGradeText.textContent = scoreData.grade;

  const heroCirc = 282.74;
  heroRingPath.style.strokeDashoffset = heroCirc - (scoreData.score / 100) * heroCirc;

  const compCirc = 100.53;
  compactRingPath.style.strokeDashoffset = compCirc - (scoreData.score / 100) * compCirc;

  const fpsText = `${window.currentFps || 30} FPS`;

  if (scoreData.color === 'green') {
    compactRingPath.style.stroke = 'var(--accent-mint)';
    statusDot.className = 'status-dot';
    statusText.textContent = isDemoMode ? `Demo Tracking (${fpsText})` : `Tracking (${fpsText})`;
  } else if (scoreData.color === 'amber') {
    compactRingPath.style.stroke = 'var(--accent-amber)';
    statusDot.className = 'status-dot amber';
    statusText.textContent = `Mild Slouch (${fpsText})`;
  } else {
    compactRingPath.style.stroke = 'var(--accent-coral)';
    statusDot.className = 'status-dot red';
    statusText.textContent = `Fix Posture (${fpsText})`;
  }

  // Floating Coach Pill & Attention Card
  if (scoreData.violations.length > 0) {
    const mainBreach = scoreData.violations[0];
    floatingCoachPill.className = 'coach-pill breach';
    floatingCoachText.textContent = mainBreach;
    coachArrowIcon.textContent = '⚠️';

    attentionCoachCard.className = 'card attention-coach-card breach';
    attentionArrow.textContent = '⚠️';
    attentionText.textContent = `${mainBreach}: Sit upright and pull shoulders back.`;

    highlightExerciseForBreach(mainBreach);
  } else {
    floatingCoachPill.className = 'coach-pill';
    floatingCoachText.textContent = 'Sit tall and relaxed';
    coachArrowIcon.textContent = '✨';

    attentionCoachCard.className = 'card attention-coach-card';
    attentionArrow.textContent = '✨';
    attentionText.textContent = 'Nice, posture looks great! Hold it there.';
  }

  repChipNum.textContent = repData.reps;

  // Gauges Update for Active View Mode
  if (angles.viewMode === 'front') {
    gaugeNeckVal.textContent = `${angles.frontHeadRatio}`;
    gaugeTrunkVal.textContent = `${angles.headTilt}°`;
    gaugeShoulderVal.textContent = `${angles.shoulderDiff}°`;
    gaugeKneeVal.textContent = 'N/A';

    gaugeNeckMarker.style.left = `${Math.min(100, (angles.frontHeadRatio / 1.0) * 100)}%`;
    gaugeTrunkMarker.style.left = `${Math.min(100, (angles.headTilt / 20) * 100)}%`;
    gaugeShoulderMarker.style.left = `${Math.min(100, (angles.shoulderDiff / 15) * 100)}%`;
    gaugeKneeMarker.style.left = '0%';
  } else {
    gaugeNeckVal.textContent = `${angles.neckTilt}°`;
    gaugeTrunkVal.textContent = angles.hasHips ? `${angles.trunkLean}°` : 'N/A';
    gaugeShoulderVal.textContent = `${angles.shoulderDiff}°`;
    gaugeKneeVal.textContent = `${angles.kneeAngle}°`;

    gaugeNeckMarker.style.left = `${Math.min(100, (angles.neckTilt / 40) * 100)}%`;
    gaugeTrunkMarker.style.left = `${Math.min(100, (angles.trunkLean / 35) * 100)}%`;
    gaugeShoulderMarker.style.left = `${Math.min(100, (angles.shoulderDiff / 15) * 100)}%`;
    gaugeKneeMarker.style.left = `${Math.min(100, (angles.kneeAngle / 180) * 100)}%`;
  }
}

function updateInvalidState(reason) {
  statusText.textContent = reason || 'Show your head and shoulders';
  statusDot.className = 'status-dot amber';
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
}

// Render Skeleton canvas with mapped coordinates
function renderSkeletonCanvas(landmarks, angles, breachedJoints = []) {
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  const w = canvasElement.width;
  const h = canvasElement.height;

  let videoW = webcamElement.videoWidth || 1280;
  let videoH = webcamElement.videoHeight || 720;
  const videoAspect = videoW / videoH;
  const canvasAspect = w / h;

  let renderWidth = w;
  let renderHeight = h;
  let offsetX = 0;
  let offsetY = 0;

  if (canvasAspect > videoAspect) {
    renderWidth = h * videoAspect;
    offsetX = (w - renderWidth) / 2;
  } else {
    renderHeight = w / videoAspect;
    offsetY = (h - renderHeight) / 2;
  }

  const connections = [
    [LANDMARKS.LEFT_EAR, LANDMARKS.LEFT_SHOULDER],
    [LANDMARKS.RIGHT_EAR, LANDMARKS.RIGHT_SHOULDER],
    [LANDMARKS.LEFT_SHOULDER, LANDMARKS.RIGHT_SHOULDER],
    [LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_ELBOW],
    [LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_ELBOW],
    [LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_HIP],
    [LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_HIP],
    [LANDMARKS.LEFT_HIP, LANDMARKS.RIGHT_HIP]
  ];

  const hasBreach = breachedJoints.length > 0;
  const getCanvasCoord = (p) => ({
    x: offsetX + (1 - p.x) * renderWidth,
    y: offsetY + p.y * renderHeight
  });

  connections.forEach(([p1Idx, p2Idx]) => {
    const p1 = landmarks[p1Idx];
    const p2 = landmarks[p2Idx];
    if (p1 && p2 && (p1.visibility || 0) >= 0.3 && (p2.visibility || 0) >= 0.3) {
      const c1 = getCanvasCoord(p1);
      const c2 = getCanvasCoord(p2);

      canvasCtx.beginPath();
      canvasCtx.moveTo(c1.x, c1.y);
      canvasCtx.lineTo(c2.x, c2.y);
      canvasCtx.strokeStyle = hasBreach ? '#F43F5E' : '#2DD4BF';
      canvasCtx.lineWidth = hasBreach ? 4.5 : 3;
      canvasCtx.stroke();
    }
  });

  [LANDMARKS.LEFT_EAR, LANDMARKS.RIGHT_EAR, LANDMARKS.LEFT_SHOULDER, LANDMARKS.RIGHT_SHOULDER].forEach((idx) => {
    const p = landmarks[idx];
    if (p && (p.visibility || 0) >= 0.3) {
      const c = getCanvasCoord(p);
      canvasCtx.beginPath();
      canvasCtx.arc(c.x, c.y, 5, 0, 2 * Math.PI);
      canvasCtx.fillStyle = hasBreach ? '#F43F5E' : '#2DD4BF';
      canvasCtx.fill();
      canvasCtx.lineWidth = 1.5;
      canvasCtx.strokeStyle = '#FFFFFF';
      canvasCtx.stroke();
    }
  });
}

function renderExerciseCards() {
  const container = document.getElementById('exercise-cards-container');
  if (!container) return;

  container.innerHTML = EXERCISES_DATABASE.map(ex => `
    <div class="ex-card-item" id="ex-card-${ex.id}">
      <span class="rec-ribbon" id="ribbon-${ex.id}" style="display:none;">Recommended now</span>
      <h4>${ex.name}</h4>
      <p>${ex.how}</p>
      <div class="ex-card-footer">
        <span class="ex-chip">${ex.sets}</span>
        <button class="btn btn-secondary btn-sm switch-ex-btn" data-mode="${ex.mode}">Start</button>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.switch-ex-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const mode = e.currentTarget.getAttribute('data-mode');
      const select = document.getElementById('exercise-select');
      if (select && mode) {
        select.value = mode;
        repCounter.setMode(mode);
        repChipOverlay.style.display = mode === 'Desk Posture' ? 'none' : 'block';
      }
    });
  });
}

function highlightExerciseForBreach(breachName) {
  EXERCISES_DATABASE.forEach(ex => {
    const ribbon = document.getElementById(`ribbon-${ex.id}`);
    const card = document.getElementById(`ex-card-${ex.id}`);
    if (ribbon && card) {
      if (ex.target === breachName || (breachName.includes('Slouch') && ex.id === 'thoracic-ext')) {
        ribbon.style.display = 'block';
        card.className = 'ex-card-item recommended';
      } else {
        ribbon.style.display = 'none';
        card.className = 'ex-card-item';
      }
    }
  });
}

function recordHistory(scoreData, angles) {
  const now = Date.now();
  scoreHistory.push({ timestamp: now, score: scoreData.score });

  const cutoff = now - 120000;
  scoreHistory = scoreHistory.filter(item => item.timestamp >= cutoff);

  if (scoreData.color === 'red') {
    badPostureSec += (1 / 30);
  }

  anglesHistory.push(angles);
  if (anglesHistory.length > 150) anglesHistory.shift();

  renderSparkline();
}

function setupSparkline() {
  if (sparklineCanvas) {
    sparklineCanvas.width = sparklineCanvas.clientWidth || 300;
    sparklineCanvas.height = 36;
  }
}

function renderSparkline() {
  if (!sparklineCtx || scoreHistory.length < 2) return;
  const w = sparklineCanvas.width;
  const h = sparklineCanvas.height;
  sparklineCtx.clearRect(0, 0, w, h);

  sparklineCtx.beginPath();
  const step = w / (scoreHistory.length - 1);

  scoreHistory.forEach((item, idx) => {
    const x = idx * step;
    const y = h - (item.score / 100) * (h - 6) - 3;
    if (idx === 0) sparklineCtx.moveTo(x, y);
    else sparklineCtx.lineTo(x, y);
  });

  sparklineCtx.strokeStyle = 'var(--accent-mint)';
  sparklineCtx.lineWidth = 2;
  sparklineCtx.stroke();

  const currScore = scoreHistory[scoreHistory.length - 1].score;
  if (sparklineScoreCurr) sparklineScoreCurr.textContent = `${currScore} / 100`;
}

async function triggerGemmaCoaching() {
  if (isGemmaInFlight || anglesHistory.length === 0) return;
  isGemmaInFlight = true;

  try {
    const avgAngles = {
      neckTilt: Math.round(anglesHistory.reduce((a, b) => a + (b.neckTilt || 0), 0) / anglesHistory.length),
      trunkLean: Math.round(anglesHistory.reduce((a, b) => a + (b.trunkLean || 0), 0) / anglesHistory.length),
      shoulderDiff: Math.round(anglesHistory.reduce((a, b) => a + (b.shoulderDiff || 0), 0) / anglesHistory.length)
    };

    const currentViolations = [];
    if (avgAngles.neckTilt > POSTURE_THRESHOLDS.NECK_TILT_SIDE.SAFE_MAX) currentViolations.push('Neck Forward Tilt');
    if (avgAngles.trunkLean > POSTURE_THRESHOLDS.TRUNK_LEAN_SIDE.SAFE_MAX) currentViolations.push('Trunk Slouch');
    if (avgAngles.shoulderDiff > POSTURE_THRESHOLDS.SHOULDER_DIFF.SAFE_MAX) currentViolations.push('Shoulders Uneven');

    const res = await fetch('/api/coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        avg_angles: avgAngles,
        violations: currentViolations,
        current_exercise: repCounter.mode,
        rep_count: repCounter.reps
      })
    });

    if (res.ok) {
      const data = await res.json();
      coachBadgeEl.textContent = data.source || 'Offline coach';
      if (data.summary) {
        attentionText.textContent = data.summary;
      }
    }
  } catch (err) {
    console.warn('[Gemma] Call error:', err.message);
  } finally {
    isGemmaInFlight = false;
  }
}

function startSessionTimer() {
  sessionStartTime = Date.now();
  sessionInterval = setInterval(() => {
    sessionDurationSec++;
    const mins = String(Math.floor(sessionDurationSec / 60)).padStart(2, '0');
    const secs = String(sessionDurationSec % 60).padStart(2, '0');
    
    tileTime.textContent = `${mins}:${secs}`;

    if (scoreHistory.length > 0) {
      const avg = Math.round(scoreHistory.reduce((a, b) => a + b.score, 0) / scoreHistory.length);
      tileAvgScore.textContent = avg;
    }
    tileBadTime.textContent = `${Math.round(badPostureSec)}s`;
    tileReps.textContent = repCounter.reps;
  }, 1000);
}

function endSession() {
  isTrackingActive = false;
  if (sessionInterval) clearInterval(sessionInterval);

  liveWorkspace.style.display = 'none';
  summaryView.style.display = 'flex';

  const insufficientBox = document.getElementById('insufficient-data-box');
  const resultsGrid = document.getElementById('summary-results-grid');

  if (sessionDurationSec < 10) {
    insufficientBox.style.display = 'block';
    resultsGrid.style.display = 'none';
  } else {
    insufficientBox.style.display = 'none';
    resultsGrid.style.display = 'flex';

    const avgScore = scoreHistory.length > 0
      ? Math.round(scoreHistory.reduce((a, b) => a + b.score, 0) / scoreHistory.length)
      : 100;

    document.getElementById('sum-avg-score').textContent = avgScore;
    document.getElementById('sum-duration-val').textContent = tileTime.textContent;
    document.getElementById('sum-streak-val').textContent = '03:45';
    document.getElementById('sum-bad-time').textContent = `${Math.round(badPostureSec)}s`;
    document.getElementById('sum-reps-val').textContent = repCounter.reps;

    const grade = avgScore >= 90 ? 'Excellent Form' : avgScore >= 80 ? 'Good Alignment' : 'Needs Correction';
    document.getElementById('sum-grade-text').textContent = grade;

    const pathEl = document.getElementById('sum-ring-path');
    if (pathEl) {
      const circ = 263.89;
      pathEl.style.strokeDashoffset = String(circ - (avgScore / 100) * circ);
    }

    renderSummaryTimelineCanvas();
  }
}

function renderSummaryTimelineCanvas() {
  const canvas = document.getElementById('summary-timeline-canvas');
  if (!canvas) return;
  canvas.width = canvas.clientWidth || 600;
  canvas.height = 100;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);
  if (scoreHistory.length < 2) return;

  const step = w / (scoreHistory.length - 1);
  ctx.beginPath();
  scoreHistory.forEach((item, idx) => {
    const x = idx * step;
    const y = h - (item.score / 100) * (h - 20) - 10;
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = 'var(--accent-mint)';
  ctx.lineWidth = 3;
  ctx.stroke();
}

function restartSession() {
  summaryView.style.display = 'none';
  welcomeView.style.display = 'flex';
  sessionDurationSec = 0;
  badPostureSec = 0;
  scoreHistory = [];
  repCounter.reset();
}

function downloadReport(format) {
  const avgScore = scoreHistory.length > 0
    ? Math.round(scoreHistory.reduce((a, b) => a + b.score, 0) / scoreHistory.length)
    : 100;

  const reportData = {
    app: 'PhysioTrace AI',
    timestamp: new Date().toISOString(),
    sessionDurationSec,
    averagePostureScore: avgScore,
    badPostureDurationSec: Math.round(badPostureSec),
    repsCompleted: repCounter.reps,
    mode: repCounter.mode,
    performance: { fps: window.currentFps, latencyMs: window.lastFrameLatency }
  };

  let blob, filename;
  if (format === 'json') {
    blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    filename = `PhysioTrace_Report_${Date.now()}.json`;
  } else {
    const csvContent = `Metric,Value\nTimestamp,${reportData.timestamp}\nDuration (s),${reportData.sessionDurationSec}\nAverage Score,${reportData.averagePostureScore}\nTime in Slouch (s),${reportData.badPostureDurationSec}\nReps Completed,${reportData.repsCompleted}`;
    blob = new Blob([csvContent], { type: 'text/csv' });
    filename = `PhysioTrace_Report_${Date.now()}.csv`;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function copySummaryToClipboard() {
  const summaryText = `PhysioTrace AI Session Summary:\nDuration: ${tileTime.textContent}\nAverage Score: ${tileAvgScore.textContent}\nTime in Slouch: ${tileBadTime.textContent}\nReps: ${tileReps.textContent}`;
  navigator.clipboard.writeText(summaryText);
  alert('Session summary copied to clipboard!');
}
