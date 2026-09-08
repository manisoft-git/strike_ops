/**
 * StrikeOps - Military Rank Progression, XP & Stats System
 * Saves persistent stats to localStorage and delivers Call of Duty style
 * XP toasts and Rank Up promotions.
 */

const RANKS = [
    { rank: 1, title: 'PRIVATE', xpReq: 0, icon: '★' },
    { rank: 2, title: 'PVT FIRST CLASS', xpReq: 500, icon: '★' },
    { rank: 3, title: 'CORPORAL', xpReq: 1200, icon: '★★' },
    { rank: 4, title: 'SERGEANT', xpReq: 2500, icon: '★★★' },
    { rank: 5, title: 'STAFF SERGEANT', xpReq: 4500, icon: '◆' },
    { rank: 6, title: 'MASTER SERGEANT', xpReq: 7500, icon: '◆◆' },
    { rank: 7, title: 'LIEUTENANT', xpReq: 12000, icon: '▲' },
    { rank: 8, title: 'CAPTAIN', xpReq: 18000, icon: '▲▲' },
    { rank: 9, title: 'MAJOR', xpReq: 26000, icon: '👑' },
    { rank: 10, title: 'COLONEL', xpReq: 36000, icon: '🎖️' },
    { rank: 11, title: 'GENERAL', xpReq: 50000, icon: '⭐' }
];

class ProgressionManager {
    constructor() {
        this.totalXP = 0;
        this.currentRankIndex = 0;
        this.careerKills = 0;
        this.careerHeadshots = 0;
        this.highestWave = 1;

        this.loadSave();
        this.updateHUD();
    }

    loadSave() {
        try {
            const data = localStorage.getItem('strikeops_progression');
            if (data) {
                const parsed = JSON.parse(data);
                this.totalXP = parsed.totalXP || 0;
                this.careerKills = parsed.careerKills || 0;
                this.careerHeadshots = parsed.careerHeadshots || 0;
                this.highestWave = parsed.highestWave || 1;
                this.calculateRank();
            }
        } catch(e) {
            console.warn('Could not load saved progression:', e);
        }
    }

    save() {
        try {
            const data = {
                totalXP: this.totalXP,
                careerKills: this.careerKills,
                careerHeadshots: this.careerHeadshots,
                highestWave: this.highestWave
            };
            localStorage.setItem('strikeops_progression', JSON.stringify(data));
        } catch(e) {}
    }

    calculateRank() {
        let idx = 0;
        for (let i = 0; i < RANKS.length; i++) {
            if (this.totalXP >= RANKS[i].xpReq) {
                idx = i;
            }
        }
        this.currentRankIndex = idx;
    }

    getCurrentRank() {
        return RANKS[this.currentRankIndex];
    }

    getNextRank() {
        if (this.currentRankIndex < RANKS.length - 1) {
            return RANKS[this.currentRankIndex + 1];
        }
        return null;
    }

    addXP(amount, reason) {
        const prevRankIdx = this.currentRankIndex;
        this.totalXP += amount;
        this.calculateRank();

        // Spawn XP Toast popup
        this.showXPPopup(amount, reason);

        // Check for Rank Up promotion
        if (this.currentRankIndex > prevRankIdx) {
            this.showRankUpBanner(this.getCurrentRank());
        }

        this.save();
        this.updateHUD();
    }

    recordKill(isHeadshot) {
        this.careerKills++;
        if (isHeadshot) {
            this.careerHeadshots++;
            this.addXP(150, 'HEADSHOT KILL');
        } else {
            this.addXP(100, 'ENEMY KILLED');
        }
    }

    recordWaveClear(waveNum) {
        if (waveNum > this.highestWave) {
            this.highestWave = waveNum;
        }
        this.addXP(250 + waveNum * 50, `WAVE ${waveNum} COMPLETED`);
    }

    showXPPopup(amount, reason) {
        const container = document.getElementById('hud-xp-feed');
        if (!container) return;

        const el = document.createElement('div');
        el.className = 'xp-toast';
        el.innerHTML = `<span class="xp-val">+${amount} XP</span> <span class="xp-lbl">${reason}</span>`;
        container.appendChild(el);

        setTimeout(() => { el.remove(); }, 1800);
    }

    showRankUpBanner(rank) {
        window.soundEngine.playKillConfirmed();

        const banner = document.getElementById('hud-rank-banner');
        const rankName = document.getElementById('rank-banner-name');
        const rankInsignia = document.getElementById('rank-banner-icon');

        if (banner && rankName && rankInsignia) {
            rankName.textContent = `RANK ${rank.rank} — ${rank.title}`;
            rankInsignia.textContent = rank.icon;
            banner.classList.add('show');
            setTimeout(() => { banner.classList.remove('show'); }, 3500);
        }
    }

    updateHUD() {
        const rank = this.getCurrentRank();
        const next = this.getNextRank();

        const rankBadge = document.getElementById('hud-rank-badge');
        const rankTitle = document.getElementById('hud-rank-title');
        const xpProgressFill = document.getElementById('hud-xp-fill');

        if (rankBadge) rankBadge.textContent = rank.icon;
        if (rankTitle) rankTitle.textContent = `${rank.title} (LVL ${rank.rank})`;

        if (xpProgressFill && next) {
            const currentFloor = rank.xpReq;
            const target = next.xpReq;
            const pct = Math.min(1.0, Math.max(0, (this.totalXP - currentFloor) / (target - currentFloor)));
            xpProgressFill.style.width = `${pct * 100}%`;
        }
    }
}

window.progressionManager = new ProgressionManager();
