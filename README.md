# Fisheye 360° Virtual Tour Viewer

A high-performance, web-based 360° virtual tour viewer built with **Three.js** for maximum flexibility and control. Features multi-resolution tiled images, interactive hotspots, and smooth transitions.

## Tech Stack

- **Three.js** - Industry-standard WebGL library for 3D graphics
- **OrbitControls** - Smooth camera controls for navigation
- **Vanilla JavaScript** - No framework overhead
- **HTML5/CSS3** - Modern web standards
- **JSON** - Configuration storage
- **Python** - Fast tile generation

### Why Three.js?

✅ **Full Control** - Complete control over rendering pipeline
✅ **Industry Standard** - Most popular WebGL library (100k+ stars)
✅ **Highly Optimized** - Excellent performance on all devices
✅ **Extensible** - Easy to add custom features (VR, effects, etc.)
✅ **Active Development** - Regular updates and improvements
✅ **Large Community** - Extensive documentation and examples

## Features

- ✅ Multi-resolution tiled images for optimal performance
- ✅ Smooth zoom-fade transitions between scenes
- ✅ Interactive hotspots for navigation
- ✅ Auto-rotate functionality
- ✅ Setup mode for easy configuration
- ✅ JSON-based configuration
- ✅ Responsive design
- ✅ Equirectangular image support

## Getting Started

### 1. Setup Your Images

Place your 360° equirectangular images in the `FishEye-Images` folder. The viewer supports:
- Images from 360° cameras
- Rendered images from 3D software
- Standard equirectangular format

### 2. Run Setup Mode

Open `setup.html` in your browser to configure your virtual tour:

1. **Generate Tiles**: Click "Generate Tiles from Images" to create multi-resolution tiles
2. **Manage Scenes**: Add, edit, or delete scenes
3. **Add Hotspots**: Click on the panorama to place navigation hotspots
4. **Save Configuration**: Download the `config.json` file

### 3. Deploy

1. Place the downloaded `config.json` in the root directory
2. Open `index.html` to view your virtual tour
3. Deploy to any web server (no backend required!)

## File Structure

```
VirtualTour-FishEYE/
├── index.html              # Main viewer
├── setup.html              # Setup/configuration page
├── styles.css              # Styles for both viewer and setup
├── viewer.js               # Main viewer logic
├── setup.js                # Setup mode logic
├── tile-generator.js       # Tile generation utility
├── config.json             # Tour configuration
├── FishEye-Images/         # Source 360° images
│   ├── 360 (1).jpg
│   ├── 360 (2).jpg
│   └── ...
└── tiles/                  # Generated multi-resolution tiles
    ├── 360_1/
    │   ├── 0/              # Level 0 (256x256)
    │   ├── 1/              # Level 1 (512x512)
    │   ├── 2/              # Level 2 (1024x1024)
    │   ├── 3/              # Level 3 (2048x2048)
    │   └── preview.jpg
    └── 360_2/
        └── ...
```

## Configuration

The `config.json` file contains:

```json
{
  "scenes": [
    {
      "id": "scene_id",
      "name": "Scene Name",
      "tilesPath": "tiles/scene_id",
      "initialView": {
        "yaw": 0,
        "pitch": 0,
        "fov": 1.5708
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

## Hotspot Types

- **Link**: Navigate to another scene with zoom-fade transition
- **Info**: Display information when clicked

## Controls

- **Mouse Drag**: Pan around the scene
- **Mouse Wheel**: Zoom in/out
- **Auto Rotate**: Automatic rotation
- **Reset View**: Return to initial view

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Performance

The multi-resolution tiling system ensures:
- Fast initial load times
- Smooth navigation
- Efficient memory usage
- Support for high-resolution images (gigapixel+)

## Customization

### Transition Effects

Edit `viewer.js` to customize transition effects:

```javascript
switchToSceneWithTransition(targetSceneId, hotspotData) {
    // Customize zoom duration, fade timing, etc.
}
```

### Hotspot Styles

Edit `styles.css` to customize hotspot appearance:

```css
.hotspot {
    /* Customize size, color, animation */
}
```

## Deployment

### Local Testing

Simply open `index.html` in a web browser. For full functionality, use a local server:

```bash
# Python 3
python -m http.server 8000

# Node.js
npx http-server
```

### Production Deployment

Upload all files to any web hosting service:
- GitHub Pages
- Netlify
- Vercel
- Traditional web hosting

No server-side processing required!

## Troubleshooting

### Images not loading
- Ensure images are in `FishEye-Images` folder
- Check that tiles have been generated
- Verify `config.json` paths are correct

### Tiles not generating
- Check browser console for errors
- Ensure images are valid equirectangular format
- Try with smaller images first

### Performance issues
- Reduce tile resolution in `tile-generator.js`
- Optimize source images
- Use fewer hotspots per scene

## Credits

Built with [Marzipano](https://www.marzipano.net/) by Google

## License

MIT License - Feel free to use and modify for your projects!

