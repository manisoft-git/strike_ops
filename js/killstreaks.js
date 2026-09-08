/**
 * StrikeOps - Tactical Killstreaks & Scorestreaks Engine
 * Authentic Call of Duty mechanics:
 * - 3 Kills: Tactical UAV Radar Sweep (30s active hostile tracker)
 * - 5 Kills: Deployable 3D Automated Sentry Turret (swivels & engages hostiles)
 * - 7 Kills: Precision Drone Airstrike (cluster missile devastation)
 */

class KillstreakManager {
    constructor(scene, targetManager, equipmentManager, player) {
        this.scene = scene;
        this.targetManager = targetManager;
        this.equipmentManager = equipmentManager;
        this.player = player;

        this.currentStreak = 0;
        this.highestStreak = 0;

        // Streak states
        this.streaks = {
            uav: { killsReq: 3, name: 'TACTICAL UAV', unlocked: false, active: false, timer: 0 },
            sentry: { killsReq: 5, name: 'SENTRY TURRET', unlocked: false, count: 0 },
            airstrike: { killsReq: 7, name: 'DRONE STRIKE', unlocked: false, count: 0 }
        };

        this.deployedSentries = [];
        this.activeMissiles = [];

        this.initMaterials();
        this.setupEventListeners();
    }

    initMaterials() {
        this.matTurretSteel = new THREE.MeshStandardMaterial({
            color: 0x1f242b,
            roughness: 0.35,
            metalness: 0.85
        });

        this.matTurretAccent = new THREE.MeshStandardMaterial({
            color: 0xcc6600,
            roughness: 0.5,
            metalness: 0.4
        });

        this.matTurretSensor = new THREE.MeshBasicMaterial({
            color: 0x00e5ff
        });
    }

