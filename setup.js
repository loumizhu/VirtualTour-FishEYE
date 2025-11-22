// Setup Mode for Virtual Tour
// Allows configuration of scenes and hotspots

class VirtualTourSetup {
    constructor() {
        this.viewer = null;
        this.scenes = [];
        this.currentScene = null;
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
        this.pendingHotspot = null;
        this.tileGenerator = new TileGenerator();
        
        this.init();
    }
    
    async init() {
        try {
            // Try to load existing configuration
            await this.loadConfig();

            // Initialize viewer
            this.initViewer();

            // Setup UI event listeners
            this.setupEventListeners();

            // Render scenes list
            this.renderScenesList();

            // Load first scene if available
            if (this.config.scenes.length > 0) {
                this.loadScene(this.config.scenes[0].id);
            }

            this.hideLoading();
            
            // Automatically scan for generated tiles on page load
            this.scanGeneratedTiles();
        } catch (error) {
            console.error('Error initializing setup:', error);
            this.hideLoading();
            
            // Still try to scan tiles even if there was an error
            this.scanGeneratedTiles();
        }
    }
    
    async loadConfig() {
        try {
            // Add cache-busting parameter to force reload
            const response = await fetch('config.json?t=' + Date.now());
            if (response.ok) {
                this.config = await response.json();
            }
        } catch (error) {
            console.log('No existing configuration found, starting fresh');
        }
    }
    
    initViewer() {
        const container = document.getElementById('pano');

        // Create Three.js scene
        this.scene = new THREE.Scene();

        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            container.clientWidth / container.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 0, 0.1);

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(this.renderer.domElement);

        // Create controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableZoom = false; // Disable default zoom, we'll use FOV
        this.controls.enablePan = false;
        this.controls.rotateSpeed = -this.config.settings.dragSensitivity;
        this.controls.minDistance = 0.1;
        this.controls.maxDistance = 0.1;
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        // Clamp pitch to prevent gimbal lock (avoid looking straight up/down)
        // This prevents the camera from flipping when looking directly up or down
        this.controls.minPolarAngle = 0.1; // ~6 degrees from top
        this.controls.maxPolarAngle = Math.PI - 0.1; // ~6 degrees from bottom

        // Lock the up vector to prevent roll (rotation around Z-axis)
        // This is critical for keeping the horizon horizontal
        this.camera.up.set(0, 1, 0);
        this.camera.up.normalize();

        // Prevent OrbitControls from changing the up vector
        this.controls.addEventListener('change', () => {
            // Enforce fixed up vector after every control update
            this.camera.up.set(0, 1, 0);
            this.camera.up.normalize();
        });

        // Zoom settings (using FOV)
        this.minFov = 30;  // Max zoom in
        this.maxFov = 100; // Max zoom out
        this.camera.fov = 75; // Default FOV

        // Raycaster for click detection
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Add click listener for hotspot placement
        this.renderer.domElement.addEventListener('click', (e) => this.handlePanoClick(e));

        // Add zoom listeners
        this.setupZoomControls(container);

