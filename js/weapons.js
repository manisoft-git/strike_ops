/**
 * StrikeOps - Weapon Systems & Procedural 3D Models
 * Builds detailed tactical firearms using Three.js primitives.
 * Controls ballistics, firing rates, recoil kicks, ADS offsets, and reload cycles.
 */

const WEAPON_CONFIGS = {
    rifle: {
        id: 'rifle',
        name: 'M4A1 CARBINE',
        type: 'automatic',
        damage: 34,
        headshotMult: 2.2,
        fireInterval: 0.10, // ~600 RPM
        magSize: 30,
        reserveAmmo: 120,
        reloadTime: 1.8,
        spreadHip: 0.038,
        spreadAds: 0.003,
        recoilKickPitch: 0.045,
        recoilKickBack: 0.04,
        recoilCamera: 0.022,
        adsFov: 52,
        hipPos: new THREE.Vector3(0.20, -0.20, -0.42),
        hipRot: new THREE.Euler(0.02, -0.04, 0),
        adsPos: new THREE.Vector3(0.00, -0.142, -0.34),
        adsRot: new THREE.Euler(0.0, 0.0, 0)
    },
    pistol: {
        id: 'pistol',
        name: 'TACTICAL .45',
        type: 'semi',
        damage: 48,
        headshotMult: 2.5,
        fireInterval: 0.22,
        magSize: 12,
        reserveAmmo: 48,
        reloadTime: 1.4,
        spreadHip: 0.025,
        spreadAds: 0.002,
        recoilKickPitch: 0.075,
        recoilKickBack: 0.035,
        recoilCamera: 0.028,
        adsFov: 60,
        hipPos: new THREE.Vector3(0.18, -0.18, -0.38),
        hipRot: new THREE.Euler(0.02, -0.02, 0),
        adsPos: new THREE.Vector3(0.00, -0.125, -0.30),
        adsRot: new THREE.Euler(0.0, 0.0, 0)
    },
    sniper: {
        id: 'sniper',
        name: 'AWM RECON',
        type: 'bolt',
        damage: 110,
        headshotMult: 3.0,
        fireInterval: 1.15,
        magSize: 5,
        reserveAmmo: 25,
        reloadTime: 2.4,
        spreadHip: 0.080,
        spreadAds: 0.0005,
        recoilKickPitch: 0.14,
        recoilKickBack: 0.09,
        recoilCamera: 0.065,
        adsFov: 24, // High-magnification scope
        hipPos: new THREE.Vector3(0.22, -0.22, -0.46),
        hipRot: new THREE.Euler(0.03, -0.05, 0),
        adsPos: new THREE.Vector3(0.00, -0.150, -0.32),
        adsRot: new THREE.Euler(0.0, 0.0, 0)
    },
    smg: {
        id: 'smg',
        name: 'MP5 TACTICAL',
        type: 'automatic',
        damage: 28,
        headshotMult: 2.0,
        fireInterval: 0.075, // 800 RPM
        magSize: 30,
        reserveAmmo: 150,
        reloadTime: 1.5,
        spreadHip: 0.026,
        spreadAds: 0.002,
        recoilKickPitch: 0.035,
        recoilKickBack: 0.03,
        recoilCamera: 0.016,
        adsFov: 56,
        hipPos: new THREE.Vector3(0.18, -0.18, -0.38),
        hipRot: new THREE.Euler(0.02, -0.03, 0),
        adsPos: new THREE.Vector3(0.00, -0.132, -0.30),
        adsRot: new THREE.Euler(0.0, 0.0, 0)
    },
    shotgun: {
        id: 'shotgun',
        name: 'SPAS-12 BREACHER',
        type: 'shotgun',
        damage: 22, // Per pellet (x8 pellets)
        pelletCount: 8,
        headshotMult: 1.8,
        fireInterval: 0.75,
        magSize: 8,
        reserveAmmo: 32,
        reloadTime: 2.2,
        spreadHip: 0.070,
        spreadAds: 0.030,
        recoilKickPitch: 0.11,
        recoilKickBack: 0.08,
        recoilCamera: 0.055,
        adsFov: 62,
        hipPos: new THREE.Vector3(0.20, -0.20, -0.42),
        hipRot: new THREE.Euler(0.03, -0.04, 0),
        adsPos: new THREE.Vector3(0.00, -0.140, -0.32),
        adsRot: new THREE.Euler(0.0, 0.0, 0)
    }
};

