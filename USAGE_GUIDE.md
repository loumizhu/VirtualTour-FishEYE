# Complete Usage Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [Tile Generation](#tile-generation)
3. [Setup Mode](#setup-mode)
4. [Viewer Mode](#viewer-mode)
5. [Configuration](#configuration)
6. [Customization](#customization)
7. [Deployment](#deployment)

---

## Getting Started

### Prerequisites
- Web browser (Chrome, Firefox, Safari, or Edge)
- Python 3.x (for local server and tile generation)
- 360° equirectangular images

### Quick Start
```bash
# 1. Start the local server
python -m http.server 8000
# Or use the convenience script
./start.bat  # Windows
./start.sh   # Mac/Linux

# 2. Open your browser
# Viewer: http://localhost:8000/index.html
# Setup:  http://localhost:8000/setup.html
```

---

## Tile Generation

### Why Generate Tiles?
Multi-resolution tiles enable:
- Fast initial loading (low-res preview)
- Progressive enhancement (higher quality as you zoom)
- Efficient bandwidth usage (only load visible tiles)
- Support for gigapixel images

### Method 1: Python Script (Recommended)

**Advantages:**
- Much faster (10-100x)
- Better quality
- Handles large images
- Batch processing

**Usage:**
```bash
# Install dependencies
pip install Pillow numpy

# Generate tiles for all images in FishEye-Images
python generate_tiles.py

# Custom source and output folders
python generate_tiles.py "path/to/images" "path/to/output"
```

**Output Structure:**
```
tiles/
├── 360_1/
│   ├── 0/              # Level 0: 256x256
│   │   ├── f/          # Front face
│   │   │   ├── 0/
│   │   │   │   └── 0.jpg
│   │   ├── r/          # Right face
│   │   ├── b/          # Back face
│   │   ├── l/          # Left face
│   │   ├── u/          # Up face
│   │   └── d/          # Down face
│   ├── 1/              # Level 1: 512x512
│   ├── 2/              # Level 2: 1024x1024
│   ├── 3/              # Level 3: 2048x2048
│   └── preview.jpg     # Cube map preview
└── 360_2/
    └── ...
```

### Method 2: Browser-Based

**Advantages:**
- No Python installation needed
- Visual progress feedback

**Disadvantages:**
- Slower processing
- May crash on large images
- Limited by browser memory

**Usage:**
1. Open `setup.html`
2. Click "Generate Tiles from Images"
3. Wait for processing (may take several minutes)

---

## Setup Mode

### Overview
Setup mode (`setup.html`) is your configuration interface for creating and managing your virtual tour.

### Step-by-Step Guide

#### 1. Generate Tiles
- Click "Generate Tiles from Images"
- Wait for completion
- Scenes are auto-created

#### 2. Manage Scenes

**Add Scene:**
1. Click "Add Scene"
2. Enter scene name
3. Enter image path (relative to FishEye-Images)

**Edit Scene:**
1. Click "Edit" on a scene card
2. Modify scene name
3. Changes save automatically

**Delete Scene:**
1. Click "Delete" on a scene card
2. Confirm deletion

**Load Scene:**
1. Click "Load" to preview a scene
2. Scene displays in the panorama viewer

#### 3. Add Hotspots

**Placement:**
1. Load a scene
2. Click anywhere on the panorama
3. Hotspot form appears

**Configuration:**

**Link Hotspot** (Navigate to another scene):
- Type: Link
- Target Scene: Select destination
- Icon: Arrow or Info

**Info Hotspot** (Display information):
- Type: Info
- Info Text: Enter message
- Icon: Info or Custom

**Save:**
- Click "Save Hotspot"
- Hotspot appears on panorama
- Listed in hotspots section

**Delete:**
- Click "Delete" on hotspot card
- Scene reloads without hotspot

#### 4. Save Configuration

1. Click "Save Configuration"
2. `config.json` downloads
3. Place file in project root directory

#### 5. Load Configuration

1. Click "Load Configuration"
2. Select `config.json` file
3. Configuration loads
4. Scenes and hotspots populate

---

## Viewer Mode

### Overview
Viewer mode (`index.html`) is the public-facing virtual tour interface.

### Controls

**Mouse:**
- **Drag**: Pan around the scene
- **Scroll**: Zoom in/out
- **Click Hotspot**: Navigate to linked scene

**Touch (Mobile):**
- **Swipe**: Pan around
- **Pinch**: Zoom in/out
- **Tap Hotspot**: Navigate

**Keyboard:**
- **Arrow Keys**: Pan
- **+/-**: Zoom

### UI Elements

**Control Buttons (Top Right):**
- **Setup Mode**: Switch to setup interface
- **Auto Rotate**: Toggle automatic rotation
- **Reset View**: Return to initial view

**Scene List (Bottom):**
- Click scene name to jump directly
- Active scene highlighted

### Navigation Flow

1. **Initial Load**
   - First scene displays
   - Loading indicator shows progress

2. **Hotspot Click**
   - Zoom animation to hotspot
   - Fade transition
   - Target scene loads
   - Fade in to new scene

3. **Scene Selector**
   - Click scene name
   - Direct transition (no zoom)
   - Faster navigation

---

## Configuration

### config.json Structure

```json
{
  "scenes": [
    {
      "id": "unique_id",
      "name": "Display Name",
      "tilesPath": "tiles/unique_id",
      "initialView": {
        "yaw": 0,
        "pitch": 0,
        "fov": 1.5707963267948966
      },
      "hotspots": [
        {
          "yaw": 1.5708,
          "pitch": 0,
          "type": "link",
          "target": "target_scene_id",
          "icon": "arrow"
        }
      ]
    }
  ],
  "settings": {
    "autorotateSpeed": 0.1,
    "transitionDuration": 1000,
    "mouseViewMode": "drag"
  }
}
```

### Field Descriptions

**Scene Fields:**
- `id`: Unique identifier (no spaces)
- `name`: Display name for UI
- `tilesPath`: Path to tile directory
- `initialView.yaw`: Horizontal rotation (radians, 0 = forward)
- `initialView.pitch`: Vertical rotation (radians, 0 = horizon)
- `initialView.fov`: Field of view (radians, ~1.57 = 90°)

**Hotspot Fields:**
- `yaw`: Horizontal position (radians)
- `pitch`: Vertical position (radians)
- `type`: "link" or "info"
- `target`: Target scene ID (for link type)
- `text`: Info text (for info type)
- `icon`: "arrow", "info", or "custom"

**Settings:**
- `autorotateSpeed`: Rotation speed (0.1 = slow, 0.5 = fast)
- `transitionDuration`: Transition time in milliseconds
- `mouseViewMode`: "drag" or "qtvr"

### Angle Conversion

**Degrees to Radians:**
```javascript
radians = degrees * Math.PI / 180
```

**Common Values:**
- 0° = 0 radians
- 45° = 0.785 radians
- 90° = 1.571 radians
- 180° = 3.142 radians
- 360° = 6.283 radians

---

## Customization

### Visual Customization

**Edit `styles.css`:**

**Change Hotspot Colors:**
```css
.hotspot {
    background: rgba(33, 150, 243, 0.9); /* Blue */
    border: 3px solid #fff;
}

.hotspot:hover {
    background: rgba(255, 87, 34, 1); /* Orange on hover */
}
```

**Modify Hotspot Size:**
```css
.hotspot {
    width: 60px;  /* Larger */
    height: 60px;
}
```

**Custom Pulse Animation:**
```css
@keyframes pulse {
    0%, 100% {
        box-shadow: 0 0 0 0 rgba(33, 150, 243, 0.7);
    }
    50% {
        box-shadow: 0 0 0 30px rgba(33, 150, 243, 0);
    }
}
```

### Behavior Customization

**Edit `viewer.js`:**

**Change Transition Speed:**
```javascript
switchToSceneWithTransition(targetSceneId, hotspotData) {
    // Zoom duration
    this.currentScene.scene.lookTo(zoomView, {
        transitionDuration: 800  // Change from 500
    });
    
    // Fade duration
    setTimeout(() => {
        this.switchToScene(targetSceneId, { duration: 1200 }); // Change from 800
    }, 800);
}
```

**Adjust Auto-rotate:**
```javascript
this.autorotateMovement = Marzipano.autorotate({
    yawSpeed: 0.05,        // Slower rotation
    targetPitch: 0.2,      // Look slightly up
    targetFov: Math.PI/3   // Narrower FOV
});
```

---

## Deployment

### Option 1: GitHub Pages

1. Create GitHub repository
2. Push all files
3. Settings → Pages → Enable
4. Access at `https://username.github.io/repo-name`

### Option 2: Netlify

1. Drag project folder to Netlify
2. Instant deployment
3. Custom domain support

### Option 3: Traditional Hosting

1. Upload via FTP/SFTP
2. Ensure all files included:
   - HTML, CSS, JS files
   - config.json
   - tiles/ directory
3. Access via your domain

### Pre-Deployment Checklist

- [ ] Tiles generated for all scenes
- [ ] config.json in root directory
- [ ] All hotspots tested
- [ ] Transitions smooth
- [ ] Mobile tested
- [ ] All scenes accessible
- [ ] Loading indicators work
- [ ] No console errors

---

## Tips & Best Practices

### Image Preparation
1. Use 4K-8K resolution (4096x2048 to 8192x4096)
2. Maintain 2:1 aspect ratio (equirectangular)
3. Consistent exposure across scenes
4. JPEG format for smaller files
5. Optimize before processing

### Hotspot Placement
1. Place at natural eye level
2. Use consistent icons
3. 3-5 hotspots per scene (don't overcrowd)
4. Test on mobile devices
5. Logical navigation flow

### Performance
1. Use Python for tile generation
2. Optimize JPEG quality (85-90%)
3. Enable server compression (gzip)
4. Use CDN for production
5. Limit simultaneous scenes

### User Experience
1. Provide clear navigation cues
2. Test all navigation paths
3. Include scene descriptions
4. Mobile-first design
5. Fast initial load

---

## Troubleshooting

### Common Issues

**"Configuration file not found"**
- Ensure config.json is in root directory
- Check file name (case-sensitive)
- Verify JSON syntax

**Images not loading**
- Check tiles directory exists
- Verify tilesPath in config
- Check browser console for errors
- Ensure server is running

**Slow performance**
- Reduce image resolution
- Lower JPEG quality
- Fewer hotspots
- Check network speed

**Hotspots not clickable**
- Verify target scene exists
- Check hotspot coordinates
- Reload configuration
- Clear browser cache

**Transitions jerky**
- Reduce transition duration
- Check GPU acceleration
- Close other browser tabs
- Update graphics drivers

---

## Support

For additional help:
1. Check README.md
2. Review PROJECT_SUMMARY.md
3. Inspect browser console
4. Check Marzipano documentation: https://www.marzipano.net/docs.html

Enjoy creating amazing virtual tours! 🎉

