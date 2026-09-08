/**
 * StrikeOps - Tactical Human Combatants & Hostile Operator AI
 * Modeled after Call of Duty Modern Warfare & Black Ops soldiers.
 * Features:
 * - Fully articulated 3D human military operators (head, helmet, comms, plate carrier, limbs, boots, rifle)
 * - 4 Authentic Operator Archetypes: TF-141 "Ghost", Shadow Company PMC, Desert Spec-Ops, Heavy Juggernaut
 * - Natural skeletal locomotion: hip bounce, knee flexion, torso sway, athletic combat stance
 * - Realistic two-handed C-clamp weapon handling with procedural burst recoil & muzzle flash
 * - Procedural ragdoll-style death collapse animation with weapon drop & expanding battlefield blood pool
 * - Headshot (critical) vs Torso hitboxes, floating damage telemetry, red tracer fire
 */

// Procedural Tactical Texture Generators
function generateCamoTexture(theme = 'multicam') {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    let baseColor = '#424a38';
    let splotchColors = ['#282e22', '#5e523b', '#1a1c17', '#7a6f59'];

    if (theme === 'shadow') {
        baseColor = '#181c22';
        splotchColors = ['#0d1014', '#2a303a', '#1e232b', '#12151a'];
    } else if (theme === 'desert') {
        baseColor = '#8c7b5f';
        splotchColors = ['#695941', '#b09e7e', '#453928', '#c9b99b'];
    } else if (theme === 'woodland') {
        baseColor = '#34452a';
        splotchColors = ['#1a2414', '#4e3c23', '#11140f', '#665335'];
    }

    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 128, 128);

    for (let c = 0; c < splotchColors.length; c++) {
        ctx.fillStyle = splotchColors[c];
        for (let i = 0; i < 16; i++) {
            ctx.beginPath();
            const x = Math.random() * 128;
            const y = Math.random() * 128;
            const r = 8 + Math.random() * 18;
            ctx.ellipse(x, y, r, r * (0.5 + Math.random() * 0.7), Math.random() * Math.PI, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    const imgData = ctx.getImageData(0, 0, 128, 128);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
        const noise = (Math.random() - 0.5) * 14;
        d[i] = Math.min(255, Math.max(0, d[i] + noise));
        d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + noise));
        d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    return tex;
}

function generateGhostSkullTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Dark balaclava fabric
    ctx.fillStyle = '#101215';
    ctx.fillRect(0, 0, 128, 128);

    // Eye slits
    ctx.fillStyle = '#6e5038';
    ctx.fillRect(24, 38, 32, 16);
    ctx.fillRect(72, 38, 32, 16);

    // Dark eyes
    ctx.fillStyle = '#110d0a';
    ctx.fillRect(36, 42, 12, 10);
    ctx.fillRect(80, 42, 12, 10);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(43, 44, 3, 3);
    ctx.fillRect(87, 44, 3, 3);

    // Skull print (off-white weathered paint)
    ctx.fillStyle = '#ded9ce';
    ctx.fillRect(20, 28, 88, 7);
    ctx.fillRect(24, 22, 80, 6);

    // Nose cavity
    ctx.fillStyle = '#101215';
    ctx.beginPath();
    ctx.moveTo(64, 58);
    ctx.lineTo(55, 72);
    ctx.lineTo(73, 72);
    ctx.closePath();
    ctx.fill();

    // Upper jaw & teeth
    ctx.fillStyle = '#ded9ce';
    ctx.fillRect(34, 75, 60, 14);
    ctx.fillStyle = '#101215';
    for (let x = 40; x < 94; x += 7) {
        ctx.fillRect(x, 75, 2, 14);
    }

    // Mandible / chin
    ctx.fillStyle = '#ded9ce';
    ctx.fillRect(38, 93, 52, 12);
    ctx.fillStyle = '#101215';
    for (let x = 44; x < 88; x += 7) {
        ctx.fillRect(x, 93, 2, 12);
    }

    return new THREE.CanvasTexture(canvas);
}

function generateBloodPoolTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 60);
    grad.addColorStop(0, 'rgba(110, 8, 12, 0.92)');
    grad.addColorStop(0.65, 'rgba(75, 5, 8, 0.75)');
    grad.addColorStop(0.9, 'rgba(40, 2, 4, 0.35)');
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(64, 64, 60, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(85, 8, 12, 0.8)';
    for (let i = 0; i < 22; i++) {
        const a = Math.random() * Math.PI * 2;
        const d = 35 + Math.random() * 24;
        const r = 1.5 + Math.random() * 4.0;
        ctx.beginPath();
        ctx.arc(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, r, 0, Math.PI * 2);
        ctx.fill();
    }

    return new THREE.CanvasTexture(canvas);
}

class TargetManager {
    constructor(scene) {
        this.scene = scene;
        this.targets = [];
        this.floatingTexts = [];
        this.sparks = [];
        this.enemyTracers = [];
        this.bloodPools = [];

        // Game Mode & Wave State
        this.gameMode = 'survival'; // 'survival' or 'practice'
        this.wave = 1;
        this.waveState = 'active'; // 'active' | 'intermission'
        this.intermissionTimer = 0;
        this.totalKills = 0;

        this.initTextures();
        this.initMaterials();
        this.startWave(1);
    }

    initTextures() {
        this.texCamoMulticam = generateCamoTexture('multicam');
        this.texCamoShadow = generateCamoTexture('shadow');
        this.texCamoDesert = generateCamoTexture('desert');
        this.texGhostSkull = generateGhostSkullTexture();
        this.texBloodPool = generateBloodPoolTexture();
    }

