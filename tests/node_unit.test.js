import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeJointAngles, applyEMA, calculatePostureScore, LANDMARKS } from '../public/js/math.js';
import { RepCounter } from '../public/js/rep_counter.js';

function createLandmarks(overrides = {}) {
  const landmarks = new Array(33).fill(null).map(() => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.9 }));
  Object.keys(overrides).forEach(idx => {
    landmarks[idx] = { ...landmarks[idx], ...overrides[idx] };
  });
  return landmarks;
}

test('Math: Upright front view scores at least 90', () => {
  const landmarks = createLandmarks({
    [LANDMARKS.LEFT_EAR]: { x: 0.38, y: 0.2, visibility: 0.95 },
    [LANDMARKS.RIGHT_EAR]: { x: 0.62, y: 0.2, visibility: 0.95 },
    [LANDMARKS.LEFT_SHOULDER]: { x: 0.35, y: 0.42, visibility: 0.98 },
    [LANDMARKS.RIGHT_SHOULDER]: { x: 0.65, y: 0.42, visibility: 0.98 }
  });

  const angles = computeJointAngles(landmarks);
  assert.equal(angles.valid, true);
  assert.equal(angles.viewMode, 'front');

  const score = calculatePostureScore(angles);
  assert.ok(score.score >= 90);
  assert.equal(score.violations.length, 0);
});

test('Math: Dropped head front view flags slouch', () => {
  const landmarks = createLandmarks({
    [LANDMARKS.LEFT_EAR]: { x: 0.38, y: 0.36, visibility: 0.95 },
    [LANDMARKS.RIGHT_EAR]: { x: 0.62, y: 0.36, visibility: 0.95 },
    [LANDMARKS.LEFT_SHOULDER]: { x: 0.35, y: 0.42, visibility: 0.98 },
    [LANDMARKS.RIGHT_SHOULDER]: { x: 0.65, y: 0.42, visibility: 0.98 }
  });

  const angles = computeJointAngles(landmarks);
  const score = calculatePostureScore(angles);

  assert.ok(score.violations.includes('Head & Neck Slouch'));
  assert.ok(score.score < 90);
});

test('Math: 25 degree side-view neck tilt produces score under 90, red neck joint, and neck warning', () => {
  const earX = 0.5 + Math.tan(25 * Math.PI / 180) * 0.15;
  const landmarks = createLandmarks({
    [LANDMARKS.RIGHT_EAR]: { x: earX, y: 0.2, visibility: 0.95 },
    [LANDMARKS.RIGHT_SHOULDER]: { x: 0.5, y: 0.35, visibility: 0.98 },
    [LANDMARKS.RIGHT_HIP]: { x: 0.5, y: 0.65, visibility: 0.98 }
  });

  const angles = computeJointAngles(landmarks);
  assert.equal(angles.viewMode, 'side');
  assert.ok(angles.neckTilt > 20);

  const score = calculatePostureScore(angles);
  assert.ok(score.score < 90);
  assert.ok(score.violations.includes('Neck Forward Tilt'));
  assert.ok(score.breachedJoints.includes('neck'));
});

test('Math: Shoulders tilted 10 degrees is flagged', () => {
  const dy = Math.tan(10 * Math.PI / 180) * 0.3;
  const landmarks = createLandmarks({
    [LANDMARKS.LEFT_EAR]: { x: 0.38, y: 0.2, visibility: 0.95 },
    [LANDMARKS.RIGHT_EAR]: { x: 0.62, y: 0.2, visibility: 0.95 },
    [LANDMARKS.LEFT_SHOULDER]: { x: 0.35, y: 0.42, visibility: 0.98 },
    [LANDMARKS.RIGHT_SHOULDER]: { x: 0.65, y: 0.42 + dy, visibility: 0.98 }
  });

  const angles = computeJointAngles(landmarks);
  assert.ok(angles.shoulderDiff > 8);

  const score = calculatePostureScore(angles);
  assert.ok(score.violations.includes('Shoulders Uneven'));
  assert.ok(score.breachedJoints.includes('shoulders'));
});

test('Math: Person with only head and shoulders visible is ready and valid', () => {
  const landmarks = new Array(33).fill(null).map(() => ({ x: 0, y: 0, z: 0, visibility: 0.05 }));
  landmarks[LANDMARKS.LEFT_EAR] = { x: 0.38, y: 0.2, visibility: 0.95 };
  landmarks[LANDMARKS.RIGHT_EAR] = { x: 0.62, y: 0.2, visibility: 0.95 };
  landmarks[LANDMARKS.LEFT_SHOULDER] = { x: 0.35, y: 0.42, visibility: 0.98 };
  landmarks[LANDMARKS.RIGHT_SHOULDER] = { x: 0.65, y: 0.42, visibility: 0.98 };

  const angles = computeJointAngles(landmarks);
  assert.equal(angles.valid, true);

  const score = calculatePostureScore(angles);
  assert.equal(score.status, 'ok');
  assert.ok(score.score >= 90);
});

test('RepCounter: Counts exactly 3 reps in full squat sequence', () => {
  const counter = new RepCounter('Squat');
  assert.equal(counter.reps, 0);

  const kneeSequence = [
    175, 170, 140, 110, 95, 90, 110, 145, 165,
    170, 130, 92, 120, 168,
    175, 120, 88, 140, 172
  ];

  kneeSequence.forEach(kneeAngle => {
    counter.update({ valid: true, kneeAngle });
  });

  assert.equal(counter.reps, 3);
});
