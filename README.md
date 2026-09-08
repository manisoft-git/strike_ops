# STRIKE OPS — 3D Tactical Combat Engine

A high-performance first-person tactical shooter engine built with modern WebGL (Three.js) and Web Audio API, engineered to run directly in mobile and desktop browsers with **zero external dependencies or installations**.

Inspired by *Call of Duty* gunplay mechanics, *Krunker.io* browser agility, and *BattleBit Remastered* indie architecture.

---

## 🎮 How to Play

The local server is running. Open in your phone or PC browser:

- **Local (Same Device / Termux)**: [http://127.0.0.1:8081](http://127.0.0.1:8081)
- **Local Network (LAN / Wi-Fi)**: `http://10.190.156.62:8081`

To restart the server anytime:
```bash
cd projects/strike_ops
python3 server.py
```

---

## 🗺️ 3 Tactical Combat Zones
1. **Killhouse Ground Zero**: Multi-story industrial compound with shipping containers, blast barriers, and sniper catwalk tower.
2. **Desert Outpost // Dust**: Sun-baked desert fortress with stone arches, adobe bunkers, sandbag fortifications, and crates.
3. **Cargo Carrier // Storm**: Rainy storm deck of a container ship with tight CQB container alleys, bridge tower, and wet metallic reflections.

---

## 🕹️ Controls & Tactical Hotkeys

### PC / Desktop
| Action | Key / Control |
| :--- | :--- |
| **Move & Strafe** | `W`, `A`, `S`, `D` |
| **Look / Aim** | `Mouse` (Click screen to lock cursor) |
| **Fire** | `Left Click` (Auto-fire supported) |
| **Aim Down Sights (ADS)** | `Right Click` or `E` |
| **Sprint** | `Left Shift` |
| **Jump / Crouch** | `Space` / `C` |
| **Reload** | `R` |
| **Switch Weapon** | `1`, `2`, `3` or `Scroll Wheel` |
| **Toggle Suppressor** | `T` (or click on HUD) |
| **Toggle Tactical Laser** | `L` (or click on HUD) |
| **Toggle Extended Mag** | `M` (or click on HUD) |

### Mobile / Touchscreen (Android / Tablet)
- **Left Thumb**: Dynamic Virtual Joystick for analog movement and sprint.
- **Right Thumb**: Touch-drag anywhere on the right half of the screen to aim.
- **On-Screen Tactical Buttons**:
  - `FIRE`: Hold to spray automatic fire.
  - `AIM`: Toggle precision Aim-Down-Sights (ADS) zoom.
  - `RELOAD`: 3-stage mechanical reload.
  - `JUMP` / `CROUCH`: Agile tactical maneuvering.
  - `CYCLE`: Cycle primary, secondary, and sniper.
  - `[T] SUPPRESSOR` / `[L] LASER` / `[M] EXT MAG`: On-screen HUD quick-buttons.
  - `FULLSCREEN`: Tap top-right button for immersive edge-to-edge view.

---

## 🔫 Weapon Attachments
- **Tactical Suppressor**: Silences muzzle report into a stealthy *thwip*, eliminates muzzle flash light, and reduces recoil by 22%.
- **Green Tactical Laser Sight**: Projects a visible glowing green laser beam from the barrel for rapid point-shooting.
- **Extended Magazine**: Expands magazine capacity by +50% (45 rounds for M4A1, 18 for Pistol, 8 for Sniper).

---

## 🤖 Hostile Bot AI & Survival Wave Defense
- **Survival Waves**: Hostile bots spawn in escalating waves (Wave 1 = 4 bots, Wave 2 = 6 bots, etc.).
- **Combat AI**: Bots seek cover, track player line of sight, and return fire with red bullet tracers and audio bursts.
- **Damage & Regeneration**: Taking fire flashes the screen red and triggers blood vignettes. Evading fire for 4 seconds triggers automatic health regeneration back to 100 HP.
- **Intermission & Resupply**: Clearing a wave triggers a victory fanfare, score bonus, and automatic ammo resupply before the 5-second countdown to the next wave.

### Mobile / Touchscreen (Android / Tablet)
- **Left Thumb**: Dynamic Virtual Joystick for analog movement and sprint.
- **Right Thumb**: Touch-drag anywhere on the right half of the screen to aim.
- **On-Screen Tactical Buttons**:
  - `FIRE`: Hold to spray automatic fire.
  - `AIM`: Toggle precision Aim-Down-Sights (ADS) zoom.
  - `RELOAD`: 3-stage mechanical reload.
  - `JUMP`: Obstacle vault & jump.
  - `CROUCH`: Low-profile tactical cover.
  - `CYCLE`: Cycle primary, secondary, and sniper.
  - `FULLSCREEN`: Tap top-right button for immersive edge-to-edge view.

---

## 🔫 Weapons Roster

1. **M4A1 Carbine (Slot 1)**
   - *Type*: Fully automatic assault rifle (600 RPM)
   - *Capacity*: 30 / 120
   - *Damage*: 34 body / 75 headshot
   - *Optic*: Holographic Red-Dot Sight with dynamic reticle

2. **Tactical .45 (Slot 2)**
   - *Type*: Semi-automatic heavy pistol
   - *Capacity*: 12 / 48
   - *Damage*: 48 body / 120 headshot
   - *Optic*: Green tritium night iron sights

3. **AWM Recon (Slot 3)**
   - *Type*: Bolt-action high-caliber precision sniper
   - *Capacity*: 5 / 25
   - *Damage*: 110 body / 330 headshot (One-shot kill)
   - *Optic*: High-magnification telescopic long-range scope

---

## 🏗️ Architecture & Features

- **Procedural 3D Weapon Models**: Built dynamically with Three.js primitives—no heavy 3D GLTF/FBX file loading required.
- **Procedural Web Audio Synthesizer (`js/audio.js`)**: Generates real-time gunfire detonations, mechanical reload clicks, footstep thuds, hitmarker chirps, and kill notifications using native browser oscillators and noise filters.
- **Ballistic Hit Registration (`js/targets.js`)**: Raycast hit detection with separate **Head** (critical multiplier) and **Torso** hitboxes, overhead 3D health gauges, and animated flinching.
- **Call of Duty Tactical HUD**:
  - 4-bracket dynamic hitmarkers with red headshot confirmation
  - Floating 3D combat damage text (`+100 HEADSHOT!`)
  - Real-time Killfeed broadcasting kills and weapon used
  - Top bearing compass tape & circular mini-sonar radar
  - Operator health gauge & live ammo magazine readout
- **Killhouse Ground Zero Arena (`js/map.js`)**:
  - Enclosed 70m x 70m compound with full physics bounding-box colliders
  - Stacked multi-color shipping containers for high-ground vantage points
  - Concrete waist-high blast barriers for tactical crouch cover
  - Elevated sniper catwalk platform with access ramp
