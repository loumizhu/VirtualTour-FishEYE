# Auto-Scan Feature for Setup Page

## Overview

The setup page now **automatically scans** the `FishEye-Images` folder for 360° images when it loads, and displays progress in a **console-like interface** directly in the page.

## Features Added

### 1. Automatic Image Scanning
- ✅ Scans `FishEye-Images` folder on page load
- ✅ Detects common naming patterns:
  - `360 (1).jpg`, `360 (2).jpg`, etc.
  - `360_1.jpg`, `360_2.jpg`, etc.
  - `pano_1.jpg`, `pano_2.jpg`, etc.
  - `scene_1.jpg`, `scene_2.jpg`, etc.
  - `image_1.jpg`, `image_2.jpg`, etc.
- ✅ Checks up to 20 images per pattern
- ✅ Displays found images in a list

### 2. Console-Like UI
- ✅ Real-time progress logging
- ✅ Emoji indicators for status:
  - 🔍 Scanning
  - ✅ Success
  - ❌ Error
  - ⚠️ Warning
  - 💡 Info/Tips
  - 📂 Folder operations
  - 📸 Image processing
  - 🔧 Processing
- ✅ Monospace font (terminal-style)
- ✅ Green text on dark background
- ✅ Auto-scrolling to latest message
- ✅ Scrollable log area

### 3. New UI Elements

#### Scan Progress Area
```html
<div id="scanProgress" class="progress-info"></div>
```
Shows scanning progress and results.

#### Images List
```html
<div id="imagesList" class="images-list"></div>
```
Displays all detected images.

#### Scan Button
```html
<button id="scanImagesBtn" class="btn-primary">Scan FishEye-Images Folder</button>
```
Manual re-scan trigger.

## How It Works

### 1. On Page Load
```javascript
async init() {
    // ... other initialization
    
    // Auto-scan for images on startup
    await this.scanImages();
    
    // ... continue setup
}
```

### 2. Scanning Process
```javascript
async scanImages() {
    // Try multiple naming patterns
    const imagePatterns = [
        { pattern: '360 ({i}).jpg', range: [1, 20] },
        { pattern: '360_{i}.jpg', range: [1, 20] },
        // ... more patterns
    ];
    
    // Check each pattern
    for (const { pattern, range } of imagePatterns) {
        for (let i = range[0]; i <= range[1]; i++) {
            const imagePath = `FishEye-Images/${pattern.replace('{i}', i)}`;
            const exists = await this.checkImageExists(imagePath);
            if (exists) {
                detectedImages.push({ path: imagePath, name: ..., index: i });
                this.logToUI(scanProgress, `✅ Found: ${imagePath}`);
            }
        }
    }
}
```

### 3. Image Detection
```javascript
checkImageExists(imagePath) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => reject(false);
        img.src = imagePath;
    });
}
```

### 4. Console-Like Logging
```javascript
logToUI(element, message) {
    console.log(message);  // Also log to browser console
    
    const line = document.createElement('div');
    line.textContent = message;
    line.style.cssText = 'padding: 2px 0; font-family: monospace; font-size: 12px;';
    element.appendChild(line);
    
    // Auto-scroll to bottom
    element.scrollTop = element.scrollHeight;
}
```

## Example Output

When you open `setup.html`, you'll see:

```
🔍 Scanning FishEye-Images folder...
📂 Checking for images...
✅ Found: FishEye-Images/360 (1).jpg
✅ Found: FishEye-Images/360 (2).jpg
✅ Found: FishEye-Images/360 (3).jpg
✅ Found: FishEye-Images/360 (4).jpg
✅ Found: FishEye-Images/360 (5).jpg
✅ Found: FishEye-Images/360 (6).jpg
✅ Found: FishEye-Images/360 (7).jpg
✅ Found: FishEye-Images/360 (8).jpg
✅ Found: FishEye-Images/360 (9).jpg
✅ Found: FishEye-Images/360 (10).jpg
✅ Found 10 images!
✅ Ready to generate tiles!
```

Then when you click "Generate Tiles from Images":

```
🔧 Starting tile generation...
⏳ This may take a while...
📸 Processing 1/10: FishEye-Images/360 (1).jpg
📸 Processing 2/10: FishEye-Images/360 (2).jpg
📸 Processing 3/10: FishEye-Images/360 (3).jpg
...
✅ Tiles generated successfully!
📋 Auto-creating scenes...
✅ Setup complete! You can now configure scenes.
```

## Styling

### Progress Info (Console-like)
```css
.progress-info {
    margin-top: 10px;
    padding: 10px;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 4px;
    font-size: 12px;
    min-height: 20px;
    max-height: 300px;
    overflow-y: auto;
    font-family: 'Courier New', monospace;
    color: #0f0;  /* Green terminal text */
}
```

### Images List
```css
.images-list {
    margin-top: 15px;
    padding: 10px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 4px;
    max-height: 400px;
    overflow-y: auto;
}
```

## User Experience

### Before
1. User opens setup.html
2. User manually adds scenes
3. User doesn't know what images are available
4. No feedback during processing

### After
1. User opens setup.html
2. **Automatic scan shows all available images**
3. **Real-time console-like feedback**
4. **Clear status messages with emojis**
5. **List of detected images displayed**
6. User can immediately see what's available

## Benefits

✅ **Automatic Discovery** - No manual file checking needed  
✅ **Visual Feedback** - See exactly what's happening  
✅ **Console-Like Interface** - Familiar terminal-style output  
✅ **Real-Time Updates** - Watch progress as it happens  
✅ **Error Visibility** - Clear error messages  
✅ **Professional Look** - Polished UI with emojis  

## Supported Image Patterns

The scanner checks for these naming patterns:

1. `360 (1).jpg`, `360 (2).jpg`, ... `360 (20).jpg`
2. `360_1.jpg`, `360_2.jpg`, ... `360_20.jpg`
3. `pano_1.jpg`, `pano_2.jpg`, ... `pano_20.jpg`
4. `scene_1.jpg`, `scene_2.jpg`, ... `scene_20.jpg`
5. `image_1.jpg`, `image_2.jpg`, ... `image_20.jpg`

**Total:** Up to 100 possible images checked

## Files Modified

1. **setup.html**
   - Added `scanImagesBtn` button
   - Added `scanProgress` div
   - Added `imagesList` div

2. **setup.js**
   - Added `scanImages()` method
   - Added `checkImageExists()` method
   - Added `logToUI()` method
   - Updated `init()` to auto-scan
   - Updated `generateTiles()` to use logToUI
   - Added event listener for scan button

3. **styles.css**
   - Updated `.progress-info` styling (terminal-like)
   - Added `.images-list` styling
   - Added `.images-list h3` styling

## Future Enhancements

Possible improvements:

- 📁 Support for subdirectories
- 🖼️ Image preview thumbnails
- 📊 Image size/resolution display
- 🔄 Drag-and-drop file upload
- 📝 Custom naming pattern input
- 🗑️ Delete unused images
- 📦 Batch operations

## Conclusion

The setup page now provides a **professional, console-like interface** that automatically scans for images and provides real-time feedback. This makes the setup process much more user-friendly and transparent!

