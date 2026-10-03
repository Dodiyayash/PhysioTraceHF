/**
 * PhysioTrace AI - Repetition Counter State Machine
 */

export class RepCounter {
  constructor(mode = 'Desk Posture') {
    this.mode = mode;
    this.reps = 0;
    this.state = 'UP'; // 'UP', 'DOWN', or 'HOLD'
    this.holdStartTime = null;
    this.progress = 0; // 0 to 1 for UI ring
  }

  setMode(mode) {
    this.mode = mode;
    this.reset();
  }

  reset() {
    this.reps = 0;
    this.state = 'UP';
    this.holdStartTime = null;
    this.progress = 0;
  }

  update(angles) {
    if (!angles || !angles.valid) return { reps: this.reps, state: this.state, progress: this.progress };

    switch (this.mode) {
      case 'Squat':
        this.updateSquat(angles.kneeAngle);
        break;
      case 'Shoulder Raise':
        this.updateShoulderRaise(angles.elbowAngle, angles.trunkLean);
        break;
      case 'Neck Stretch':
        this.updateNeckStretch(angles.neckTilt);
        break;
      case 'Desk Posture':
      default:
        this.progress = 0;
        break;
    }

    return { reps: this.reps, state: this.state, progress: this.progress };
  }

  updateSquat(kneeAngle) {
    // knee < 100 => DOWN phase, knee > 160 => UP phase
    if (this.state === 'UP' && kneeAngle < 105) {
      this.state = 'DOWN';
    } else if (this.state === 'DOWN' && kneeAngle > 158) {
      this.state = 'UP';
      this.reps += 1;
    }

    // UI Progress calculation (180deg = 0%, 90deg = 100%)
    const clamped = Math.max(90, Math.min(170, kneeAngle));
    this.progress = Math.min(1, Math.max(0, (170 - clamped) / (170 - 90)));
  }

  updateShoulderRaise(elbowAngle, trunkLean) {
    // Elbow angle or arm elevation: > 130 => RAISED (DOWN state), < 60 => LOWERED (UP state)
    if (this.state === 'UP' && elbowAngle > 130) {
      this.state = 'DOWN';
    } else if (this.state === 'DOWN' && elbowAngle < 60) {
      this.state = 'UP';
      this.reps += 1;
    }

    const clamped = Math.max(50, Math.min(140, elbowAngle));
    this.progress = Math.min(1, Math.max(0, (clamped - 50) / (140 - 50)));
  }

  updateNeckStretch(neckTilt) {
    // Hold stretch tilt > 20 deg for 2.5 seconds
    if (neckTilt > 22) {
      if (!this.holdStartTime) {
        this.holdStartTime = Date.now();
      }
      const elapsed = Date.now() - this.holdStartTime;
      this.progress = Math.min(1, elapsed / 2500);

      if (elapsed >= 2500 && this.state !== 'HOLD') {
        this.state = 'HOLD';
        this.reps += 1;
      }
    } else {
      this.holdStartTime = null;
      this.state = 'UP';
      this.progress = 0;
    }
  }
}