class WeaponManager {
    constructor(camera) {
        this.camera = camera;
        this.weapons = {};
        this.activeWeaponId = 'rifle';

        // Recoil state vectors
        this.currentRecoil = {
            pitch: 0,
            back: 0,
            yaw: 0
        };

        // State variables
        this.ammoInMag = {
            rifle: WEAPON_CONFIGS.rifle.magSize,
            pistol: WEAPON_CONFIGS.pistol.magSize,
            sniper: WEAPON_CONFIGS.sniper.magSize,
            smg: WEAPON_CONFIGS.smg.magSize,
            shotgun: WEAPON_CONFIGS.shotgun.magSize
        };
        this.reserveAmmo = {
            rifle: WEAPON_CONFIGS.rifle.reserveAmmo,
            pistol: WEAPON_CONFIGS.pistol.reserveAmmo,
            sniper: WEAPON_CONFIGS.sniper.reserveAmmo,
            smg: WEAPON_CONFIGS.smg.reserveAmmo,
            shotgun: WEAPON_CONFIGS.shotgun.reserveAmmo
        };

        this.lastShotTime = 0;
        this.isReloading = false;
        this.reloadEndTime = 0;
        this.isAiming = false;
        this.adsProgress = 0;

        // Weapon container parented directly to camera
        this.rig = new THREE.Group();
        this.camera.add(this.rig);

        // Weapon Attachments System
        this.attachments = {
            suppressor: false,
            laser: false,
            extendedMag: false
        };

        this.buildMaterials();
        this.buildAllWeapons();
        this.equip('rifle');
    }

    buildMaterials() {
        this.matMatteGunmetal = new THREE.MeshStandardMaterial({
            color: 0x1f2326,
            roughness: 0.45,
            metalness: 0.8
        });
        this.matSteel = new THREE.MeshStandardMaterial({
            color: 0x3a4045,
            roughness: 0.3,
            metalness: 0.9
        });
        this.matPolymerGrip = new THREE.MeshStandardMaterial({
            color: 0x141618,
            roughness: 0.85,
            metalness: 0.1
        });
        this.matTanAccent = new THREE.MeshStandardMaterial({
            color: 0x6e604d,
            roughness: 0.7,
            metalness: 0.2
        });
        this.matOpticGlass = new THREE.MeshBasicMaterial({
            color: 0x0a1a20,
            transparent: true,
            opacity: 0.6
        });
        this.matReticleRed = new THREE.MeshBasicMaterial({
            color: 0xff1122
        });
        this.matReticleGreen = new THREE.MeshBasicMaterial({
            color: 0x00ff66
        });
        this.matSuppressor = new THREE.MeshStandardMaterial({
            color: 0x111315,
            roughness: 0.6,
            metalness: 0.7
        });
        this.matLaserBeam = new THREE.LineBasicMaterial({
            color: 0x00ff44,
            linewidth: 2,
            transparent: true,
            opacity: 0.85
        });

        // First-Person Operator Tactical Arms Materials
        this.matArmSleeve = new THREE.MeshStandardMaterial({
            color: 0x3d4734, // Olive tactical multicam
            roughness: 0.85,
            metalness: 0.05
        });
        this.matGloves = new THREE.MeshStandardMaterial({
            color: 0x181c20, // Black Mechanix tactical gloves
            roughness: 0.75,
            metalness: 0.2
        });
        this.matWatch = new THREE.MeshStandardMaterial({
            color: 0x0e1012,
            roughness: 0.35,
            metalness: 0.6
        });
        this.matWatchScreen = new THREE.MeshBasicMaterial({
            color: 0x00e5ff
        });

        this.currentCamo = 'standard';
    }

    setCamo(camoName) {
        this.currentCamo = camoName;
        if (camoName === 'desert') {
            this.matMatteGunmetal.color.setHex(0x8c7853);
            this.matTanAccent.color.setHex(0xb59d6e);
            this.matMatteGunmetal.roughness = 0.55;
            this.matMatteGunmetal.metalness = 0.5;
            this.matArmSleeve.color.setHex(0x7d6c52);
        } else if (camoName === 'arctic') {
            this.matMatteGunmetal.color.setHex(0xccd5de);
            this.matTanAccent.color.setHex(0x8a99a8);
            this.matMatteGunmetal.roughness = 0.35;
            this.matMatteGunmetal.metalness = 0.7;
            this.matArmSleeve.color.setHex(0xb0b8c2);
        } else if (camoName === 'gold') {
            this.matMatteGunmetal.color.setHex(0xd4af37);
            this.matTanAccent.color.setHex(0xaa8c2c);
            this.matMatteGunmetal.roughness = 0.20;
            this.matMatteGunmetal.metalness = 0.95;
            this.matArmSleeve.color.setHex(0x1a1a1a);
        } else if (camoName === 'damascus') {
            this.matMatteGunmetal.color.setHex(0x20354b);
            this.matTanAccent.color.setHex(0x00d4ff);
            this.matMatteGunmetal.roughness = 0.30;
            this.matMatteGunmetal.metalness = 0.85;
            this.matArmSleeve.color.setHex(0x182028);
        } else {
            // Standard issue gunmetal & olive multicam
            this.matMatteGunmetal.color.setHex(0x1f2326);
            this.matTanAccent.color.setHex(0x6e604d);
            this.matMatteGunmetal.roughness = 0.45;
            this.matMatteGunmetal.metalness = 0.8;
            this.matArmSleeve.color.setHex(0x3d4734);
        }
    }

