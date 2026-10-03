import { describe, it, expect } from 'vitest';
import { computeJointAngles, applyEMA, calculatePostureScore, LANDMARKS } from '../public/js/math.js';
import { RepCounter } from '../public/js/rep_counter.js';

function createLandmarks(overrides = {}) {
  const landmarks = new Array(33).fill(null).map(() => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.9 }));
  Object.keys(overrides).forEach(idx => {
    landmarks[idx] = { ...landmarks[idx], ...overrides[idx] };
  });
  return landmarks;
}

describe('PhysioTrace AI Dual-View Biomechanics Unit Tests', () => {
  it('Upright front view scores at least 90', () => {
    // Front view fixture (shoulder width dx = 0.3 > 0.14)
    const landmarks = createLandmarks({
      [LANDMARKS.LEFT_EAR]: { x: 0.38, y: 0.2, visibility: 0.95 },
      [LANDMARKS.RIGHT_EAR]: { x: 0.62, y: 0.2, visibility: 0.95 },
      [LANDMARKS.LEFT_SHOULDER]: { x: 0.35, y: 0.42, visibility: 0.98 },
      [LANDMARKS.RIGHT_SHOULDER]: { x: 0.65, y: 0.42, visibility: 0.98 }
    });

    const angles = computeJointAngles(landmarks);
    expect(angles.valid).toBe(true);
    expect(angles.viewMode).toBe('front');

    const score = calculatePostureScore(angles);
    expect(score.score).toBeGreaterThanOrEqual(90);
    expect(score.violations).toHaveLength(0);
  });

  it('Dropped head front view flags slouch', () => {
    // Front view dropped head (ear y dropped closer to shoulder y)
    const landmarks = createLandmarks({
      [LANDMARKS.LEFT_EAR]: { x: 0.38, y: 0.36, visibility: 0.95 },
      [LANDMARKS.RIGHT_EAR]: { x: 0.62, y: 0.36, visibility: 0.95 },
      [LANDMARKS.LEFT_SHOULDER]: { x: 0.35, y: 0.42, visibility: 0.98 },
      [LANDMARKS.RIGHT_SHOULDER]: { x: 0.65, y: 0.42, visibility: 0.98 }
    });

    const angles = computeJointAngles(landmarks);
    const score = calculatePostureScore(angles);

    expect(score.violations).toContain('Head & Neck Slouch');
    expect(score.score).toBeLessThan(90);
  });

  it('25 degree side-view neck tilt produces score under 90, red neck joint, and neck warning', () => {
    // Side view fixture (shoulder width dx = 0.05 < 0.14)
    const earX = 0.5 + Math.tan(25 * Math.PI / 180) * 0.15;
    const landmarks = createLandmarks({
      [LANDMARKS.RIGHT_EAR]: { x: earX, y: 0.2, visibility: 0.95 },
      [LANDMARKS.RIGHT_SHOULDER]: { x: 0.5, y: 0.35, visibility: 0.98 },
      [LANDMARKS.RIGHT_HIP]: { x: 0.5, y: 0.65, visibility: 0.98 }
    });

    const angles = computeJointAngles(landmarks);
    expect(angles.viewMode).toBe('side');
    expect(angles.neckTilt).toBeGreaterThan(20);

    const score = calculatePostureScore(angles);
    expect(score.score).toBeLessThan(90);
    expect(score.violations).toContain('Neck Forward Tilt');
    expect(score.breachedJoints).toContain('neck');
  });

  it('Shoulders tilted 10 degrees is flagged', () => {
    // Front view with 10 degree shoulder tilt
    const dy = Math.tan(10 * Math.PI / 180) * 0.3;
    const landmarks = createLandmarks({
      [LANDMARKS.LEFT_EAR]: { x: 0.38, y: 0.2, visibility: 0.95 },
      [LANDMARKS.RIGHT_EAR]: { x: 0.62, y: 0.2, visibility: 0.95 },
      [LANDMARKS.LEFT_SHOULDER]: { x: 0.35, y: 0.42, visibility: 0.98 },
      [LANDMARKS.RIGHT_SHOULDER]: { x: 0.65, y: 0.42 + dy, visibility: 0.98 }
    });

    const angles = computeJointAngles(landmarks);
    expect(angles.shoulderDiff).toBeGreaterThan(8);

    const score = calculatePostureScore(angles);
    expect(score.violations).toContain('Shoulders Uneven');
    expect(score.breachedJoints).toContain('shoulders');
  });

  it('Person with only head and shoulders visible is ready and valid', () => {
    // Only ears and shoulders visible (hidden hips, knees, ankles)
    const landmarks = new Array(33).fill(null).map(() => ({ x: 0, y: 0, z: 0, visibility: 0.05 }));
    landmarks[LANDMARKS.LEFT_EAR] = { x: 0.38, y: 0.2, visibility: 0.95 };
    landmarks[LANDMARKS.RIGHT_EAR] = { x: 0.62, y: 0.2, visibility: 0.95 };
    landmarks[LANDMARKS.LEFT_SHOULDER] = { x: 0.35, y: 0.42, visibility: 0.98 };
    landmarks[LANDMARKS.RIGHT_SHOULDER] = { x: 0.65, y: 0.42, visibility: 0.98 };

    const angles = computeJointAngles(landmarks);
    expect(angles.valid).toBe(true);

    const score = calculatePostureScore(angles);
    expect(score.status).toBe('ok');
    expect(score.score).toBeGreaterThanOrEqual(90);
  });

  it('Counts exactly 3 reps in a full squat sequence', () => {
    const counter = new RepCounter('Squat');
    expect(counter.reps).toBe(0);

    const kneeSequence = [
      175, 170, 140, 110, 95, 90, 110, 145, 165,
      170, 130, 92, 120, 168,
      175, 120, 88, 140, 172
    ];

    kneeSequence.forEach(kneeAngle => {
      counter.update({ valid: true, kneeAngle });
    });

    expect(counter.reps).toBe(3);
  });
});
