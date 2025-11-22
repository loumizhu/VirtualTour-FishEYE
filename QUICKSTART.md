# Quick Start Guide

Get your 360° virtual tour up and running in minutes!

## Prerequisites

- A web browser (Chrome recommended)
- Python 3 (for tile generation and local server)
- Your 360° equirectangular images

## Step-by-Step Setup

### 1. Install Python Dependencies (Optional but Recommended)

For faster tile generation, install Python dependencies:

```bash
pip install Pillow numpy
```

### 2. Add Your Images

Place your 360° images in the `FishEye-Images` folder. The images should be:
- Equirectangular format (2:1 aspect ratio)
- JPG or PNG format
- Any resolution (higher is better, but larger files take longer to process)

### 3. Generate Tiles

**Option A: Using Python (Recommended - Much Faster)**

```bash
python generate_tiles.py
```

This will process all images in `FishEye-Images` and create tiles in the `tiles` folder.

**Option B: Using the Web Interface**

1. Start a local server:
   ```bash
   python -m http.server 8000
   ```

2. Open http://localhost:8000/setup.html
3. Click "Generate Tiles from Images"
4. Wait for processing to complete (this may take a while in the browser)

### 4. Configure Your Tour

1. Open http://localhost:8000/setup.html
2. Your scenes should be auto-created after tile generation
3. Click "Load" on a scene to view it
4. Click on the panorama to add hotspots
5. Configure hotspot type (Link to another scene or Info)
6. Click "Save Configuration" to download `config.json`
7. Place the downloaded `config.json` in the root directory

### 5. View Your Tour

1. Open http://localhost:8000/index.html
2. Navigate using:
   - Mouse drag to look around
   - Mouse wheel to zoom
   - Click hotspots to jump between scenes
   - Use the scene selector at the bottom
   - Click "Auto Rotate" for automatic rotation

## Example Workflow

```bash
# 1. Clone or download the project
cd VirtualTour-FishEYE

# 2. Add your images to FishEye-Images folder
# (You already have sample images there)

# 3. Generate tiles
python generate_tiles.py

# 4. Start local server
python -m http.server 8000

# 5. Open browser
# - Setup: http://localhost:8000/setup.html
# - Viewer: http://localhost:8000/index.html
```

## Tips

### For Best Performance

1. **Use Python for tile generation** - It's much faster than browser-based generation
2. **Optimize your source images** - 4K-8K resolution is usually sufficient
3. **Use JPG format** - Smaller file sizes, faster loading
4. **Limit hotspots** - Too many hotspots can clutter the view

### Creating Hotspots

1. Load a scene in setup mode
2. Click where you want the hotspot
3. Choose "Link" to navigate to another scene
4. Choose "Info" to display information
5. Select an icon style (arrow or info)
6. Save the hotspot

### Customizing Transitions

Edit `viewer.js` to adjust:
- Transition duration
- Zoom speed
- Fade timing
- Auto-rotate speed

### Styling Hotspots

Edit `styles.css` to customize:
- Hotspot colors
- Hotspot sizes
- Hover effects
- Pulse animations

## Troubleshooting

### "Configuration file not found"
- Make sure `config.json` is in the root directory
- Run setup mode and save configuration

### Images not loading
- Check that tiles were generated successfully
- Verify the `tiles` folder contains subdirectories for each scene
- Check browser console for errors

### Tiles generation is slow
- Use the Python script instead of browser-based generation
- Process fewer images at a time
- Reduce source image resolution

### Hotspots not appearing
- Make sure you saved the configuration
- Reload the page
- Check that the target scene exists

## Deployment

### GitHub Pages

1. Push your project to GitHub
2. Enable GitHub Pages in repository settings
3. Your tour will be available at `https://username.github.io/repo-name`

### Netlify

1. Drag and drop your project folder to Netlify
2. Your tour is instantly deployed!

### Traditional Hosting

1. Upload all files via FTP
2. Ensure `config.json` and `tiles` folder are included
3. Access via your domain

## Next Steps

- Customize the UI in `styles.css`
- Add more transition effects in `viewer.js`
- Create custom hotspot icons
- Add background music or sound effects
- Integrate with analytics

## Support

For issues or questions:
- Check the main README.md
- Review the code comments
- Inspect browser console for errors

Enjoy creating your virtual tour! 🎉

