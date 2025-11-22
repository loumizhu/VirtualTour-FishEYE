#!/usr/bin/env python3
"""
Tile Generator for 360° Images
Converts equirectangular images to multi-resolution cube map tiles
Requires: Pillow (PIL), numpy
Install: pip install Pillow numpy
"""

import os
import sys
import math
from pathlib import Path
from PIL import Image
import numpy as np


class TileGenerator:
    def __init__(self, tile_size=512):
        self.tile_size = tile_size
        self.face_names = ['f', 'r', 'b', 'l', 'u', 'd']
        
    def generate_tiles_from_folder(self, source_folder, output_folder):
        """Generate tiles for all images in source folder"""
        source_path = Path(source_folder)
        output_path = Path(output_folder)
        output_path.mkdir(exist_ok=True)
        
        # Get all image files
        image_files = list(source_path.glob('*.jpg')) + list(source_path.glob('*.png'))
        
        print(f"Found {len(image_files)} images to process")
        
        for idx, image_file in enumerate(image_files, 1):
            print(f"\nProcessing {idx}/{len(image_files)}: {image_file.name}")
            
            # Create scene ID from filename
            scene_id = image_file.stem.replace(' ', '_')
            scene_output = output_path / scene_id
            
            self.generate_tiles_for_image(str(image_file), str(scene_output))
            
        print("\n[OK] All tiles generated successfully!")
    
    def generate_tiles_for_image(self, image_path, output_path):
        """Generate multi-resolution tiles for a single image"""
        output_dir = Path(output_path)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Load equirectangular image
        print(f"  Loading image...")
        img = Image.open(image_path)
        img_array = np.array(img)
        
        # Convert to cube faces
        print(f"  Converting to cube faces...")
        cube_faces = self.equirectangular_to_cube_faces(img_array)
        
        # Generate multi-resolution levels
        levels = [
            {'size': 256, 'tile_size': 256, 'level': 0},
            {'size': 512, 'tile_size': 512, 'level': 1},
            {'size': 1024, 'tile_size': 512, 'level': 2},
            {'size': 2048, 'tile_size': 512, 'level': 3}
        ]
        
        for level_info in levels:
            print(f"  Generating level {level_info['level']} ({level_info['size']}x{level_info['size']})...")
            self.generate_level_tiles(cube_faces, output_dir, level_info)
        
        # Generate preview
        print(f"  Generating preview...")
        self.generate_preview(cube_faces, output_dir)
        
        print(f"  [OK] Done!")
    
    def equirectangular_to_cube_faces(self, img_array, face_size=2048):
        """Convert equirectangular image to 6 cube faces"""
        height, width = img_array.shape[:2]
        cube_faces = {}
        
        for face_name in self.face_names:
            print(f"    Processing face: {face_name}")
            face = np.zeros((face_size, face_size, 3), dtype=np.uint8)
            
            for y in range(face_size):
                for x in range(face_size):
                    # Convert cube face coordinates to 3D vector
                    vec = self.cube_face_to_vector(face_name, x, y, face_size)
                    
                    # Convert 3D vector to equirectangular coordinates
                    u, v = self.vector_to_equirectangular(vec)
                    
                    # Sample from source image
                    src_x = int(u * (width - 1))
                    src_y = int(v * (height - 1))
                    
                    face[y, x] = img_array[src_y, src_x]
            
            cube_faces[face_name] = Image.fromarray(face)
        
        return cube_faces
    
    def cube_face_to_vector(self, face, x, y, size):
        """
        Convert cube face coordinates to 3D unit vector
        Coordinate system matches Three.js BoxGeometry:
        - r: Right face (+X)
        - l: Left face (-X)
        - u: Up/Top face (+Y)
        - d: Down/Bottom face (-Y)
        - f: Front face (+Z)
        - b: Back face (-Z)
        """
        # Normalize coordinates to [-1, 1] range
        s = (x + 0.5) / size * 2 - 1
        t = (y + 0.5) / size * 2 - 1

        # Map to 3D vectors (matching Three.js coordinate system)
        if face == 'r':  # Right (+X)
            vec = [1, -t, -s]
        elif face == 'l':  # Left (-X)
            vec = [-1, -t, s]
        elif face == 'u':  # Up (+Y)
            vec = [s, 1, t]
        elif face == 'd':  # Down (-Y)
            vec = [s, -1, -t]
        elif face == 'f':  # Front (+Z)
            vec = [s, -t, 1]
        elif face == 'b':  # Back (-Z)
            vec = [-s, -t, -1]
        else:
            vec = [0, 0, 1]

        # Normalize to unit vector
        length = math.sqrt(vec[0]**2 + vec[1]**2 + vec[2]**2)
        return [vec[0]/length, vec[1]/length, vec[2]/length]
    
    def vector_to_equirectangular(self, vec):
        """Convert 3D vector to equirectangular UV coordinates"""
        x, y, z = vec
        u = 0.5 + math.atan2(x, z) / (2 * math.pi)
        v = 0.5 - math.asin(y) / math.pi
        return u, v
    
    def generate_level_tiles(self, cube_faces, output_dir, level_info):
        """Generate tiles for a specific resolution level"""
        level = level_info['level']
        size = level_info['size']
        tile_size = level_info['tile_size']
        
        for face_name, face_img in cube_faces.items():
            # Resize face to level size
            resized_face = face_img.resize((size, size), Image.LANCZOS)
            
            # Calculate number of tiles
            num_tiles = max(1, size // tile_size)
            
            # Split into tiles
            for tile_y in range(num_tiles):
                for tile_x in range(num_tiles):
                    # Extract tile
                    left = tile_x * tile_size
                    top = tile_y * tile_size
                    right = min(left + tile_size, size)
                    bottom = min(top + tile_size, size)
                    
                    tile = resized_face.crop((left, top, right, bottom))
                    
                    # Ensure tile is exactly tile_size (pad if necessary)
                    if tile.size != (tile_size, tile_size):
                        padded = Image.new('RGB', (tile_size, tile_size), (0, 0, 0))
                        padded.paste(tile, (0, 0))
                        tile = padded
                    
                    # Save tile
                    tile_path = output_dir / str(level) / face_name / str(tile_y)
                    tile_path.mkdir(parents=True, exist_ok=True)
                    tile.save(tile_path / f"{tile_x}.jpg", quality=90, optimize=True)
    
    def generate_preview(self, cube_faces, output_dir):
        """Generate cube map preview image"""
        preview_size = 256
        
        # Create preview canvas (cube map cross layout)
        canvas = Image.new('RGB', (preview_size * 4, preview_size * 3), (0, 0, 0))
        
        # Layout positions
        layout = {
            'u': (1, 0),
            'l': (0, 1),
            'f': (1, 1),
            'r': (2, 1),
            'b': (3, 1),
            'd': (1, 2)
        }
        
        for face_name, (x, y) in layout.items():
            face_img = cube_faces[face_name].resize((preview_size, preview_size), Image.LANCZOS)
            canvas.paste(face_img, (x * preview_size, y * preview_size))
        
        canvas.save(output_dir / "preview.jpg", quality=85, optimize=True)


def main():
    if len(sys.argv) > 1:
        source_folder = sys.argv[1]
    else:
        source_folder = "FishEye-Images"
    
    if len(sys.argv) > 2:
        output_folder = sys.argv[2]
    else:
        output_folder = "tiles"
    
    print("=" * 60)
    print("360° Image Tile Generator")
    print("=" * 60)
    print(f"Source folder: {source_folder}")
    print(f"Output folder: {output_folder}")
    print()
    
    if not os.path.exists(source_folder):
        print(f"Error: Source folder '{source_folder}' not found!")
        sys.exit(1)
    
    generator = TileGenerator()
    generator.generate_tiles_from_folder(source_folder, output_folder)
    
    print("\n" + "=" * 60)
    print("Tile generation complete!")
    print("You can now use setup.html to configure your virtual tour.")
    print("=" * 60)


if __name__ == "__main__":
    main()

