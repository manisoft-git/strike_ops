/**
 * StrikeOps - First-Person Player Controller & Dual Control Rig
 * Features robust WASD+Mouse (PC) and Dual Virtual Joystick+Buttons (Mobile/Touchscreen).
 * Implements realistic acceleration, jump physics, collision resolution, weapon sway, and raycast ballistics.
 */

class PlayerController {
    constructor(camera, scene, map, targetManager) {
        this.camera = camera;
        this.scene = scene;
        this.map = map;
        this.targetManager = targetManager;

        // Player Physical State
        this.position = new THREE.Vector3(0, 1.7, 15);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.pitch = 0; // Look up/down (-85 to +85 deg)
        this.yaw = 0;   // Look left/right (0 to 360 deg)

        // Health & Survival State
        this.health = 100;
        this.maxHealth = 100;
        this.isDead = false;
        this.lastDamageTime = 0;

        this.standingHeight = 1.75;
        this.crouchHeight = 1.05;
        this.currentHeight = this.standingHeight;

        this.isGrounded = false;
        this.isSprinting = false;
        this.isCrouching = false;
        this.isShootingHeld = false;

        // Sensitivities & Speeds
        this.mouseSensitivity = 0.0022;
        this.touchLookSensitivity = 0.0035;
        this.walkSpeed = 6.0;
        this.sprintSpeed = 9.8;
        this.crouchSpeed = 3.0;
        this.jumpForce = 7.2;
        this.gravity = 22.0;

        // Movement input vector (-1 to 1)
        this.moveInput = { forward: 0, right: 0 };

        // Weapon System Rig
        this.weapons = new WeaponManager(this.camera);

        // Sliding & Camera Shake
        this.isSliding = false;
        this.slideTimer = 0;
        this.cameraShake = 0;

        // Footstep cadence tracker
        this.stepTimer = 0;

        // Tracers & Decals
        this.tracers = [];

        // Setup input handlers
        this.setupKeyboardMouse();
        this.setupTouchControls();
    }