    initMaterials() {
        // Human Skin Tone
        this.matSkin = new THREE.MeshStandardMaterial({
            color: 0xa87d5b,
            roughness: 0.65,
            metalness: 0.05
        });

        // Ghost Skull Balaclava Face
        this.matGhostFace = new THREE.MeshStandardMaterial({
            map: this.texGhostSkull,
            roughness: 0.85,
            metalness: 0.1
        });

        // Balaclava / Neck Gaiter
        this.matBalaclava = new THREE.MeshStandardMaterial({
            color: 0x181a1e,
            roughness: 0.9,
            metalness: 0.05
        });

        // Ballistic FAST Helmets
        this.matHelmetDark = new THREE.MeshStandardMaterial({
            color: 0x22262c,
            roughness: 0.45,
            metalness: 0.4
        });
        this.matHelmetTan = new THREE.MeshStandardMaterial({
            color: 0x827357,
            roughness: 0.55,
            metalness: 0.35
        });

        // Tactical Polycarbonate Goggles / Sunglasses
        this.matGogglesLens = new THREE.MeshStandardMaterial({
            color: 0x11161d,
            roughness: 0.15,
            metalness: 0.85
        });

        // Combat Uniforms (BDU)
        this.matBduMulticam = new THREE.MeshStandardMaterial({
            map: this.texCamoMulticam,
            roughness: 0.85,
            metalness: 0.1
        });
        this.matBduShadow = new THREE.MeshStandardMaterial({
            map: this.texCamoShadow,
            roughness: 0.85,
            metalness: 0.1
        });
        this.matBduDesert = new THREE.MeshStandardMaterial({
            map: this.texCamoDesert,
            roughness: 0.85,
            metalness: 0.1
        });

        // Tactical Plate Carrier / Body Armor
        this.matVestBlack = new THREE.MeshStandardMaterial({
            color: 0x1a1e24,
            roughness: 0.7,
            metalness: 0.3
        });
        this.matVestTan = new THREE.MeshStandardMaterial({
            color: 0x6e5f49,
            roughness: 0.7,
            metalness: 0.3
        });
        this.matVestJuggernaut = new THREE.MeshStandardMaterial({
            color: 0x2a313d,
            roughness: 0.4,
            metalness: 0.7
        });

        // Tactical Hard Knuckle Gloves & Combat Boots
        this.matGloves = new THREE.MeshStandardMaterial({
            color: 0x1c2024,
            roughness: 0.75,
            metalness: 0.2
        });
        this.matBoots = new THREE.MeshStandardMaterial({
            color: 0x15171a,
            roughness: 0.6,
            metalness: 0.4
        });
        this.matKneePads = new THREE.MeshStandardMaterial({
            color: 0x121417,
            roughness: 0.5,
            metalness: 0.5
        });

        // Tactical Assault Rifle
        this.matOperatorRifle = new THREE.MeshStandardMaterial({
            color: 0x1f2327,
            roughness: 0.35,
            metalness: 0.85
        });
        this.matRifleTanAccent = new THREE.MeshStandardMaterial({
            color: 0x75654d,
            roughness: 0.5,
            metalness: 0.3
        });

        // Dynamic Muzzle Flash
        this.matMuzzleFlash = new THREE.MeshBasicMaterial({
            color: 0xffcc44,
            transparent: true,
            opacity: 0.95
        });

        // Blood Pool Material for fallen casualties
        this.matBloodPool = new THREE.MeshBasicMaterial({
            map: this.texBloodPool,
            transparent: true,
            opacity: 0.9,
            depthWrite: false
        });
    }

    setGameMode(mode) {
        this.gameMode = mode;
        this.wave = 1;
        this.clearAllTargets();
        if (mode === 'survival') {
            this.startWave(1);
        } else {
            this.spawnPracticeSquad();
        }
        this.updateWaveHUD();
    }

    clearAllTargets() {
        this.targets.forEach(t => {
            this.scene.remove(t.group);
            if (t.hpSprite) this.scene.remove(t.hpSprite);
        });
        this.targets = [];

        this.bloodPools.forEach(b => {
            this.scene.remove(b.mesh);
        });
        this.bloodPools = [];
    }

