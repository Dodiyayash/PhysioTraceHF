/**
 * PhysioTrace AI - Math & Biomechanics Module (Dual View: Front & Side Support)
 */
import { POSTURE_THRESHOLDS } from './thresholds.js';

export const LANDMARKS = {
  NOSE: 0,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28
};

// Calculate angle between two vectors A->B and B->C in degrees (0 to 180)
export function calculate3PointAngle(A, B, C) {
  if (!A || !B || !C) return 0;
  const AB = { x: A.x - B.x, y: A.y - B.y };
  const CB = { x: C.x - B.x, y: C.y - B.y };
  const dot = AB.x * CB.x + AB.y * CB.y;
  const magAB = Math.hypot(AB.x, AB.y);
  const magCB = Math.hypot(CB.x, CB.y);
  if (magAB === 0 || magCB === 0) return 0;
  let cosTheta = dot / (magAB * magCB);
  cosTheta = Math.max(-1, Math.min(1, cosTheta));
  return (Math.acos(cosTheta) * 180) / Math.PI;
}

// Calculate vector tilt relative to vertical
export function calculateVerticalTilt(P1, P2) {
  if (!P1 || !P2) return 0;
  const dx = P2.x - P1.x;
  const dy = P2.y - P1.y;
  const angleRad = Math.atan2(Math.abs(dx), Math.abs(dy));
  return (angleRad * 180) / Math.PI;
}

