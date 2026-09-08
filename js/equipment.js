/**
 * StrikeOps - Tactical Equipment & Ballistic Explosives Engine
 * Features:
 * - Physics-simulated Frag Grenades with bounce, fuse timers, and radius damage
 * - Tactical Smoke Grenades creating volumetric line-of-sight blocking clouds
 * - Camera shockwave impulses and explosive debris particle systems
 */

class EquipmentManager {
    constructor(scene, map, targetManager, player) {
        this.scene = scene;
        this.map = map;
        this.targetManager = targetManager;
        this.player = player;

        this.fragCount = 2;
        this.maxFrags = 2;
        this.smokeCount = 2;
        this.maxSmokes = 2;

        this.activeGrenades = [];
        this.smokeClouds = [];
        this.explosions = [];

        this.initMaterials();
    }

    initMaterials() {
        this.matFrag = new THREE.MeshStandardMaterial({
            color: 0x3b4a2e, // Olive drab
            roughness: 0.6,
            metalness: 0.7
        });

        this.matSmokeCanister = new THREE.MeshStandardMaterial({
            color: 0xcccccc,
            roughness: 0.4,
            metalness: 0.8
        });

        this.matExplosion = new THREE.MeshBasicMaterial({
            color: 0xff6600,
            transparent: true,
            opacity: 0.9
        });
    }

    throwFrag(camera) {
        if (this.fragCount <= 0) {
            window.soundEngine.playDryFire();
            return false;
        }

        this.fragCount--;
        this.updateHUD();

        // Pin pull & throw sound
        window.soundEngine.playAttachmentClick();
        if (window.radioManager) window.radioManager.transmit('OPERATOR // GHOST', 'Frag out!');

        // Create 3D Grenade Mesh
        const geo = new THREE.SphereGeometry(0.1, 8, 8);
        const mesh = new THREE.Mesh(geo, this.matFrag);
        mesh.castShadow = true;

        // Spawn position: in front of camera
        const fwd = new THREE.Vector3();
        camera.getWorldDirection(fwd);

        mesh.position.copy(camera.position).add(fwd.clone().multiplyScalar(0.6));
        this.scene.add(mesh);

        // Throw velocity (forward + upward arc)
        const throwForce = 18.0;
        const vel = fwd.clone().multiplyScalar(throwForce).add(new THREE.Vector3(0, 3.5, 0));

        this.activeGrenades.push({
            type: 'frag',
            mesh: mesh,
            velocity: vel,
            fuseTime: 2.8, // 2.8s fuse
            bounces: 0
        });

        return true;
    }

    throwSmoke(camera) {
        if (this.smokeCount <= 0) {
            window.soundEngine.playDryFire();
            return false;
        }

        this.smokeCount--;
        this.updateHUD();
        window.soundEngine.playAttachmentClick();
        if (window.radioManager) window.radioManager.transmit('OPERATOR // GHOST', 'Deploying smoke screen!');

        // Cylinder Canister
        const geo = new THREE.CylinderGeometry(0.06, 0.06, 0.16, 8);
        const mesh = new THREE.Mesh(geo, this.matSmokeCanister);
        mesh.castShadow = true;

        const fwd = new THREE.Vector3();
        camera.getWorldDirection(fwd);
        mesh.position.copy(camera.position).add(fwd.clone().multiplyScalar(0.6));
        this.scene.add(mesh);

        const throwForce = 16.0;
        const vel = fwd.clone().multiplyScalar(throwForce).add(new THREE.Vector3(0, 3.0, 0));

        this.activeGrenades.push({
            type: 'smoke',
            mesh: mesh,
            velocity: vel,
            fuseTime: 1.8,
            bounces: 0
        });

        return true;
    }