    startWave(waveNum) {
        this.wave = waveNum;
        this.waveState = 'active';
        this.clearAllTargets();

        window.soundEngine.playWaveStart();
        if (window.radioManager) {
            window.radioManager.transmit('HQ // OVERLORD', `Wave ${waveNum} incursion detected. All operators weapons free!`);
        }

        // Announce Wave
        this.showWaveAnnouncement(`WAVE ${waveNum}`, 'INCOMING HOSTILES DETECTED');

        // Scaling bot count: Wave 1 = 4, Wave 2 = 6, Wave 3 = 8, Wave 4 = 10...
        const botCount = Math.min(14, 3 + waveNum * 2);

        // Operator archetype themes
        const archetypes = ['ghost', 'shadow', 'desert'];
        if (waveNum >= 3) archetypes.push('juggernaut');

        for (let i = 0; i < botCount; i++) {
            const angle = (i / botCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
            const distance = 22 + Math.random() * 8;
            const posX = Math.cos(angle) * distance;
            const posZ = Math.sin(angle) * distance;

            // Pick archetype (high waves include heavy juggernaut)
            let archetype = archetypes[Math.floor(Math.random() * archetypes.length)];
            if (waveNum >= 4 && i === 0) archetype = 'juggernaut';

            const isJuggernaut = (archetype === 'juggernaut');
            const hp = isJuggernaut ? (250 + waveNum * 40) : (80 + waveNum * 15);
            const speed = isJuggernaut ? 1.8 : (2.4 + Math.min(waveNum * 0.25, 1.8));

            this.createTarget({
                pos: [posX, 0, posZ],
                type: 'hostile',
                archetype: archetype,
                label: isJuggernaut ? `JUGGERNAUT_ELITE` : `OPERATOR_${i + 1}`,
                health: hp,
                speed: speed,
                fireCooldown: isJuggernaut ? 1.2 : Math.max(1.1, 2.6 - waveNum * 0.2)
            });
        }

        this.updateWaveHUD();
    }

    spawnPracticeSquad() {
        const spawns = [
            { pos: [0, 0, -12], type: 'practice', archetype: 'ghost', label: 'TF141_TARGET', health: 100 },
            { pos: [-10, 0, -16], type: 'practice', archetype: 'shadow', label: 'SHADOW_PMC', health: 100 },
            { pos: [10, 0, -16], type: 'practice', archetype: 'desert', label: 'DESERT_SCOUT', health: 100 },
            { pos: [0, 3.8, -12], type: 'practice', archetype: 'shadow', label: 'SNIPER_TOWER', health: 100 },
            { pos: [-18, 0, -4], type: 'practice', archetype: 'desert', label: 'FLANK_LEFT', health: 100 },
            { pos: [18, 0, 4], type: 'practice', archetype: 'ghost', label: 'FLANK_RIGHT', health: 100 }
        ];

        spawns.forEach(sp => this.createTarget(sp));
    }

    createTarget(config) {
        const archetype = config.archetype || 'ghost';
        const isJuggernaut = (archetype === 'juggernaut');

        // Select materials based on archetype
        let matBdu = this.matBduMulticam;
        let matVest = this.matVestBlack;
        let matHelmet = this.matHelmetDark;
        let isGhost = (archetype === 'ghost');

        if (archetype === 'shadow') {
            matBdu = this.matBduShadow;
            matVest = this.matVestBlack;
            matHelmet = this.matHelmetDark;
        } else if (archetype === 'desert') {
            matBdu = this.matBduDesert;
            matVest = this.matVestTan;
            matHelmet = this.matHelmetTan;
        } else if (isJuggernaut) {
            matBdu = this.matBduShadow;
            matVest = this.matVestJuggernaut;
            matHelmet = this.matHelmetDark;
        }

        // ================= ROOT GROUP =================
        const group = new THREE.Group();
        group.position.set(...config.pos);

        // ================= PELVIS & BATTLE BELT =================
        const pelvis = new THREE.Group();
        pelvis.position.y = 0.88;
        group.add(pelvis);

        // Heavy Tactical Battle Belt
        const beltGeo = new THREE.BoxGeometry(0.38, 0.12, 0.26);
        const beltMesh = new THREE.Mesh(beltGeo, matVest);
        pelvis.add(beltMesh);

        // Sidearm holster with tactical pistol on right hip
        const holsterGroup = new THREE.Group();
        holsterGroup.position.set(0.21, -0.06, 0.02);
        const holsterBody = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.10), this.matBoots);
        const holsterPistolGrip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.04), this.matOperatorRifle);
        holsterPistolGrip.position.set(0, 0.09, -0.02);
        holsterPistolGrip.rotation.x = -0.3;
        holsterGroup.add(holsterBody);
        holsterGroup.add(holsterPistolGrip);
        pelvis.add(holsterGroup);

        // Dump pouch on left hip
        const dumpPouch = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.14, 0.12), matVest);
        dumpPouch.position.set(-0.21, -0.06, 0);
        pelvis.add(dumpPouch);

        // ================= TORSO & PLATE CARRIER =================
        const torso = new THREE.Group();
        torso.position.set(0, 0.06, 0);
        pelvis.add(torso);

        // Combat BDU Shirt (Athletic human V-taper)
        const chestGeo = new THREE.BoxGeometry(0.40, 0.46, 0.25);
        const chestMesh = new THREE.Mesh(chestGeo, matBdu);
        chestMesh.position.y = 0.23;
        chestMesh.castShadow = true;
        chestMesh.userData.part = 'body';
        torso.add(chestMesh);

        // Modular Ballistic Plate Carrier (Front & Back Ceramic Armor)
        const vestWidth = isJuggernaut ? 0.46 : 0.38;
        const vestHeight = isJuggernaut ? 0.44 : 0.38;
        const vestDepth = isJuggernaut ? 0.14 : 0.09;
        const vestGeo = new THREE.BoxGeometry(vestWidth, vestHeight, vestDepth);
        const vestMesh = new THREE.Mesh(vestGeo, matVest);
        vestMesh.position.set(0, 0.24, 0.12);
        vestMesh.castShadow = true;
        vestMesh.userData.part = 'body';
        torso.add(vestMesh);

        // Rear plate
        const rearPlate = new THREE.Mesh(new THREE.BoxGeometry(vestWidth * 0.95, vestHeight * 0.95, 0.08), matVest);
        rearPlate.position.set(0, 0.24, -0.11);
        torso.add(rearPlate);

        // 3x 5.56 Rifle Magazine Pouches on Chest
        for (let m = -1; m <= 1; m++) {
            const magPouch = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.06), matVest);
            magPouch.position.set(m * 0.10, 0.18, 0.18);
            torso.add(magPouch);

            // Magazine top sticking out
            const magTop = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.04), this.matRifleTanAccent);
            magTop.position.set(m * 0.10, 0.27, 0.18);
            torso.add(magTop);
        }

        // Tactical Radio on Left Shoulder with Whip Antenna
        const radioBox = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.14, 0.06), this.matBoots);
        radioBox.position.set(-0.16, 0.38, -0.08);
        const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.32, 6), this.matBoots);
        antenna.position.set(-0.16, 0.56, -0.08);
        torso.add(radioBox);
        torso.add(antenna);

        // Heavy Juggernaut Armor Accents (Neck gorget + shoulder pauldrons)
        if (isJuggernaut) {
            const gorget = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.14, 8), matVest);
            gorget.position.set(0, 0.44, 0);
            torso.add(gorget);

            const pauldronL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.18), matVest);
            pauldronL.position.set(-0.28, 0.42, 0);
            const pauldronR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.18), matVest);
            pauldronR.position.set(0.28, 0.42, 0);
            torso.add(pauldronL);
            torso.add(pauldronR);
        }

        // ================= HEAD & HELMET SYSTEM =================
        const headGroup = new THREE.Group();
        headGroup.position.set(0, 0.48, 0);
        torso.add(headGroup);

        // Neck with gaiter
        const neckGeo = new THREE.CylinderGeometry(0.08, 0.09, 0.12, 8);
        const neckMesh = new THREE.Mesh(neckGeo, this.matBalaclava);
        neckMesh.position.y = 0.05;
        headGroup.add(neckMesh);

        // Human Head (Critical Headshot Hitbox!)
        const headGeo = new THREE.BoxGeometry(0.24, 0.26, 0.24);
        const matHead = isGhost ? this.matGhostFace : (archetype === 'desert' ? this.matSkin : this.matBalaclava);
        const headMesh = new THREE.Mesh(headGeo, matHead);
        headMesh.position.y = 0.19;
        headMesh.castShadow = true;
        headMesh.userData.part = 'head'; // RAYCAST CRITICAL HITBOX
        headGroup.add(headMesh);

        // Ballistic FAST Helmet / Ops-Core Dome
        const helmetDome = new THREE.Mesh(
            new THREE.SphereGeometry(0.145, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.56),
            matHelmet
        );
        helmetDome.position.set(0, 0.22, 0);
        headGroup.add(helmetDome);

        // NVG Wilcox Shroud Mount on Forehead
        const nvgShroud = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.02), this.matHelmetDark);
        nvgShroud.position.set(0, 0.27, 0.135);
        headGroup.add(nvgShroud);

        // Side ARC Accessory Rails
        const arcRailL = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.14), this.matHelmetDark);
        arcRailL.position.set(-0.135, 0.22, 0.02);
        const arcRailR = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.14), this.matHelmetDark);
        arcRailR.position.set(0.135, 0.22, 0.02);
        headGroup.add(arcRailL);
        headGroup.add(arcRailR);

        // Tactical Polycarbonate Goggles / Sunglasses
        const goggles = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.06, 0.06), this.matGogglesLens);
        goggles.position.set(0, 0.20, 0.12);
        headGroup.add(goggles);

        // Comms Headset (Ear cups + headband)
        const earL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.09, 0.07), this.matHelmetDark);
        earL.position.set(-0.135, 0.18, 0);
        const earR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.09, 0.07), this.matHelmetDark);
        earR.position.set(0.135, 0.18, 0);
        headGroup.add(earL);
        headGroup.add(earR);

        // ================= ARTICULATED ARMS =================
        // Left Arm (Shoulder Pivot)
        const leftArm = new THREE.Group();
        leftArm.position.set(-0.25, 0.38, 0.02);
        torso.add(leftArm);

        const leftUpperArm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.26, 0.13), matBdu);
        leftUpperArm.position.y = -0.13;
        leftUpperArm.castShadow = true;
        leftArm.add(leftUpperArm);

        // Left Forearm Group (Elbow Pivot)
        const leftForearm = new THREE.Group();
        leftForearm.position.set(0, -0.26, 0);
        leftArm.add(leftForearm);

        const leftLowerArm = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.24, 0.11), matBdu);
        leftLowerArm.position.y = -0.12;
        leftLowerArm.castShadow = true;
        leftForearm.add(leftLowerArm);

        const leftElbowPad = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.10, 0.07), this.matKneePads);
        leftElbowPad.position.set(0, -0.04, -0.06);
        leftForearm.add(leftElbowPad);

        const leftGlove = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.12, 0.09), this.matGloves);
        leftGlove.position.set(0, -0.26, 0);
        leftForearm.add(leftGlove);

        // Right Arm (Shoulder Pivot)
        const rightArm = new THREE.Group();
        rightArm.position.set(0.25, 0.38, 0.02);
        torso.add(rightArm);

        const rightUpperArm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.26, 0.13), matBdu);
        rightUpperArm.position.y = -0.13;
        rightUpperArm.castShadow = true;
        rightArm.add(rightUpperArm);

        // Right Forearm Group (Elbow Pivot)
        const rightForearm = new THREE.Group();
        rightForearm.position.set(0, -0.26, 0);
        rightArm.add(rightForearm);

        const rightLowerArm = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.24, 0.11), matBdu);
        rightLowerArm.position.y = -0.12;
        rightLowerArm.castShadow = true;
        rightForearm.add(rightLowerArm);

        const rightElbowPad = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.10, 0.07), this.matKneePads);
        rightElbowPad.position.set(0, -0.04, -0.06);
        rightForearm.add(rightElbowPad);

        const rightGlove = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.12, 0.09), this.matGloves);
        rightGlove.position.set(0, -0.26, 0);
        rightForearm.add(rightGlove);

        // ================= TACTICAL ASSAULT RIFLE =================
        const weaponGroup = new THREE.Group();
        // Positioned in hands
        weaponGroup.position.set(0, -0.28, 0.14);
        rightForearm.add(weaponGroup);

        // Upper & Lower Receiver
        const rifleBody = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.10, 0.36), this.matOperatorRifle);
        weaponGroup.add(rifleBody);

        // Handguard Barrel
        const rifleBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.32, 8), this.matOperatorRifle);
        rifleBarrel.rotation.x = Math.PI / 2;
        rifleBarrel.position.set(0, 0.01, 0.32);
        weaponGroup.add(rifleBarrel);

        // Birdcage Flash Hider
        const flashHider = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.06, 8), this.matOperatorRifle);
        flashHider.rotation.x = Math.PI / 2;
        flashHider.position.set(0, 0.01, 0.49);
        weaponGroup.add(flashHider);

        // Holographic Optic Sight
        const holoBox = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.12), this.matOperatorRifle);
        holoBox.position.set(0, 0.08, 0.02);
        const holoGlass = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.04, 0.02), this.matGogglesLens);
        holoGlass.position.set(0, 0.08, 0.02);
        weaponGroup.add(holoBox);
        weaponGroup.add(holoGlass);

        // PMAG 30-round Magazine
        const rifleMag = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.18, 0.09), this.matRifleTanAccent);
        rifleMag.position.set(0, -0.11, 0.06);
        rifleMag.rotation.x = 0.25;
        weaponGroup.add(rifleMag);

        // Muzzle Flash Effect (Visual fire star + PointLight)
        const flashGeo = new THREE.OctahedronGeometry(0.10, 0);
        const muzzleFlashMesh = new THREE.Mesh(flashGeo, this.matMuzzleFlash);
        muzzleFlashMesh.position.set(0, 0.01, 0.54);
        muzzleFlashMesh.visible = false;
        weaponGroup.add(muzzleFlashMesh);

        const muzzleLight = new THREE.PointLight(0xffaa22, 0, 8);
        muzzleLight.position.set(0, 0.01, 0.56);
        weaponGroup.add(muzzleLight);

        // Authentic Two-Handed Tactical High-Ready Aim Stance
        rightArm.rotation.set(-1.05, 0.28, -0.18);
        rightForearm.rotation.set(-0.45, 0.15, 0);

        leftArm.rotation.set(-0.95, -0.48, 0.42);
        leftForearm.rotation.set(-0.80, 0.32, 0);

        // ================= ARTICULATED LEGS & COMBAT BOOTS =================
        // Left Thigh (Hip Joint)
        const leftThigh = new THREE.Group();
        leftThigh.position.set(-0.14, 0, 0);
        pelvis.add(leftThigh);

        const leftUpperLeg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.38, 0.16), matBdu);
        leftUpperLeg.position.y = -0.19;
        leftUpperLeg.castShadow = true;
        leftThigh.add(leftUpperLeg);

        // Cargo Pocket
        const cargoPocketL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.12), matBdu);
        cargoPocketL.position.set(-0.09, -0.18, 0);
        leftThigh.add(cargoPocketL);

        // Left Calf / Knee (Knee Joint)
        const leftCalf = new THREE.Group();
        leftCalf.position.set(0, -0.38, 0);
        leftThigh.add(leftCalf);

        const leftLowerLeg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.36, 0.14), matBdu);
        leftLowerLeg.position.y = -0.18;
        leftLowerLeg.castShadow = true;
        leftCalf.add(leftLowerLeg);

        // Hard Combat Knee Pad (Crye G3 style)
        const kneePadL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.06), this.matKneePads);
        kneePadL.position.set(0, -0.05, 0.08);
        leftCalf.add(kneePadL);

        // Heavy Combat Assault Boot
        const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.22), this.matBoots);
        bootL.position.set(0, -0.36, 0.04);
        bootL.castShadow = true;
        leftCalf.add(bootL);

        // Right Thigh (Hip Joint)
        const rightThigh = new THREE.Group();
        rightThigh.position.set(0.14, 0, 0);
        pelvis.add(rightThigh);

        const rightUpperLeg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.38, 0.16), matBdu);
        rightUpperLeg.position.y = -0.19;
        rightUpperLeg.castShadow = true;
        rightThigh.add(rightUpperLeg);

        // Right Calf / Knee (Knee Joint)
        const rightCalf = new THREE.Group();
        rightCalf.position.set(0, -0.38, 0);
        rightThigh.add(rightCalf);

        const rightLowerLeg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.36, 0.14), matBdu);
        rightLowerLeg.position.y = -0.18;
        rightLowerLeg.castShadow = true;
        rightCalf.add(rightLowerLeg);

        // Hard Combat Knee Pad
        const kneePadR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.06), this.matKneePads);
        kneePadR.position.set(0, -0.05, 0.08);
        rightCalf.add(kneePadR);

        // Heavy Combat Assault Boot
        const bootR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.22), this.matBoots);
        bootR.position.set(0, -0.36, 0.04);
        bootR.castShadow = true;
        rightCalf.add(bootR);

        // ================= BILLBOARD HEALTH BAR =================
        const hpCanvas = document.createElement('canvas');
        hpCanvas.width = 128;
        hpCanvas.height = 24;
        const hpTexture = new THREE.CanvasTexture(hpCanvas);
        const hpSpriteMat = new THREE.SpriteMaterial({ map: hpTexture });
        const hpSprite = new THREE.Sprite(hpSpriteMat);
        hpSprite.position.set(0, 2.25, 0);
        hpSprite.scale.set(1.2, 0.22, 1);
        group.add(hpSprite);

        this.scene.add(group);

        const targetData = {
            group: group,
            pelvis: pelvis,
            torso: torso,
            headGroup: headGroup,
            headMesh: headMesh,
            torsoMesh: chestMesh,
            leftArm: leftArm,
            leftForearm: leftForearm,
            rightArm: rightArm,
            rightForearm: rightForearm,
            weaponGroup: weaponGroup,
            muzzleFlash: muzzleFlashMesh,
            muzzleLight: muzzleLight,
            leftThigh: leftThigh,
            leftCalf: leftCalf,
            rightThigh: rightThigh,
            rightCalf: rightCalf,
            hpCanvas: hpCanvas,
            hpTexture: hpTexture,
            hpSprite: hpSprite,
            label: config.label,
            type: config.type || 'hostile',
            archetype: archetype,
            isJuggernaut: isJuggernaut,
            spawnPos: new THREE.Vector3(...config.pos),
            maxHealth: config.health || 100,
            health: config.health || 100,
            speed: config.speed || 2.5,
            fireCooldown: config.fireCooldown || 2.0,
            lastShotTime: performance.now() / 1000 + Math.random() * 2.0,
            isDead: false,
            isDying: false,
            deathProgress: 0,
            deathType: 'fall',
            respawnTime: 0,
            flinchAngle: 0,
            walkPhase: Math.random() * Math.PI * 2,
            armRecoil: 0,
            flashTimer: 0
        };

        this.updateHealthBar(targetData);
        this.targets.push(targetData);
    }

    updateHealthBar(target) {
        const ctx = target.hpCanvas.getContext('2d');
        ctx.clearRect(0, 0, 128, 24);

        ctx.fillStyle = 'rgba(10, 15, 20, 0.88)';
        ctx.fillRect(0, 0, 128, 24);

        ctx.strokeStyle = target.isJuggernaut ? '#ff3344' : '#445566';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, 126, 22);

        const pct = Math.max(0, target.health / target.maxHealth);
        if (target.isJuggernaut) {
            ctx.fillStyle = '#ff2233'; // Boss red
        } else if (pct > 0.5) {
            ctx.fillStyle = '#00ff66';
        } else if (pct > 0.25) {
            ctx.fillStyle = '#ffaa00';
        } else {
            ctx.fillStyle = '#ff2233';
        }

        ctx.fillRect(3, 3, Math.floor(122 * pct), 18);
        target.hpTexture.needsUpdate = true;
    }

    checkHit(raycaster, baseDamage, headshotMult, onKillCallback) {
        const hitCandidates = [];
        this.targets.forEach(t => {
            if (!t.isDead) {
                hitCandidates.push(t.headMesh);
                hitCandidates.push(t.torsoMesh);
            }
        });

        const intersects = raycaster.intersectObjects(hitCandidates, false);
        if (intersects.length === 0) return null;

        const hit = intersects[0];
        const hitMesh = hit.object;
        const part = hitMesh.userData.part;
        const isHeadshot = (part === 'head');

        const target = this.targets.find(t => t.headMesh === hitMesh || t.torsoMesh === hitMesh);
        if (!target || target.isDead) return null;

        const damage = isHeadshot ? Math.round(baseDamage * headshotMult) : baseDamage;
        target.health = Math.max(0, target.health - damage);

        target.flinchAngle = isHeadshot ? 0.45 : 0.25;
        this.spawnSparks(hit.point);
        this.spawnFloatingText(hit.point, isHeadshot ? `+${damage} HEADSHOT!` : `+${damage}`, isHeadshot);
        this.updateHealthBar(target);

        if (target.health <= 0) {
            this.killTarget(target, hit.point, isHeadshot, onKillCallback, damage);
        }

        return {
            isHeadshot: isHeadshot,
            damage: damage,
            point: hit.point,
            target: target
        };
    }

    killTarget(target, hitPoint, isHeadshot, onKillCallback, damage) {
        target.isDead = true;
        target.isDying = true;
        target.deathProgress = 0;
        target.deathType = isHeadshot ? 'headshot_collapse' : (Math.random() < 0.5 ? 'backwards' : 'buckle');
        this.totalKills++;

        // Hide health bar
        if (target.hpSprite) target.hpSprite.visible = false;

        // Spawn Expanding Blood Pool on Floor
        this.spawnBloodPool(target.group.position.clone());

        if (onKillCallback) {
            onKillCallback(target.label, isHeadshot, damage);
        }

        // Spawn tactical drop
        if (window.strikeGame && window.strikeGame.pickupManager) {
            const forceDrop = (window.perkManager && window.perkManager.hasPerk('scavenger'));
            window.strikeGame.pickupManager.spawnDrop(target.group.position, forceDrop ? (Math.random() < 0.65 ? 'ammo' : 'equipment') : null);
        }

        if (this.gameMode === 'practice') {
            target.respawnTime = performance.now() / 1000 + 4.0;
        }

        this.checkWaveProgress();
    }

    spawnBloodPool(pos) {
        const poolGeo = new THREE.PlaneGeometry(0.4, 0.4);
        poolGeo.rotateX(-Math.PI / 2);
        const poolMesh = new THREE.Mesh(poolGeo, this.matBloodPool);
        poolMesh.position.set(pos.x, 0.02, pos.z);
        this.scene.add(poolMesh);

        this.bloodPools.push({
            mesh: poolMesh,
            life: 25.0,
            scale: 0.4,
            maxScale: 2.2 + Math.random() * 0.6
        });
    }

    checkWaveProgress() {
        if (this.gameMode !== 'survival') return;

        const aliveCount = this.targets.filter(t => !t.isDead).length;
        this.updateWaveHUD();

        if (aliveCount === 0 && this.waveState === 'active') {
            this.waveState = 'intermission';
            this.intermissionTimer = 5.0;

            window.soundEngine.playWaveClear();
            if (window.radioManager) {
                window.radioManager.transmit('HQ // OVERLORD', `Wave ${this.wave} eliminated! Restock and hold defensive positions.`);
            }
            this.showWaveAnnouncement(`WAVE ${this.wave} CLEARED!`, '+500 SCORE • AMMO RESTOCKED');

            window.gameScore = (window.gameScore || 0) + 500;

            if (window.progressionManager) {
                window.progressionManager.recordWaveClear(this.wave);
            }

            if (window.strikeGame) {
                if (window.strikeGame.player) {
                    const wm = window.strikeGame.player.weapons;
                    wm.reserveAmmo.rifle += 60;
                    wm.reserveAmmo.pistol += 24;
                    wm.reserveAmmo.sniper += 10;
                    wm.reserveAmmo.smg += 60;
                    wm.reserveAmmo.shotgun += 16;
                    wm.updateHUD();
                }
                if (window.strikeGame.equipmentManager) {
                    window.strikeGame.equipmentManager.resupply();
                }
            }
        }
    }

    updateWaveHUD() {
        const waveEl = document.getElementById('hud-wave-number');
        const countEl = document.getElementById('hud-enemies-count');
        const aliveCount = this.targets.filter(t => !t.isDead).length;

        if (waveEl) waveEl.textContent = (this.gameMode === 'survival') ? `WAVE ${this.wave}` : 'PRACTICE';
        if (countEl) countEl.textContent = aliveCount;
    }

    showWaveAnnouncement(title, subtitle) {
        const banner = document.getElementById('hud-wave-banner');
        const titleEl = document.getElementById('wave-banner-title');
        const subEl = document.getElementById('wave-banner-sub');

        if (banner && titleEl && subEl) {
            titleEl.textContent = title;
            subEl.textContent = subtitle;
            banner.classList.add('show');
            setTimeout(() => {
                banner.classList.remove('show');
            }, 3000);
        }
    }

    spawnFloatingText(worldPos, text, isHeadshot = false) {
        const hud = document.getElementById('hud-layer');
        if (!hud) return;

        const el = document.createElement('div');
        el.className = 'damage-number';
        el.textContent = text;
        el.style.color = isHeadshot ? '#ff2233' : '#ffffff';
        el.style.fontSize = isHeadshot ? '24px' : '17px';
        el.style.fontWeight = '900';
        el.style.textShadow = '0 0 8px rgba(0,0,0,0.9)';
        hud.appendChild(el);

        this.floatingTexts.push({
            el: el,
            pos: worldPos.clone(),
            life: 0.85,
            maxLife: 0.85
        });
    }

    spawnSparks(pos) {
        const sparkCount = 14;
        const geo = new THREE.BufferGeometry();
        const positions = new Float32Array(sparkCount * 3);
        const velocities = [];

        for (let i = 0; i < sparkCount; i++) {
            positions[i * 3] = pos.x;
            positions[i * 3 + 1] = pos.y;
            positions[i * 3 + 2] = pos.z;

            velocities.push(new THREE.Vector3(
                (Math.random() - 0.5) * 6,
                Math.random() * 5 + 1.5,
                (Math.random() - 0.5) * 6
            ));
        }

        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const mat = new THREE.PointsMaterial({
            color: 0xffaa22,
            size: 0.12,
            transparent: true,
            opacity: 1.0
        });

        const points = new THREE.Points(geo, mat);
        this.scene.add(points);

        this.sparks.push({
            mesh: points,
            velocities: velocities,
            life: 0.35,
            maxLife: 0.35
        });
    }

    spawnEnemyTracer(startPos, endPos) {
        const geo = new THREE.BufferGeometry().setFromPoints([startPos, endPos]);
        const mat = new THREE.LineBasicMaterial({
            color: 0xff2222,
            linewidth: 2,
            transparent: true,
            opacity: 0.95
        });

        const line = new THREE.Line(geo, mat);
        this.scene.add(line);

        this.enemyTracers.push({
            line: line,
            life: 0.12
        });
    }

    update(delta, time, camera, player) {
        // Intermission countdown
        if (this.waveState === 'intermission') {
            this.intermissionTimer -= delta;
            const timerEl = document.getElementById('hud-intermission-timer');
            if (timerEl) {
                timerEl.style.display = 'block';
                timerEl.textContent = `NEXT WAVE IN: ${Math.ceil(this.intermissionTimer)}s`;
            }
            if (this.intermissionTimer <= 0) {
                if (timerEl) timerEl.style.display = 'none';
                this.startWave(this.wave + 1);
            }
            return;
        }

        // Update Human Operator Bots
        this.targets.forEach(t => {
            // Check Muzzle Flash Decay
            if (t.flashTimer > 0) {
                t.flashTimer -= delta;
                if (t.flashTimer <= 0) {
                    t.muzzleFlash.visible = false;
                    t.muzzleLight.intensity = 0;
                }
            }

            // Arm Recoil Decay
            if (t.armRecoil > 0) {
                t.armRecoil = Math.max(0, t.armRecoil - delta * 0.4);
                t.weaponGroup.position.z = 0.14 - t.armRecoil;
            }

            // Procedural Death Ragdoll Collapse
            if (t.isDead) {
                if (t.isDying) {
                    t.deathProgress = Math.min(1.0, t.deathProgress + delta * 2.2);
                    const p = t.deathProgress;

                    if (t.deathType === 'backwards') {
                        // Flings backwards & collapses
                        t.pelvis.position.y = Math.max(0.18, 0.88 - p * 0.70);
                        t.torso.rotation.x = -p * 1.35;
                        t.headGroup.rotation.x = -p * 0.4;
                        t.leftThigh.rotation.x = p * 0.6;
                        t.rightThigh.rotation.x = p * 0.4;
                        t.leftCalf.rotation.x = p * 1.1;
                        t.rightCalf.rotation.x = p * 0.9;
                        // Drop rifle
                        t.weaponGroup.rotation.x = p * 1.5;
                        t.weaponGroup.position.y = -0.28 - p * 0.3;
                    } else if (t.deathType === 'headshot_collapse') {
                        // Instant limp drop forward
                        t.pelvis.position.y = Math.max(0.16, 0.88 - p * 0.72);
                        t.torso.rotation.x = p * 1.25;
                        t.headGroup.rotation.x = p * 0.6;
                        t.leftThigh.rotation.x = -p * 0.7;
                        t.rightThigh.rotation.x = -p * 0.5;
                        t.leftCalf.rotation.x = p * 1.3;
                        t.rightCalf.rotation.x = p * 1.2;
                        t.weaponGroup.rotation.z = p * 1.2;
                    } else {
                        // Knees buckle straight down
                        t.pelvis.position.y = Math.max(0.20, 0.88 - p * 0.68);
                        t.torso.rotation.x = p * 0.5;
                        t.leftThigh.rotation.x = -p * 0.8;
                        t.rightThigh.rotation.x = -p * 0.8;
                        t.leftCalf.rotation.x = p * 1.4;
                        t.rightCalf.rotation.x = p * 1.4;
                    }

                    if (p >= 1.0) {
                        t.isDying = false;
                    }
                }

                if (this.gameMode === 'practice' && time >= t.respawnTime) {
                    t.isDead = false;
                    t.isDying = false;
                    t.health = t.maxHealth;
                    t.pelvis.position.y = 0.88;
                    t.torso.rotation.set(0, 0, 0);
                    t.headGroup.rotation.set(0, 0, 0);
                    t.leftThigh.rotation.set(0, 0, 0);
                    t.rightThigh.rotation.set(0, 0, 0);
                    t.leftCalf.rotation.set(0, 0, 0);
                    t.rightCalf.rotation.set(0, 0, 0);
                    t.weaponGroup.position.set(0, -0.28, 0.14);
                    t.weaponGroup.rotation.set(0, 0, 0);
                    t.group.position.copy(t.spawnPos);
                    t.group.rotation.set(0, 0, 0);
                    if (t.hpSprite) t.hpSprite.visible = true;
                    this.updateHealthBar(t);
                }
                return;
            }

            // Flinch Decay
            if (t.flinchAngle > 0) {
                t.flinchAngle = Math.max(0, t.flinchAngle - delta * 3.5);
                t.torso.rotation.x = -t.flinchAngle * 0.7;
                t.headGroup.rotation.x = -t.flinchAngle;
            }

            // AI Logic for Hostile Operators
            if (t.type === 'hostile' && player) {
                const distToPlayer = t.group.position.distanceTo(player.position);

                // Rotate Operator to face player
                const targetYaw = Math.atan2(
                    player.position.x - t.group.position.x,
                    player.position.z - t.group.position.z
                );
                t.group.rotation.y = targetYaw;

                // Move toward player if beyond 7 meters
                let isMoving = false;
                if (distToPlayer > 7.5) {
                    isMoving = true;
                    const moveDirX = Math.sin(targetYaw);
                    const moveDirZ = Math.cos(targetYaw);
                    t.group.position.x += moveDirX * t.speed * delta;
                    t.group.position.z += moveDirZ * t.speed * delta;

                    // Skeletal Running Gait
                    t.walkPhase += delta * t.speed * 4.4;

                    // Hip bounce
                    t.pelvis.position.y = 0.88 + Math.abs(Math.sin(t.walkPhase)) * 0.04;

                    // Torso forward pitch & twist
                    t.torso.rotation.x = 0.14; // Combat forward lean
                    t.torso.rotation.y = Math.cos(t.walkPhase) * 0.05;

                    // Thigh swing & Knee flexion
                    t.leftThigh.rotation.x = Math.sin(t.walkPhase) * 0.65;
                    t.rightThigh.rotation.x = -Math.sin(t.walkPhase) * 0.65;

                    t.leftCalf.rotation.x = Math.max(0, -Math.sin(t.walkPhase) * 0.85);
                    t.rightCalf.rotation.x = Math.max(0, Math.sin(t.walkPhase) * 0.85);
                } else {
                    // Idle Breathing & Athletic Ready Stance
                    t.pelvis.position.y = 0.88 + Math.sin(time * 2.2) * 0.008;
                    t.torso.rotation.x = 0.06;
                    t.torso.rotation.y = 0;
                    t.leftThigh.rotation.x = 0.05;
                    t.rightThigh.rotation.x = -0.10;
                    t.leftCalf.rotation.x = 0.05;
                    t.rightCalf.rotation.x = 0.10;
                }

                // Operator Burst Shooting Logic
                if (distToPlayer < 38.0 && time - t.lastShotTime >= t.fireCooldown) {
                    t.lastShotTime = time;
                    window.soundEngine.playBotGunfire();

                    // Flash muzzle effect
                    t.muzzleFlash.visible = true;
                    t.muzzleLight.intensity = 3.5;
                    t.flashTimer = 0.06;
                    t.armRecoil = 0.06;

                    // Muzzle world position
                    const muzzleWorld = new THREE.Vector3();
                    t.muzzleFlash.getWorldPosition(muzzleWorld);

                    // Aim target at player chest/head with spread
                    const playerHead = player.position.clone().add(new THREE.Vector3(0, player.currentHeight - 0.2, 0));
                    const spread = (player.isSprinting ? 1.4 : 0.8) * (t.isJuggernaut ? 1.2 : 0.9);
                    const aimTarget = playerHead.clone().add(new THREE.Vector3(
                        (Math.random() - 0.5) * spread,
                        (Math.random() - 0.5) * (spread * 0.5),
                        (Math.random() - 0.5) * spread
                    ));

                    this.spawnEnemyTracer(muzzleWorld, aimTarget);

                    const hitDist = aimTarget.distanceTo(playerHead);
                    if (hitDist < 0.65) {
                        const botDamage = t.isJuggernaut ? Math.round(18 + Math.random() * 10) : Math.round(11 + Math.random() * 8);
                        player.takeDamage(botDamage);
                    }
                }
            } else if (t.type === 'practice') {
                const targetYaw = Math.atan2(
                    camera.position.x - t.group.position.x,
                    camera.position.z - t.group.position.z
                );
                t.group.rotation.y = targetYaw;
            }
        });

        // Update Blood Pools (expand then fade)
        for (let i = this.bloodPools.length - 1; i >= 0; i--) {
            const bp = this.bloodPools[i];
            bp.life -= delta;

            if (bp.scale < bp.maxScale) {
                bp.scale = Math.min(bp.maxScale, bp.scale + delta * 0.8);
                bp.mesh.scale.set(bp.scale, bp.scale, 1);
            }

            if (bp.life <= 0) {
                this.scene.remove(bp.mesh);
                bp.mesh.geometry.dispose();
                this.bloodPools.splice(i, 1);
            }
        }

        // Update Enemy Tracers
        for (let i = this.enemyTracers.length - 1; i >= 0; i--) {
            const tr = this.enemyTracers[i];
            tr.life -= delta;
            if (tr.life <= 0) {
                this.scene.remove(tr.line);
                tr.line.geometry.dispose();
                tr.line.material.dispose();
                this.enemyTracers.splice(i, 1);
            }
        }

        // Update Floating Combat Texts
        const halfWidth = window.innerWidth / 2;
        const halfHeight = window.innerHeight / 2;

        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.life -= delta;
            ft.pos.y += delta * 0.8;

            if (ft.life <= 0) {
                ft.el.remove();
                this.floatingTexts.splice(i, 1);
                continue;
            }

            const proj = ft.pos.clone().project(camera);
            if (proj.z > 1.0) {
                ft.el.style.display = 'none';
            } else {
                ft.el.style.display = 'block';
                const x = (proj.x * halfWidth) + halfWidth;
                const y = -(proj.y * halfHeight) + halfHeight;
                ft.el.style.left = `${x}px`;
                ft.el.style.top = `${y}px`;
                ft.el.style.opacity = (ft.life / ft.maxLife).toString();
            }
        }

        // Update Sparks
        for (let i = this.sparks.length - 1; i >= 0; i--) {
            const sp = this.sparks[i];
            sp.life -= delta;
            if (sp.life <= 0) {
                this.scene.remove(sp.mesh);
                sp.mesh.geometry.dispose();
                sp.mesh.material.dispose();
                this.sparks.splice(i, 1);
                continue;
            }

            const posAttr = sp.mesh.geometry.attributes.position;
            for (let j = 0; j < sp.velocities.length; j++) {
                const vel = sp.velocities[j];
                vel.y -= 9.8 * delta;
                posAttr.setXYZ(
                    j,
                    posAttr.getX(j) + vel.x * delta,
                    posAttr.getY(j) + vel.y * delta,
                    posAttr.getZ(j) + vel.z * delta
                );
            }
            posAttr.needsUpdate = true;
            sp.mesh.material.opacity = sp.life / sp.maxLife;
        }
    }
}

window.TargetManager = TargetManager;