// Calculate line tilt relative to horizontal (degrees)
export function calculateHorizontalTilt(P1, P2) {
  if (!P1 || !P2) return 0;
  const dx = Math.abs(P2.x - P1.x);
  const dy = Math.abs(P2.y - P1.y);
  if (dx < 0.001) return 90;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

export function computeJointAngles(landmarks) {
  if (!landmarks || landmarks.length < 29) {
    return { valid: false, reason: 'Show your head and shoulders' };
  }

  const leftEar = landmarks[LANDMARKS.LEFT_EAR];
  const rightEar = landmarks[LANDMARKS.RIGHT_EAR];
  const leftShoulder = landmarks[LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = landmarks[LANDMARKS.RIGHT_SHOULDER];

  const headJoints = [leftEar, rightEar, leftShoulder, rightShoulder];
  const visibleHeadJoints = headJoints.filter(j => j && (j.visibility || 0) >= 0.3).length;

  if (visibleHeadJoints < 2) {
    return { valid: false, reason: 'Show your head and shoulders' };
  }

  // Determine View Mode: Front vs Side based on horizontal shoulder distance
  const lsX = leftShoulder ? leftShoulder.x : 0;
  const rsX = rightShoulder ? rightShoulder.x : 0;
  const shoulderWidth = Math.abs(lsX - rsX);

  const viewMode = shoulderWidth >= POSTURE_THRESHOLDS.FRONT_VIEW_SHOULDER_WIDTH_MIN ? 'front' : 'side';

  // Hips & Legs optional visibility check
  const leftHip = landmarks[LANDMARKS.LEFT_HIP];
  const rightHip = landmarks[LANDMARKS.RIGHT_HIP];
  const leftKnee = landmarks[LANDMARKS.LEFT_KNEE];
  const rightKnee = landmarks[LANDMARKS.RIGHT_KNEE];
  const leftAnkle = landmarks[LANDMARKS.LEFT_ANKLE];
  const rightAnkle = landmarks[LANDMARKS.RIGHT_ANKLE];

  const hasHips = (leftHip?.visibility || 0) >= 0.35 || (rightHip?.visibility || 0) >= 0.35;

  let neckTilt = 0;
  let trunkLean = 0;
  let shoulderDiff = 0;
  let headTilt = 0;
  let frontHeadRatio = 0.75;
  let kneeAngle = 175;
  let elbowAngle = 90;

  if (viewMode === 'front') {
    // Front View Metrics
    if (leftShoulder && rightShoulder) {
      shoulderDiff = calculateHorizontalTilt(leftShoulder, rightShoulder);
    }
    if (leftEar && rightEar) {
      headTilt = calculateHorizontalTilt(leftEar, rightEar);
    }
    if (leftShoulder && rightShoulder && (leftEar || rightEar)) {
      const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
      const avgEarY = ((leftEar?.y || avgShoulderY - 0.15) + (rightEar?.y || avgShoulderY - 0.15)) / 2;
      const dy = avgShoulderY - avgEarY;
      if (shoulderWidth > 0.02) {
        frontHeadRatio = dy / shoulderWidth;
      }
    }
  } else {
    // Side View Metrics
    const isLeft = (leftEar?.visibility || 0) >= (rightEar?.visibility || 0);
    const ear = isLeft ? leftEar : rightEar;
    const shoulder = isLeft ? leftShoulder : rightShoulder;
    const hip = isLeft ? leftHip : rightHip;
    const knee = isLeft ? leftKnee : rightKnee;
    const ankle = isLeft ? leftAnkle : rightAnkle;

    if (ear && shoulder) {
      neckTilt = calculateVerticalTilt(shoulder, ear);
    }
    if (hasHips && shoulder && hip) {
      trunkLean = calculateVerticalTilt(hip, shoulder);
    }
    if (hip && knee && ankle && (knee.visibility || 0) >= 0.3) {
      kneeAngle = calculate3PointAngle(hip, knee, ankle);
    }
  }

  return {
    valid: true,
    viewMode,
    neckTilt: Math.round(neckTilt * 10) / 10,
    trunkLean: Math.round(trunkLean * 10) / 10,
    shoulderDiff: Math.round(shoulderDiff * 10) / 10,
    headTilt: Math.round(headTilt * 10) / 10,
    frontHeadRatio: Math.round(frontHeadRatio * 100) / 100,
    kneeAngle: Math.round(kneeAngle * 10) / 10,
    elbowAngle: Math.round(elbowAngle * 10) / 10,
    hasHips,
    landmarks: { leftEar, rightEar, leftShoulder, rightShoulder, leftHip, rightHip }
  };
}

export function applyEMA(prev, current, alpha = 0.3) {
  if (!prev) return { ...current };
  if (!current.valid) return current;

  return {
    ...current,
    neckTilt: Math.round((alpha * current.neckTilt + (1 - alpha) * prev.neckTilt) * 10) / 10,
    trunkLean: Math.round((alpha * current.trunkLean + (1 - alpha) * prev.trunkLean) * 10) / 10,
    shoulderDiff: Math.round((alpha * current.shoulderDiff + (1 - alpha) * prev.shoulderDiff) * 10) / 10,
    headTilt: Math.round((alpha * current.headTilt + (1 - alpha) * prev.headTilt) * 10) / 10,
    frontHeadRatio: Math.round((alpha * current.frontHeadRatio + (1 - alpha) * prev.frontHeadRatio) * 100) / 100,
    kneeAngle: Math.round((alpha * current.kneeAngle + (1 - alpha) * prev.kneeAngle) * 10) / 10,
    elbowAngle: Math.round((alpha * current.elbowAngle + (1 - alpha) * prev.elbowAngle) * 10) / 10
  };
}

export function calculatePostureScore(angles, baseline = null) {
  if (!angles || !angles.valid) {
    return { score: 0, grade: 'Invalid', violations: ['Show your head and shoulders'], status: 'invalid' };
  }

  let penalty = 0;
  const violations = [];
  const breachedJoints = [];

  if (angles.viewMode === 'front') {
    // Front View Score Evaluation
    const bRatio = baseline ? baseline.frontHeadRatio : 0.75;
    const ratioDrop = bRatio - angles.frontHeadRatio;

    if (ratioDrop > POSTURE_THRESHOLDS.FRONT_HEAD_SLOUCH.SAFE_MIN_RATIO_DROP) {
      const p = Math.min(POSTURE_THRESHOLDS.FRONT_HEAD_SLOUCH.MAX_PENALTY, (ratioDrop - 0.12) * POSTURE_THRESHOLDS.FRONT_HEAD_SLOUCH.PENALTY_WEIGHT);
      penalty += p;
      violations.push('Head & Neck Slouch');
      breachedJoints.push('neck');
    }

    if (angles.headTilt > POSTURE_THRESHOLDS.FRONT_HEAD_TILT.SAFE_MAX) {
      const p = Math.min(POSTURE_THRESHOLDS.FRONT_HEAD_TILT.MAX_PENALTY, (angles.headTilt - 8.0) * POSTURE_THRESHOLDS.FRONT_HEAD_TILT.PENALTY_WEIGHT);
      penalty += p;
      violations.push('Head Lateral Tilt');
      breachedJoints.push('neck');
    }

    if (angles.shoulderDiff > POSTURE_THRESHOLDS.SHOULDER_DIFF.SAFE_MAX) {
      const p = Math.min(POSTURE_THRESHOLDS.SHOULDER_DIFF.MAX_PENALTY, (angles.shoulderDiff - 5.5) * POSTURE_THRESHOLDS.SHOULDER_DIFF.PENALTY_WEIGHT);
      penalty += p;
      violations.push('Shoulders Uneven');
      breachedJoints.push('shoulders');
    }
  } else {
    // Side View Score Evaluation
    const bNeck = baseline ? baseline.neckTilt : POSTURE_THRESHOLDS.NECK_TILT_SIDE.SAFE_MAX;
    const neckLimit = Math.max(POSTURE_THRESHOLDS.NECK_TILT_SIDE.SAFE_MAX, bNeck);

    if (angles.neckTilt > neckLimit) {
      const diff = angles.neckTilt - neckLimit;
      const p = Math.min(POSTURE_THRESHOLDS.NECK_TILT_SIDE.MAX_PENALTY, diff * POSTURE_THRESHOLDS.NECK_TILT_SIDE.PENALTY_WEIGHT);
      penalty += p;
      violations.push('Neck Forward Tilt');
      breachedJoints.push('neck');
    }

    if (angles.hasHips && angles.trunkLean > POSTURE_THRESHOLDS.TRUNK_LEAN_SIDE.SAFE_MAX) {
      const diff = angles.trunkLean - POSTURE_THRESHOLDS.TRUNK_LEAN_SIDE.SAFE_MAX;
      const p = Math.min(POSTURE_THRESHOLDS.TRUNK_LEAN_SIDE.MAX_PENALTY, diff * POSTURE_THRESHOLDS.TRUNK_LEAN_SIDE.PENALTY_WEIGHT);
      penalty += p;
      violations.push('Trunk Slouch');
      breachedJoints.push('trunk');
    }
  }

  const rawScore = Math.max(0, Math.min(100, Math.round(100 - penalty)));

  let color = 'green';
  let grade = 'Excellent';

  if (rawScore < 60) {
    color = 'red';
    grade = 'Needs Work';
  } else if (rawScore < 80) {
    color = 'amber';
    grade = 'Good';
  } else if (rawScore < 90) {
    color = 'green';
    grade = 'Good';
  }

  return {
    score: rawScore,
    grade,
    violations,
    breachedJoints,
    color,
    status: 'ok'
  };
}
