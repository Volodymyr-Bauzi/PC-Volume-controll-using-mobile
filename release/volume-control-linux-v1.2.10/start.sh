#!/bin/bash
echo "Starting Volume Control App..."

# Check if native addon is built
if [ ! -f "./addon.node" ]; then
    echo "Native addon not found. Building it now..."
    echo "This will require Node.js and build tools to be installed."
    echo "The installation will be guided if they are missing."
    ./build.sh
    if [ $? -ne 0 ]; then
        echo "Failed to build native addon. Please check the error messages above."
        exit 1
    fi
fi

# Get local IP address
export HOST=$(ip route get 1 | awk '{print $7;exit}')
if [ -z "$HOST" ]; then
    # Fallback method
    export HOST=$(hostname -I | awk '{print $1}')
fi
export PORT=8000

# Make the executable runnable
chmod +x ./volume-control

# Start the server with the addon in the current directory
LD_LIBRARY_PATH=".:$LD_LIBRARY_PATH" ./volume-control &
sleep 2

echo
echo "App is running! You can now access it from your mobile device at:"
echo "http://$HOST:$PORT"
echo
echo "Press Ctrl+C to stop the server when done"
read -p "Press Enter to exit..."