        // Handle window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = container.clientWidth / container.clientHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(container.clientWidth, container.clientHeight);
        });

        // Start render loop
        this.animate();
    }

    setupZoomControls(container) {
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
        const zoomSpeed = this.config.settings.zoomSensitivity;
        this.camera.fov += direction * zoomSpeed;

        // Clamp FOV to min/max
        this.camera.fov = Math.max(this.minFov, Math.min(this.maxFov, this.camera.fov));

        // Update camera projection
        this.camera.updateProjectionMatrix();
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    setupEventListeners() {
        // Generate tiles button
        document.getElementById('generateTilesBtn').addEventListener('click', () => {
            this.generateTilesFromImages();
        });

        // Scan images button
        document.getElementById('scanImagesBtn').addEventListener('click', () => {
            this.scanGeneratedTiles();
        });

        // Add scene button
        document.getElementById('addSceneBtn').addEventListener('click', () => {
            this.addScene();
        });
        
        // Hotspot type change
        document.getElementById('hotspotType').addEventListener('change', (e) => {
            this.updateHotspotForm(e.target.value);
        });
        
        // Save hotspot button
        document.getElementById('saveHotspotBtn').addEventListener('click', () => {
            this.saveHotspot();
        });
        
        // Cancel hotspot button
        document.getElementById('cancelHotspotBtn').addEventListener('click', () => {
            this.cancelHotspot();
        });
        
        // Save configuration button
        document.getElementById('saveConfigBtn').addEventListener('click', () => {
            this.saveConfiguration();
        });
        
        // Load configuration button
        document.getElementById('loadConfigBtn').addEventListener('click', () => {
            document.getElementById('configFileInput').click();
        });
        
        // Config file input
        document.getElementById('configFileInput').addEventListener('change', (e) => {
            this.loadConfigurationFromFile(e.target.files[0]);
        });
        
        // Viewer mode button
        document.getElementById('viewerModeBtn').addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }

    async generateTilesFromImages() {
        const scanProgress = document.getElementById('scanProgress');
        const imagesList = document.getElementById('imagesList');
        const generateBtn = document.getElementById('generateTilesBtn');

        scanProgress.innerHTML = ''; // Clear previous logs
        imagesList.innerHTML = '';

        // Disable button during generation
        generateBtn.disabled = true;
        generateBtn.textContent = 'Generating...';

        this.logToUI(scanProgress, '🚀 Starting tile generation...');
        this.logToUI(scanProgress, '📂 Running: python generate_tiles.py');

        try {
            // Call the Python script via server endpoint
            const response = await fetch('/generate-tiles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.statusText}`);
            }

            const result = await response.json();

            if (result.success) {
                this.logToUI(scanProgress, '✅ Tile generation complete!');
                this.logToUI(scanProgress, `📊 Processed ${result.count} images`);

                // Automatically scan the generated tiles
                await this.scanGeneratedTiles();
            } else {
                this.logToUI(scanProgress, `❌ Error: ${result.error}`);
            }

        } catch (error) {
            console.error('Error generating tiles:', error);
            this.logToUI(scanProgress, `❌ Error: ${error.message}`);
            this.logToUI(scanProgress, '💡 Make sure the server is running');
            this.logToUI(scanProgress, '💡 Or run manually: python generate_tiles.py');
        } finally {
            // Re-enable button
            generateBtn.disabled = false;
            generateBtn.textContent = 'Generate Tiles from Images';
        }
    }

    async scanGeneratedTiles() {
        const scanProgress = document.getElementById('scanProgress');
        const imagesList = document.getElementById('imagesList');

        scanProgress.innerHTML = ''; // Clear previous logs
        imagesList.innerHTML = '';

        this.logToUI(scanProgress, '🔍 Scanning tiles folder...');

        try {
            // Scan tiles folder for generated scenes
            const tilesFolder = 'tiles';
            const sceneIds = [];

            // Try to detect scene folders by checking for preview images
            const commonSceneIds = [
                '360_(1)', '360_(2)', '360_(3)', '360_(4)', '360_(5)',
                '360_(6)', '360_(7)', '360_(8)', '360_(9)', '360_(10)',
                '360_1', '360_2', '360_3', '360_4', '360_5',
                'pano_1', 'pano_2', 'pano_3', 'scene_1', 'scene_2'
            ];

            this.logToUI(scanProgress, '📂 Checking for generated tiles...');

            for (const sceneId of commonSceneIds) {
                const previewPath = `${tilesFolder}/${sceneId}/preview.jpg`;
                try {
                    const exists = await this.checkImageExists(previewPath);
                    if (exists) {
                        sceneIds.push(sceneId);
                        this.logToUI(scanProgress, `✅ Found: ${sceneId}`);
                    }
                } catch (e) {
                    // Scene doesn't exist, continue
                }
            }

            if (sceneIds.length === 0) {
                this.logToUI(scanProgress, '⚠️ No generated tiles found!');
                this.logToUI(scanProgress, '💡 Click "Generate Tiles from Images" button');
                this.logToUI(scanProgress, '💡 Make sure you have images in FishEye-Images folder');
            } else {
                this.logToUI(scanProgress, `✅ Found ${sceneIds.length} generated scenes!`);

                // Display found scenes
                imagesList.innerHTML = '<h3>Generated Scenes:</h3>';
                const ul = document.createElement('ul');
                ul.style.cssText = 'list-style: none; padding: 0; margin: 10px 0;';

                sceneIds.forEach(sceneId => {
                    const li = document.createElement('li');
                    li.style.cssText = 'padding: 5px; margin: 5px 0; background: rgba(255,255,255,0.1); border-radius: 4px;';
                    li.textContent = `🎬 ${sceneId}`;
                    ul.appendChild(li);
                });

                imagesList.appendChild(ul);

                this.logToUI(scanProgress, '📋 Auto-creating scenes...');

                // Auto-create scenes from detected tiles
                await this.autoCreateScenesFromTiles(sceneIds);

                this.logToUI(scanProgress, '✅ Setup complete! Configure hotspots below.');
            }

        } catch (error) {
            console.error('Error scanning tiles:', error);
            this.logToUI(scanProgress, `❌ Error: ${error.message}`);
        }
    }

    checkImageExists(imagePath) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => reject(false);
            img.src = imagePath;
        });
    }

    logToUI(element, message) {
        console.log(message);
        const line = document.createElement('div');
        line.textContent = message;
        line.style.cssText = 'padding: 2px 0; font-family: monospace; font-size: 12px;';
        element.appendChild(line);

        // Auto-scroll to bottom
        element.scrollTop = element.scrollHeight;
    }

    async autoCreateScenesFromTiles(sceneIds) {
        // Clear existing scenes
        this.config.scenes = [];

        // Create a scene for each detected tile set
        sceneIds.forEach((sceneId, index) => {
            const sceneName = sceneId.replace(/_/g, ' ').replace(/\(/g, '').replace(/\)/g, '');

            this.config.scenes.push({
                id: sceneId,
                name: sceneName,
                tilesPath: `tiles/${sceneId}`,
                initialView: {
                    yaw: 0,
                    pitch: 0,
                    fov: 90
                },
                hotspots: []
            });
        });

        // Set first scene as default
        if (this.config.scenes.length > 0) {
            this.config.defaultScene = this.config.scenes[0].id;
        }

        // Refresh UI
        this.renderScenesList();
        if (this.config.scenes.length > 0) {
            this.loadScene(this.config.scenes[0].id);
        }
    }
    

    addScene() {
        const sceneName = prompt('Enter scene name:');
        if (!sceneName) return;
        
        const sceneId = `scene_${Date.now()}`;
        const imagePath = prompt('Enter image path (relative to FishEye-Images):');
        if (!imagePath) return;
        
        this.config.scenes.push({
            id: sceneId,
            name: sceneName,
            tilesPath: `tiles/${sceneId}`,
            imagePath: `FishEye-Images/${imagePath}`,
            initialView: {
                yaw: 0,
                pitch: 0,
                fov: 90 * Math.PI / 180
            },
            hotspots: []
        });
        
        this.renderScenesList();
    }
    
    renderScenesList() {
        const scenesList = document.getElementById('scenesList');
        scenesList.innerHTML = '';
        
        this.config.scenes.forEach((scene, index) => {
            const sceneCard = document.createElement('div');
            sceneCard.className = 'scene-card';
            sceneCard.innerHTML = `
                <h3>${scene.name}</h3>
                <p>ID: ${scene.id}</p>
                <button onclick="tourSetup.loadScene('${scene.id}')">Load</button>
                <button onclick="tourSetup.editScene(${index})">Edit</button>
                <button class="delete-btn" onclick="tourSetup.deleteScene(${index})">Delete</button>
            `;
            scenesList.appendChild(sceneCard);
        });
        
        // Update target scene dropdown
        this.updateTargetSceneDropdown();
    }
    
    async loadScene(sceneId) {
        const sceneData = this.config.scenes.find(s => s.id === sceneId);
        if (!sceneData) return;

        this.showLoading();

        // Clear existing scene mesh
        if (this.currentCubeMesh) {
            this.scene.remove(this.currentCubeMesh);
        }

        // Load scene tiles
        const cubeMesh = await this.createScene(sceneData);

        this.currentScene = {
            id: sceneId,
            mesh: cubeMesh,
            data: sceneData
        };

        this.currentCubeMesh = cubeMesh;
        this.scene.add(cubeMesh);

        // Set initial view
        if (sceneData.initialView) {
            this.setView(sceneData.initialView);
        }

        this.renderHotspotsList();
        this.hideLoading();
    }

    async createScene(sceneData) {
        const tilesPath = sceneData.tilesPath || `tiles/${sceneData.id}`;

        // Create cube geometry
        const geometry = new THREE.BoxGeometry(100, 100, 100);

        // Load textures for each face
        const materials = await this.loadCubeFaceTextures(tilesPath);

        // Create mesh with inverted normals
        const mesh = new THREE.Mesh(geometry, materials);
        mesh.scale.set(-1, 1, 1);

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

    setView(view) {
        const theta = view.yaw || 0;
        const phi = Math.PI / 2 - (view.pitch || 0);

        this.camera.position.x = 0.1 * Math.sin(phi) * Math.sin(theta);
        this.camera.position.y = 0.1 * Math.cos(phi);
        this.camera.position.z = 0.1 * Math.sin(phi) * Math.cos(theta);
        this.camera.lookAt(0, 0, 0);

        if (view.fov) {
            this.camera.fov = view.fov * 180 / Math.PI;
            this.camera.updateProjectionMatrix();
        }
    }

    createSceneOld(sceneData) {
        const levels = [
            { tileSize: 256, size: 256, fallbackOnly: true },
            { tileSize: 512, size: 512 },
            { tileSize: 512, size: 1024 },
            { tileSize: 512, size: 2048 }
        ];

        const geometry = new Marzipano.CubeGeometry(levels);

        const urlPrefix = sceneData.tilesPath || `tiles/${sceneData.id}`;
        const source = Marzipano.ImageUrlSource.fromString(
            `${urlPrefix}/{z}/{f}/{y}/{x}.jpg`,
            { cubeMapPreviewUrl: `${urlPrefix}/preview.jpg` }
        );
        
        const initialView = {
            yaw: sceneData.initialView?.yaw || 0,
            pitch: sceneData.initialView?.pitch || 0,
            fov: sceneData.initialView?.fov || (90 * Math.PI / 180)
        };
        
        const limiter = Marzipano.RectilinearView.limit.traditional(2048, 120 * Math.PI / 180);
        const view = new Marzipano.RectilinearView(initialView, limiter);
        
        const scene = this.viewer.createScene({
            source: source,
            geometry: geometry,
            view: view,
            pinFirstLevel: true
        });
        
        // Add existing hotspots
        if (sceneData.hotspots) {
            sceneData.hotspots.forEach(hotspotData => {
                this.addHotspotToScene(scene, hotspotData);
            });
        }
        
        return scene;
    }
    
    handlePanoClick(e) {
        if (!this.currentScene) return;

        const rect = e.target.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Convert to normalized device coordinates
        this.mouse.x = (x / rect.width) * 2 - 1;
        this.mouse.y = -(y / rect.height) * 2 + 1;

        // Raycast to get 3D position
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObject(this.currentCubeMesh);

        if (intersects.length > 0) {
            const point = intersects[0].point;

            // Convert 3D point to yaw/pitch
            const yaw = Math.atan2(point.x, point.z);
            const pitch = Math.asin(point.y / Math.sqrt(point.x * point.x + point.y * point.y + point.z * point.z));

            this.pendingHotspot = {
                yaw: yaw,
                pitch: pitch
            };

            // Show hotspot form
            document.getElementById('hotspotForm').style.display = 'block';
            document.getElementById('setupOverlay').style.display = 'none';
        }
    }
    
    updateHotspotForm(type) {
        const targetSceneLabel = document.getElementById('targetSceneLabel');
        const infoTextLabel = document.getElementById('infoTextLabel');
        
        if (type === 'link') {
            targetSceneLabel.style.display = 'block';
            infoTextLabel.style.display = 'none';
        } else {
            targetSceneLabel.style.display = 'none';
            infoTextLabel.style.display = 'block';
        }
    }
    
    saveHotspot() {
        if (!this.pendingHotspot || !this.currentScene) return;
        
        const type = document.getElementById('hotspotType').value;
        const icon = document.getElementById('hotspotIcon').value;
        
        const hotspotData = {
            yaw: this.pendingHotspot.yaw,
            pitch: this.pendingHotspot.pitch,
            type: type,
            icon: icon
        };
        
        if (type === 'link') {
            hotspotData.target = document.getElementById('targetScene').value;
        } else {
            hotspotData.text = document.getElementById('infoText').value;
        }
        
        // Add to current scene data
        this.currentScene.data.hotspots.push(hotspotData);
        
        // Add to scene visually
        this.addHotspotToScene(this.currentScene.scene, hotspotData);
        
        this.cancelHotspot();
        this.renderHotspotsList();
    }
    
    addHotspotToScene(scene, hotspotData) {
        const element = document.createElement('div');
        element.className = `hotspot ${hotspotData.icon || 'arrow'}`;
        
        const position = {
            yaw: hotspotData.yaw,
            pitch: hotspotData.pitch
        };
        
        scene.hotspotContainer().createHotspot(element, position);
    }
    
    cancelHotspot() {
        this.pendingHotspot = null;
        document.getElementById('hotspotForm').style.display = 'none';
        document.getElementById('setupOverlay').style.display = 'block';
    }
    
    renderHotspotsList() {
        const hotspotsList = document.getElementById('hotspotsList');
        if (!this.currentScene) {
            hotspotsList.innerHTML = '<p>Load a scene first</p>';
            return;
        }
        
        hotspotsList.innerHTML = '<h4>Hotspots:</h4>';
        
        this.currentScene.data.hotspots.forEach((hotspot, index) => {
            const card = document.createElement('div');
            card.className = 'hotspot-card';
            card.innerHTML = `
                <p>Type: ${hotspot.type}</p>
                <p>${hotspot.type === 'link' ? 'Target: ' + hotspot.target : 'Text: ' + hotspot.text}</p>
                <button class="delete-btn" onclick="tourSetup.deleteHotspot(${index})">Delete</button>
            `;
            hotspotsList.appendChild(card);
        });
    }
    
    deleteHotspot(index) {
        if (!this.currentScene) return;
        
        this.currentScene.data.hotspots.splice(index, 1);
        
        // Reload scene to refresh hotspots
        this.loadScene(this.currentScene.id);
    }
    
    updateTargetSceneDropdown() {
        const select = document.getElementById('targetScene');
        select.innerHTML = '';
        
        this.config.scenes.forEach(scene => {
            const option = document.createElement('option');
            option.value = scene.id;
            option.textContent = scene.name;
            select.appendChild(option);
        });
    }
    
    editScene(index) {
        const scene = this.config.scenes[index];
        const newName = prompt('Enter new scene name:', scene.name);
        if (newName) {
            scene.name = newName;
            this.renderScenesList();
        }
    }
    
    deleteScene(index) {
        if (confirm('Are you sure you want to delete this scene?')) {
            this.config.scenes.splice(index, 1);
            this.renderScenesList();
        }
    }
    
    saveConfiguration() {
        const configJson = JSON.stringify(this.config, null, 2);
        const blob = new Blob([configJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'config.json';
        a.click();
        
        URL.revokeObjectURL(url);
        
        alert('Configuration saved! Place config.json in the root directory.');
    }
    
    async loadConfigurationFromFile(file) {
        if (!file) return;
        
        try {
            const text = await file.text();
            this.config = JSON.parse(text);
            this.renderScenesList();
            alert('Configuration loaded successfully!');
        } catch (error) {
            alert('Error loading configuration file');
            console.error(error);
        }
    }
    
    showLoading() {
        document.getElementById('loading').classList.remove('hidden');
    }
    
    hideLoading() {
        document.getElementById('loading').classList.add('hidden');
    }
}

// Global instance for onclick handlers
let tourSetup;

document.addEventListener('DOMContentLoaded', () => {
    tourSetup = new VirtualTourSetup();
});