    setupKeyboardMouse() {
        this.keys = {};

        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;

            if (e.code === 'KeyR') {
                this.weapons.startReload(performance.now() / 1000);
            }
            if (e.code === 'KeyC') {
                this.toggleCrouch();
            }
            if (e.code === 'Digit1') this.weapons.equip('rifle');
            if (e.code === 'Digit2') this.weapons.equip('pistol');
            if (e.code === 'Digit3') this.weapons.equip('sniper');
            if (e.code === 'Digit4') this.weapons.equip('smg');
            if (e.code === 'Digit5') this.weapons.equip('shotgun');
            if (e.code === 'KeyE') {
                this.weapons.isAiming = !this.weapons.isAiming;
            }
            // Tactical Equipment Hotkeys
            if (e.code === 'KeyG') {
                if (window.strikeGame && window.strikeGame.equipmentManager) {
                    window.strikeGame.equipmentManager.throwFrag(this.camera);
                }
            }
            if (e.code === 'KeyF') {
                if (window.strikeGame && window.strikeGame.equipmentManager) {
                    window.strikeGame.equipmentManager.throwSmoke(this.camera);
                }
            }
            // Tactical Attachment Hotkeys
            if (e.code === 'KeyT') {
                this.weapons.toggleAttachment('suppressor');
            }
            if (e.code === 'KeyL') {
                this.weapons.toggleAttachment('laser');
            }
            if (e.code === 'KeyM') {
                this.weapons.toggleAttachment('extendedMag');
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        // Mouse Look via Pointer Lock API
        const canvas = this.scene.userData.rendererDom || document.body;

        canvas.addEventListener('click', () => {
            if (!document.pointerLockElement && window.gameStarted) {
                canvas.requestPointerLock();
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === canvas) {
                const adsFactor = this.weapons.isAiming ? 0.45 : 1.0;
                this.yaw -= e.movementX * this.mouseSensitivity * adsFactor;
                this.pitch -= e.movementY * this.mouseSensitivity * adsFactor;
                this.pitch = Math.max(-Math.PI * 0.48, Math.min(Math.PI * 0.48, this.pitch));
            }
        });

        window.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Left Click: Shoot
                this.isShootingHeld = true;
                this.tryShoot();
            } else if (e.button === 2) { // Right Click: ADS
                this.weapons.isAiming = true;
            }
        });

        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.isShootingHeld = false;
            } else if (e.button === 2) {
                this.weapons.isAiming = false;
            }
        });

        window.addEventListener('contextmenu', (e) => e.preventDefault());

        // Mouse scroll wheel weapon switch
        window.addEventListener('wheel', (e) => {
            const list = ['rifle', 'pistol', 'sniper'];
            let idx = list.indexOf(this.weapons.activeWeaponId);
            if (e.deltaY > 0) {
                idx = (idx + 1) % list.length;
            } else {
                idx = (idx - 1 + list.length) % list.length;
            }
            this.weapons.equip(list[idx]);
        });
    }

    setupTouchControls() {
        // Mobile Touch Virtual Joystick & Touch Camera Drag
        const touchZoneLeft = document.getElementById('touch-zone-left');
        const touchZoneRight = document.getElementById('touch-zone-right');
        const stickThumb = document.getElementById('joystick-thumb');
        const stickBase = document.getElementById('joystick-base');

        this.touchMoveId = null;
        this.touchLookId = null;
        this.touchMoveOrigin = { x: 0, y: 0 };
        this.lastTouchLookPos = { x: 0, y: 0 };

        if (!touchZoneLeft || !touchZoneRight) return;

        // Left Joystick (Movement)
        touchZoneLeft.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            this.touchMoveId = touch.identifier;
            this.touchMoveOrigin = { x: touch.clientX, y: touch.clientY };

            if (stickBase && stickThumb) {
                stickBase.style.display = 'block';
                stickBase.style.left = `${touch.clientX - 50}px`;
                stickBase.style.top = `${touch.clientY - 50}px`;
                stickThumb.style.transform = 'translate(0px, 0px)';
            }
        }, { passive: false });

        touchZoneLeft.addEventListener('touchmove', (e) => {
            e.preventDefault();
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                if (touch.identifier === this.touchMoveId) {
                    const dx = touch.clientX - this.touchMoveOrigin.x;
                    const dy = touch.clientY - this.touchMoveOrigin.y;
                    const maxDist = 45;
                    const dist = Math.hypot(dx, dy);
                    const clampedDist = Math.min(dist, maxDist);
                    const angle = Math.atan2(dy, dx);

                    const clampedX = Math.cos(angle) * clampedDist;
                    const clampedY = Math.sin(angle) * clampedDist;

                    if (stickThumb) {
                        stickThumb.style.transform = `translate(${clampedX}px, ${clampedY}px)`;
                    }

                    this.moveInput.right = clampedX / maxDist;
                    this.moveInput.forward = -clampedY / maxDist;
                }
            }
        }, { passive: false });

        const endLeftTouch = (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === this.touchMoveId) {
                    this.touchMoveId = null;
                    this.moveInput.right = 0;
                    this.moveInput.forward = 0;
                    if (stickBase) stickBase.style.display = 'none';
                }
            }
        };
        touchZoneLeft.addEventListener('touchend', endLeftTouch);
        touchZoneLeft.addEventListener('touchcancel', endLeftTouch);

        // Right Screen Area (Touch Camera Look)
        touchZoneRight.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            this.touchLookId = touch.identifier;
            this.lastTouchLookPos = { x: touch.clientX, y: touch.clientY };
        }, { passive: false });

        touchZoneRight.addEventListener('touchmove', (e) => {
            e.preventDefault();
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                if (touch.identifier === this.touchLookId) {
                    const dx = touch.clientX - this.lastTouchLookPos.x;
                    const dy = touch.clientY - this.lastTouchLookPos.y;
                    this.lastTouchLookPos = { x: touch.clientX, y: touch.clientY };

                    const adsFactor = this.weapons.isAiming ? 0.45 : 1.0;
                    this.yaw -= dx * this.touchLookSensitivity * adsFactor;
                    this.pitch -= dy * this.touchLookSensitivity * adsFactor;
                    this.pitch = Math.max(-Math.PI * 0.48, Math.min(Math.PI * 0.48, this.pitch));
                }
            }
        }, { passive: false });

        const endRightTouch = (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === this.touchLookId) {
                    this.touchLookId = null;
                }
            }
        };
        touchZoneRight.addEventListener('touchend', endRightTouch);
        touchZoneRight.addEventListener('touchcancel', endRightTouch);

        // Virtual Touch Buttons
        const btnShoot = document.getElementById('btn-touch-shoot');
        const btnAds = document.getElementById('btn-touch-ads');
        const btnReload = document.getElementById('btn-touch-reload');
        const btnJump = document.getElementById('btn-touch-jump');
        const btnCrouch = document.getElementById('btn-touch-crouch');
        const btnWeaponCycle = document.getElementById('btn-touch-weapon');

        if (btnShoot) {
            btnShoot.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.isShootingHeld = true;
                this.tryShoot();
            });
            btnShoot.addEventListener('touchend', () => { this.isShootingHeld = false; });
        }

        if (btnAds) {
            btnAds.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.weapons.isAiming = !this.weapons.isAiming;
                btnAds.classList.toggle('active', this.weapons.isAiming);
            });
        }

        if (btnReload) {
            btnReload.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.weapons.startReload(performance.now() / 1000);
            });
        }

        if (btnJump) {
            btnJump.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.tryJump();
            });
        }

        if (btnCrouch) {
            btnCrouch.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.toggleCrouch();
                btnCrouch.classList.toggle('active', this.isCrouching);
            });
        }

        if (btnWeaponCycle) {
            btnWeaponCycle.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const list = ['rifle', 'pistol', 'sniper', 'smg', 'shotgun'];
                let idx = list.indexOf(this.weapons.activeWeaponId);
                idx = (idx + 1) % list.length;
                this.weapons.equip(list[idx]);
            });
        }
    }

    toggleCrouch() {
        if (this.isSprinting) {
            // Tactical Knee Slide
            this.startSlide();
        } else {
            this.isCrouching = !this.isCrouching;
            this.isSprinting = false;
        }
    }

    startSlide() {
        this.isSliding = true;
        this.slideTimer = 0.75; // 0.75s slide duration
        this.isCrouching = true;
        this.isSprinting = false;
        window.soundEngine.playFootstep(true);
    }

    applyCameraShake(amount) {
        this.cameraShake = Math.min(0.22, (this.cameraShake || 0) + amount);
    }

    tryJump() {
        if (this.isGrounded) {
            this.velocity.y = this.jumpForce;
            this.isGrounded = false;
            this.isSliding = false;
            window.soundEngine.playJump();
        }
    }

    tryShoot() {
        const time = performance.now() / 1000;
        const fired = this.weapons.shoot(time);
        if (!fired) return;

        // Apply camera recoil kick & shake
        const cfg = this.weapons.getConfig();
        this.pitch += cfg.recoilCamera;
        this.yaw += (Math.random() - 0.5) * (cfg.recoilCamera * 0.4);
        this.applyCameraShake(cfg.recoilCamera * 0.5);

        // Perform raycast ballistics (handles single ray or multi-pellet shotgun)
        this.performBallisticRaycast();
    }

    performBallisticRaycast() {
        const cfg = this.weapons.getConfig();
        const pellets = cfg.pelletCount || 1;

        for (let p = 0; p < pellets; p++) {
            this.fireSinglePellet(cfg);
        }
    }

    fireSinglePellet(cfg) {
        const raycaster = new THREE.Raycaster();

        // Calculate spread
        const spread = this.weapons.getCurrentSpread();
        const spreadX = (Math.random() - 0.5) * spread;
        const spreadY = (Math.random() - 0.5) * spread;

        // Ray from camera center + spread
        raycaster.setFromCamera(new THREE.Vector2(spreadX, spreadY), this.camera);

        // Check Targets first
        const hitResult = this.targetManager.checkHit(
            raycaster,
            cfg.damage,
            cfg.headshotMult,
            (targetName, isHeadshot, damage) => {
                // Kill callback
                window.soundEngine.playKillConfirmed();
                this.broadcastKill(targetName, isHeadshot);

                // Notify Killstreak Manager
                if (window.strikeGame && window.strikeGame.killstreakManager) {
                    window.strikeGame.killstreakManager.onKill();
                }

                // Notify Progression Manager
                if (window.progressionManager) {
                    window.progressionManager.recordKill(isHeadshot);
                }

                // Quick Fix Perk: immediate health regen kickstart
                if (window.perkManager && window.perkManager.hasPerk('quickfix')) {
                    this.lastDamageTime = 0;
                }

                // Operator Voice Comms
                if (window.radioManager && Math.random() < 0.45) {
                    const line = isHeadshot ? 'Target dropped, headshot!' : 'Hostile eliminated!';
                    window.radioManager.transmit('OPERATOR // GHOST', line);
                }

                window.gameScore = (window.gameScore || 0) + (isHeadshot ? 150 : 100);
                window.gameKills = (window.gameKills || 0) + 1;
                this.updateScoreHUD();
            }
        );

        let hitPoint = null;

        if (hitResult) {
            hitPoint = hitResult.point;
            // Play Hitmarker
            window.soundEngine.playHitmarker(hitResult.isHeadshot);
            this.showScreenHitmarker(hitResult.isHeadshot);
        } else {
            // Check Map Colliders/Environment
            const envHits = raycaster.intersectObjects(this.map.shootableObjects, true);
            if (envHits.length > 0) {
                hitPoint = envHits[0].point;
                this.targetManager.spawnSparks(hitPoint);
            } else {
                hitPoint = raycaster.ray.origin.clone().add(raycaster.ray.direction.clone().multiplyScalar(60));
            }
        }

        // Spawn bullet tracer
        if (hitPoint) {
            this.spawnBulletTracer(hitPoint);
        }
    }

    spawnBulletTracer(targetPos) {
        const mesh = this.weapons.getActiveMesh();
        const startPos = new THREE.Vector3();
        if (mesh && mesh.userData.muzzlePos) {
            mesh.localToWorld(startPos.copy(mesh.userData.muzzlePos));
        } else {
            startPos.copy(this.camera.position).add(new THREE.Vector3(0.1, -0.1, -0.3));
        }

        const points = [startPos, targetPos];
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const mat = new THREE.LineBasicMaterial({
            color: 0xffe277,
            linewidth: 2,
            transparent: true,
            opacity: 0.9
        });

        const line = new THREE.Line(geo, mat);
        this.scene.add(line);

        this.tracers.push({
            line: line,
            life: 0.06
        });
    }

    showScreenHitmarker(isHeadshot) {
        const hm = document.getElementById('hud-hitmarker');
        if (!hm) return;
        hm.className = isHeadshot ? 'active headshot' : 'active';
        clearTimeout(this.hitmarkerTimeout);
        this.hitmarkerTimeout = setTimeout(() => {
            hm.className = '';
        }, 130);
    }

    broadcastKill(victim, isHeadshot) {
        const feed = document.getElementById('hud-killfeed');
        if (!feed) return;
        const entry = document.createElement('div');
        entry.className = 'killfeed-entry';
        const weaponName = this.weapons.getConfig().name;
        const icon = isHeadshot ? '🎯 HEADSHOT' : '💥';
        entry.innerHTML = `<span class="killer">YOU</span> [${weaponName}] <span class="victim">${victim}</span> <span class="badge">${icon}</span>`;
        feed.appendChild(entry);
        setTimeout(() => { entry.remove(); }, 3500);
    }

    updateScoreHUD() {
        const scoreEl = document.getElementById('hud-score');
        const killsEl = document.getElementById('hud-kills');
        if (scoreEl) scoreEl.textContent = window.gameScore || 0;
        if (killsEl) killsEl.textContent = window.gameKills || 0;
    }

    takeDamage(amount) {
        if (this.isDead) return;
        this.health = Math.max(0, this.health - amount);
        this.lastDamageTime = performance.now() / 1000;

        window.soundEngine.playHurt();

        // Flash red screen damage overlay
        const dmgOverlay = document.getElementById('hud-damage-overlay');
        if (dmgOverlay) {
            dmgOverlay.classList.add('flash');
            clearTimeout(this.damageTimeout);
            this.damageTimeout = setTimeout(() => {
                dmgOverlay.classList.remove('flash');
            }, 250);
        }

        this.updateHealthHUD();

        if (this.health <= 0) {
            this.die();
        }
    }

    die() {
        this.isDead = true;
        this.velocity.set(0, 0, 0);

        if (window.strikeGame && window.strikeGame.killstreakManager) {
            window.strikeGame.killstreakManager.onDeath();
        }

        // Show Game Over Screen
        const gameOverModal = document.getElementById('game-over-screen');
        const finalWaveEl = document.getElementById('go-final-wave');
        const finalKillsEl = document.getElementById('go-final-kills');
        const finalScoreEl = document.getElementById('go-final-score');

        if (gameOverModal) {
            if (finalWaveEl) finalWaveEl.textContent = this.targetManager.wave;
            if (finalKillsEl) finalKillsEl.textContent = window.gameKills || 0;
            if (finalScoreEl) finalScoreEl.textContent = window.gameScore || 0;

            if (window.progressionManager) {
                const rank = window.progressionManager.getCurrentRank();
                const badgeEl = document.getElementById('aar-rank-badge');
                const nameEl = document.getElementById('aar-rank-name');
                const xpEl = document.getElementById('aar-xp-total');
                const killsEl = document.getElementById('aar-career-kills');
                const hsEl = document.getElementById('aar-career-hs');

                if (badgeEl) badgeEl.textContent = rank.icon;
                if (nameEl) nameEl.textContent = `${rank.title} (LVL ${rank.rank})`;
                if (xpEl) xpEl.textContent = `${window.progressionManager.totalXP} TOTAL XP`;
                if (killsEl) killsEl.textContent = window.progressionManager.careerKills;
                if (hsEl) hsEl.textContent = window.progressionManager.careerHeadshots;
            }

            gameOverModal.style.display = 'flex';
        }

        if (document.exitPointerLock) {
            try { document.exitPointerLock(); } catch(e) {}
        }
    }

    respawn(spawnPos) {
        this.health = 100;
        this.isDead = false;
        if (spawnPos) this.position.copy(spawnPos);
        this.velocity.set(0, 0, 0);
        this.updateHealthHUD();

        const gameOverModal = document.getElementById('game-over-screen');
        if (gameOverModal) gameOverModal.style.display = 'none';

        // Reset wave and bots
        this.targetManager.startWave(1);
        window.gameScore = 0;
        window.gameKills = 0;
        this.updateScoreHUD();
    }

    updateHealthHUD() {
        const fill = document.getElementById('hud-health-fill');
        const pct = Math.max(0, this.health / this.maxHealth);
        if (fill) {
            fill.style.width = `${pct * 100}%`;
            if (pct < 0.3) fill.style.background = '#ff2233';
            else if (pct < 0.6) fill.style.background = '#ffaa00';
            else fill.style.background = '#00ff66';
        }

        const vignette = document.getElementById('hud-blood-vignette');
        if (vignette) {
            if (pct < 0.45) {
                vignette.style.opacity = ((0.45 - pct) / 0.45).toString();
            } else {
                vignette.style.opacity = '0';
            }
        }
    }

    update(delta, time) {
        if (this.isDead) return;

        // Health Regeneration (quickfix perk reduces delay to 1.2s)
        const regenDelay = (window.perkManager && window.perkManager.hasPerk('quickfix')) ? 1.2 : 4.0;
        if (time - this.lastDamageTime > regenDelay && this.health < this.maxHealth) {
            this.health = Math.min(this.maxHealth, this.health + delta * 25);
            this.updateHealthHUD();
        }

        // Tactical Sliding Timer
        if (this.isSliding) {
            this.slideTimer -= delta;
            if (this.slideTimer <= 0) {
                this.isSliding = false;
            }
        }

        // Continuous automatic firing when trigger held
        if (this.isShootingHeld && this.weapons.getConfig().type === 'automatic') {
            this.tryShoot();
        }

        // Determine input direction
        let inputFwd = this.moveInput.forward;
        let inputRight = this.moveInput.right;

        // Add keyboard input if active
        if (this.keys['KeyW']) inputFwd += 1;
        if (this.keys['KeyS']) inputFwd -= 1;
        if (this.keys['KeyA']) inputRight -= 1;
        if (this.keys['KeyD']) inputRight += 1;
        if (this.keys['Space']) this.tryJump();

        this.isSprinting = (this.keys['ShiftLeft'] || this.keys['ShiftRight']) && inputFwd > 0.5 && !this.weapons.isAiming && !this.isCrouching && !this.isSliding;

        // Normalize movement vector
        const len = Math.hypot(inputFwd, inputRight);
        if (len > 1.0) {
            inputFwd /= len;
            inputRight /= len;
        }

        const isMoving = len > 0.1;

        // Current speed (lightweight perk gives +18% speed)
        const speedBonus = (window.perkManager && window.perkManager.hasPerk('lightweight')) ? 1.18 : 1.0;
        let speed = this.walkSpeed * speedBonus;
        if (this.isSliding) speed = this.sprintSpeed * 1.35 * speedBonus;
        else if (this.isSprinting) speed = this.sprintSpeed * speedBonus;
        else if (this.isCrouching) speed = this.crouchSpeed;
        if (this.weapons.isAiming) speed *= 0.6;

        // Compute forward and right world vectors based on Yaw
        const fwdX = -Math.sin(this.yaw);
        const fwdZ = -Math.cos(this.yaw);
        const rightX = Math.cos(this.yaw);
        const rightZ = -Math.sin(this.yaw);

        const targetVelX = (fwdX * inputFwd + rightX * inputRight) * speed;
        const targetVelZ = (fwdZ * inputFwd + rightZ * inputRight) * speed;

        // Smooth horizontal acceleration/damping
        const accel = this.isGrounded ? (this.isSliding ? 8 : 16) : 4;
        this.velocity.x += (targetVelX - this.velocity.x) * Math.min(delta * accel, 1.0);
        this.velocity.z += (targetVelZ - this.velocity.z) * Math.min(delta * accel, 1.0);

        // Apply gravity
        this.velocity.y -= this.gravity * delta;

        // Update Position & Resolve Map Collisions
        this.resolveCollisions(delta);

        // Smooth camera height for crouch / slide
        const targetHeight = (this.isCrouching || this.isSliding) ? this.crouchHeight : this.standingHeight;
        this.currentHeight += (targetHeight - this.currentHeight) * Math.min(delta * 12, 1.0);

        // Camera positioning & Euler rotation + Shake
        this.camera.position.set(this.position.x, this.position.y + this.currentHeight - 0.2, this.position.z);
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.y = this.yaw;
        this.camera.rotation.x = this.pitch;

        if (this.cameraShake > 0) {
            this.camera.rotation.z = (Math.random() - 0.5) * this.cameraShake;
            this.cameraShake = Math.max(0, this.cameraShake - delta * 3.5);
        } else {
            this.camera.rotation.z = 0;
        }

        // Footsteps audio cadence
        if (this.isGrounded && isMoving && !this.isSliding) {
            this.stepTimer += delta * (this.isSprinting ? 2.5 : 1.6);
            if (this.stepTimer >= 1.0) {
                this.stepTimer = 0;
                window.soundEngine.playFootstep(this.isSprinting);
            }
        }

        // Update Weapon Rig
        this.weapons.update(delta, time, this.isSprinting, isMoving);

        // Update Bullet Tracers
        for (let i = this.tracers.length - 1; i >= 0; i--) {
            const tr = this.tracers[i];
            tr.life -= delta;
            if (tr.life <= 0) {
                this.scene.remove(tr.line);
                tr.line.geometry.dispose();
                tr.line.material.dispose();
                this.tracers.splice(i, 1);
            }
        }
    }

    resolveCollisions(delta) {
        // Player Bounding Cylinder approximated as a point with radius
        const radius = 0.45;
        const nextX = this.position.x + this.velocity.x * delta;
        const nextZ = this.position.z + this.velocity.z * delta;
        const nextY = this.position.y + this.velocity.y * delta;

        // Ground / floor collision
        if (nextY <= 0) {
            if (!this.isGrounded && this.velocity.y < -4.0) {
                window.soundEngine.playLand();
            }
            this.position.y = 0;
            this.velocity.y = 0;
            this.isGrounded = true;
        } else {
            this.position.y = nextY;
            this.isGrounded = false;
        }

        // Test X axis movement against colliders
        let allowX = true;
        const playerBoxX = new THREE.Box3(
            new THREE.Vector3(nextX - radius, this.position.y, this.position.z - radius),
            new THREE.Vector3(nextX + radius, this.position.y + this.currentHeight, this.position.z + radius)
        );

        for (let i = 0; i < this.map.colliders.length; i++) {
            if (playerBoxX.intersectsBox(this.map.colliders[i])) {
                allowX = false;
                this.velocity.x = 0;
                break;
            }
        }
        if (allowX) this.position.x = nextX;

        // Test Z axis movement against colliders
        let allowZ = true;
        const playerBoxZ = new THREE.Box3(
            new THREE.Vector3(this.position.x - radius, this.position.y, nextZ - radius),
            new THREE.Vector3(this.position.x + radius, this.position.y + this.currentHeight, nextZ + radius)
        );

        for (let i = 0; i < this.map.colliders.length; i++) {
            if (playerBoxZ.intersectsBox(this.map.colliders[i])) {
                allowZ = false;
                this.velocity.z = 0;
                break;
            }
        }
        if (allowZ) this.position.z = nextZ;

        // Clamp inside arena walls (68m x 68m)
        this.position.x = Math.max(-33, Math.min(33, this.position.x));
        this.position.z = Math.max(-33, Math.min(33, this.position.z));
    }
}

window.PlayerController = PlayerController;
