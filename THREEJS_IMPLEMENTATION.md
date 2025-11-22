# Three.js Implementation Guide

## Overview

This virtual tour viewer is built entirely with **Three.js**, providing complete control over the 3D rendering pipeline and eliminating dependency on third-party 360° viewer libraries.

## Architecture

### Core Components

1. **Three.js Scene** - Container for all 3D objects
2. **PerspectiveCamera** - Positioned at center (0, 0, 0.1) looking outward
3. **WebGLRenderer** - Hardware-accelerated rendering
4. **OrbitControls** - Mouse/touch navigation
5. **Cube Mesh** - 360° panorama displayed on inverted cube faces
6. **Hotspot Meshes** - Interactive 3D spheres for navigation

### Why Cube Geometry?

360° equirectangular images are converted to **cube maps** (6 faces):
- **Front (f)** - Forward view
- **Right (r)** - Right side
- **Back (b)** - Behind view
- **Left (l)** - Left side
- **Up (u)** - Sky/ceiling
- **Down (d)** - Ground/floor

**Advantages:**
- ✅ Better performance than sphere geometry
- ✅ Easier texture mapping
- ✅ Standard format for 360° content
- ✅ Supports multi-resolution tiling

## Rendering Pipeline

### 1. Scene Setup

```javascript
// Create scene
this.scene = new THREE.Scene();

// Create camera (inside cube looking out)
this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
this.camera.position.set(0, 0, 0.1);

// Create renderer
this.renderer = new THREE.WebGLRenderer({ antialias: true });
```

### 2. Cube Mesh Creation

```javascript
// Create cube geometry
const geometry = new THREE.BoxGeometry(100, 100, 100);

// Load 6 face textures
const materials = [
    new THREE.MeshBasicMaterial({ map: rightTexture, side: THREE.BackSide }),
    new THREE.MeshBasicMaterial({ map: leftTexture, side: THREE.BackSide }),
    new THREE.MeshBasicMaterial({ map: upTexture, side: THREE.BackSide }),
    new THREE.MeshBasicMaterial({ map: downTexture, side: THREE.BackSide }),
    new THREE.MeshBasicMaterial({ map: frontTexture, side: THREE.BackSide }),
    new THREE.MeshBasicMaterial({ map: backTexture, side: THREE.BackSide })
];

// Create mesh (inverted to see from inside)
const mesh = new THREE.Mesh(geometry, materials);
mesh.scale.set(-1, 1, 1); // Invert X axis
```

**Key Points:**
- `BackSide` renders inside of cube
- Scale `(-1, 1, 1)` inverts geometry for correct viewing
- Camera positioned at center looking outward

### 3. Texture Loading

Multi-resolution tile loading with fallback:

```javascript
async loadCubeFaceTextures(tilesPath) {
    const faces = ['r', 'l', 'u', 'd', 'f', 'b'];
    const levels = [3, 2, 1, 0]; // Try highest quality first
    
    for (const face of faces) {
        for (const level of levels) {
            try {
                const texture = await loadTexture(`${tilesPath}/${level}/${face}/0/0.jpg`);
                // Success! Use this texture
                break;
            } catch (e) {
                // Try next level
            }
        }
    }
}
```

**Resolution Levels:**
- Level 0: 256×256 (preview)
- Level 1: 512×512 (low quality)
- Level 2: 1024×1024 (medium quality)
- Level 3: 2048×2048 (high quality)

### 4. Camera Controls

```javascript
this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
this.controls.enableZoom = true;
this.controls.enablePan = false; // Disable panning
this.controls.rotateSpeed = -0.5; // Invert rotation
this.controls.minDistance = 0.1; // Lock camera at center
this.controls.maxDistance = 0.1;
this.controls.enableDamping = true; // Smooth movement
```

**Why these settings?**
- Camera locked at center (min/max distance = 0.1)
- Rotation inverted for natural feel
- Damping for smooth, inertial movement
- Pan disabled (not needed for 360° viewing)

## Hotspot System

### Hotspot Creation

Hotspots are 3D spheres positioned in the scene:

```javascript
createHotspot(data) {
    // Convert yaw/pitch to 3D position
    const radius = 45; // Inside the cube (cube size = 100)
    const theta = data.yaw;
    const phi = Math.PI / 2 - data.pitch;
    
    const x = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.cos(theta);
    
    // Create sphere geometry
    const geometry = new THREE.SphereGeometry(1.5, 16, 16);
    const material = new THREE.MeshBasicMaterial({
        color: 0x2196F3,
        transparent: true,
        opacity: 0.9
    });
    
    const hotspot = new THREE.Mesh(geometry, material);
    hotspot.position.set(x, y, z);
    hotspot.userData = data; // Store hotspot data
    
    return hotspot;
}
```

### Hotspot Interaction

Using **Raycasting** for click detection:

