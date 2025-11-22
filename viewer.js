// Fisheye 360° Virtual Tour Viewer
// Built with Three.js for maximum performance and flexibility

class VirtualTourViewer {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.scenes = {};
        this.currentSceneId = null;
        this.config = null;
        this.isAutorotating = false;
        this.autorotateSpeed = 0.1;
        this.tileCache = new Map();
        this.currentCubeMesh = null;
        this.hotspots = [];
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.isTransitioning = false;
        
        // Debug helpers
        this.gridHelper = null;
        this.horizonLine = null;
        this.axesHelper = null;
        this.showCameraInfo = true;
        this.cameraInfoElement = null;

        this.init();
    }

    async init() {
        try {
            // Load configuration
            await this.loadConfig();

            // Initialize Three.js
            this.initThreeJS();

            // Setup event listeners
            this.setupEventListeners();

            // Create all scenes
            await this.createScenes();

            // Load first scene
            if (this.config.scenes.length > 0) {
                await this.switchToScene(this.config.scenes[0].id);
            }

            // Setup UI
            this.setupUI();

            // Start render loop
            this.animate();

            // Hide loading
            this.hideLoading();
        } catch (error) {
            console.error('Failed to initialize viewer:', error);
            alert('Failed to load virtual tour. Please check console for details.');
        }
    }

    async loadConfig() {
        try {
            const response = await fetch('config.json');
            if (!response.ok) {
                throw new Error('Configuration file not found');
            }
            this.config = await response.json();
        } catch (error) {
            console.error('Error loading config:', error);
            this.config = {
                scenes: [],
                settings: {
                    autorotateSpeed: 0.1,
                    transitionDuration: 1000,
                    mouseViewMode: 'drag',
                    dragSensitivity: 0.5,
                    zoomSensitivity: 3
                }
            };
        }
    }

    initThreeJS() {
        const container = document.getElementById('pano');

        // Create scene
        this.scene = new THREE.Scene();

        // Create camera (inside a sphere looking outward)
        this.camera = new THREE.PerspectiveCamera(
            75, // FOV
            container.clientWidth / container.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 0, 0.1);

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false
        });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(this.renderer.domElement);

        // Lock the up vector to prevent roll (rotation around Z-axis)
        // This is critical for keeping the horizon horizontal - MUST be set BEFORE controls
        this.camera.up.set(0, 1, 0);
        this.camera.up.normalize();

        // Create controls (OrbitControls will be loaded from CDN)
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableZoom = false; // Disable default zoom, we'll use FOV
        this.controls.enablePan = false;
        this.controls.rotateSpeed = -(this.config.settings.dragSensitivity || 0.5);
        this.controls.minDistance = 0.1;
        this.controls.maxDistance = 0.1;
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        // Clamp pitch to prevent gimbal lock (avoid looking straight up/down)
        // This prevents the camera from flipping when looking directly up or down
        this.controls.minPolarAngle = 0.1; // ~6 degrees from top
        this.controls.maxPolarAngle = Math.PI - 0.1; // ~6 degrees from bottom

        // CRITICAL: Prevent roll by continuously enforcing up vector
        // This ensures horizon stays horizontal like in FPS games
        this.controls.addEventListener('change', () => {
            // Enforce fixed up vector after every control update
            this.camera.up.set(0, 1, 0);
            this.camera.up.normalize();
        });

        // Zoom settings (using FOV)
        this.minFov = 30;  // Max zoom in
        this.maxFov = 100; // Max zoom out
        this.camera.fov = 75; // Default FOV
    }

    setupEventListeners() {
        // Window resize
        window.addEventListener('resize', () => this.onWindowResize());

        // Mouse click for hotspots
        this.renderer.domElement.addEventListener('click', (e) => this.onMouseClick(e));

        // Mouse move for hotspot hover
        this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));

        // Zoom controls
        this.setupZoomControls();
    }

    setupZoomControls() {
        const container = document.getElementById('pano');

        // Mouse wheel zoom
        container.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.handleZoom(e.deltaY > 0 ? 1 : -1);
        }, { passive: false });

        // Keyboard zoom (Numpad + and -)
        window.addEventListener('keydown', (e) => {
            if (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd') {
                e.preventDefault();
                this.handleZoom(-1); // Zoom in
            } else if (e.key === '-' || e.key === '_' || e.code === 'NumpadSubtract') {
                e.preventDefault();
                this.handleZoom(1); // Zoom out
            }
        });
    }

    handleZoom(direction) {
        // Adjust FOV for zoom effect using sensitivity setting
        const zoomSpeed = this.config.settings.zoomSensitivity || 3;
        this.camera.fov += direction * zoomSpeed;

        // Clamp FOV to min/max
        this.camera.fov = Math.max(this.minFov, Math.min(this.maxFov, this.camera.fov));

        // Update camera projection
        this.camera.updateProjectionMatrix();
    }

    onWindowResize() {
        const container = document.getElementById('pano');
        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
    }

    onMouseClick(event) {
        if (this.isTransitioning) return;

        // Calculate mouse position in normalized device coordinates
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        // Raycast to check hotspot clicks
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.hotspots);

        if (intersects.length > 0) {
            const hotspot = intersects[0].object;
            this.handleHotspotClick(hotspot.userData);
        }
    }

    onMouseMove(event) {
        // Calculate mouse position
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        // Raycast for hover effects
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.hotspots);

        // Update cursor
        if (intersects.length > 0) {
            this.renderer.domElement.style.cursor = 'pointer';
        } else {
            this.renderer.domElement.style.cursor = 'grab';
        }
    }

    async createScenes() {
        for (const sceneData of this.config.scenes) {
            this.scenes[sceneData.id] = {
                id: sceneData.id,
                name: sceneData.name,
                data: sceneData,
                loaded: false,
                cubeMesh: null
            };
        }
    }

    async loadSceneTiles(sceneId) {
        const sceneInfo = this.scenes[sceneId];
        if (!sceneInfo) return null;

        const sceneData = sceneInfo.data;
        const tilesPath = sceneData.tilesPath;

        // Create cube geometry
        const geometry = new THREE.BoxGeometry(100, 100, 100);

        // Load textures for each face
        const materials = await this.loadCubeFaceTextures(tilesPath);

        // Create mesh with inverted normals (we're inside the cube)
        const mesh = new THREE.Mesh(geometry, materials);
        mesh.scale.set(-1, 1, 1); // Invert to see from inside

        sceneInfo.cubeMesh = mesh;
        sceneInfo.loaded = true;

        return mesh;
    }

    async loadCubeFaceTextures(tilesPath) {
        // Three.js BoxGeometry face order: right, left, top, bottom, front, back
        // Mapping to our cube face names: r(+X), l(-X), u(+Y), d(-Y), f(+Z), b(-Z)
        const faces = ['r', 'l', 'u', 'd', 'f', 'b'];

        // Tile configuration for level 3 (highest resolution)
        // Level 3 = 2048x2048 per face, split into 4x4 tiles of 512x512 each
        const level = 3;
        const tilesPerSide = 4; // 4x4 grid of tiles
        const tileSize = 512;
        const faceSize = tilesPerSide * tileSize; // 2048x2048

        const materials = [];

        for (let i = 0; i < 6; i++) {
            const face = faces[i];
            console.log(`Loading tiles for face: ${face}`);

            // Create a canvas to composite all tiles for this face
            const canvas = document.createElement('canvas');
            canvas.width = faceSize;
            canvas.height = faceSize;
            const ctx = canvas.getContext('2d');

            // Load all tiles for this face
            let tilesLoaded = 0;
            for (let y = 0; y < tilesPerSide; y++) {
                for (let x = 0; x < tilesPerSide; x++) {
                    const tilePath = `${tilesPath}/${level}/${face}/${y}/${x}.jpg`;

                    try {
                        const img = await this.loadImage(tilePath);
                        // Draw tile at correct position
                        ctx.drawImage(img, x * tileSize, y * tileSize, tileSize, tileSize);
                        tilesLoaded++;
                    } catch (e) {
                        console.warn(`Failed to load tile ${tilePath}`);
                        // Fill with gray color for missing tiles
                        ctx.fillStyle = '#808080';
                        ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
                    }
                }
            }

            console.log(`Loaded ${tilesLoaded}/${tilesPerSide * tilesPerSide} tiles for face ${face}`);

            // Create texture from canvas
            const texture = new THREE.CanvasTexture(canvas);
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.needsUpdate = true;

            materials.push(new THREE.MeshBasicMaterial({
                map: texture,
                side: THREE.BackSide // Render inside of cube
            }));
        }

        return materials;
    }

    loadImage(path) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load ${path}`));
            img.src = path;
        });
    }

    loadTexture(loader, path) {
        return new Promise((resolve, reject) => {
            loader.load(
                path,
                (texture) => {
                    texture.minFilter = THREE.LinearFilter;
                    texture.magFilter = THREE.LinearFilter;
                    resolve(texture);
                },
                undefined,
                (error) => reject(error)
            );
        });
    }

    async switchToScene(sceneId, options = {}) {
        if (this.isTransitioning) return;
        if (this.currentSceneId === sceneId) return;

        const sceneInfo = this.scenes[sceneId];
        if (!sceneInfo) {
            console.error(`Scene ${sceneId} not found`);
            return;
        }

        this.showLoading();

        // Load scene if not already loaded
        if (!sceneInfo.loaded) {
            await this.loadSceneTiles(sceneId);
        }

        // Remove current scene
        if (this.currentCubeMesh) {
            this.scene.remove(this.currentCubeMesh);
        }

        // Remove current hotspots
        this.clearHotspots();

        // Add new scene
        this.currentCubeMesh = sceneInfo.cubeMesh;
        this.scene.add(this.currentCubeMesh);

        // Set initial view
        if (sceneInfo.data.initialView) {
            this.setView(sceneInfo.data.initialView);
        }

        // Add hotspots
        this.addHotspots(sceneInfo.data.hotspots || []);

        this.currentSceneId = sceneId;

        // Update UI
        this.updateSceneList();

        this.hideLoading();
    }


    async switchToSceneWithTransition(targetSceneId, hotspotData) {
        if (this.isTransitioning) return;

        this.isTransitioning = true;

        // Zoom into hotspot
        const targetRotation = {
            theta: hotspotData.yaw,
            phi: Math.PI / 2 - hotspotData.pitch
        };

        await this.animateCamera(targetRotation, 500);

        // Switch scene with fade
        await this.switchToScene(targetSceneId);

        this.isTransitioning = false;
    }

    animateCamera(targetRotation, duration) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            const startRotation = {
                theta: Math.atan2(this.camera.position.x, this.camera.position.z),
                phi: Math.acos(this.camera.position.y / 0.1)
            };

            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = this.easeInOutCubic(progress);

                const theta = startRotation.theta + (targetRotation.theta - startRotation.theta) * eased;
                const phi = startRotation.phi + (targetRotation.phi - startRotation.phi) * eased;

                // Update camera position
                this.camera.position.x = 0.1 * Math.sin(phi) * Math.sin(theta);
                this.camera.position.y = 0.1 * Math.cos(phi);
                this.camera.position.z = 0.1 * Math.sin(phi) * Math.cos(theta);
                
                // Lock up vector before lookAt to prevent roll
                this.camera.up.set(0, 1, 0);
                this.camera.up.normalize();
                this.camera.lookAt(0, 0, 0);
                
                // Re-enforce up vector after lookAt
                this.camera.up.set(0, 1, 0);
                this.camera.up.normalize();

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };

            animate();
        });
    }

    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    setView(view) {
        // Convert yaw/pitch to spherical coordinates
        const theta = view.yaw || 0;
        const phi = Math.PI / 2 - (view.pitch || 0);

        // Update camera position
        this.camera.position.x = 0.1 * Math.sin(phi) * Math.sin(theta);
        this.camera.position.y = 0.1 * Math.cos(phi);
        this.camera.position.z = 0.1 * Math.sin(phi) * Math.cos(theta);
        
        // Lock up vector before lookAt to prevent roll
        this.camera.up.set(0, 1, 0);
        this.camera.up.normalize();
        this.camera.lookAt(0, 0, 0);
        
        // Re-enforce up vector after lookAt
        this.camera.up.set(0, 1, 0);
        this.camera.up.normalize();

        // Update FOV if specified
        if (view.fov) {
            this.camera.fov = view.fov * 180 / Math.PI;
            this.camera.updateProjectionMatrix();
        }
    }

    addHotspots(hotspotsData) {
        hotspotsData.forEach(hotspotData => {
            const hotspot = this.createHotspot(hotspotData);
            if (hotspot) {
                this.hotspots.push(hotspot);
                this.scene.add(hotspot);
            }
        });
    }

    createHotspot(data) {
        // Convert yaw/pitch to 3D position
        const radius = 45; // Slightly inside the cube
        const theta = data.yaw;
        const phi = Math.PI / 2 - data.pitch;

        const x = radius * Math.sin(phi) * Math.sin(theta);
        const y = radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.cos(theta);

        // Create hotspot geometry
        const geometry = new THREE.SphereGeometry(1.5, 16, 16);
        const material = new THREE.MeshBasicMaterial({
            color: data.type === 'info' ? 0x4CAF50 : 0x2196F3,
            transparent: true,
            opacity: 0.9
        });

        const hotspot = new THREE.Mesh(geometry, material);
        hotspot.position.set(x, y, z);
        hotspot.userData = data;

        // Add pulsing animation
        hotspot.userData.pulsePhase = Math.random() * Math.PI * 2;

        return hotspot;
    }

    clearHotspots() {
        this.hotspots.forEach(hotspot => {
            this.scene.remove(hotspot);
        });
        this.hotspots = [];
    }

    handleHotspotClick(hotspotData) {
        if (hotspotData.type === 'link' && hotspotData.target) {
            this.switchToSceneWithTransition(hotspotData.target, hotspotData);
        } else if (hotspotData.type === 'info' && hotspotData.text) {
            alert(hotspotData.text); // Simple info display
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // CRITICAL: Continuously enforce up vector to prevent horizon tilt
        // This must be done every frame to keep horizon horizontal
        this.camera.up.set(0, 1, 0);
        this.camera.up.normalize();

        // Auto-rotate
        if (this.isAutorotating && !this.isTransitioning) {
            const rotationSpeed = this.autorotateSpeed * 0.001;
            this.camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationSpeed);
            this.camera.lookAt(0, 0, 0);
            // Re-enforce up vector after lookAt
            this.camera.up.set(0, 1, 0);
            this.camera.up.normalize();
        }

        // Animate hotspots (pulse effect)
        this.hotspots.forEach(hotspot => {
            hotspot.userData.pulsePhase += 0.05;
            const scale = 1 + Math.sin(hotspot.userData.pulsePhase) * 0.2;
            hotspot.scale.set(scale, scale, scale);
        });

        this.controls.update();
        
        // Re-enforce up vector after controls update (final safety check)
        this.camera.up.set(0, 1, 0);
        this.camera.up.normalize();
        
        // Update camera info display
        this.updateCameraInfo();
        
        this.renderer.render(this.scene, this.camera);
    }

    setupUI() {
        // Setup mode button
        const setupBtn = document.getElementById('setupBtn');
        if (setupBtn) {
            setupBtn.addEventListener('click', () => {
                window.location.href = 'setup.html';
            });
        }

        // Auto-rotate button
        const autorotateBtn = document.getElementById('autorotateBtn');
        if (autorotateBtn) {
            autorotateBtn.addEventListener('click', () => {
                this.toggleAutorotate();
            });
        }

        // Reset view button
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetView();
            });
        }

        // Settings panel
        this.setupSettingsPanel();

        // Create scene list
        this.updateSceneList();
    }
    
    setupSettingsPanel() {
        const settingsBtn = document.getElementById('settingsBtn');
        const closeSettingsBtn = document.getElementById('closeSettingsBtn');
        const settingsPanel = document.getElementById('settingsPanel');
        this.cameraInfoElement = document.getElementById('cameraInfo');

        console.log('Setting up settings panel:', { settingsBtn, settingsPanel, closeSettingsBtn });

        // Toggle settings panel
        if (settingsBtn && settingsPanel) {
            settingsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Settings button clicked, toggling panel');
                const isHidden = settingsPanel.classList.contains('hidden');
                if (isHidden) {
                    settingsPanel.classList.remove('hidden');
                    console.log('Panel shown');
                } else {
                    settingsPanel.classList.add('hidden');
                    console.log('Panel hidden');
                }
            });
        } else {
            console.error('Settings button or panel not found!', { 
                settingsBtn: !!settingsBtn, 
                settingsPanel: !!settingsPanel 
            });
        }

        if (closeSettingsBtn && settingsPanel) {
            closeSettingsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                settingsPanel.classList.add('hidden');
            });
        }

        // Grid toggle
        const showGridCheck = document.getElementById('showGrid');
        if (showGridCheck) {
            showGridCheck.addEventListener('change', (e) => {
                this.toggleGrid(e.target.checked);
            });
        }

        // Horizon line toggle
        const showHorizonCheck = document.getElementById('showHorizon');
        if (showHorizonCheck) {
            showHorizonCheck.addEventListener('change', (e) => {
                this.toggleHorizon(e.target.checked);
            });
        }

        // Wireframe toggle
        const showWireframeCheck = document.getElementById('showWireframe');
        if (showWireframeCheck) {
            showWireframeCheck.addEventListener('change', (e) => {
                this.toggleWireframe(e.target.checked);
            });
        }

        // Axes helper toggle
        const showAxesCheck = document.getElementById('showAxes');
        if (showAxesCheck) {
            showAxesCheck.addEventListener('change', (e) => {
                this.toggleAxes(e.target.checked);
            });
        }

        // Camera info toggle
        const showCameraInfoCheck = document.getElementById('showCameraInfo');
        if (showCameraInfoCheck) {
            showCameraInfoCheck.addEventListener('change', (e) => {
                this.showCameraInfo = e.target.checked;
                if (this.cameraInfoElement) {
                    this.cameraInfoElement.style.display = this.showCameraInfo ? 'block' : 'none';
                }
            });
        }

        // Reset roll button
        const resetRollBtn = document.getElementById('resetRollBtn');
        if (resetRollBtn) {
            resetRollBtn.addEventListener('click', () => {
                this.resetCameraRoll();
            });
        }

        // Reset camera position button
        const resetCameraBtn = document.getElementById('resetCameraBtn');
        if (resetCameraBtn) {
            resetCameraBtn.addEventListener('click', () => {
                this.resetCameraPosition();
            });
        }
    }
    
    toggleGrid(show) {
        if (show) {
            if (!this.gridHelper) {
                this.gridHelper = new THREE.GridHelper(200, 20, 0x888888, 0x444444);
                this.scene.add(this.gridHelper);
            }
        } else {
            if (this.gridHelper) {
                this.scene.remove(this.gridHelper);
                this.gridHelper = null;
            }
        }
    }
    
    toggleHorizon(show) {
        if (show) {
            if (!this.horizonLine) {
                // Create a circle at y=0 to represent the horizon
                const radius = 50;
                const segments = 64;
                const geometry = new THREE.BufferGeometry();
                const vertices = [];
                
                for (let i = 0; i <= segments; i++) {
                    const angle = (i / segments) * Math.PI * 2;
                    vertices.push(
                        Math.cos(angle) * radius,
                        0,
                        Math.sin(angle) * radius
                    );
                }
                
                geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
                const material = new THREE.LineBasicMaterial({ 
                    color: 0x00ff00, 
                    linewidth: 3,
                    transparent: true,
                    opacity: 0.8
                });
                this.horizonLine = new THREE.Line(geometry, material);
                this.scene.add(this.horizonLine);
            }
        } else {
            if (this.horizonLine) {
                this.scene.remove(this.horizonLine);
                this.horizonLine = null;
            }
        }
    }
    
    toggleWireframe(show) {
        if (this.currentCubeMesh) {
            this.currentCubeMesh.traverse((child) => {
                if (child.isMesh) {
                    child.material.wireframe = show;
                }
            });
        }
        
        // Also update all loaded scenes
        Object.values(this.scenes).forEach(sceneInfo => {
            if (sceneInfo.cubeMesh) {
                sceneInfo.cubeMesh.traverse((child) => {
                    if (child.isMesh) {
                        child.material.wireframe = show;
                    }
                });
            }
        });
    }
    
    toggleAxes(show) {
        if (show) {
            if (!this.axesHelper) {
                this.axesHelper = new THREE.AxesHelper(50);
                this.scene.add(this.axesHelper);
            }
        } else {
            if (this.axesHelper) {
                this.scene.remove(this.axesHelper);
                this.axesHelper = null;
            }
        }
    }
    
    resetCameraRoll() {
        // Reset camera roll by enforcing up vector and recalculating look direction
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        
        // Set up vector to prevent roll
        this.camera.up.set(0, 1, 0);
        this.camera.up.normalize();
        
        // Recalculate camera position to maintain view direction
        const distance = this.camera.position.length();
        const target = new THREE.Vector3(0, 0, 0);
        const newPosition = target.clone().sub(direction.multiplyScalar(distance));
        this.camera.position.copy(newPosition);
        this.camera.lookAt(0, 0, 0);
        
        // Final enforcement
        this.camera.up.set(0, 1, 0);
        this.camera.up.normalize();
        
        // Update controls
        this.controls.update();
    }
    
    resetCameraPosition() {
        // Reset to default position
        this.camera.position.set(0, 0, 0.1);
        this.camera.up.set(0, 1, 0);
        this.camera.up.normalize();
        this.camera.lookAt(0, 0, 0);
        this.camera.fov = 75;
        this.camera.updateProjectionMatrix();
        this.controls.update();
    }
    
    updateCameraInfo() {
        if (!this.showCameraInfo || !this.cameraInfoElement) return;
        
        const pos = this.camera.position;
        const rot = this.camera.rotation;
        
        // Calculate yaw and pitch from camera position
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        const yaw = Math.atan2(direction.x, direction.z);
        const pitch = Math.asin(direction.y);
        
        const info = `Position:
  X: ${pos.x.toFixed(3)}
  Y: ${pos.y.toFixed(3)}
  Z: ${pos.z.toFixed(3)}