    detonateFrag(pos) {
        // 1. Play massive explosion sound
        this.playExplosionAudio();

        // 2. Camera shake impulse
        if (this.player) {
            const dist = this.player.position.distanceTo(pos);
            const shake = Math.max(0, 1.0 - dist / 25.0) * 0.12;
            if (shake > 0) this.player.applyCameraShake(shake);

            // Damage player if in blast radius (<7m)
            if (dist < 7.0) {
                const dmg = Math.round((1.0 - dist / 7.0) * 85);
                this.player.takeDamage(dmg);
            }
        }

        // 3. Damage Hostile Bots in radius (<9m)
        if (this.targetManager) {
            this.targetManager.targets.forEach(t => {
                if (t.isDead) return;
                const dist = t.group.position.distanceTo(pos);
                if (dist < 9.0) {
                    const dmg = Math.round((1.0 - dist / 9.0) * 160);
                    t.health = Math.max(0, t.health - dmg);
                    t.flinchAngle = 0.5;
                    this.targetManager.spawnFloatingText(t.group.position, `+${dmg} BLAST!`, true);
                    this.targetManager.updateHealthBar(t);

                    if (t.health <= 0) {
                        t.isDead = true;
                        this.targetManager.totalKills++;
                        window.soundEngine.playKillConfirmed();
                        if (this.player) {
                            this.player.broadcastKill(t.label, false);
                            window.gameScore = (window.gameScore || 0) + 120;
                            window.gameKills = (window.gameKills || 0) + 1;
                            this.player.updateScoreHUD();

                            if (window.strikeGame && window.strikeGame.killstreakManager) {
                                window.strikeGame.killstreakManager.onKill();
                            }
                            if (window.progressionManager) {
                                window.progressionManager.recordKill(false);
                            }
                            if (window.strikeGame && window.strikeGame.pickupManager) {
                                window.strikeGame.pickupManager.spawnDrop(t.group.position);
                            }
                        }
                        if (this.targetManager.gameMode === 'survival') {
                            this.scene.remove(t.group);
                        } else {
                            t.respawnTime = performance.now() / 1000 + 3.0;
                            t.group.position.y = -10;
                        }
                        this.targetManager.checkWaveProgress();
                    }
                }
            });
        }

        // 4. Visual Explosion Fireball & Shockwave
        const fireballGeo = new THREE.SphereGeometry(2.5, 12, 12);
        const fireball = new THREE.Mesh(fireballGeo, this.matExplosion.clone());
        fireball.position.copy(pos);
        this.scene.add(fireball);

        // Flash point light
        const light = new THREE.PointLight(0xff6611, 8.0, 20);
        light.position.copy(pos);
        this.scene.add(light);

        this.explosions.push({
            mesh: fireball,
            light: light,
            life: 0.35,
            maxLife: 0.35
        });

        // Spawn explosive debris sparks
        if (this.targetManager) {
            this.targetManager.spawnSparks(pos);
        }
    }

    deploySmoke(pos) {
        // Spawn expanding smoke sphere particles
        const smokeGroup = new THREE.Group();
        smokeGroup.position.copy(pos);

        const matCloud = new THREE.MeshStandardMaterial({
            color: 0xdde5ed,
            roughness: 0.9,
            transparent: true,
            opacity: 0.8
        });

        for (let i = 0; i < 7; i++) {
            const r = 1.6 + Math.random() * 0.8;
            const geo = new THREE.SphereGeometry(r, 8, 8);
            const puff = new THREE.Mesh(geo, matCloud.clone());
            puff.position.set(
                (Math.random() - 0.5) * 2.5,
                0.8 + Math.random() * 1.5,
                (Math.random() - 0.5) * 2.5
            );
            smokeGroup.add(puff);
        }

        this.scene.add(smokeGroup);

        this.smokeClouds.push({
            group: smokeGroup,
            life: 14.0, // Lasts 14 seconds
            maxLife: 14.0
        });
    }

    playExplosionAudio() {
        if (!window.soundEngine || !window.soundEngine.ctx) return;
        const ctx = window.soundEngine.ctx;
        const now = ctx.currentTime;

        // Sub-bass detonation thump
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + 0.5);

