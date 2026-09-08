/**
 * StrikeOps - Core Game Loop & Main Application Entry
 * Initializes WebGL scene, lighting, player systems, radar compass, and UI events.
 */

window.gameStarted = false;
window.gameScore = 0;
window.gameKills = 0;

class StrikeOpsGame {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.clock = new THREE.Clock();

        this.initThree();
        this.initGameSystems();
        this.initUI();

        // Handle window resizing
        window.addEventListener('resize', () => this.onResize());

        // Start render loop
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    initThree() {
        // Scene
        this.scene = new THREE.Scene();

        // Camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 200);
        this.scene.add(this.camera);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        this.scene.userData.rendererDom = this.renderer.domElement;
    }

    initGameSystems() {
        // 1. Build 3D Arena
        this.map = new TacticalMap(this.scene);

        // 2. Build Targets & AI Bots
        this.targetManager = new TargetManager(this.scene);

        // 3. Build Player Controller
        this.player = new PlayerController(this.camera, this.scene, this.map, this.targetManager);

        // 4. Build Tactical Equipment
        this.equipmentManager = new EquipmentManager(this.scene, this.map, this.targetManager, this.player);

        // 5. Build Killstreaks
        this.killstreakManager = new KillstreakManager(this.scene, this.targetManager, this.equipmentManager, this.player);

        // 6. Build Battlefield Drops
        this.pickupManager = new PickupManager(this.scene);
    }

    deployGame() {
        try { window.soundEngine.init(); } catch(err) {}
        const startScreen = document.getElementById('start-screen');
        if (startScreen) {
            startScreen.style.display = 'none';
            startScreen.style.pointerEvents = 'none';
        }
        window.gameStarted = true;

        if (!('ontouchstart' in window) && navigator.maxTouchPoints === 0) {
            try { this.renderer.domElement.requestPointerLock(); } catch(err) {}
        }
    }

