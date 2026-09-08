/**
 * StrikeOps - Tactical Perks Engine
 * Call of Duty 3-Tier Perk System:
 * - Tier 1: SCAVENGER (100% drop rate, +ammo) | LIGHTWEIGHT (+18% move speed)
 * - Tier 2: FAST HANDS (+45% reload/swap speed) | HARDLINE (-1 kill for killstreaks)
 * - Tier 3: QUICK FIX (instant regen on kill, 1.2s delay) | SPOTTER (permanent radar tracking)
 */

const AVAILABLE_PERKS = {
    tier1: [
        { id: 'scavenger', name: 'SCAVENGER', icon: '🎒', desc: '100% tactical drop rate from hostiles' },
        { id: 'lightweight', name: 'LIGHTWEIGHT', icon: '⚡', desc: '+18% operator sprint & move speed' }
    ],
    tier2: [
        { id: 'fasthands', name: 'FAST HANDS', icon: '🧤', desc: '+45% faster reload & weapon swap speed' },
        { id: 'hardline', name: 'HARDLINE', icon: '🎖️', desc: 'Killstreaks require 1 less kill' }
    ],
    tier3: [
        { id: 'quickfix', name: 'QUICK FIX', icon: '💉', desc: 'Kills immediately kickstart health regen' },
        { id: 'spotter', name: 'SPOTTER', icon: '📡', desc: 'Constant hostile sonar blips on mini-radar' }
    ]
};

class PerkManager {
    constructor() {
        this.selectedPerks = {
            tier1: 'scavenger',
            tier2: 'fasthands',
            tier3: 'quickfix'
        };

        this.loadSavedPerks();
    }

    loadSavedPerks() {
        try {
            const saved = localStorage.getItem('strikeops_perks');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.selectedPerks = Object.assign(this.selectedPerks, parsed);
            }
        } catch(e) {}
    }

    savePerks() {
        try {
            localStorage.setItem('strikeops_perks', JSON.stringify(this.selectedPerks));
        } catch(e) {}
    }

    hasPerk(perkId) {
        return (
            this.selectedPerks.tier1 === perkId ||
            this.selectedPerks.tier2 === perkId ||
            this.selectedPerks.tier3 === perkId
        );
    }

    setPerk(tier, perkId) {
        if (this.selectedPerks[tier] !== undefined) {
            this.selectedPerks[tier] = perkId;
            this.savePerks();
        }
    }
}

window.perkManager = new PerkManager();
