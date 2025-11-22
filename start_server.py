#!/usr/bin/env python3
"""
Simple HTTP server that automatically finds an available port
"""
import http.server
import socketserver
import socket
import webbrowser
import os
import json
import subprocess
import sys

def find_free_port(start_port=3000, max_attempts=50):
    """Find a free port starting from start_port"""
    # Try common ports: 3000-3050, 5000-5050, 9000-9050
    port_ranges = [
        range(3000, 3000 + max_attempts),
        range(5000, 5000 + max_attempts),
        range(9000, 9000 + max_attempts),
    ]

    for port_range in port_ranges:
        for port in port_range:
            try:
                # Try to bind to the port
                with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                    s.bind(('', port))
                    return port
            except OSError:
                continue
    return None

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Custom HTTP handler with tile generation endpoint"""

    def do_POST(self):
        """Handle POST requests"""
        if self.path == '/generate-tiles':
            self.handle_generate_tiles()
        else:
            self.send_error(404, "Not Found")

    def handle_generate_tiles(self):
        """Handle tile generation request"""
        try:
            # Run the tile generation script
            print("\n🚀 Starting tile generation...")

            result = subprocess.run(
                [sys.executable, 'generate_tiles.py'],
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )

            if result.returncode == 0:
                # Count generated scenes
                tiles_dir = 'tiles'
                scene_count = 0
                if os.path.exists(tiles_dir):
                    scene_count = len([d for d in os.listdir(tiles_dir)
                                     if os.path.isdir(os.path.join(tiles_dir, d))])

                print("✅ Tile generation complete!")

                response = {
                    'success': True,
                    'count': scene_count,
                    'message': 'Tiles generated successfully'
                }
            else:
                print(f"❌ Tile generation failed: {result.stderr}")
                response = {
                    'success': False,
                    'error': result.stderr or 'Unknown error'
                }

            # Send JSON response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode())

        except subprocess.TimeoutExpired:
            print("❌ Tile generation timed out")
            self.send_error(500, "Tile generation timed out")
        except Exception as e:
            print(f"❌ Error: {e}")
            self.send_error(500, str(e))

def start_server():
    """Start the HTTP server on an available port"""
    print("=" * 50)
    print("Fisheye 360° Virtual Tour")
    print("=" * 50)
    print()

    # Find an available port
    port = find_free_port(3000)

    if port is None:
        print("ERROR: Could not find an available port!")
        print("Please close some applications and try again.")
        input("Press Enter to exit...")
        return

    print(f"Starting server on port {port}...")
    print()
    print("Open your browser and navigate to:")
    print(f"  - Viewer: http://localhost:{port}/index.html")
    print(f"  - Setup:  http://localhost:{port}/setup.html")
    print()
    print("Press Ctrl+C to stop the server")
    print("=" * 50)
    print()

    # Change to script directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    try:
        with socketserver.TCPServer(("", port), CustomHTTPRequestHandler) as httpd:
            print(f"Server running at http://localhost:{port}/")
            print()

            # Optionally open browser
            try:
                webbrowser.open(f"http://localhost:{port}/setup.html")
            except:
                pass

            # Serve forever
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\nServer stopped.")
    except Exception as e:
        print(f"\nERROR: {e}")
        input("Press Enter to exit...")

if __name__ == "__main__":
    start_server()