Rotation (Euler):
  X: ${(rot.x * 180 / Math.PI).toFixed(2)}°
  Y: ${(rot.y * 180 / Math.PI).toFixed(2)}°
  Z: ${(rot.z * 180 / Math.PI).toFixed(2)}°

Spherical:
  Yaw: ${(yaw * 180 / Math.PI).toFixed(2)}°
  Pitch: ${(pitch * 180 / Math.PI).toFixed(2)}°

FOV: ${this.camera.fov.toFixed(2)}°
Aspect: ${this.camera.aspect.toFixed(3)}`;
        
        this.cameraInfoElement.textContent = info;
    }

    updateSceneList() {
        const sceneList = document.getElementById('sceneList');
        if (!sceneList) return;

        sceneList.innerHTML = '';

        this.config.scenes.forEach(sceneData => {
            const sceneBtn = document.createElement('button');
            sceneBtn.textContent = sceneData.name;
            sceneBtn.className = 'scene-btn';
            if (sceneData.id === this.currentSceneId) {
                sceneBtn.classList.add('active');
            }
            sceneBtn.addEventListener('click', () => {
                this.switchToScene(sceneData.id);
            });
            sceneList.appendChild(sceneBtn);
        });
    }

    toggleAutorotate() {
        this.isAutorotating = !this.isAutorotating;
        const btn = document.getElementById('autorotateBtn');
        if (btn) {
            btn.textContent = this.isAutorotating ? 'Stop Rotate' : 'Auto Rotate';
        }
    }

    resetView() {
        if (this.currentSceneId) {
            const sceneInfo = this.scenes[this.currentSceneId];
            if (sceneInfo && sceneInfo.data.initialView) {
                this.setView(sceneInfo.data.initialView);
            }
        }
    }

    showLoading() {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = 'flex';
        }
    }

    hideLoading() {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = 'none';
        }
    }
}

// Initialize viewer when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.viewer = new VirtualTourViewer();
});
