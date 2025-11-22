#!/bin/bash

echo "========================================"
echo "Fisheye 360 Virtual Tour"
echo "========================================"
echo ""
echo "Starting local web server..."
echo ""
echo "Open your browser and navigate to:"
echo "  - Viewer: http://localhost:8000/index.html"
echo "  - Setup:  http://localhost:8000/setup.html"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""
echo "========================================"
echo ""

python3 -m http.server 8000

