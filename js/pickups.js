/**
 * StrikeOps - Battlefield Pickups & Tactical Drops Engine
 * When hostile bots are eliminated, they drop physical 3D ammo crates,
 * equipment bags, and medical stims with pulsing glowing beacons.
 */

class PickupManager {
    constructor(scene) {
        this.scene = scene;
        this.pickups = [];

        this.initMaterials();
    }

    initMaterials() {
        // Ammo crate materials
        this.matAmmoBody = new THREE.MeshStandardMaterial({
            color: 0x2e352b, // Olive tactical
            roughness: 0.5,
            metalness: 0.8
        });

        this.matAmmoStripe = new THREE.MeshBasicMaterial({
            color: 0xffaa00 // Bright yellow caution band
        });

        // Equipment drop materials
        this.matEquipBody = new THREE.MeshStandardMaterial({
            color: 0x1f2b38,
            roughness: 0.6,
            metalness: 0.7
        });

        this.matEquipStripe = new THREE.MeshBasicMaterial({
            color: 0x00e5ff // Cyan tech stripe
        });

        // Medkit / Stim materials
        this.matStimBody = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.3,
            metalness: 0.4
        });

        this.matStimCross = new THREE.MeshBasicMaterial({
            color: 0x00ff66 // Medical cross
        });
    }

    spawnDrop(pos, forceType = null) {
        // 70% chance to drop unless forced
        if (!forceType && Math.random() > 0.70) return;

        const rand = Math.random();
        const type = forceType || (rand < 0.55 ? 'ammo' : (rand < 0.85 ? 'equipment' : 'stim'));

        const group = new THREE.Group();
        group.position.set(pos.x, 0.4, pos.z);

        let lightColor = 0xffaa00;

        if (type === 'ammo') {
            // Rectangular tactical ammo container
            const boxGeo = new THREE.BoxGeometry(0.35, 0.22, 0.22);
            const box = new THREE.Mesh(boxGeo, this.matAmmoBody);
            box.castShadow = true;
            group.add(box);

            const bandGeo = new THREE.BoxGeometry(0.36, 0.05, 0.23);
            const band = new THREE.Mesh(bandGeo, this.matAmmoStripe);
            group.add(band);

            lightColor = 0xffaa00;
        } else if (type === 'equipment') {
            // Square tactical ordnance satchel
            const boxGeo = new THREE.BoxGeometry(0.30, 0.25, 0.30);
            const box = new THREE.Mesh(boxGeo, this.matEquipBody);
            box.castShadow = true;
            group.add(box);

            const bandGeo = new THREE.BoxGeometry(0.31, 0.06, 0.31);
            const band = new THREE.Mesh(bandGeo, this.matEquipStripe);
            group.add(band);

            lightColor = 0x00e5ff;
        } else {
            // Medical Stim Pack
            const cylGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.28, 8);
            const cyl = new THREE.Mesh(cylGeo, this.matStimBody);
            cyl.castShadow = true;
            group.add(cyl);

            const crossH = new THREE.BoxGeometry(0.04, 0.12, 0.25);
            const crossMeshH = new THREE.Mesh(crossH, this.matStimCross);
            group.add(crossMeshH);

            lightColor = 0x00ff66;
        }

        // Glowing point light beacon
        const beaconLight = new THREE.PointLight(lightColor, 1.2, 4.0);
        beaconLight.position.set(0, 0.2, 0);
        group.add(beaconLight);

        this.scene.add(group);

        this.pickups.push({
            type: type,
            group: group,
            baseY: 0.4,
            spawnTime: performance.now() / 1000,
            life: 35.0 // Despawns after 35 seconds if ignored
        });
    }

    update(delta, time, player) {
        if (!player) return;

        for (let i = this.pickups.length - 1; i >= 0; i--) {
            const p = this.pickups[i];
            p.life -= delta;

            // Despawn on timeout
            if (p.life <= 0) {
                this.scene.remove(p.group);
                this.pickups.splice(i, 1);
                continue;
            }

            // Bobbing and rotation animation
            p.group.rotation.y += delta * 1.8;
            p.group.position.y = p.baseY + Math.sin(time * 3.0 + p.spawnTime) * 0.08;

            // Proximity check to player
            const dist = player.position.distanceTo(p.group.position);
            if (dist < 1.75) {
                this.collectPickup(p, player);
                this.scene.remove(p.group);
                this.pickups.splice(i, 1);
            }
        }
    }

    collectPickup(pickup, player) {
        window.soundEngine.playPickup();

        const feed = document.getElementById('hud-xp-feed');

        if (pickup.type === 'ammo') {
            // Replenish active gun ammo
            const activeId = player.weapons.activeWeaponId;
            const cfg = WEAPON_CONFIGS[activeId];
            if (cfg) {
                player.weapons.reserveAmmo[activeId] += cfg.magSize;
                player.updateAmmoHUD();
            }

            if (feed) {
                const toast = document.createElement('div');
                toast.className = 'xp-toast';
                toast.style.borderColor = '#ffaa00';
                toast.innerHTML = `<span class="xp-val" style="color:#ffaa00">+AMMO</span> <span class="xp-lbl">RESERVE RESUPPLY</span>`;
                feed.appendChild(toast);
                setTimeout(() => toast.remove(), 1600);
            }
        } else if (pickup.type === 'equipment') {
            // Replenish grenades
            if (window.strikeGame && window.strikeGame.equipmentManager) {
                const eq = window.strikeGame.equipmentManager;
                eq.fragCount = Math.min(eq.maxFrags, eq.fragCount + 1);
                eq.smokeCount = Math.min(eq.maxSmokes, eq.smokeCount + 1);
                eq.updateHUD();
            }

            if (feed) {
                const toast = document.createElement('div');
                toast.className = 'xp-toast';
                toast.style.borderColor = '#00e5ff';
                toast.innerHTML = `<span class="xp-val" style="color:#00e5ff">+ORDNANCE</span> <span class="xp-lbl">GRENADE RESTOCKED</span>`;
                feed.appendChild(toast);
                setTimeout(() => toast.remove(), 1600);
            }
        } else if (pickup.type === 'stim') {
            // Heal player
            player.health = Math.min(100, player.health + 40);
            player.lastDamageTime = 0; // Trigger instant recovery
            player.updateHealthHUD();

            if (feed) {
                const toast = document.createElement('div');
                toast.className = 'xp-toast';
                toast.style.borderColor = '#00ff66';
                toast.innerHTML = `<span class="xp-val" style="color:#00ff66">+STIM PACK</span> <span class="xp-lbl">VITALS RESTORED</span>`;
                feed.appendChild(toast);
                setTimeout(() => toast.remove(), 1600);
            }
        }
    }

    clearAll() {
        this.pickups.forEach(p => {
            this.scene.remove(p.group);
        });
        this.pickups = [];
    }
}

window.PickupManager = PickupManager;
