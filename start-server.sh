#!/bin/bash

# Ducky Race - Local Server Launcher
# This script starts a simple web server to run the Ducky Race app

echo "🦆 Starting Ducky Race Server..."
echo ""

# Check for Python 3
if command -v python3 &> /dev/null; then
    echo "✅ Using Python 3"
    echo "🌐 Open your browser to: http://localhost:8000"
    echo "⏹️  Press Ctrl+C to stop the server"
    echo ""
    python3 -m http.server 8000

# Check for Python 2
elif command -v python &> /dev/null; then
    echo "✅ Using Python 2"
    echo "🌐 Open your browser to: http://localhost:8000"
    echo "⏹️  Press Ctrl+C to stop the server"
    echo ""
    python -m SimpleHTTPServer 8000

# Check for PHP
elif command -v php &> /dev/null; then
    echo "✅ Using PHP"
    echo "🌐 Open your browser to: http://localhost:8000"
    echo "⏹️  Press Ctrl+C to stop the server"
    echo ""
    php -S localhost:8000

# Check for Node.js http-server
elif command -v http-server &> /dev/null; then
    echo "✅ Using Node.js http-server"
    echo "🌐 Open your browser to: http://localhost:8000"
    echo "⏹️  Press Ctrl+C to stop the server"
    echo ""
    http-server -p 8000

else
    echo "❌ No suitable server found!"
    echo ""
    echo "Please install one of the following:"
    echo "  - Python (recommended): https://www.python.org/downloads/"
    echo "  - Node.js http-server: npm install -g http-server"
    echo "  - PHP: https://www.php.net/downloads"
    echo ""
    echo "Or use VS Code/Cursor with the 'Live Server' extension"
    exit 1
fi

