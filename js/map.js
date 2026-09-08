/**
 * StrikeOps - Tactical Combat Arena & Multi-Map System
 * Features 3 distinct maps:
 * 1. KILLHOUSE (Urban warehouse compound & catwalk)
 * 2. DESERT OUTPOST (Dusty fortress, stone arches, market lanes)
 * 3. CARGO CARRIER (Wet ship deck, container alleys, storm fog)
 */

class TacticalMap {
    constructor(scene) {
        this.scene = scene;
        this.currentMapId = 'killhouse';
        this.mapGroup = new THREE.Group();
        this.lightingGroup = new THREE.Group();
        this.scene.add(this.mapGroup);
        this.scene.add(this.lightingGroup);

        this.colliders = [];
        this.shootableObjects = [];

        this.initSharedMaterials();
        this.loadMap('killhouse');
    }

    initSharedMaterials() {
        // Shared procedural materials
        this.matWoodCrate = new THREE.MeshStandardMaterial({
            color: 0x7a5b3a,
            roughness: 0.9,
            metalness: 0.05
        });

        this.matBarrel = new THREE.MeshStandardMaterial({
            color: 0xbf3020,
            roughness: 0.5,
            metalness: 0.5
        });

        this.matSteel = new THREE.MeshStandardMaterial({
            color: 0x25282d,
            roughness: 0.4,
            metalness: 0.85
        });
    }