```javascript
onMouseClick(event) {
    // Convert mouse position to normalized device coordinates
    this.mouse.x = (event.clientX / width) * 2 - 1;
    this.mouse.y = -(event.clientY / height) * 2 + 1;
    
    // Raycast from camera through mouse position
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.hotspots);
    
    if (intersects.length > 0) {
        const hotspot = intersects[0].object;
        this.handleHotspotClick(hotspot.userData);
    }
}
```

### Hotspot Animation

Pulsing effect in render loop:

```javascript
animate() {
    this.hotspots.forEach(hotspot => {
        hotspot.userData.pulsePhase += 0.05;
        const scale = 1 + Math.sin(hotspot.userData.pulsePhase) * 0.2;
        hotspot.scale.set(scale, scale, scale);
    });
}
```

## Coordinate Systems

### Spherical to Cartesian Conversion

**Yaw/Pitch → 3D Position:**

```javascript
// Yaw: horizontal rotation (radians)
// Pitch: vertical rotation (radians)
// Radius: distance from center

const theta = yaw;
const phi = Math.PI / 2 - pitch;

const x = radius * Math.sin(phi) * Math.sin(theta);
const y = radius * Math.cos(phi);
const z = radius * Math.sin(phi) * Math.cos(theta);
```

### Cartesian to Spherical Conversion

**3D Position → Yaw/Pitch:**

```javascript
const yaw = Math.atan2(point.x, point.z);
const pitch = Math.asin(point.y / radius);
```

## Transitions

### Zoom-Fade Transition

```javascript
async switchToSceneWithTransition(targetSceneId, hotspotData) {
    this.isTransitioning = true;
    
    // 1. Zoom into hotspot
    const targetRotation = {
        theta: hotspotData.yaw,
        phi: Math.PI / 2 - hotspotData.pitch
    };
    await this.animateCamera(targetRotation, 500);
    
    // 2. Switch scene
    await this.switchToScene(targetSceneId);
    
    this.isTransitioning = false;
}
```

### Camera Animation

Smooth camera movement using easing:

```javascript
animateCamera(targetRotation, duration) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        const startRotation = getCurrentRotation();
        
        const animate = () => {
            const progress = (Date.now() - startTime) / duration;
            const eased = easeInOutCubic(progress);
            
            // Interpolate rotation
            const theta = lerp(startRotation.theta, targetRotation.theta, eased);
            const phi = lerp(startRotation.phi, targetRotation.phi, eased);
            
            // Update camera position
            updateCameraPosition(theta, phi);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                resolve();
            }
        };
        
        animate();
    });
}
```

## Performance Optimizations

### 1. Texture Optimization

```javascript
texture.minFilter = THREE.LinearFilter; // Faster than mipmap
texture.magFilter = THREE.LinearFilter;
```

### 2. Pixel Ratio Limiting

```javascript
this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
```

Prevents excessive rendering on high-DPI displays.

### 3. Lazy Scene Loading

Scenes only load when needed:

```javascript
if (!sceneInfo.loaded) {
    await this.loadSceneTiles(sceneId);
}
```

### 4. Efficient Render Loop

```javascript
animate() {
    requestAnimationFrame(() => this.animate());
    
    // Only update if needed
    if (this.isAutorotating || this.controls.enabled) {
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}
```

## Setup Mode Integration

### Click-to-Place Hotspots

```javascript
handlePanoClick(event) {
    // Raycast to cube mesh
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.currentCubeMesh);
    
    if (intersects.length > 0) {
        const point = intersects[0].point;
        
        // Convert to yaw/pitch
        const yaw = Math.atan2(point.x, point.z);
        const pitch = Math.asin(point.y / Math.sqrt(
            point.x * point.x + point.y * point.y + point.z * point.z
        ));
        
        // Store for hotspot creation
        this.pendingHotspot = { yaw, pitch };
    }
}
```

## Advantages Over Marzipano

| Feature | Three.js | Marzipano |
|---------|----------|-----------|
| **Control** | Full control over rendering | Limited to library API |
| **Customization** | Unlimited | Constrained by library |
| **VR Support** | Easy to add (WebXR) | Requires workarounds |
| **Effects** | Any Three.js effect | Limited |
| **File Size** | ~600KB | ~200KB |
| **Learning Curve** | Steeper | Easier |
| **Flexibility** | Maximum | Moderate |
| **Community** | Huge (100k+ stars) | Small |

## Future Enhancements

With Three.js, you can easily add:

- **VR Mode** - WebXR support
- **Post-Processing** - Bloom, depth of field, etc.
- **3D Objects** - Add 3D models to scenes
- **Particle Effects** - Snow, rain, etc.
- **Custom Shaders** - Unique visual effects
- **Video Textures** - 360° video support
- **Spatial Audio** - 3D positional audio
- **Physics** - Interactive objects

## Conclusion

The Three.js implementation provides:
- ✅ Complete control over rendering
- ✅ Industry-standard technology
- ✅ Unlimited customization potential
- ✅ Excellent performance
- ✅ Future-proof architecture

Perfect for projects requiring flexibility and advanced features!

