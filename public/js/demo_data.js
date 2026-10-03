/**
 * PhysioTrace AI - Synthetic Pose Landmarks Generator for Demo Mode
 */

export function generateSyntheticPose(frameIndex, mode = 'Desk Posture') {
  // Normalized 0 to 1 canvas coordinates
  const t = frameIndex * 0.05;

  let neckTiltOffset = 0;
  let trunkLeanOffset = 0;
  let kneeAngleOffset = 0;

  if (mode === 'Squat') {
    // Oscillate knee angle between 170 (standing) and 90 (deep squat)
    const cycle = (Math.sin(t * 1.5) + 1) / 2; // 0 to 1
    kneeAngleOffset = cycle * 80; // 0 to 80 deg bend
  } else {
    // Desk posture simulation: alternating good (0-4s), slouched (4-9s), good (9-12s)
    const phase = (Math.floor(t / 4) % 3);
    if (phase === 1) {
      // Slump phase
      neckTiltOffset = 25 + Math.sin(t * 2) * 3; // ~28-30 deg tilt
      trunkLeanOffset = 18 + Math.cos(t * 2) * 2; // ~20 deg tilt
    } else {
      // Good posture phase
      neckTiltOffset = 10 + Math.sin(t) * 2;
      trunkLeanOffset = 8 + Math.cos(t) * 1.5;
    }
  }

  // Base keypoints (Right side view)
  const earY = 0.25;
  const shoulderY = 0.38;
  const hipY = 0.65;
  const kneeY = 0.82;
  const ankleY = 0.95;

  const earX = 0.5 + Math.sin((neckTiltOffset * Math.PI) / 180) * 0.15;
  const shoulderX = 0.5;
  const hipX = 0.48 + Math.sin((trunkLeanOffset * Math.PI) / 180) * 0.1;

  // Squat knee shift
  const kneeX = 0.55 + (kneeAngleOffset / 80) * 0.12;

  const landmarks = new Array(33).fill(null).map(() => ({ x: 0, y: 0, z: 0, visibility: 0.1 }));

  // Populate key joints (Right side)
  landmarks[8] = { x: earX, y: earY, z: 0, visibility: 0.95 }; // RIGHT_EAR
  landmarks[12] = { x: shoulderX, y: shoulderY, z: 0, visibility: 0.98 }; // RIGHT_SHOULDER
  landmarks[14] = { x: shoulderX + 0.08, y: shoulderY + 0.15, z: 0, visibility: 0.95 }; // RIGHT_ELBOW
  landmarks[16] = { x: shoulderX + 0.12, y: shoulderY + 0.25, z: 0, visibility: 0.92 }; // RIGHT_WRIST
  landmarks[24] = { x: hipX, y: hipY, z: 0, visibility: 0.98 }; // RIGHT_HIP
  landmarks[26] = { x: kneeX, y: kneeY, z: 0, visibility: 0.96 }; // RIGHT_KNEE
  landmarks[28] = { x: 0.48, y: ankleY, z: 0, visibility: 0.95 }; // RIGHT_ANKLE

  // Populate left side slightly dimmed for depth
  landmarks[7] = { x: earX - 0.02, y: earY, z: 0.05, visibility: 0.8 };
  landmarks[11] = { x: shoulderX - 0.03, y: shoulderY, z: 0.05, visibility: 0.85 };
  landmarks[23] = { x: hipX - 0.03, y: hipY, z: 0.05, visibility: 0.85 };
  landmarks[25] = { x: kneeX - 0.03, y: kneeY, z: 0.05, visibility: 0.82 };
  landmarks[27] = { x: 0.45, y: ankleY, z: 0.05, visibility: 0.8 };

  return landmarks;
}
