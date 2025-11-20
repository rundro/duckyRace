# 🦆 Ducky Race - Video & GIF Exporter

A fun and interactive duck racing web application that lets you create exciting races and export them as shareable MP4 videos!

## ⚠️ Important: How to Run

**The app requires a local web server.** Simply opening `index.html` won't work due to browser security restrictions. All FFmpeg files (libraries and core) are included locally - no internet connection required!

### Quick Start (Choose One):

#### Option 1: Python (Easiest - works on Mac/Linux/Windows)

```bash
# If you have Python 3:
python3 -m http.server 8000

# If you have Python 2:
python -m SimpleHTTPServer 8000
```

Then open: http://localhost:8000

#### Option 2: Node.js

```bash
# Install http-server globally (one-time)
npm install -g http-server

# Run server
http-server -p 8000
```

Then open: http://localhost:8000

#### Option 3: PHP

```bash
php -S localhost:8000
```

Then open: http://localhost:8000

#### Option 4: VS Code / Cursor

- Install "Live Server" extension
- Right-click on `index.html`
- Select "Open with Live Server"

## Features

- **Customizable Races**: Add 2-20 ducks with custom names
- **Dynamic Racing**: Ducks speed up and slow down unpredictably throughout the race
- **Adjustable Duration**: Set race duration from 10 seconds to 5 minutes
- **Beautiful Animation**: Watch ducks race through animated water with waves
- **Powered by FFmpeg.wasm**: High-quality video encoding in the browser - 100% local, no internet required!

## How to Use

1. **Start the local server** (see above)
2. **Configure Ducks**:
   - Choose number of ducks (2-10)
   - Click "Generate Ducks"
   - Customize duck names
3. **Set Duration**: Choose race duration in seconds
4. **Start Race**: Click "Start Race" button
5. **Export**: After the race finishes, click "Convert" to download

## Key Features Explained

### Variable Duck Speeds

Each duck has:

- A base speed that determines their overall pace
- Speed variations that change every 0.5-2 seconds
- The ability to surge ahead or fall behind unpredictably
- This makes races exciting - the leader can change throughout!

### Video/GIF Export

- Captures the race at 30 frames per second
- Choose between GIF, MP4, or WebM formats
- High-quality encoding using FFmpeg.wasm
- Automatically downloads when ready
- Perfect for sharing on social media or with friends

## Technical Details

- Built with vanilla JavaScript (no framework needed!)
- Uses HTML5 Canvas for smooth animations
- Utilizes [FFmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm) for video/GIF encoding
- All FFmpeg files included locally (libraries + 31MB WASM core) - works completely offline
- Responsive design with modern CSS

## Browser Compatibility

Works best in modern browsers:

- Chrome/Edge (recommended)
- Firefox
- Safari

## Troubleshooting

**"FFmpeg is not defined" or "FFmpeg not loading" error?**

- Make sure you're running a local web server (not opening file:// directly)
- Verify all files exist in the `ffmpeg-core/` directory:
  - `ffmpeg.js` - Main FFmpeg wrapper (4KB)
  - `ffmpeg-util.js` - Utilities (3KB)
  - `814.ffmpeg.js` - Worker chunk (3KB)
  - `ffmpeg-core.js` - Core wrapper (112KB)
  - `ffmpeg-core.wasm` - FFmpeg binary (31MB)
- Clear browser cache and reload the page
- Check browser console for any loading errors

**Export not working?**

- Wait for FFmpeg to fully load (check status message)
- Make sure you ran the race completely before exporting
- Check browser console (F12) for error messages
- Try a different export format (GIF, MP4, or WebM)

**Race not smooth?**

- Close other browser tabs
- Try a shorter race duration
- Reduce number of ducks

**Export taking too long?**

- Longer races take more time to encode
- GIF export is typically slower than MP4/WebM
- Be patient - encoding happens entirely in your browser!
