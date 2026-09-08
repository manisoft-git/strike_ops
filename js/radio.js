/**
 * StrikeOps - Tactical Radio Chatter & Military Comms Engine
 * Provides authentic Call of Duty style radio transmissions with
 * synthetic walkie-talkie squelches and on-screen telemetry subtitles.
 */

class RadioManager {
    constructor() {
        this.container = null;
        this.currentTimeout = null;
        this.initUI();
    }

    initUI() {
        // Find or create radio chatter display
        let el = document.getElementById('hud-radio-chatter');
        if (!el) {
            el = document.createElement('div');
            el.id = 'hud-radio-chatter';
            el.className = 'hud-radio-chatter';
            el.innerHTML = `
                <div class="radio-header">
                    <span class="radio-icon">📻</span>
                    <span id="radio-speaker" class="radio-speaker">HQ // OVERLORD</span>
                    <div class="radio-waveform">
                        <span></span><span></span><span></span><span></span>
                    </div>
                </div>
                <div id="radio-message" class="radio-message">SYSTEMS INITIALIZED</div>
            `;
            const hud = document.getElementById('hud-layer');
            if (hud) hud.appendChild(el);
        }
        this.container = el;
    }

    transmit(speaker, text, playSfx = true) {
        if (!this.container) this.initUI();
        if (!this.container) return;

        if (playSfx && window.soundEngine) {
            window.soundEngine.playRadioComms();
        }

        const speakerEl = document.getElementById('radio-speaker');
        const messageEl = document.getElementById('radio-message');

        if (speakerEl) speakerEl.textContent = speaker;
        if (messageEl) messageEl.textContent = `"${text}"`;

        this.container.classList.add('active');

        if (this.currentTimeout) clearTimeout(this.currentTimeout);
        this.currentTimeout = setTimeout(() => {
            this.container.classList.remove('active');
        }, 3600);
    }
}

window.radioManager = new RadioManager();
