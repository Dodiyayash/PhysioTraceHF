/**
 * PhysioTrace AI - Audio & Speech Alert Manager
 */

export class AudioManager {
  constructor() {
    this.isMuted = false;
    this.trackingAnnounced = false;
    this.breachStartTime = null;
    this.lastSpokenTime = 0;
    this.lastGoodSpokenTime = Date.now();
    this.wasBreaching = false;
  }

  setMuted(muted) {
    this.isMuted = muted;
    const synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
    if (this.isMuted && synth) {
      try { synth.cancel(); } catch (e) {}
    }
  }

  toggleMute() {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  speak(text) {
    if (this.isMuted) return;
    const synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
    if (!synth) return;

    try {
      try { synth.cancel(); } catch (e) {}
      
      const utterance = typeof SpeechSynthesisUtterance !== 'undefined'
        ? new SpeechSynthesisUtterance(text)
        : text;

      synth.speak(utterance);
    } catch (err) {
      console.warn('[Audio] Speech error:', err.message);
    }
  }

  announceStart() {
    this.speak('Voice coaching on');
  }

  announceTrackingStarted() {
    if (!this.trackingAnnounced) {
      this.trackingAnnounced = true;
      this.speak('Tracking started');
      this.lastGoodSpokenTime = Date.now();
    }
  }

  updateBreachState(violations = []) {
    const synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
    if (this.isMuted || !synth) return;
    const now = Date.now();
    const isBreaching = violations.length > 0;

    if (isBreaching) {
      if (!this.breachStartTime) {
        this.breachStartTime = now;
      }
      this.wasBreaching = true;

      const breachDuration = now - this.breachStartTime;
      const cooldownDuration = now - this.lastSpokenTime;

      if (breachDuration >= 1200 && cooldownDuration >= 6000) {
        this.speak(`Correction: ${violations[0]}`);
        this.lastSpokenTime = now;
      }
    } else {
      if (this.wasBreaching) {
        this.wasBreaching = false;
        this.breachStartTime = null;
        this.speak('Good posture. Hold it there.');
        this.lastGoodSpokenTime = now;
      } else {
        if (now - this.lastGoodSpokenTime >= 20000) {
          this.speak('Posture looks good');
          this.lastGoodSpokenTime = now;
        }
      }
    }
  }
}