    attachOperatorArms(gun, type = 'rifle') {
        const armsGroup = new THREE.Group();

        // Right Forearm & Tactical Glove Hand (holding pistol grip)
        const rightArm = new THREE.Group();
        rightArm.position.set(0.14, -0.22, 0.16);
        rightArm.rotation.set(0.45, -0.35, 0.25);

        const rSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.28, 8), this.matArmSleeve);
        rSleeve.position.y = -0.10;
        rightArm.add(rSleeve);

        const rGlove = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.08, 0.09), this.matGloves);
        rGlove.position.set(-0.02, 0.06, -0.04);
        rightArm.add(rGlove);

        const rFingers = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.06, 0.05), this.matGloves);
        rFingers.position.set(-0.04, 0.07, -0.08);
        rightArm.add(rFingers);

        armsGroup.add(rightArm);

        // Left Forearm & Glove Hand (gripping foregrip / handguard)
        if (type !== 'pistol') {
            const leftArm = new THREE.Group();
            leftArm.position.set(-0.14, -0.22, 0.04);
            leftArm.rotation.set(0.35, 0.45, -0.30);

            const lSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.30, 8), this.matArmSleeve);
            lSleeve.position.y = -0.10;
            leftArm.add(lSleeve);

            // Tactical Digital Watch on Left Wrist
            const watch = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.02, 0.05), this.matWatch);
            watch.position.set(0, 0.04, 0.035);
            const watchScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.035, 0.018), this.matWatchScreen);
            watchScreen.position.set(0, 0.052, 0.035);
            watchScreen.rotation.x = -Math.PI / 2;
            leftArm.add(watch);
            leftArm.add(watchScreen);

            // Left Glove Hand in tactical C-clamp grip
            const lGlove = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.075, 0.08), this.matGloves);
            lGlove.position.set(0.06, 0.12, -0.18);
            lGlove.rotation.z = 0.4;
            leftArm.add(lGlove);

            armsGroup.add(leftArm);
        } else {
            // Pistol two-handed Weaver / Modern Isosceles support grip
            const leftArm = new THREE.Group();
            leftArm.position.set(-0.10, -0.24, 0.18);
            leftArm.rotation.set(0.40, 0.35, -0.20);

            const lSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.28, 8), this.matArmSleeve);
            lSleeve.position.y = -0.10;
            leftArm.add(lSleeve);

            const lGlove = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.08), this.matGloves);
            lGlove.position.set(0.05, 0.08, -0.06);
            leftArm.add(lGlove);

            armsGroup.add(leftArm);
        }

        gun.add(armsGroup);
    }

    buildAllWeapons() {
        this.weapons.rifle = this.buildRifleModel();
        this.weapons.pistol = this.buildPistolModel();
        this.weapons.sniper = this.buildSniperModel();
        this.weapons.smg = this.buildSMGModel();
        this.weapons.shotgun = this.buildShotgunModel();

        for (let key in this.weapons) {
            this.rig.add(this.weapons[key]);
            this.weapons[key].visible = false;
        }
    }

    buildRifleModel() {
        const gun = new THREE.Group();

        // Receiver / Body
        const receiverGeo = new THREE.BoxGeometry(0.048, 0.085, 0.32);
        const receiver = new THREE.Mesh(receiverGeo, this.matMatteGunmetal);
        gun.add(receiver);

        // Handguard / Quad Rail
        const handguardGeo = new THREE.BoxGeometry(0.044, 0.065, 0.28);
        const handguard = new THREE.Mesh(handguardGeo, this.matTanAccent);
        handguard.position.set(0, 0.005, -0.28);
        gun.add(handguard);

        // Barrel & Flash Hider
        const barrelGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.22, 12);
        barrelGeo.rotateX(Math.PI / 2);
        const barrel = new THREE.Mesh(barrelGeo, this.matSteel);
        barrel.position.set(0, 0.02, -0.48);
        gun.add(barrel);

        const flashHiderGeo = new THREE.CylinderGeometry(0.016, 0.014, 0.05, 8);
        flashHiderGeo.rotateX(Math.PI / 2);
        const flashHider = new THREE.Mesh(flashHiderGeo, this.matSteel);
        flashHider.position.set(0, 0.02, -0.60);
        gun.add(flashHider);

        // Curved STANAG 30-round Magazine
        const magGeo = new THREE.BoxGeometry(0.038, 0.16, 0.075);
        const mag = new THREE.Mesh(magGeo, this.matSteel);
        mag.position.set(0, -0.11, -0.06);
        mag.rotation.x = -0.15;
        gun.add(mag);

        // Pistol Grip
        const gripGeo = new THREE.BoxGeometry(0.036, 0.12, 0.05);
        const grip = new THREE.Mesh(gripGeo, this.matPolymerGrip);
        grip.position.set(0, -0.09, 0.10);
        grip.rotation.x = -0.32;
        gun.add(grip);

        // Tactical Stock
        const stockTubeGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.16, 8);
        stockTubeGeo.rotateX(Math.PI / 2);
        const stockTube = new THREE.Mesh(stockTubeGeo, this.matSteel);
        stockTube.position.set(0, 0.02, 0.22);
        gun.add(stockTube);

        const stockPadGeo = new THREE.BoxGeometry(0.042, 0.13, 0.08);
        const stockPad = new THREE.Mesh(stockPadGeo, this.matTanAccent);
        stockPad.position.set(0, -0.01, 0.32);
        gun.add(stockPad);

        // Holographic Red Dot Sight
        const opticMountGeo = new THREE.BoxGeometry(0.035, 0.02, 0.09);
        const opticMount = new THREE.Mesh(opticMountGeo, this.matMatteGunmetal);
        opticMount.position.set(0, 0.052, -0.05);
        gun.add(opticMount);

        const opticHousingGeo = new THREE.BoxGeometry(0.046, 0.042, 0.07);
        const opticHousing = new THREE.Mesh(opticHousingGeo, this.matMatteGunmetal);
        opticHousing.position.set(0, 0.075, -0.05);
        gun.add(opticHousing);

        // Glass window
        const opticLensGeo = new THREE.PlaneGeometry(0.032, 0.028);
        const opticLens = new THREE.Mesh(opticLensGeo, this.matOpticGlass);
        opticLens.position.set(0, 0.075, -0.02);
        gun.add(opticLens);

        // Glowing red dot reticle (positioned right on center aim line)
        const dotGeo = new THREE.SphereGeometry(0.0022, 8, 8);
        const redDot = new THREE.Mesh(dotGeo, this.matReticleRed);
        redDot.position.set(0, 0.075, -0.022);
        gun.add(redDot);

        // Muzzle Flash anchor point & Light
        gun.userData.muzzlePos = new THREE.Vector3(0, 0.02, -0.63);
        const muzzleLight = new THREE.PointLight(0xffaa22, 0, 8);
        muzzleLight.position.copy(gun.userData.muzzlePos);
        gun.add(muzzleLight);
        gun.userData.muzzleLight = muzzleLight;

        // Tactical Suppressor Attachment
        const suppGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.22, 12);
        suppGeo.rotateX(Math.PI / 2);
        const suppressor = new THREE.Mesh(suppGeo, this.matSuppressor);
        suppressor.position.set(0, 0.02, -0.72);
        suppressor.visible = false;
        gun.add(suppressor);
        gun.userData.suppressor = suppressor;

        // Tactical Green Laser Sight
        const laserBoxGeo = new THREE.BoxGeometry(0.02, 0.02, 0.06);
        const laserBox = new THREE.Mesh(laserBoxGeo, this.matSuppressor);
        laserBox.position.set(-0.032, 0.015, -0.32);
        gun.add(laserBox);

        const laserPoints = [
            new THREE.Vector3(-0.032, 0.015, -0.35),
            new THREE.Vector3(-0.032, 0.015, -40)
        ];
        const laserGeo = new THREE.BufferGeometry().setFromPoints(laserPoints);
        const laserBeam = new THREE.Line(laserGeo, this.matLaserBeam);
        laserBeam.visible = false;
        gun.add(laserBeam);
        gun.userData.laser = laserBeam;

        this.attachOperatorArms(gun, 'rifle');
        return gun;
    }

    buildPistolModel() {
        const gun = new THREE.Group();

        // Slide
        const slideGeo = new THREE.BoxGeometry(0.038, 0.055, 0.22);
        const slide = new THREE.Mesh(slideGeo, this.matSteel);
        slide.position.set(0, 0.025, -0.04);
        gun.add(slide);

        // Frame
        const frameGeo = new THREE.BoxGeometry(0.036, 0.045, 0.18);
        const frame = new THREE.Mesh(frameGeo, this.matMatteGunmetal);
        frame.position.set(0, -0.015, -0.03);
        gun.add(frame);

        // Grip
        const gripGeo = new THREE.BoxGeometry(0.034, 0.11, 0.055);
        const grip = new THREE.Mesh(gripGeo, this.matPolymerGrip);
        grip.position.set(0, -0.075, 0.035);
        grip.rotation.x = -0.25;
        gun.add(grip);

        // Front & Rear Iron Sights (with green tritium dots)
        const frontSightGeo = new THREE.BoxGeometry(0.006, 0.012, 0.008);
        const frontSight = new THREE.Mesh(frontSightGeo, this.matReticleGreen);
        frontSight.position.set(0, 0.058, -0.14);
        gun.add(frontSight);

        const rearSightL = new THREE.Mesh(frontSightGeo, this.matReticleGreen);
        rearSightL.position.set(-0.012, 0.058, 0.06);
        gun.add(rearSightL);

        const rearSightR = new THREE.Mesh(frontSightGeo, this.matReticleGreen);
        rearSightR.position.set(0.012, 0.058, 0.06);
        gun.add(rearSightR);

        gun.userData.muzzlePos = new THREE.Vector3(0, 0.025, -0.16);
        const muzzleLight = new THREE.PointLight(0xffbb33, 0, 6);
        muzzleLight.position.copy(gun.userData.muzzlePos);
        gun.add(muzzleLight);
        gun.userData.muzzleLight = muzzleLight;

        // Pistol Suppressor
        const pSuppGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.16, 10);
        pSuppGeo.rotateX(Math.PI / 2);
        const pSupp = new THREE.Mesh(pSuppGeo, this.matSuppressor);
        pSupp.position.set(0, 0.025, -0.24);
        pSupp.visible = false;
        gun.add(pSupp);
        gun.userData.suppressor = pSupp;

        // Pistol Laser
        const pLaserPoints = [
            new THREE.Vector3(0, -0.01, -0.14),
            new THREE.Vector3(0, -0.01, -30)
        ];
        const pLaserGeo = new THREE.BufferGeometry().setFromPoints(pLaserPoints);
        const pLaser = new THREE.Line(pLaserGeo, this.matLaserBeam);
        pLaser.visible = false;
        gun.add(pLaser);
        gun.userData.laser = pLaser;

        this.attachOperatorArms(gun, 'pistol');
        return gun;
    }

    buildSniperModel() {
        const gun = new THREE.Group();

        // Heavy long receiver
        const receiverGeo = new THREE.BoxGeometry(0.055, 0.085, 0.38);
        const receiver = new THREE.Mesh(receiverGeo, this.matTanAccent);
        gun.add(receiver);

        // Fluted sniper barrel
        const barrelGeo = new THREE.CylinderGeometry(0.016, 0.018, 0.55, 12);
        barrelGeo.rotateX(Math.PI / 2);
        const barrel = new THREE.Mesh(barrelGeo, this.matSteel);
        barrel.position.set(0, 0.02, -0.45);
        gun.add(barrel);

        // Massive muzzle brake
        const brakeGeo = new THREE.BoxGeometry(0.038, 0.034, 0.08);
        const brake = new THREE.Mesh(brakeGeo, this.matSteel);
        brake.position.set(0, 0.02, -0.74);
        gun.add(brake);

        // Precision stock with cheek rest
        const stockGeo = new THREE.BoxGeometry(0.048, 0.12, 0.28);
        const stock = new THREE.Mesh(stockGeo, this.matTanAccent);
        stock.position.set(0, -0.01, 0.30);
        gun.add(stock);

        // Large telescopic sniper scope
        const scopeTubeGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.26, 12);
        scopeTubeGeo.rotateX(Math.PI / 2);
        const scopeTube = new THREE.Mesh(scopeTubeGeo, this.matMatteGunmetal);
        scopeTube.position.set(0, 0.085, -0.04);
        gun.add(scopeTube);

        const scopeBellGeo = new THREE.CylinderGeometry(0.032, 0.022, 0.08, 12);
        scopeBellGeo.rotateX(Math.PI / 2);
        const scopeBell = new THREE.Mesh(scopeBellGeo, this.matMatteGunmetal);
        scopeBell.position.set(0, 0.085, -0.19);
        gun.add(scopeBell);

        // Bipod legs
        const bipodGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.18, 6);
        const bipodL = new THREE.Mesh(bipodGeo, this.matSteel);
        bipodL.position.set(-0.06, -0.07, -0.45);
        bipodL.rotation.z = -0.35;
        gun.add(bipodL);

        const bipodR = new THREE.Mesh(bipodGeo, this.matSteel);
        bipodR.position.set(0.06, -0.07, -0.45);
        bipodR.rotation.z = 0.35;
        gun.add(bipodR);

        gun.userData.muzzlePos = new THREE.Vector3(0, 0.02, -0.78);
        const muzzleLight = new THREE.PointLight(0xffaa22, 0, 10);
        muzzleLight.position.copy(gun.userData.muzzlePos);
        gun.add(muzzleLight);
        gun.userData.muzzleLight = muzzleLight;

        // Sniper Suppressor
        const sSuppGeo = new THREE.CylinderGeometry(0.026, 0.026, 0.32, 12);
        sSuppGeo.rotateX(Math.PI / 2);
        const sSupp = new THREE.Mesh(sSuppGeo, this.matSuppressor);
        sSupp.position.set(0, 0.02, -0.92);
        sSupp.visible = false;
        gun.add(sSupp);
        gun.userData.suppressor = sSupp;

        // Sniper Laser
        const sLaserPoints = [
            new THREE.Vector3(0.04, 0.02, -0.55),
            new THREE.Vector3(0.04, 0.02, -50)
        ];
        const sLaserGeo = new THREE.BufferGeometry().setFromPoints(sLaserPoints);
        const sLaser = new THREE.Line(sLaserGeo, this.matLaserBeam);
        sLaser.visible = false;
        gun.add(sLaser);
        gun.userData.laser = sLaser;

        this.attachOperatorArms(gun, 'sniper');
        return gun;
    }

    buildSMGModel() {
        const gun = new THREE.Group();

        // Receiver
        const receiverGeo = new THREE.BoxGeometry(0.042, 0.075, 0.28);
        const receiver = new THREE.Mesh(receiverGeo, this.matMatteGunmetal);
        gun.add(receiver);

        // Barrel & Front Sight Ring
        const barrelGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.18, 10);
        barrelGeo.rotateX(Math.PI / 2);
        const barrel = new THREE.Mesh(barrelGeo, this.matSteel);
        barrel.position.set(0, 0.015, -0.22);
        gun.add(barrel);

        const sightGeo = new THREE.BoxGeometry(0.008, 0.018, 0.008);
        const sight = new THREE.Mesh(sightGeo, this.matReticleGreen);
        sight.position.set(0, 0.052, -0.28);
        gun.add(sight);

        // Curved 9mm Magazine
        const magGeo = new THREE.BoxGeometry(0.028, 0.16, 0.042);
        const mag = new THREE.Mesh(magGeo, this.matSteel);
        mag.position.set(0, -0.10, -0.04);
        mag.rotation.x = 0.12;
        gun.add(mag);

        // Foregrip / Handguard
        const foregripGeo = new THREE.BoxGeometry(0.038, 0.06, 0.12);
        const foregrip = new THREE.Mesh(foregripGeo, this.matPolymerGrip);
        foregrip.position.set(0, -0.01, -0.14);
        gun.add(foregrip);

        // Retractable Wire Stock
        const stockL = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.22, 6), this.matSteel);
        stockL.rotateX(Math.PI / 2);
        stockL.position.set(-0.024, 0.01, 0.22);
        gun.add(stockL);

        const stockR = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.22, 6), this.matSteel);
        stockR.rotateX(Math.PI / 2);
        stockR.position.set(0.024, 0.01, 0.22);
        gun.add(stockR);

        gun.userData.muzzlePos = new THREE.Vector3(0, 0.015, -0.32);
        const muzzleLight = new THREE.PointLight(0xffaa22, 0, 7);
        muzzleLight.position.copy(gun.userData.muzzlePos);
        gun.add(muzzleLight);
        gun.userData.muzzleLight = muzzleLight;

        // Suppressor
        const suppGeo = new THREE.CylinderGeometry(0.020, 0.020, 0.20, 10);
        suppGeo.rotateX(Math.PI / 2);
        const supp = new THREE.Mesh(suppGeo, this.matSuppressor);
        supp.position.set(0, 0.015, -0.41);
        supp.visible = false;
        gun.add(supp);
        gun.userData.suppressor = supp;

        // Laser
        const laserPoints = [
            new THREE.Vector3(-0.026, 0.01, -0.18),
            new THREE.Vector3(-0.026, 0.01, -35)
        ];
        const laserGeo = new THREE.BufferGeometry().setFromPoints(laserPoints);
        const laser = new THREE.Line(laserGeo, this.matLaserBeam);
        laser.visible = false;
        gun.add(laser);
        gun.userData.laser = laser;

        this.attachOperatorArms(gun, 'smg');
        return gun;
    }

    buildShotgunModel() {
        const gun = new THREE.Group();

        // Receiver
        const receiverGeo = new THREE.BoxGeometry(0.052, 0.082, 0.35);
        const receiver = new THREE.Mesh(receiverGeo, this.matMatteGunmetal);
        gun.add(receiver);

        // Heavy Wide Barrel
        const barrelGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.52, 10);
        barrelGeo.rotateX(Math.PI / 2);
        const barrel = new THREE.Mesh(barrelGeo, this.matSteel);
        barrel.position.set(0, 0.025, -0.42);
        gun.add(barrel);

        // Under-barrel Tube
        const tubeGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.46, 10);
        tubeGeo.rotateX(Math.PI / 2);
        const tube = new THREE.Mesh(tubeGeo, this.matSteel);
        tube.position.set(0, -0.012, -0.38);
        gun.add(tube);

        // Ribbed Pump Slide
        const pumpGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.18, 8);
        pumpGeo.rotateX(Math.PI / 2);
        const pump = new THREE.Mesh(pumpGeo, this.matPolymerGrip);
        pump.position.set(0, -0.012, -0.34);
        gun.add(pump);

        // Folding Top Stock
        const stockGeo = new THREE.BoxGeometry(0.038, 0.022, 0.28);
        const stock = new THREE.Mesh(stockGeo, this.matMatteGunmetal);
        stock.position.set(0, 0.052, 0.05);
        gun.add(stock);

        // Pistol Grip
        const gripGeo = new THREE.BoxGeometry(0.036, 0.12, 0.055);
        const grip = new THREE.Mesh(gripGeo, this.matPolymerGrip);
        grip.position.set(0, -0.085, 0.12);
        grip.rotation.x = -0.30;
        gun.add(grip);

        gun.userData.muzzlePos = new THREE.Vector3(0, 0.025, -0.68);
        const muzzleLight = new THREE.PointLight(0xff9911, 0, 9);
        muzzleLight.position.copy(gun.userData.muzzlePos);
        gun.add(muzzleLight);
        gun.userData.muzzleLight = muzzleLight;

        // Suppressor
        const suppGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.25, 10);
        suppGeo.rotateX(Math.PI / 2);
        const supp = new THREE.Mesh(suppGeo, this.matSuppressor);
        supp.position.set(0, 0.025, -0.80);
        supp.visible = false;
        gun.add(supp);
        gun.userData.suppressor = supp;

        // Laser
        const laserPoints = [
            new THREE.Vector3(0.03, 0.01, -0.30),
            new THREE.Vector3(0.03, 0.01, -35)
        ];
        const laserGeo = new THREE.BufferGeometry().setFromPoints(laserPoints);
        const laser = new THREE.Line(laserGeo, this.matLaserBeam);
        laser.visible = false;
        gun.add(laser);
        gun.userData.laser = laser;

        this.attachOperatorArms(gun, 'shotgun');
        return gun;
    }

    toggleAttachment(type) {
        if (this.attachments[type] === undefined) return;
        this.attachments[type] = !this.attachments[type];
        window.soundEngine.playAttachmentClick();

        for (let key in this.weapons) {
            const w = this.weapons[key];
            if (type === 'suppressor' && w.userData.suppressor) {
                w.userData.suppressor.visible = this.attachments.suppressor;
            }
            if (type === 'laser' && w.userData.laser) {
                w.userData.laser.visible = this.attachments.laser;
            }
        }

        if (type === 'extendedMag') {
            for (let wId in WEAPON_CONFIGS) {
                const maxMag = this.getMagSize(wId);
                if (this.ammoInMag[wId] > maxMag) this.ammoInMag[wId] = maxMag;
            }
        }

        this.updateHUD();
        this.updateAttachmentUI();
    }

    getMagSize(wId = this.activeWeaponId) {
        const base = WEAPON_CONFIGS[wId].magSize;
        return this.attachments.extendedMag ? Math.round(base * 1.5) : base;
    }

    equip(weaponId) {
        if (!this.weapons[weaponId]) return;
        if (this.isReloading) {
            this.cancelReload();
        }

        this.activeWeaponId = weaponId;
        for (let key in this.weapons) {
            this.weapons[key].visible = (key === weaponId);
        }

        // Reapply current attachment visibility on newly equipped weapon
        const activeMesh = this.getActiveMesh();
        if (activeMesh.userData.suppressor) {
            activeMesh.userData.suppressor.visible = this.attachments.suppressor;
        }
        if (activeMesh.userData.laser) {
            activeMesh.userData.laser.visible = this.attachments.laser;
        }

        // Apply base hip position
        const cfg = this.getConfig();
        activeMesh.position.copy(cfg.hipPos);
        activeMesh.rotation.copy(cfg.hipRot);

        this.updateHUD();
    }

    getConfig() {
        return WEAPON_CONFIGS[this.activeWeaponId];
    }

    getActiveMesh() {
        return this.weapons[this.activeWeaponId];
    }

    canShoot(time) {
        if (this.isReloading) return false;
        const cfg = this.getConfig();
        if (time - this.lastShotTime < cfg.fireInterval) return false;
        return true;
    }

    shoot(time, callbackOnHit) {
        if (!this.canShoot(time)) return false;

        const cfg = this.getConfig();

        if (this.ammoInMag[this.activeWeaponId] <= 0) {
            window.soundEngine.playDryFire();
            this.startReload(time);
            return false;
        }

        // Deduct round
        this.ammoInMag[this.activeWeaponId]--;
        this.lastShotTime = time;

        // Play weapon gunshot audio (suppressed vs regular)
        if (this.attachments.suppressor) {
            window.soundEngine.playSuppressedShot();
        } else {
            window.soundEngine.playShot(cfg.id);
        }

        // Apply procedural recoil kick (suppressor dampens recoil)
        const recoilMod = this.attachments.suppressor ? 0.78 : 1.0;
        this.currentRecoil.pitch += cfg.recoilKickPitch * recoilMod;
        this.currentRecoil.back += cfg.recoilKickBack * recoilMod;
        this.currentRecoil.yaw += (Math.random() - 0.5) * 0.015 * recoilMod;

        // Flash muzzle light (suppressor eliminates flash)
        const mesh = this.getActiveMesh();
        if (mesh.userData.muzzleLight && !this.attachments.suppressor) {
            mesh.userData.muzzleLight.intensity = 2.5;
            setTimeout(() => {
                if (mesh.userData.muzzleLight) mesh.userData.muzzleLight.intensity = 0;
            }, 45);
        }

        this.updateHUD();
        return true;
    }

    startReload(time) {
        if (this.isReloading) return;
        const cfg = this.getConfig();
        const maxMag = this.getMagSize(this.activeWeaponId);
        const currentMag = this.ammoInMag[this.activeWeaponId];
        const reserve = this.reserveAmmo[this.activeWeaponId];

        if (currentMag >= maxMag || reserve <= 0) return;

        let reloadDuration = cfg.reloadTime;
        if (window.perkManager && window.perkManager.hasPerk('fasthands')) {
            reloadDuration *= 0.55;
        }

        this.isReloading = true;
        this.currentReloadDuration = reloadDuration;
        this.reloadEndTime = time + reloadDuration;

        window.soundEngine.playReload(reloadDuration);
        this.updateHUD();
    }

    cancelReload() {
        this.isReloading = false;
        this.updateHUD();
    }

    update(delta, time, isSprinting, isMoving) {
        const cfg = this.getConfig();
        const mesh = this.getActiveMesh();
        if (!mesh) return;

        // Check reload completion
        if (this.isReloading && time >= this.reloadEndTime) {
            const maxMag = this.getMagSize(this.activeWeaponId);
            const needed = maxMag - this.ammoInMag[this.activeWeaponId];
            const loadCount = Math.min(needed, this.reserveAmmo[this.activeWeaponId]);
            this.ammoInMag[this.activeWeaponId] += loadCount;
            this.reserveAmmo[this.activeWeaponId] -= loadCount;
            this.isReloading = false;
            this.updateHUD();
        }

        // Smooth ADS transition
        const targetAds = (this.isAiming && !this.isReloading && !isSprinting) ? 1.0 : 0.0;
        this.adsProgress += (targetAds - this.adsProgress) * Math.min(delta * 14, 1.0);

        // Recover recoil springs
        const recoilRecovery = delta * 10;
        this.currentRecoil.pitch = Math.max(0, this.currentRecoil.pitch - recoilRecovery);
        this.currentRecoil.back = Math.max(0, this.currentRecoil.back - recoilRecovery * 1.2);
        this.currentRecoil.yaw *= Math.max(0, 1 - delta * 12);

        // Weapon bobbing calculation
        let bobX = 0;
        let bobY = 0;
        if (isMoving && !this.isAiming) {
            const bobSpeed = isSprinting ? 12 : 8;
            const bobAmp = isSprinting ? 0.018 : 0.008;
            bobX = Math.cos(time * bobSpeed) * bobAmp;
            bobY = Math.abs(Math.sin(time * bobSpeed)) * bobAmp * 1.4;
        }

        // Sprint weapon drop
        let sprintRotX = 0;
        let sprintPosY = 0;
        if (isSprinting && !this.isAiming) {
            sprintRotX = -0.35;
            sprintPosY = -0.06;
        }

        // Reload animation dip
        let reloadDip = 0;
        if (this.isReloading) {
            const dur = this.currentReloadDuration || cfg.reloadTime;
            const reloadProgress = (time - (this.reloadEndTime - dur)) / dur;
            reloadDip = Math.sin(reloadProgress * Math.PI) * -0.12;
        }

        // Interpolate position: Hip -> ADS + Recoil + Bobbing
        const basePos = new THREE.Vector3().lerpVectors(cfg.hipPos, cfg.adsPos, this.adsProgress);
        mesh.position.set(
            basePos.x + bobX + this.currentRecoil.yaw * 0.3,
            basePos.y - bobY + sprintPosY + reloadDip - this.currentRecoil.pitch * 0.2,
            basePos.z + this.currentRecoil.back
        );

        // Interpolate rotation
        const baseRotX = THREE.MathUtils.lerp(cfg.hipRot.x, cfg.adsRot.x, this.adsProgress);
        const baseRotY = THREE.MathUtils.lerp(cfg.hipRot.y, cfg.adsRot.y, this.adsProgress);
        mesh.rotation.set(
            baseRotX + sprintRotX + this.currentRecoil.pitch,
            baseRotY + this.currentRecoil.yaw,
            THREE.MathUtils.lerp(cfg.hipRot.z, cfg.adsRot.z, this.adsProgress)
        );

        // Dynamic Camera FOV Zoom during ADS
        const targetFov = THREE.MathUtils.lerp(75, cfg.adsFov, this.adsProgress);
        if (Math.abs(this.camera.fov - targetFov) > 0.05) {
            this.camera.fov = targetFov;
            this.camera.updateProjectionMatrix();
        }
    }

    getCurrentSpread() {
        const cfg = this.getConfig();
        return THREE.MathUtils.lerp(cfg.spreadHip, cfg.spreadAds, this.adsProgress);
    }

    updateAttachmentUI() {
        const btnSupp = document.getElementById('att-btn-supp');
        const btnLaser = document.getElementById('att-btn-laser');
        const btnMag = document.getElementById('att-btn-mag');

        if (btnSupp) btnSupp.classList.toggle('active', this.attachments.suppressor);
        if (btnLaser) btnLaser.classList.toggle('active', this.attachments.laser);
        if (btnMag) btnMag.classList.toggle('active', this.attachments.extendedMag);
    }

    updateHUD() {
        const ammoCurrent = document.getElementById('hud-ammo-current');
        const ammoReserve = document.getElementById('hud-ammo-reserve');
        const weaponName = document.getElementById('hud-weapon-name');
        const reloadIndicator = document.getElementById('hud-reload-indicator');

        if (ammoCurrent) ammoCurrent.textContent = this.ammoInMag[this.activeWeaponId];
        if (ammoReserve) ammoReserve.textContent = this.reserveAmmo[this.activeWeaponId];
        if (weaponName) {
            let name = this.getConfig().name;
            if (this.attachments.suppressor) name += ' (SUPPRESSED)';
            weaponName.textContent = name;
        }

        if (reloadIndicator) {
            if (this.isReloading) {
                reloadIndicator.classList.add('active');
            } else {
                reloadIndicator.classList.remove('active');
            }
        }
    }
}

window.WeaponManager = WeaponManager;
window.WEAPON_CONFIGS = WEAPON_CONFIGS;