        oscGain.gain.setValueAtTime(1.5, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        osc.connect(oscGain);
        oscGain.connect(window.soundEngine.sfxGain);
        osc.start(now);
        osc.stop(now + 0.5);

        // Crackle / blast noise
        const noise = window.soundEngine.createNoiseBuffer(0.8);
        if (noise) {
            const src = ctx.createBufferSource();
            src.buffer = noise;
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(600, now);
            filter.frequency.exponentialRampToValueAtTime(80, now + 0.8);

            const nGain = ctx.createGain();
            nGain.gain.setValueAtTime(1.8, now);
            nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

            src.connect(filter);
            filter.connect(nGain);
            nGain.connect(window.soundEngine.sfxGain);
            src.start(now);
            src.stop(now + 0.8);
        }
    }

    resupply() {
        this.fragCount = this.maxFrags;
        this.smokeCount = this.maxSmokes;
        this.updateHUD();
    }

    updateHUD() {
        const fragEl = document.getElementById('hud-frag-count');
        const smokeEl = document.getElementById('hud-smoke-count');
        if (fragEl) fragEl.textContent = this.fragCount;
        if (smokeEl) smokeEl.textContent = this.smokeCount;
    }

    update(delta) {
        // Update Grenades
        for (let i = this.activeGrenades.length - 1; i >= 0; i--) {
            const g = this.activeGrenades[i];
            g.fuseTime -= delta;

            // Gravity
            g.velocity.y -= 18.0 * delta;

            // Movement
            g.mesh.position.x += g.velocity.x * delta;
            g.mesh.position.y += g.velocity.y * delta;
            g.mesh.position.z += g.velocity.z * delta;

            // Floor bounce
            if (g.mesh.position.y <= 0.1) {
                g.mesh.position.y = 0.1;
                g.velocity.y = -g.velocity.y * 0.45; // Energy loss
                g.velocity.x *= 0.65;
                g.velocity.z *= 0.65;
                g.bounces++;
            }

            // Tumble rotation
            g.mesh.rotation.x += g.velocity.z * delta * 2;
            g.mesh.rotation.z -= g.velocity.x * delta * 2;

            // Detonation
            if (g.fuseTime <= 0) {
                if (g.type === 'frag') {
                    this.detonateFrag(g.mesh.position.clone());
                } else {
                    this.deploySmoke(g.mesh.position.clone());
                }

                this.scene.remove(g.mesh);
                g.mesh.geometry.dispose();
                this.activeGrenades.splice(i, 1);
            }
        }

        // Update Explosions
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const exp = this.explosions[i];
            exp.life -= delta;
            const progress = 1 - (exp.life / exp.maxLife);

            // Expanding sphere
            const scale = 1.0 + progress * 2.5;
            exp.mesh.scale.set(scale, scale, scale);
            exp.mesh.material.opacity = (1 - progress);
            exp.light.intensity = (1 - progress) * 8.0;

            if (exp.life <= 0) {
                this.scene.remove(exp.mesh);
                this.scene.remove(exp.light);
                exp.mesh.geometry.dispose();
                exp.mesh.material.dispose();
                this.explosions.splice(i, 1);
            }
        }

        // Update Smoke Clouds
        for (let i = this.smokeClouds.length - 1; i >= 0; i--) {
            const sm = this.smokeClouds[i];
            sm.life -= delta;
            const scale = 1.0 + (1 - (sm.life / sm.maxLife)) * 0.6;
            sm.group.scale.set(scale, scale, scale);

            if (sm.life < 3.0) {
                // Fade out
                const alpha = sm.life / 3.0;
                sm.group.children.forEach(puff => {
                    puff.material.opacity = alpha * 0.8;
                });
            }

            if (sm.life <= 0) {
                this.scene.remove(sm.group);
                this.smokeClouds.splice(i, 1);
            }
        }
    }
}

window.EquipmentManager = EquipmentManager;