    setupEventListeners() {
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Digit4') this.activateUAV();
            if (e.code === 'Digit5') this.deploySentry();
            if (e.code === 'Digit6') this.callAirstrike();
        });
    }

    getReq(key) {
        const base = this.streaks[key].killsReq;
        return (window.perkManager && window.perkManager.hasPerk('hardline')) ? Math.max(1, base - 1) : base;
    }

    onKill() {
        this.currentStreak++;
        this.highestStreak = Math.max(this.highestStreak, this.currentStreak);

        // Check streak unlocks
        for (let key in this.streaks) {
            const st = this.streaks[key];
            const req = this.getReq(key);
            if (this.currentStreak >= req && !st.unlocked) {
                st.unlocked = true;
                if (key === 'sentry') st.count++;
                if (key === 'airstrike') st.count++;
                this.announceStreakUnlocked(st.name);
                if (window.radioManager) {
                    window.radioManager.transmit('HQ // OVERLORD', `${st.name} standing by for deployment.`);
                }
            }
        }

        this.updateHUD();
    }

    onDeath() {
        this.currentStreak = 0;
        this.updateHUD();
    }

    announceStreakUnlocked(streakName) {
        window.soundEngine.playKillConfirmed();
        const feed = document.getElementById('hud-killfeed');
        if (feed) {
            const entry = document.createElement('div');
            entry.className = 'killfeed-entry';
            entry.style.borderLeftColor = '#00e5ff';
            entry.innerHTML = `<span style="color:#00e5ff">KILLSTREAK READY</span> • <span style="color:#fff">${streakName}</span>`;
            feed.appendChild(entry);
            setTimeout(() => { entry.remove(); }, 4000);
        }
    }

    activateUAV() {
        if (!this.streaks.uav.unlocked) return;
        this.streaks.uav.unlocked = false;
        this.streaks.uav.active = true;
        this.streaks.uav.timer = 30.0; // 30 seconds

        window.soundEngine.playWaveStart();
        if (window.radioManager) {
            window.radioManager.transmit('HQ // OVERLORD', 'Tactical UAV online. Hostile positions revealed.');
        }

        // Flash radar banner
        const radar = document.querySelector('.hud-radar');
        if (radar) radar.style.borderColor = '#00ff66';

        this.updateHUD();
    }

    deploySentry() {
        if (!this.streaks.sentry.unlocked || this.streaks.sentry.count <= 0) return;
        this.streaks.sentry.count--;
        if (this.streaks.sentry.count <= 0) this.streaks.sentry.unlocked = false;

        window.soundEngine.playAttachmentClick();
        if (window.radioManager) {
            window.radioManager.transmit('OPERATOR // GHOST', 'Sentry turret deployed and guarding sector.');
        }

        // Build 3D Sentry Turret
        const turretGroup = new THREE.Group();

        // Tripod Base
        for (let i = 0; i < 3; i++) {
            const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.85, 6);
            legGeo.rotateZ(0.45);
            const leg = new THREE.Mesh(legGeo, this.matTurretSteel);
            leg.position.set(Math.cos(i * (Math.PI * 2 / 3)) * 0.35, 0.35, Math.sin(i * (Math.PI * 2 / 3)) * 0.35);
            leg.rotation.y = i * (Math.PI * 2 / 3);
            turretGroup.add(leg);
        }

        // Swivel Head
        const headGroup = new THREE.Group();
        headGroup.position.y = 0.75;

        const bodyGeo = new THREE.BoxGeometry(0.3, 0.25, 0.45);
        const bodyMesh = new THREE.Mesh(bodyGeo, this.matTurretAccent);
        headGroup.add(bodyMesh);

        // Twin Barrels
        const barrelGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.5, 8);
        barrelGeo.rotateX(Math.PI / 2);
        const barrel1 = new THREE.Mesh(barrelGeo, this.matTurretSteel);
        barrel1.position.set(-0.08, 0, -0.35);
        headGroup.add(barrel1);

        const barrel2 = new THREE.Mesh(barrelGeo, this.matTurretSteel);
        barrel2.position.set(0.08, 0, -0.35);
        headGroup.add(barrel2);

        // Glowing Blue Targeting Sensor
        const sensorGeo = new THREE.SphereGeometry(0.035, 8, 8);
        const sensor = new THREE.Mesh(sensorGeo, this.matTurretSensor);
        sensor.position.set(0, 0.1, -0.22);
        headGroup.add(sensor);

        turretGroup.add(headGroup);

        // Place sentry in front of player
        const fwd = new THREE.Vector3();
        this.player.camera.getWorldDirection(fwd);
        fwd.y = 0;
        fwd.normalize();

        turretGroup.position.copy(this.player.position).add(fwd.clone().multiplyScalar(1.8));
        turretGroup.position.y = 0;
        this.scene.add(turretGroup);

        this.deployedSentries.push({
            group: turretGroup,
            head: headGroup,
            lastFireTime: 0,
            life: 45.0 // Sentry operates for 45s
        });

        this.updateHUD();
    }

    callAirstrike() {
        if (!this.streaks.airstrike.unlocked || this.streaks.airstrike.count <= 0) return;
        this.streaks.airstrike.count--;
        if (this.streaks.airstrike.count <= 0) this.streaks.airstrike.unlocked = false;

        window.soundEngine.playWaveStart();
        if (window.radioManager) {
            window.radioManager.transmit('HQ // OVERLORD', 'Drone airstrike confirmed. Cluster warhead inbound!');
        }

        // Target center of arena or cluster of enemies
        const targetPos = new THREE.Vector3(0, 0, 0);
        if (this.targetManager.targets.length > 0) {
            const alive = this.targetManager.targets.filter(t => !t.isDead);
            if (alive.length > 0) {
                targetPos.copy(alive[0].group.position);
            }
        }

        // Spawn high-speed missile from upper sky
        const missileGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.2, 8);
        missileGeo.rotateX(Math.PI / 2);
        const missile = new THREE.Mesh(missileGeo, this.matTurretSteel);
        missile.position.set(targetPos.x, 60, targetPos.z);
        this.scene.add(missile);

        this.activeMissiles.push({
            mesh: missile,
            target: targetPos,
            speed: 40.0
        });

        this.updateHUD();
    }

    updateHUD() {
        const uavBtn = document.getElementById('ks-uav-btn');
        const sentryBtn = document.getElementById('ks-sentry-btn');
        const strikeBtn = document.getElementById('ks-strike-btn');

        if (uavBtn) uavBtn.classList.toggle('ready', this.streaks.uav.unlocked);
        if (sentryBtn) {
            sentryBtn.classList.toggle('ready', this.streaks.sentry.unlocked && this.streaks.sentry.count > 0);
            sentryBtn.textContent = `[5] SENTRY (${this.streaks.sentry.count})`;
        }
        if (strikeBtn) {
            strikeBtn.classList.toggle('ready', this.streaks.airstrike.unlocked && this.streaks.airstrike.count > 0);
            strikeBtn.textContent = `[6] AIRSTRIKE (${this.streaks.airstrike.count})`;
        }

        const streakVal = document.getElementById('hud-streak-count');
        if (streakVal) streakVal.textContent = this.currentStreak;
    }

    update(delta, time) {
        // Update UAV Timer
        if (this.streaks.uav.active) {
            this.streaks.uav.timer -= delta;
            if (this.streaks.uav.timer <= 0) {
                this.streaks.uav.active = false;
                const radar = document.querySelector('.hud-radar');
                if (radar) radar.style.borderColor = 'rgba(0, 229, 255, 0.4)';
            }
        }

        // Update Deployed Sentries
        for (let i = this.deployedSentries.length - 1; i >= 0; i--) {
            const s = this.deployedSentries[i];
            s.life -= delta;

            if (s.life <= 0) {
                this.scene.remove(s.group);
                this.deployedSentries.splice(i, 1);
                continue;
            }

            // Find closest hostile bot within 25m
            let closestBot = null;
            let minDist = 25.0;

            this.targetManager.targets.forEach(t => {
                if (t.isDead) return;
                const d = s.group.position.distanceTo(t.group.position);
                if (d < minDist) {
                    minDist = d;
                    closestBot = t;
                }
            });

            if (closestBot) {
                // Swivel head toward target
                const targetYaw = Math.atan2(
                    closestBot.group.position.x - s.group.position.x,
                    closestBot.group.position.z - s.group.position.z
                );
                s.head.rotation.y = targetYaw;

                // Fire burst every 0.12s
                if (time - s.lastFireTime > 0.12) {
                    s.lastFireTime = time;
                    window.soundEngine.playShot('rifle');

                    // Raycast hit
                    closestBot.health = Math.max(0, closestBot.health - 22);
                    closestBot.flinchAngle = 0.2;
                    this.targetManager.updateHealthBar(closestBot);

                    // Sentry tracer line
                    const startPos = s.group.position.clone().add(new THREE.Vector3(0, 0.8, 0));
                    const endPos = closestBot.group.position.clone().add(new THREE.Vector3(0, 1.2, 0));
                    this.equipmentManager.player.spawnBulletTracer(endPos);

                    if (closestBot.health <= 0) {
                        closestBot.isDead = true;
                        this.targetManager.totalKills++;
                        window.soundEngine.playKillConfirmed();
                        this.player.broadcastKill(`SENTRY TURRET ➔ ${closestBot.label}`, false);
                        window.gameScore = (window.gameScore || 0) + 100;
                        window.gameKills = (window.gameKills || 0) + 1;
                        this.player.updateScoreHUD();

                        if (this.targetManager.gameMode === 'survival') {
                            this.scene.remove(closestBot.group);
                        } else {
                            closestBot.respawnTime = performance.now() / 1000 + 3.0;
                            closestBot.group.position.y = -10;
                        }
                        this.targetManager.checkWaveProgress();
                    }
                }
            } else {
                // Idle scanning swivel
                s.head.rotation.y = Math.sin(time * 1.5) * 0.8;
            }
        }

        // Update Airstrike Missiles
        for (let i = this.activeMissiles.length - 1; i >= 0; i--) {
            const m = this.activeMissiles[i];
            m.mesh.position.y -= m.speed * delta;

            if (m.mesh.position.y <= 0.5) {
                // Impact detonation
                this.equipmentManager.detonateFrag(m.target.clone());
                this.scene.remove(m.mesh);
                m.mesh.geometry.dispose();
                this.activeMissiles.splice(i, 1);
            }
        }
    }
}

window.KillstreakManager = KillstreakManager;
