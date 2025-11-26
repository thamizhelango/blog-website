#!/bin/bash
# Wrapper script to run download_images.py with virtual environment

# Activate virtual environment
source venv/bin/activate

# Run the download script
python3 download_images.py

# Deactivate virtual environment
deactivate

