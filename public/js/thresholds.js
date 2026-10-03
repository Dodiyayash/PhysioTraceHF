/**
 * PhysioTrace AI - Shared Thresholds & Biomechanics Config
 */

export const POSTURE_THRESHOLDS = {
  // Side View
  NECK_TILT_SIDE: {
    SAFE_MAX: 20,
    PENALTY_WEIGHT: 2.5,
    MAX_PENALTY: 45,
    LABEL: 'Neck Forward Tilt',
    WARN_MESSAGE: 'Pull head back over shoulders',
    DIRECTION_ARROW: '⬆️'
  },
  TRUNK_LEAN_SIDE: {
    SAFE_MAX: 16,
    PENALTY_WEIGHT: 2.5,
    MAX_PENALTY: 40,
    LABEL: 'Trunk Slouch Lean',
    WARN_MESSAGE: 'Sit tall and engage core',
    DIRECTION_ARROW: '⬆️'
  },
  // Front View
  FRONT_HEAD_SLOUCH: {
    SAFE_MIN_RATIO_DROP: 0.15, // Ratio drop from baseline (ear-shoulder vertical distance / shoulder width)
    PENALTY_WEIGHT: 120,
    MAX_PENALTY: 45,
    LABEL: 'Head & Neck Slouch',
    WARN_MESSAGE: 'Lift your head and sit upright',
    DIRECTION_ARROW: '⬆️'
  },
  FRONT_HEAD_TILT: {
    SAFE_MAX: 8.0, // degrees
    PENALTY_WEIGHT: 3.0,
    MAX_PENALTY: 30,
    LABEL: 'Head Lateral Tilt',
    WARN_MESSAGE: 'Keep head level and straight',
    DIRECTION_ARROW: '↔️'
  },
  SHOULDER_DIFF: {
    SAFE_MAX: 5.5, // degrees
    PENALTY_WEIGHT: 3.0,
    MAX_PENALTY: 25,
    LABEL: 'Shoulders Uneven',
    WARN_MESSAGE: 'Level your shoulders evenly',
    DIRECTION_ARROW: '↔️'
  },
  KNEE_ANGLE: {
    STANDING_MIN: 155,
    SQUAT_DOWN_MAX: 105,
    SQUAT_UP_MIN: 158,
    LABEL: 'Knee Flexion'
  },
  // Front vs Side view threshold (shoulder width in normalized coords)
  FRONT_VIEW_SHOULDER_WIDTH_MIN: 0.14,
  MIN_HEAD_SHOULDER_LANDMARKS: 4 // At least 4 of (ears, shoulders) with visibility >= 0.3
};
