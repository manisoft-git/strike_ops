/**
 * StrikeOps - Procedural Web Audio API Synthesizer
 * Zero audio assets required. All gunshots, reloads, hitmarkers,
 * footfalls, and tactical feedback are dynamically generated in real-time.
 */

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.sfxGain = null;
        this.initialized = false;
        this.muted = false;
    }

    init() {
        if (this.initialized) return;
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        this.ctx = new AudioCtx();

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
        this.sfxGain.connect(this.masterGain);

        this.initialized = true;
    }

    resumeIfNeeded() {
        if (!this.initialized) this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    createNoiseBuffer(duration = 0.5) {
        if (!this.ctx) return null;
        const bufferSize = Math.floor(this.ctx.sampleRate * duration);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            // Pinkish white noise with slight decay
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
        }
        return buffer;
    }

    playShot(weaponType = 'rifle') {
        this.resumeIfNeeded();
        if (!this.ctx || this.muted) return;

        const now = this.ctx.currentTime;

        if (weaponType === 'pistol') {
            // Crisp, punchy pop
            this._synthesizeShot({
                noiseDuration: 0.15,
                noiseFilterFreq: 1400,
                oscFreqStart: 280,
                oscFreqEnd: 40,
                oscDuration: 0.09,
                gain: 0.9
            });
        } else if (weaponType === 'sniper') {
            // Thunderous heavy cannon crack + deep sub-bass boom
            this._synthesizeShot({
                noiseDuration: 0.45,
                noiseFilterFreq: 800,
                oscFreqStart: 200,
                oscFreqEnd: 25,
                oscDuration: 0.28,
                gain: 1.2
            });
        } else if (weaponType === 'shotgun') {
            // Roaring wide-bore buckshot blast
            this._synthesizeShot({
                noiseDuration: 0.35,
                noiseFilterFreq: 950,
                oscFreqStart: 160,
                oscFreqEnd: 25,
                oscDuration: 0.22,
                gain: 1.4
            });
            setTimeout(() => {
                if (this.ctx) {
                    this._playMechanicalClick(this.ctx.currentTime, 850, 0.06, 0.4);
                    this._playMechanicalClick(this.ctx.currentTime + 0.08, 1100, 0.05, 0.5);
                }
            }, 350);
        } else if (weaponType === 'smg') {
            // Rapid snappy 9mm burst
            this._synthesizeShot({
                noiseDuration: 0.12,
                noiseFilterFreq: 1600,
                oscFreqStart: 250,
                oscFreqEnd: 50,
                oscDuration: 0.07,
                gain: 0.85
            });
        } else {
            // Assault Rifle: M4A1 military burst
            this._synthesizeShot({
                noiseDuration: 0.22,
                noiseFilterFreq: 1100,
                oscFreqStart: 220,
                oscFreqEnd: 35,
                oscDuration: 0.12,
                gain: 1.0
            });
        }
    }

    _synthesizeShot(config) {
        const now = this.ctx.currentTime;

        // 1. Noise transient (gunpowder detonation crack)
        const noiseBuffer = this.createNoiseBuffer(config.noiseDuration);
        if (noiseBuffer) {
            const noiseSource = this.ctx.createBufferSource();
            noiseSource.buffer = noiseBuffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(config.noiseFilterFreq, now);
            filter.frequency.exponentialRampToValueAtTime(150, now + config.noiseDuration);

            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(config.gain * 0.9, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + config.noiseDuration);

            noiseSource.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(this.sfxGain);

            noiseSource.start(now);
            noiseSource.stop(now + config.noiseDuration);
        }

        // 2. Low-end body & recoil kick (sub-oscillator)
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(config.oscFreqStart, now);
        osc.frequency.exponentialRampToValueAtTime(config.oscFreqEnd, now + config.oscDuration);

        oscGain.gain.setValueAtTime(config.gain * 0.7, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + config.oscDuration);

        osc.connect(oscGain);
        oscGain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + config.oscDuration);
    }

    playDryFire() {
        this.resumeIfNeeded();
        if (!this.ctx || this.muted) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1600, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.04);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.04);
    }

    playReload(duration = 1.8) {
        this.resumeIfNeeded();
        if (!this.ctx || this.muted) return;

        const now = this.ctx.currentTime;
        // Mechanical sequence:
        // Stage 1: Mag release click (immediate)
        this._playMechanicalClick(now + 0.05, 750, 0.06, 0.4);
        // Stage 2: Mag eject slide sound (at 0.25s)
        this._playMechanicalClick(now + 0.35, 500, 0.08, 0.35);
        // Stage 3: New mag slap in (at ~55% of duration)
        this._playMechanicalClick(now + duration * 0.52, 950, 0.09, 0.7);
        // Stage 4: Charging handle rack/release (at ~80% of duration)
        this._playMechanicalClick(now + duration * 0.78, 1400, 0.07, 0.6);
        this._playMechanicalClick(now + duration * 0.85, 1100, 0.06, 0.5);
    }

    _playMechanicalClick(time, freq, dur, vol) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.4, time + dur);

        gain.gain.setValueAtTime(vol * 0.4, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(time);
        osc.stop(time + dur);
    }

    playHitmarker(isHeadshot = false) {
        this.resumeIfNeeded();
        if (!this.ctx || this.muted) return;
        const now = this.ctx.currentTime;

        if (isHeadshot) {
            // High-pitched iconic headshot ping (metallic ding)
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(2400, now);
            osc.frequency.exponentialRampToValueAtTime(1800, now + 0.18);

            gain.gain.setValueAtTime(0.5, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now);
            osc.stop(now + 0.18);
        } else {
            // Crisp standard Call of Duty style double-tick
            const osc1 = this.ctx.createOscillator();
            const gain1 = this.ctx.createGain();
            osc1.type = 'triangle';
            osc1.frequency.setValueAtTime(1500, now);

            gain1.gain.setValueAtTime(0.35, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

            osc1.connect(gain1);
            gain1.connect(this.sfxGain);
            osc1.start(now);
            osc1.stop(now + 0.04);

            const osc2 = this.ctx.createOscillator();
            const gain2 = this.ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(1800, now + 0.02);

            gain2.gain.setValueAtTime(0.35, now + 0.02);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

            osc2.connect(gain2);
            gain2.connect(this.sfxGain);
            osc2.start(now + 0.02);
            osc2.stop(now + 0.06);
        }
    }

    playFootstep(isSprint = false) {
        this.resumeIfNeeded();
        if (!this.ctx || this.muted) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        const pitch = 70 + Math.random() * 20;
        osc.frequency.setValueAtTime(pitch, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.06);

        const vol = isSprint ? 0.28 : 0.15;
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.06);
    }

    playJump() {
        this.resumeIfNeeded();
        if (!this.ctx || this.muted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.exponentialRampToValueAtTime(240, now + 0.12);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.12);
    }

    playLand() {
        this.resumeIfNeeded();
        if (!this.ctx || this.muted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(90, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.14);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.14);
    }

    playKillConfirmed() {
        this.resumeIfNeeded();
        if (!this.ctx || this.muted) return;
        const now = this.ctx.currentTime;

        // Tactical bass drop + two-tone military radio confirmation
        const osc1 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(140, now);
        osc1.frequency.exponentialRampToValueAtTime(45, now + 0.3);
        gain1.gain.setValueAtTime(0.35, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc1.connect(gain1);
        gain1.connect(this.sfxGain);
        osc1.start(now);
        osc1.stop(now + 0.3);

        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, now + 0.08); // A5
        osc2.frequency.setValueAtTime(1174, now + 0.18); // D6
        gain2.gain.setValueAtTime(0.25, now + 0.08);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc2.connect(gain2);
        gain2.connect(this.sfxGain);
        osc2.start(now + 0.08);
        osc2.stop(now + 0.35);
    }

    playHurt() {
        this.resumeIfNeeded();
        if (!this.ctx || this.muted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.18);

        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.18);
    }

    playSuppressedShot() {
        this.resumeIfNeeded();
        if (!this.ctx || this.muted) return;
        const now = this.ctx.currentTime;

        // Pneumatic "thwip" pop
        const noiseBuffer = this.createNoiseBuffer(0.07);
        if (noiseBuffer) {
            const src = this.ctx.createBufferSource();
            src.buffer = noiseBuffer;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(500, now);
            filter.Q.setValueAtTime(3.0, now);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.4, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

            src.connect(filter);
            filter.connect(gain);
            gain.connect(this.sfxGain);
            src.start(now);
            src.stop(now + 0.07);
        }

        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.06);

        oscGain.gain.setValueAtTime(0.25, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        osc.connect(oscGain);
        oscGain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.06);
    }

    playBotGunfire() {
        this.resumeIfNeeded();
        if (!this.ctx || this.muted) return;
        const now = this.ctx.currentTime;

        // Distant snappy AK/rifle burst
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180 + Math.random() * 40, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.08);
    }

    playWaveStart() {
        this.resumeIfNeeded();
        if (!this.ctx || this.muted) return;
        const now = this.ctx.currentTime;

        // Tactical military warning horn (low brass chord)
        [130.81, 164.81, 196.00].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now);

            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now);
            osc.stop(now + 0.85);
        });
    }

    playWaveClear() {
        this.resumeIfNeeded();
        if (!this.ctx || this.muted) return;
        const now = this.ctx.currentTime;

        // Triumphant rising chime
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + i * 0.09);

            gain.gain.setValueAtTime(0.25, now + i * 0.09);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.4);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now + i * 0.09);
            osc.stop(now + i * 0.09 + 0.4);
        });
    }

    playAttachmentClick() {
        this.resumeIfNeeded();
        if (!this.ctx || this.muted) return;
        const now = this.ctx.currentTime;
        this._playMechanicalClick(now, 1200, 0.04, 0.45);
        this._playMechanicalClick(now + 0.03, 800, 0.05, 0.5);
    }

    playPickup() {
        this.resumeIfNeeded();
        if (!this.ctx || this.muted) return;
        const now = this.ctx.currentTime;
        this._playMechanicalClick(now, 1800, 0.03, 0.3);

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(987.77, now); // B5
        osc.frequency.exponentialRampToValueAtTime(1318.51, now + 0.08); // E6

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.16);
    }

    playRadioComms() {
        this.resumeIfNeeded();
        if (!this.ctx || this.muted) return;
        const now = this.ctx.currentTime;

        // Tactical radio squelch / static burst
        const noise = this.createNoiseBuffer(0.06);
        if (noise) {
            const src = this.ctx.createBufferSource();
            src.buffer = noise;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(2200, now);
            filter.Q.setValueAtTime(4.0, now);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

            src.connect(filter);
            filter.connect(gain);
            gain.connect(this.sfxGain);
            src.start(now);
            src.stop(now + 0.06);
        }

        // Two-tone walkie chirp
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(1400, now + 0.02);
        osc.frequency.setValueAtTime(2100, now + 0.06);

        oscGain.gain.setValueAtTime(0.08, now + 0.02);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(oscGain);
        oscGain.connect(this.sfxGain);
        osc.start(now + 0.02);
        osc.stop(now + 0.12);
    }

    playMedal() {
        this.resumeIfNeeded();
        if (!this.ctx || this.muted) return;
        const now = this.ctx.currentTime;

        [440, 554.37, 659.25, 880].forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.06);

            gain.gain.setValueAtTime(0.22, now + idx * 0.06);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.4);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now + idx * 0.06);
            osc.stop(now + idx * 0.06 + 0.4);
        });
    }
}

window.soundEngine = new SoundEngine();