    initUI() {
        const btnDeploy = document.getElementById('btn-deploy');
        const btnFullscreen = document.getElementById('btn-fullscreen');

        // Deploy button
        if (btnDeploy) {
            const handleDeploy = (e) => {
                if (e && e.cancelable) e.preventDefault();
                this.deployGame();
            };

            btnDeploy.addEventListener('click', handleDeploy);
            btnDeploy.addEventListener('touchend', handleDeploy);
        }

        // Map Selector Buttons
        const mapButtons = document.querySelectorAll('.map-select-btn');
        mapButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mapId = e.currentTarget.dataset.map;
                if (!mapId) return;
                const newSpawn = this.map.loadMap(mapId);
                if (this.player) {
                    this.player.position.copy(newSpawn);
                    this.player.velocity.set(0, 0, 0);
                }
                if (this.targetManager) {
                    this.targetManager.setGameMode(this.targetManager.gameMode);
                }
                window.soundEngine.playAttachmentClick();
            });
        });

        // Game Mode Selector Buttons
        const modeButtons = document.querySelectorAll('.mode-select-btn');
        modeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                modeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const mode = btn.dataset.mode;
                if (this.targetManager) {
                    this.targetManager.setGameMode(mode);
                }
                window.soundEngine.playAttachmentClick();
            });
        });

        // Attachment Toggle Buttons in HUD / Menu
        const btnSupp = document.getElementById('att-btn-supp');
        const btnLaser = document.getElementById('att-btn-laser');
        const btnMag = document.getElementById('att-btn-mag');

        if (btnSupp) {
            btnSupp.addEventListener('click', () => {
                if (this.player) this.player.weapons.toggleAttachment('suppressor');
            });
        }
        if (btnLaser) {
            btnLaser.addEventListener('click', () => {
                if (this.player) this.player.weapons.toggleAttachment('laser');
            });
        }
        if (btnMag) {
            btnMag.addEventListener('click', () => {
                if (this.player) this.player.weapons.toggleAttachment('extendedMag');
            });
        }

        // Game Over Restart Button
        const btnDeployAgain = document.getElementById('btn-deploy-again');
        if (btnDeployAgain) {
            btnDeployAgain.addEventListener('click', () => {
                if (this.player) {
                    this.player.respawn(new THREE.Vector3(0, 1.7, 15));
                }
            });
        }

        // Fullscreen toggle for mobile
        if (btnFullscreen) {
            btnFullscreen.addEventListener('click', () => {
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(() => {});
                } else {
                    document.exitFullscreen().catch(() => {});
                }
            });
        }

        // Detect touch device to tailor UI
        const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        const touchOverlay = document.getElementById('mobile-touch-overlay');
        const desktopInstructions = document.getElementById('desktop-controls-hint');

        if (touchOverlay && desktopInstructions) {
            if (isTouch) {
                touchOverlay.style.display = 'block';
                desktopInstructions.style.display = 'none';
            } else {
                touchOverlay.style.display = 'none';
                desktopInstructions.style.display = 'block';
            }
        }

        // Tactical Equipment Buttons
        const btnFrag = document.getElementById('btn-throw-frag');
        const btnSmoke = document.getElementById('btn-throw-smoke');
        const touchFrag = document.getElementById('btn-touch-frag');
        const touchSmoke = document.getElementById('btn-touch-smoke');

        const triggerFrag = (e) => {
            if (e && e.cancelable) e.preventDefault();
            if (this.equipmentManager && this.camera) this.equipmentManager.throwFrag(this.camera);
        };
        const triggerSmoke = (e) => {
            if (e && e.cancelable) e.preventDefault();
            if (this.equipmentManager && this.camera) this.equipmentManager.throwSmoke(this.camera);
        };

        if (btnFrag) { btnFrag.addEventListener('click', triggerFrag); btnFrag.addEventListener('touchend', triggerFrag); }
        if (btnSmoke) { btnSmoke.addEventListener('click', triggerSmoke); btnSmoke.addEventListener('touchend', triggerSmoke); }
        if (touchFrag) { touchFrag.addEventListener('touchstart', triggerFrag); }
        if (touchSmoke) { touchSmoke.addEventListener('touchstart', triggerSmoke); }

        // Killstreak Deployment Buttons
        const btnUav = document.getElementById('ks-uav-btn');
        const btnSentry = document.getElementById('ks-sentry-btn');
        const btnStrike = document.getElementById('ks-strike-btn');
        const touchStreak = document.getElementById('btn-touch-streak');

        if (btnUav) btnUav.addEventListener('click', () => { if (this.killstreakManager) this.killstreakManager.activateUAV(); });
        if (btnSentry) btnSentry.addEventListener('click', () => { if (this.killstreakManager) this.killstreakManager.deploySentry(); });
        if (btnStrike) btnStrike.addEventListener('click', () => { if (this.killstreakManager) this.killstreakManager.callAirstrike(); });

        if (touchStreak) {
            touchStreak.addEventListener('touchstart', (e) => {
                if (e && e.cancelable) e.preventDefault();
                if (!this.killstreakManager) return;
                if (this.killstreakManager.streaks.airstrike.unlocked && this.killstreakManager.streaks.airstrike.count > 0) {
                    this.killstreakManager.callAirstrike();
                } else if (this.killstreakManager.streaks.sentry.unlocked && this.killstreakManager.streaks.sentry.count > 0) {
                    this.killstreakManager.deploySentry();
                } else if (this.killstreakManager.streaks.uav.unlocked) {
                    this.killstreakManager.activateUAV();
                }
            });
        }

        // Weapon Camo Selection Buttons
        const camoButtons = document.querySelectorAll('.camo-select-btn');
        camoButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                camoButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const camo = btn.dataset.camo;
                if (this.player && this.player.weapons) {
                    this.player.weapons.setCamo(camo);
                }
                window.soundEngine.playAttachmentClick();
            });
        });

        // Primary Weapon Selector Buttons
        const primaryButtons = document.querySelectorAll('.primary-select-btn');
        primaryButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                primaryButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const weapon = btn.dataset.weapon;
                if (this.player && this.player.weapons) {
                    this.player.weapons.equip(weapon);
                }
                window.soundEngine.playAttachmentClick();
            });
        });

        // Perk Selector Buttons
        const perkButtons = document.querySelectorAll('.perk-btn');
        perkButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tier = btn.dataset.tier;
                const perk = btn.dataset.perk;
                document.querySelectorAll(`.perk-btn[data-tier="${tier}"]`).forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (window.perkManager) {
                    window.perkManager.setPerk(tier, perk);
                }
                window.soundEngine.playAttachmentClick();
            });
        });

        // Initial HUD synchronization
        if (this.equipmentManager) this.equipmentManager.updateHUD();
        if (this.killstreakManager) this.killstreakManager.updateHUD();
        if (window.progressionManager) window.progressionManager.updateHUD();
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    updateCompassAndRadar() {
        // Update Compass Bearing tape (0 to 360 deg)
        const compassBearing = document.getElementById('hud-compass-bearing');
        const compassTape = document.getElementById('hud-compass-tape');
        if (compassBearing && this.player) {
            let deg = Math.round((-this.player.yaw * 180 / Math.PI) % 360);
            if (deg < 0) deg += 360;
            compassBearing.textContent = `${deg}°`;

            if (compassTape) {
                const offset = (deg / 360) * 100;
                compassTape.style.transform = `translateX(-${offset}%)`;
            }
        }

        // Mini Radar Dots for targets
        const radarCanvas = document.getElementById('radar-canvas');
        if (radarCanvas && this.targetManager && this.player) {
            const ctx = radarCanvas.getContext('2d');
            const w = radarCanvas.width;
            const h = radarCanvas.height;
            const cx = w / 2;
            const cy = h / 2;
            const time = performance.now() / 1000;

            const isUav = this.killstreakManager && this.killstreakManager.streaks.uav.active;
            const hasSpotter = window.perkManager && window.perkManager.hasPerk('spotter');
            const radarRange = isUav ? 75 : (hasSpotter ? 55 : 35);

            ctx.clearRect(0, 0, w, h);

            // Radar rings
            ctx.strokeStyle = isUav ? 'rgba(0, 255, 102, 0.45)' : 'rgba(0, 229, 255, 0.35)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(cx, cy, cx - 2, 0, Math.PI * 2);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(cx, cy, (cx - 2) * 0.5, 0, Math.PI * 2);
            ctx.stroke();

            // Tactical Rotating Sweep Line
            const sweepAngle = time * 2.4;
            ctx.strokeStyle = isUav ? 'rgba(0, 255, 102, 0.75)' : 'rgba(0, 229, 255, 0.5)';
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(sweepAngle) * (cx - 2), cy + Math.sin(sweepAngle) * (cy - 2));
            ctx.stroke();

            // Player position in center (green triangle)
            ctx.fillStyle = '#00ff66';
            ctx.beginPath();
            ctx.moveTo(cx, cy - 4);
            ctx.lineTo(cx - 3, cy + 3);
            ctx.lineTo(cx + 3, cy + 3);
            ctx.closePath();
            ctx.fill();

            const cos = Math.cos(this.player.yaw);
            const sin = Math.sin(this.player.yaw);

            // Plot Sentry Turrets (Cyan Diamond)
            if (this.killstreakManager) {
                this.killstreakManager.deployedSentries.forEach(s => {
                    const dx = s.group.position.x - this.player.position.x;
                    const dz = s.group.position.z - this.player.position.z;
                    const rx = dx * cos - dz * sin;
                    const rz = dx * sin + dz * cos;
                    const plotX = cx + (rx / radarRange) * (cx - 6);
                    const plotY = cy + (rz / radarRange) * (cy - 6);

                    if ((plotX - cx) ** 2 + (plotY - cy) ** 2 < (cx - 4) ** 2) {
                        ctx.fillStyle = '#00e5ff';
                        ctx.fillRect(plotX - 2, plotY - 2, 4, 4);
                    }
                });
            }

            // Plot Battlefield Pickups (Gold Dots)
            if (this.pickupManager) {
                this.pickupManager.pickups.forEach(p => {
                    const dx = p.group.position.x - this.player.position.x;
                    const dz = p.group.position.z - this.player.position.z;
                    const rx = dx * cos - dz * sin;
                    const rz = dx * sin + dz * cos;
                    const plotX = cx + (rx / radarRange) * (cx - 6);
                    const plotY = cy + (rz / radarRange) * (cy - 6);

                    if ((plotX - cx) ** 2 + (plotY - cy) ** 2 < (cx - 4) ** 2) {
                        ctx.fillStyle = '#ffaa00';
                        ctx.beginPath();
                        ctx.arc(plotX, plotY, 2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                });
            }

            // Plot active hostile targets
            this.targetManager.targets.forEach(t => {
                if (t.isDead) return;

                const dx = t.group.position.x - this.player.position.x;
                const dz = t.group.position.z - this.player.position.z;
                const dist = Math.hypot(dx, dz);

                if (!isUav && !hasSpotter && dist > radarRange) return;

                const rx = dx * cos - dz * sin;
                const rz = dx * sin + dz * cos;

                const plotX = cx + (rx / radarRange) * (cx - 6);
                const plotY = cy + (rz / radarRange) * (cy - 6);

                const distSq = (plotX - cx) * (plotX - cx) + (plotY - cy) * (plotY - cy);
                if (distSq < (cx - 4) * (cx - 4)) {
                    ctx.fillStyle = '#ff2233';
                    ctx.beginPath();
                    ctx.arc(plotX, plotY, isUav ? 3.5 : 2.5, 0, Math.PI * 2);
                    ctx.fill();

                    if (isUav) {
                        ctx.strokeStyle = 'rgba(255, 34, 51, 0.4)';
                        ctx.beginPath();
                        ctx.arc(plotX, plotY, 5.5, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                }
            });
        }
    }

    animate() {
        requestAnimationFrame(this.animate);

        const delta = Math.min(this.clock.getDelta(), 0.08);
        const time = performance.now() / 1000;

        if (window.gameStarted && this.player) {
            this.player.update(delta, time);
            this.targetManager.update(delta, time, this.camera, this.player);
            if (this.equipmentManager) this.equipmentManager.update(delta);
            if (this.killstreakManager) this.killstreakManager.update(delta, time);
            if (this.pickupManager) this.pickupManager.update(delta, time, this.player);
            this.updateCompassAndRadar();
        }

        this.renderer.render(this.scene, this.camera);
    }
}

// Start on DOM ready or immediately if already loaded
function bootStrikeOps() {
    if (!window.strikeGame) {
        window.strikeGame = new StrikeOpsGame();
    }
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', bootStrikeOps);
} else {
    bootStrikeOps();
}
