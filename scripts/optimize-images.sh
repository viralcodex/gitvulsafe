#!/bin/bash

# SVG Optimization Script
echo "Optimizing SVG files..."

# Create optimized versions of SVGs
npx svgo -f public -o public --quiet

echo "SVG optimization complete!"