    createCanvasTexture(width, height, drawFn) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        drawFn(ctx, width, height);
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        return tex;
    }

    clearCurrentMap() {
        // Remove old map meshes
        while (this.mapGroup.children.length > 0) {
            const obj = this.mapGroup.children[0];
            this.mapGroup.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
        }

        // Remove old lights
        while (this.lightingGroup.children.length > 0) {
            const light = this.lightingGroup.children[0];
            this.lightingGroup.remove(light);
            if (light.dispose) light.dispose();
        }

        this.colliders = [];
        this.shootableObjects = [];
    }

    loadMap(mapId) {
        this.clearCurrentMap();
        this.currentMapId = mapId;

        let spawnPos = new THREE.Vector3(0, 1.7, 15);

        if (mapId === 'desert') {
            spawnPos = this.buildDesertOutpost();
        } else if (mapId === 'cargoship') {
            spawnPos = this.buildCargoCarrier();
        } else {
            spawnPos = this.buildKillhouse();
        }

        // Update Map Selector UI
        const mapNameEl = document.getElementById('hud-map-name');
        if (mapNameEl) {
            const names = {
                killhouse: 'KILLHOUSE GROUND ZERO',
                desert: 'DESERT OUTPOST // DUST',
                cargoship: 'CARGO CARRIER // STORM'
            };
            mapNameEl.textContent = names[mapId] || mapId.toUpperCase();
        }

        const mapBtns = document.querySelectorAll('.map-select-btn');
        mapBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.map === mapId);
        });

        return spawnPos;
    }

    /* =========================================================================
       MAP 1: KILLHOUSE GROUND ZERO
       ========================================================================= */
    buildKillhouse() {
        // Lighting & Sky
        this.scene.background = new THREE.Color(0x0c1117);
        this.scene.fog = new THREE.FogExp2(0x0c1117, 0.015);

        const ambient = new THREE.AmbientLight(0xdde5f0, 0.55);
        this.lightingGroup.add(ambient);

        const sun = new THREE.DirectionalLight(0xfff5e6, 0.9);
        sun.position.set(25, 40, 20);
        sun.castShadow = true;
        sun.shadow.mapSize.set(1024, 1024);
        const d = 35;
        sun.shadow.camera.left = -d;
        sun.shadow.camera.right = d;
        sun.shadow.camera.top = d;
        sun.shadow.camera.bottom = -d;
        this.lightingGroup.add(sun);

        const flood1 = new THREE.PointLight(0x4488ff, 0.8, 25);
        flood1.position.set(-25, 6, -25);
        this.lightingGroup.add(flood1);

        const flood2 = new THREE.PointLight(0xff9933, 0.8, 25);
        flood2.position.set(25, 6, 25);
        this.lightingGroup.add(flood2);

        // Floor
        const floorTex = this.createCanvasTexture(256, 256, (ctx, w, h) => {
            ctx.fillStyle = '#1c2024';
            ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = '#2a3138';
            ctx.lineWidth = 2;
            ctx.strokeRect(0, 0, w, h);
            ctx.fillStyle = '#e5a823';
            ctx.beginPath();
            ctx.moveTo(230, 0); ctx.lineTo(256, 0); ctx.lineTo(256, 26);
            ctx.closePath(); ctx.fill();
        });
        floorTex.repeat.set(30, 30);

        const matFloor = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.85, metalness: 0.15 });
        const floorGeo = new THREE.PlaneGeometry(70, 70);
        floorGeo.rotateX(-Math.PI / 2);
        const floor = new THREE.Mesh(floorGeo, matFloor);
        floor.receiveShadow = true;
        this.mapGroup.add(floor);
        this.shootableObjects.push(floor);

        // Perimeter Walls
        const matWall = new THREE.MeshStandardMaterial({ color: 0x3d434a, roughness: 0.9 });
        this.buildPerimeterWalls(70, 8, 2, matWall);

        // Shipping Containers
        const matRed = new THREE.MeshStandardMaterial({ color: 0x8b251e, roughness: 0.6, metalness: 0.3 });
        const matBlue = new THREE.MeshStandardMaterial({ color: 0x1d4d73, roughness: 0.6, metalness: 0.3 });
        const matGreen = new THREE.MeshStandardMaterial({ color: 0x2e5033, roughness: 0.6, metalness: 0.3 });

        const containers = [
            { pos: [-12, 1.4, -10], rotY: 0, mat: matRed },
            { pos: [-12, 4.2, -10], rotY: 0, mat: matRed }, // Stacked
            { pos: [14, 1.4, -8], rotY: Math.PI / 2, mat: matBlue },
            { pos: [-10, 1.4, 12], rotY: 0.4, mat: matGreen },
            { pos: [12, 1.4, 14], rotY: -0.2, mat: matRed },
            { pos: [0, 1.4, -20], rotY: Math.PI / 2, mat: matBlue },
            { pos: [20, 1.4, 0], rotY: 0, mat: matGreen }
        ];

        containers.forEach(c => {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.8, 8.0), c.mat);
            mesh.position.set(...c.pos);
            mesh.rotation.y = c.rotY;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.mapGroup.add(mesh);
            this.shootableObjects.push(mesh);
            this.addColliderFromMesh(mesh);
        });

        // Concrete Barriers
        const matBarrier = new THREE.MeshStandardMaterial({ color: 0x5a636e, roughness: 0.8 });
        const barriers = [
            { pos: [-4, 0.58, 2], rotY: 0 },
            { pos: [4, 0.58, 2], rotY: 0 },
            { pos: [-4, 0.58, -6], rotY: 0.2 },
            { pos: [6, 0.58, -14], rotY: -0.5 },
            { pos: [-18, 0.58, 0], rotY: Math.PI / 2 },
            { pos: [0, 0.58, 18], rotY: 0 }
        ];
        barriers.forEach(b => {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.15, 0.4), matBarrier);
            mesh.position.set(...b.pos);
            mesh.rotation.y = b.rotY;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.mapGroup.add(mesh);
            this.shootableObjects.push(mesh);
            this.addColliderFromMesh(mesh);
        });

        // Catwalk Sniper Tower
        const platform = new THREE.Mesh(new THREE.BoxGeometry(10, 0.4, 4), this.matSteel);
        platform.position.set(0, 3.8, -12);
        platform.castShadow = true;
        this.mapGroup.add(platform);
        this.shootableObjects.push(platform);
        this.addColliderFromMesh(platform);

        // Ramp
        const ramp = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.3, 8.5), this.matSteel);
        ramp.rotateX(0.46);
        ramp.position.set(-6, 1.9, -8.5);
        this.mapGroup.add(ramp);
        this.shootableObjects.push(ramp);
        this.addColliderFromMesh(ramp);

        return new THREE.Vector3(0, 1.7, 15);
    }

    /* =========================================================================
       MAP 2: DESERT OUTPOST // DUST
       ========================================================================= */
    buildDesertOutpost() {
        // Bright desert sun & golden haze
        this.scene.background = new THREE.Color(0xd9c298);
        this.scene.fog = new THREE.FogExp2(0xd9c298, 0.012);

        const ambient = new THREE.AmbientLight(0xfff0d0, 0.75);
        this.lightingGroup.add(ambient);

        const sun = new THREE.DirectionalLight(0xfffae6, 1.15);
        sun.position.set(30, 50, 15);
        sun.castShadow = true;
        sun.shadow.mapSize.set(1024, 1024);
        const d = 35;
        sun.shadow.camera.left = -d;
        sun.shadow.camera.right = d;
        sun.shadow.camera.top = d;
        sun.shadow.camera.bottom = -d;
        this.lightingGroup.add(sun);

        // Desert Sandy Floor
        const sandTex = this.createCanvasTexture(256, 256, (ctx, w, h) => {
            ctx.fillStyle = '#c7a76c';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#b8985c';
            for (let i = 0; i < 400; i++) {
                ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
            }
        });
        sandTex.repeat.set(25, 25);

        const matSand = new THREE.MeshStandardMaterial({ map: sandTex, roughness: 0.95 });
        const floorGeo = new THREE.PlaneGeometry(70, 70);
        floorGeo.rotateX(-Math.PI / 2);
        const floor = new THREE.Mesh(floorGeo, matSand);
        floor.receiveShadow = true;
        this.mapGroup.add(floor);
        this.shootableObjects.push(floor);

        // Adobe Sandstone Fortress Walls
        const matSandstone = new THREE.MeshStandardMaterial({ color: 0xba9d74, roughness: 0.9 });
        this.buildPerimeterWalls(70, 8, 2.5, matSandstone);

        // Desert Archway in center
        const archL = new THREE.Mesh(new THREE.BoxGeometry(2, 6, 2), matSandstone);
        archL.position.set(-4, 3, 0);
        this.mapGroup.add(archL);
        this.addColliderFromMesh(archL);

        const archR = new THREE.Mesh(new THREE.BoxGeometry(2, 6, 2), matSandstone);
        archR.position.set(4, 3, 0);
        this.mapGroup.add(archR);
        this.addColliderFromMesh(archR);

        const archTop = new THREE.Mesh(new THREE.BoxGeometry(10, 1.8, 2), matSandstone);
        archTop.position.set(0, 6.9, 0);
        this.mapGroup.add(archTop);
        this.addColliderFromMesh(archTop);

        // Adobe Bunkers / Houses
        const bunker1 = new THREE.Mesh(new THREE.BoxGeometry(8, 4, 10), matSandstone);
        bunker1.position.set(-18, 2, -14);
        this.mapGroup.add(bunker1);
        this.shootableObjects.push(bunker1);
        this.addColliderFromMesh(bunker1);

        const bunker2 = new THREE.Mesh(new THREE.BoxGeometry(10, 4, 8), matSandstone);
        bunker2.position.set(16, 2, 12);
        this.mapGroup.add(bunker2);
        this.shootableObjects.push(bunker2);
        this.addColliderFromMesh(bunker2);

        // Sandbags & Low Stone Walls
        const matSandbag = new THREE.MeshStandardMaterial({ color: 0x967c52, roughness: 0.9 });
        const sandbags = [
            { pos: [-4, 0.5, 6], size: [4, 1.0, 0.8] },
            { pos: [4, 0.5, 6], size: [4, 1.0, 0.8] },
            { pos: [0, 0.5, -10], size: [6, 1.0, 0.8] },
            { pos: [-10, 0.5, -4], size: [5, 1.0, 0.8] },
            { pos: [10, 0.5, -4], size: [5, 1.0, 0.8] }
        ];

        sandbags.forEach(s => {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(...s.size), matSandbag);
            mesh.position.set(...s.pos);
            mesh.castShadow = true;
            this.mapGroup.add(mesh);
            this.shootableObjects.push(mesh);
            this.addColliderFromMesh(mesh);
        });

        // Crates & Oil Barrels scattered
        const crates = [
            [-8, 0.75, 4], [8, 0.75, 4], [-12, 0.75, 14], [12, 0.75, -14]
        ];
        crates.forEach(c => {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), this.matWoodCrate);
            mesh.position.set(...c);
            this.mapGroup.add(mesh);
            this.shootableObjects.push(mesh);
            this.addColliderFromMesh(mesh);
        });

        return new THREE.Vector3(0, 1.7, 18);
    }

    /* =========================================================================
       MAP 3: CARGO CARRIER // STORM WET WORK
       ========================================================================= */
    buildCargoCarrier() {
        // Rainy storm night atmosphere
        this.scene.background = new THREE.Color(0x060c14);
        this.scene.fog = new THREE.FogExp2(0x060c14, 0.022);

        const ambient = new THREE.AmbientLight(0x1a2b3c, 0.45);
        this.lightingGroup.add(ambient);

        const moon = new THREE.DirectionalLight(0x7aa5d2, 0.6);
        moon.position.set(-20, 35, -20);
        this.lightingGroup.add(moon);

        // Industrial sodium ship floodlights
        const lamp1 = new THREE.PointLight(0xffa726, 1.2, 30);
        lamp1.position.set(0, 8, 0);
        this.lightingGroup.add(lamp1);

        const lamp2 = new THREE.PointLight(0x00e5ff, 0.8, 25);
        lamp2.position.set(0, 8, -20);
        this.lightingGroup.add(lamp2);

        // Wet Steel Deck Floor
        const deckTex = this.createCanvasTexture(256, 256, (ctx, w, h) => {
            ctx.fillStyle = '#0f141a';
            ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = '#222d38';
            ctx.lineWidth = 3;
            for (let y = 0; y < h; y += 32) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
            }
        });
        deckTex.repeat.set(20, 20);

        const matDeck = new THREE.MeshStandardMaterial({
            map: deckTex,
            roughness: 0.25, // Wet slick reflections!
            metalness: 0.85
        });

        const floorGeo = new THREE.PlaneGeometry(70, 70);
        floorGeo.rotateX(-Math.PI / 2);
        const floor = new THREE.Mesh(floorGeo, matDeck);
        floor.receiveShadow = true;
        this.mapGroup.add(floor);
        this.shootableObjects.push(floor);

        // Ship Hull Bullwarks / Railings
        const matHull = new THREE.MeshStandardMaterial({ color: 0x161d26, roughness: 0.5, metalness: 0.8 });
        this.buildPerimeterWalls(70, 6, 2.0, matHull);

        // Massive Cargo Container Maze (Tight CQB corridors)
        const matRed = new THREE.MeshStandardMaterial({ color: 0x781a14, roughness: 0.4, metalness: 0.5 });
        const matBlue = new THREE.MeshStandardMaterial({ color: 0x143b59, roughness: 0.4, metalness: 0.5 });
        const matOrange = new THREE.MeshStandardMaterial({ color: 0xb55a16, roughness: 0.4, metalness: 0.5 });

        const shipContainers = [
            // Center corridor
            { pos: [-5, 1.4, 0], rotY: 0, mat: matRed },
            { pos: [5, 1.4, 0], rotY: 0, mat: matBlue },
            { pos: [-5, 4.2, 0], rotY: 0, mat: matOrange }, // Stacked
            { pos: [5, 4.2, 0], rotY: 0, mat: matRed },
            // North stacks
            { pos: [-16, 1.4, -14], rotY: Math.PI / 2, mat: matOrange },
            { pos: [-16, 4.2, -14], rotY: Math.PI / 2, mat: matBlue },
            { pos: [16, 1.4, -14], rotY: Math.PI / 2, mat: matRed },
            // South stacks
            { pos: [-14, 1.4, 14], rotY: 0, mat: matBlue },
            { pos: [14, 1.4, 14], rotY: 0, mat: matOrange },
            // Far End
            { pos: [0, 1.4, -24], rotY: Math.PI / 2, mat: matBlue }
        ];

        shipContainers.forEach(c => {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.8, 8.0), c.mat);
            mesh.position.set(...c.pos);
            mesh.rotation.y = c.rotY;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.mapGroup.add(mesh);
            this.shootableObjects.push(mesh);
            this.addColliderFromMesh(mesh);
        });

        // Ship Bridge Superstructure (at South end)
        const bridge = new THREE.Mesh(new THREE.BoxGeometry(20, 8, 6), matHull);
        bridge.position.set(0, 4, 30);
        this.mapGroup.add(bridge);
        this.shootableObjects.push(bridge);
        this.addColliderFromMesh(bridge);

        return new THREE.Vector3(0, 1.7, 14);
    }

    buildPerimeterWalls(size, height, thickness, material) {
        const walls = [
            { size: [size, height, thickness], pos: [0, height / 2, -size / 2] },
            { size: [size, height, thickness], pos: [0, height / 2, size / 2] },
            { size: [thickness, height, size], pos: [size / 2, height / 2, 0] },
            { size: [thickness, height, size], pos: [-size / 2, height / 2, 0] }
        ];

        walls.forEach(w => {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(...w.size), material);
            mesh.position.set(...w.pos);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.mapGroup.add(mesh);
            this.shootableObjects.push(mesh);
            this.addColliderFromMesh(mesh);
        });
    }

    addColliderFromMesh(mesh) {
        mesh.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(mesh);
        this.colliders.push(box);
    }
}

window.TacticalMap = TacticalMap;
