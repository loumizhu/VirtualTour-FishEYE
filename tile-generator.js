// Tile Generator for 360° Images
// Generates multi-resolution tiles from source images

class TileGenerator {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.tileSize = 512;
    }
    
    async generateTilesFromImages(sourceFolder, outputFolder, progressCallback) {
        try {
            // Get list of images from FishEye-Images folder
            const images = await this.getImageList(sourceFolder);
            
            const totalImages = images.length;
            let processedImages = 0;
            
            for (const imagePath of images) {
                const sceneId = this.getSceneIdFromPath(imagePath);
                await this.generateTilesForImage(imagePath, `${outputFolder}/${sceneId}`, progressCallback);
                
                processedImages++;
                if (progressCallback) {
                    progressCallback({
                        current: processedImages,
                        total: totalImages,
                        currentImage: imagePath
                    });
                }
            }
            
            return true;
        } catch (error) {
            console.error('Error generating tiles:', error);
            throw error;
        }
    }
    
    async getImageList(sourceFolder) {
        // In a real implementation, this would scan the directory
        // For now, we'll use a predefined list based on the FishEye-Images folder
        const images = [];
        for (let i = 1; i <= 10; i++) {
            images.push(`${sourceFolder}/360 (${i}).jpg`);
        }
        return images;
    }
    
    getSceneIdFromPath(imagePath) {
        const filename = imagePath.split('/').pop();
        return filename.replace(/\.[^/.]+$/, '').replace(/\s+/g, '_');
    }
    
    async generateTilesForImage(imagePath, outputPath, progressCallback) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = async () => {
                try {
                    // Convert equirectangular to cube faces
                    const cubeFaces = this.equirectangularToCubeFaces(img);
                    
                    // Generate multi-resolution tiles for each face
                    await this.generateMultiResolutionTiles(cubeFaces, outputPath);
                    
                    // Generate preview
                    await this.generatePreview(cubeFaces, outputPath);
                    
                    resolve();
                } catch (error) {
                    reject(error);
                }
            };
            
            img.onerror = () => {
                reject(new Error(`Failed to load image: ${imagePath}`));
            };
            
            img.src = imagePath;
        });
    }
    
    equirectangularToCubeFaces(img) {
        const faceSize = 1024; // Base face size
        const faces = ['f', 'r', 'b', 'l', 'u', 'd']; // front, right, back, left, up, down
        const cubeFaces = {};
        
        faces.forEach(face => {
            const canvas = document.createElement('canvas');
            canvas.width = faceSize;
            canvas.height = faceSize;
            const ctx = canvas.getContext('2d');
            
            // Convert equirectangular to cube face
            this.renderCubeFace(ctx, img, face, faceSize);
            
            cubeFaces[face] = canvas;
        });
        
        return cubeFaces;
    }
    
    renderCubeFace(ctx, img, face, size) {
        const imgWidth = img.width;
        const imgHeight = img.height;
        
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                // Convert cube face coordinates to 3D vector
                const vec = this.cubeFaceToVector(face, x, y, size);
                
                // Convert 3D vector to equirectangular coordinates
                const [u, v] = this.vectorToEquirectangular(vec);
                
                // Sample from source image
                const srcX = Math.floor(u * imgWidth);
                const srcY = Math.floor(v * imgHeight);
                
                // Get pixel from source
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = imgWidth;
                tempCanvas.height = imgHeight;
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.drawImage(img, 0, 0);
                
                const pixel = tempCtx.getImageData(srcX, srcY, 1, 1);
                ctx.putImageData(pixel, x, y);
            }
        }
    }
    
    cubeFaceToVector(face, x, y, size) {
        const s = (x + 0.5) / size * 2 - 1;
        const t = (y + 0.5) / size * 2 - 1;
        
        let vec = [0, 0, 0];
        
        switch (face) {
            case 'f': vec = [s, -t, 1]; break;
            case 'r': vec = [1, -t, -s]; break;
            case 'b': vec = [-s, -t, -1]; break;
            case 'l': vec = [-1, -t, s]; break;
            case 'u': vec = [s, 1, t]; break;
            case 'd': vec = [s, -1, -t]; break;
        }
        
        // Normalize
        const len = Math.sqrt(vec[0] * vec[0] + vec[1] * vec[1] + vec[2] * vec[2]);
        return [vec[0] / len, vec[1] / len, vec[2] / len];
    }
    
    vectorToEquirectangular(vec) {
        const [x, y, z] = vec;
        const u = 0.5 + Math.atan2(x, z) / (2 * Math.PI);
        const v = 0.5 - Math.asin(y) / Math.PI;
        return [u, v];
    }
    
    async generateMultiResolutionTiles(cubeFaces, outputPath) {
        const levels = [
            { size: 256, tileSize: 256 },
            { size: 512, tileSize: 512 },
            { size: 1024, tileSize: 512 },
            { size: 2048, tileSize: 512 }
        ];
        
        for (let z = 0; z < levels.length; z++) {
            const level = levels[z];
            
            for (const [faceName, faceCanvas] of Object.entries(cubeFaces)) {
                // Resize face to level size
                const resizedFace = this.resizeCanvas(faceCanvas, level.size, level.size);
                
                // Split into tiles
                const tiles = this.splitIntoTiles(resizedFace, level.tileSize);
                
                // Save tiles (in browser, we'll store in IndexedDB or return as blobs)
                for (let y = 0; y < tiles.length; y++) {
                    for (let x = 0; x < tiles[y].length; x++) {
                        const tilePath = `${outputPath}/${z}/${faceName}/${y}/${x}.jpg`;
                        // Store tile data
                        this.storeTile(tilePath, tiles[y][x]);
                    }
                }
            }
        }
    }
    
    resizeCanvas(sourceCanvas, width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(sourceCanvas, 0, 0, width, height);
        return canvas;
    }
    
    splitIntoTiles(canvas, tileSize) {
        const tiles = [];
        const numTilesX = Math.ceil(canvas.width / tileSize);
        const numTilesY = Math.ceil(canvas.height / tileSize);
        
        for (let y = 0; y < numTilesY; y++) {
            tiles[y] = [];
            for (let x = 0; x < numTilesX; x++) {
                const tileCanvas = document.createElement('canvas');
                tileCanvas.width = tileSize;
                tileCanvas.height = tileSize;
                const ctx = tileCanvas.getContext('2d');
                
                ctx.drawImage(
                    canvas,
                    x * tileSize, y * tileSize, tileSize, tileSize,
                    0, 0, tileSize, tileSize
                );
                
                tiles[y][x] = tileCanvas;
            }
        }
        
        return tiles;
    }
    
    async generatePreview(cubeFaces, outputPath) {
        // Generate a small preview image (cube map)
        const previewSize = 256;
        const canvas = document.createElement('canvas');
        canvas.width = previewSize * 4;
        canvas.height = previewSize * 3;
        const ctx = canvas.getContext('2d');
        
        // Layout: standard cube map cross
        //     [u]
        // [l] [f] [r] [b]
        //     [d]
        
        const layout = {
            'u': [1, 0],
            'l': [0, 1],
            'f': [1, 1],
            'r': [2, 1],
            'b': [3, 1],
            'd': [1, 2]
        };
        
        for (const [face, [x, y]] of Object.entries(layout)) {
            const faceCanvas = cubeFaces[face];
            const resized = this.resizeCanvas(faceCanvas, previewSize, previewSize);
            ctx.drawImage(resized, x * previewSize, y * previewSize);
        }
        
        this.storeTile(`${outputPath}/preview.jpg`, canvas);
    }
    
    storeTile(path, canvas) {
        // Convert canvas to blob and store
        // In a real implementation, this would save to a server or IndexedDB
        canvas.toBlob(blob => {
            // Store blob with path as key
            console.log(`Storing tile: ${path}`);
            // This is a placeholder - actual implementation would use IndexedDB or server upload
        }, 'image/jpeg', 0.9);
    }
}

