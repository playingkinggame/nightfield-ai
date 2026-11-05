/**
 * Generative procedural ambient synthesizer for NIGHTFIELD
 * Generates an evolving meditative soundscape via Web Audio API.
 * Zero external audio files. Starts strictly MUTED.
 */

class AmbientSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private oscillators: OscillatorNode[] = [];
  private lfoNode: OscillatorNode | null = null;
  private lfoGain: GainNode | null = null;
  private isMuted: boolean = true;
  private isHoverMuffled: boolean = false;
  private isInitialized: boolean = false;

  private init() {
    if (this.isInitialized) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master gain node
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

      // Low pass filter
      this.filterNode = this.ctx.createBiquadFilter();
      this.filterNode.type = "lowpass";
      this.filterNode.frequency.setValueAtTime(1200, this.ctx.currentTime);
      this.filterNode.Q.setValueAtTime(2.5, this.ctx.currentTime);

      // Connect filter to master gain to destination
      this.filterNode.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      // Harmonic chords (D-minor / Pentatonic meditative frequencies: D, F, A, C, E)
      const frequencies = [73.42, 110.0, 146.83, 174.61, 220.0, 261.63, 329.63];

      frequencies.forEach((freq, i) => {
        if (!this.ctx || !this.filterNode) return;
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();

        osc.type = i % 2 === 0 ? "sine" : "triangle";
        // Gentle micro-detuning for chorus shimmer
        osc.frequency.setValueAtTime(freq + (Math.random() - 0.5) * 0.8, this.ctx.currentTime);

        const individualVolume = (0.05 / frequencies.length) * (1 - (i / frequencies.length) * 0.3);
        oscGain.gain.setValueAtTime(individualVolume, this.ctx.currentTime);

        osc.connect(oscGain);
        oscGain.connect(this.filterNode);
        osc.start();
        this.oscillators.push(osc);
      });

      // Subtle LFO for breathing filter sweep
      this.lfoNode = this.ctx.createOscillator();
      this.lfoGain = this.ctx.createGain();
      this.lfoNode.type = "sine";
      this.lfoNode.frequency.setValueAtTime(0.08, this.ctx.currentTime); // 12-second cycle
      this.lfoGain.gain.setValueAtTime(350, this.ctx.currentTime);

      this.lfoNode.connect(this.lfoGain);
      this.lfoGain.connect(this.filterNode.frequency);
      this.lfoNode.start();

      this.isInitialized = true;
    } catch {
      // AudioContext may fail if browser restricts audio
    }
  }

  public toggleMute(): boolean {
    if (!this.isInitialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }

    this.isMuted = !this.isMuted;
    this.updateGain();
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public startHoverMuffle() {
    this.isHoverMuffled = true;
    if (!this.ctx || !this.filterNode) return;
    const now = this.ctx.currentTime;
    this.filterNode.frequency.cancelScheduledValues(now);
    this.filterNode.frequency.setTargetAtTime(320, now, 0.4); // Smooth muffle to 320Hz
  }

  public stopHoverMuffle() {
    this.isHoverMuffled = false;
    if (!this.ctx || !this.filterNode) return;
    const now = this.ctx.currentTime;
    this.filterNode.frequency.cancelScheduledValues(now);
    this.filterNode.frequency.setTargetAtTime(1200, now, 0.5); // Back to bright 1200Hz
  }

  private updateGain() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);

    if (this.isMuted) {
      // Fade out
      this.masterGain.gain.setTargetAtTime(0.0001, now, 0.4);
    } else {
      // Gentle fade in
      this.masterGain.gain.setTargetAtTime(0.22, now, 0.8);
    }
  }

  public playTick() {
    // Subtle tactile click on UI interaction
    if (this.isMuted || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, this.ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.02, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch {
      // Ignore
    }
  }
}

export const ambientSound = new AmbientSoundEngine();
