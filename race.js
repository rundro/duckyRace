// Duck Race Application
class DuckRace {
  constructor() {
    this.canvas = document.getElementById("raceCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.ducks = [];
    this.duckColors = []; // Store duck colors to keep them consistent
    this.raceActive = false;
    this.raceFinished = false;
    this.raceDuration = 10;
    this.startTime = null;
    this.animationFrameId = null;
    this.continuousAnimationId = null; // For continuous animation loop
    this.finishedDucks = [];
    this.capturedFrames = [];
    this.ffmpeg = null;
    this.ffmpegLoaded = false;
    this.exportBlob = null;
    this.exportBlobURL = null;
    this.lastFrameTime = null;
    this.lastPositionUpdateTime = null;
    this.quackAudio = null;
    this.quackTimestamps = []; // Track when quacks occur for export
    this.lastQuackTime = 0;
    this.quackInterval = null;
    this.quackMuted = false; // Mute state for quacks
    this.currentFinishLineX = this.canvas.width - 50; // Default finish line position
    this.bubbles = []; // Array to store bubble objects

    // Canvas dimensions
    this.canvas.width = 1000;
    this.canvas.height = 700; // Increased to accommodate more ducks with labels

    // Reserve top 25% for scenery (sky, trees, grass, dirt)
    this.sceneryHeight = this.canvas.height * 0.25;
    this.waterTop = this.sceneryHeight;

    this.trackStart = 50;
    this.trackEnd = this.canvas.width - 50;
    this.trackLength = this.trackEnd - this.trackStart;

    // Scenery elements for parallax effect
    this.trees = [];
    this.grassPatches = [];
    this.initializeScenery();

    this.initializeEventListeners();
    this.generateDefaultDucks();
    this.initializeBubbles(); // Pre-populate bubbles for initial draw
    this.loadFFmpeg();
    this.loadQuackAudio();

    // Start continuous animation loop for water, bubbles, and duck bobbing
    this.startContinuousAnimation();

    console.log("DuckRace initialized");
  }

  initializeEventListeners() {
    document.getElementById("startRace").addEventListener("click", (e) => {
      e.preventDefault(); // Prevent any default scrolling behavior
      this.startRace();
    });

    document.getElementById("exportRace").addEventListener("click", () => {
      this.exportRace();
    });

    document.getElementById("downloadRace").addEventListener("click", () => {
      this.downloadFile();
    });

    document.getElementById("resetRace").addEventListener("click", () => {
      this.resetRace();
    });

    document.getElementById("muteQuacks").addEventListener("click", () => {
      this.toggleMute();
    });

    // Auto-generate ducks when number changes
    const numDucksInput = document.getElementById("numDucks");
    numDucksInput.addEventListener("change", () => {
      let value = parseInt(numDucksInput.value);
      if (isNaN(value) || value < 2) {
        numDucksInput.value = 2;
        this.showStatus("Minimum 2 ducks required!", "info");
      } else if (value > 20) {
        numDucksInput.value = 20;
        this.showStatus("Maximum 20 ducks allowed!", "info");
      }
      // Auto-generate ducks with the validated value
      this.generateDefaultDucks();
    });

    // Validate race duration input in real-time
    const raceDurationInput = document.getElementById("raceDuration");
    raceDurationInput.addEventListener("change", () => {
      let value = parseInt(raceDurationInput.value);
      if (isNaN(value) || value < 10) {
        raceDurationInput.value = 10;
        this.showStatus("Minimum 10 seconds required!", "info");
      } else if (value > 300) {
        raceDurationInput.value = 300;
        this.showStatus("Maximum 5 minutes (300 seconds) allowed!", "info");
      }
    });

    // Toggle duck names dropdown
    const toggleBtn = document.getElementById("toggleDuckNames");
    const duckNamesDiv = document.getElementById("duckNames");
    const toggleIcon = document.getElementById("toggleIcon");
    toggleBtn.addEventListener("click", () => {
      const isCollapsed = duckNamesDiv.classList.contains("collapsed");
      if (isCollapsed) {
        duckNamesDiv.classList.remove("collapsed");
        toggleIcon.textContent = "▼";
      } else {
        duckNamesDiv.classList.add("collapsed");
        toggleIcon.textContent = "▶";
      }
    });
  }

  generateDefaultDucks() {
    let numDucks = parseInt(document.getElementById("numDucks").value) || 2;

    // Validate and enforce limits
    if (numDucks < 2) {
      numDucks = 2;
      document.getElementById("numDucks").value = 2;
      this.showStatus("Minimum 2 ducks required!", "info");
    } else if (numDucks > 20) {
      numDucks = 20;
      document.getElementById("numDucks").value = 20;
      this.showStatus("Maximum 20 ducks allowed!", "info");
    }

    const defaultNames = [
      "Speedy",
      "Quackers",
      "Waddles",
      "Flash",
      "Bubbles",
      "Splash",
      "Turbo",
      "Ducky",
      "Rocket",
      "Zoom",
      "Thunder",
      "Bolt",
      "Zippy",
      "Swoosh",
      "Jet",
      "Dash",
      "Blaze",
      "Storm",
      "Comet",
      "Nitro",
    ];

    // Generate unique colors for each duck and store them
    this.duckColors = this.getUniqueColors(numDucks);

    const duckNamesContainer = document.getElementById("duckNames");
    duckNamesContainer.innerHTML = "";

    for (let i = 0; i < numDucks; i++) {
      const duckInput = document.createElement("div");
      duckInput.className = "duck-input";
      // Create colored duck SVG instead of emoji
      duckInput.innerHTML = `
                <svg width="32" height="32" viewBox="0 0 32 32" style="display: inline-block; vertical-align: middle;">
                    <!-- Body -->
                    <circle cx="12" cy="16" r="8" fill="${
                      this.duckColors[i]
                    }" stroke="#FFA500" stroke-width="1.5"/>
                    <!-- Head -->
                    <circle cx="20" cy="11" r="5" fill="${
                      this.duckColors[i]
                    }" stroke="#FFA500" stroke-width="1.5"/>
                    <!-- Beak -->
                    <path d="M 24 11 L 30 11 L 27 14 Z" fill="#FFA500"/>
                    <!-- Eye -->
                    <circle cx="22" cy="10" r="1.5" fill="#000"/>
                </svg>
                <input type="text" id="duck${i}" placeholder="Duck ${
        i + 1
      }" value="${defaultNames[i] || "Duck " + (i + 1)}">
            `;
      duckNamesContainer.appendChild(duckInput);

      // Add event listener to update duck name when input changes
      const inputElement = duckInput.querySelector(`#duck${i}`);
      if (inputElement) {
        inputElement.addEventListener("input", (e) => {
          // Update the duck's name if it exists (for live updates during race)
          if (this.ducks[i]) {
            this.ducks[i].name = e.target.value || `Duck ${i + 1}`;
          }
        });
        // Also listen for blur to ensure name is saved even if race hasn't started
        inputElement.addEventListener("blur", (e) => {
          // Update the duck's name if it exists
          if (this.ducks[i]) {
            this.ducks[i].name = e.target.value || `Duck ${i + 1}`;
          }
        });
      }
    }

    // Clear any existing race state
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.raceActive = false;
    this.raceFinished = false;
    this.finishedDucks = [];

    const resultsDiv = document.getElementById("results");
    resultsDiv.innerHTML = "";
    resultsDiv.classList.remove("show");

    document.getElementById("startRace").disabled = false;
    document.getElementById("exportRace").disabled = true;
    document.getElementById("downloadRace").disabled = true;

    // Initialize ducks at start line
    this.initializeDucksAtStart();
  }

  initializeDucksAtStart() {
    // Create ducks at the start line (position 0) so they're visible before race starts
    this.ducks = [];
    const numDucks = parseInt(document.getElementById("numDucks").value) || 2;
    // Leave 100px at bottom for duck name labels
    const waterHeight = this.canvas.height - this.waterTop - 100;
    const laneHeight = waterHeight / numDucks;

    this.raceDuration =
      parseInt(document.getElementById("raceDuration").value) || 10;
    // Calculate target speed: position goes from 0 to 1, finish in raceDuration seconds
    // Account for speed variations (0.2x to 2x) - slower base speed for more excitement
    // Increased multiplier to 1.8 so ducks don't finish too early
    const targetSpeed = 1.0 / (this.raceDuration * 1.8);

    // Use stored colors (or generate if not available)
    if (!this.duckColors || this.duckColors.length !== numDucks) {
      this.duckColors = this.getUniqueColors(numDucks);
    }

    for (let i = 0; i < numDucks; i++) {
      const nameInput = document.getElementById(`duck${i}`);
      const name = nameInput
        ? nameInput.value || `Duck ${i + 1}`
        : `Duck ${i + 1}`;

      const speedMultiplier = 0.7 + Math.random() * 0.6;

      this.ducks.push({
        id: i,
        name: name,
        position: 0, // At start line
        y: this.waterTop + 50 + i * laneHeight + laneHeight / 2,
        baseSpeed: targetSpeed * speedMultiplier,
        currentSpeed: targetSpeed * speedMultiplier,
        speedState: "normal",
        stateTimer: 0,
        stateDuration: 0,
        finished: false,
        finishTime: null,
        color: this.duckColors[i], // Use stored color
        lastStateChangeTime: 0, // Time when current speed state started
        positionAtStateChange: 0, // Position when current speed state started
        bobPhase: Math.random() * Math.PI * 2, // Random phase for bobbing animation
      });
    }

    // Draw the initial state
    this.draw();
  }

  initializeScenery() {
    // Ground level where trees sit
    this.groundLevel = this.sceneryHeight * 0.65;

    // Create trees at random positions - they'll sit on the ground
    this.trees = [];
    for (let i = 0; i < 10; i++) {
      const size = 35 + Math.random() * 40;
      this.trees.push({
        x: Math.random() * this.canvas.width,
        size: size,
        offset: Math.random() * 1000, // For parallax
      });
    }

    // Create grass patches on the grass layer with fixed heights
    this.grassPatches = [];
    for (let i = 0; i < 20; i++) {
      const blades = [];
      for (let j = 0; j < 4; j++) {
        blades.push({
          xOffset: j * 6,
          height: 12 + Math.random() * 8,
        });
      }
      this.grassPatches.push({
        x: Math.random() * this.canvas.width,
        offset: Math.random() * 1000,
        blades: blades,
      });
    }
  }

  initializeDucks() {
    this.ducks = [];
    const numDucks = parseInt(document.getElementById("numDucks").value) || 2;
    // Leave 100px at bottom for duck name labels
    const waterHeight = this.canvas.height - this.waterTop - 100;
    const laneHeight = waterHeight / numDucks;

    // Base speed to finish in approximately raceDuration
    // Account for speed variations (0.2x to 3x) - average around 1.2x
    const targetSpeed = 1.0 / (this.raceDuration * 1.2);

    // Use stored colors (or generate if not available)
    if (!this.duckColors || this.duckColors.length !== numDucks) {
      this.duckColors = this.getUniqueColors(numDucks);
    }

    for (let i = 0; i < numDucks; i++) {
      const nameInput = document.getElementById(`duck${i}`);
      const name = nameInput
        ? nameInput.value || `Duck ${i + 1}`
        : `Duck ${i + 1}`;

      // Each duck gets a random base speed for variety
      const speedMultiplier = 0.7 + Math.random() * 0.6; // 0.7 to 1.3

      this.ducks.push({
        id: i,
        name: name,
        position: 0,
        y: this.waterTop + 50 + i * laneHeight + laneHeight / 2,
        baseSpeed: targetSpeed * speedMultiplier,
        currentSpeed: targetSpeed * speedMultiplier,
        speedState: "normal", // normal, surge, crawl
        stateTimer: 0,
        stateDuration: 0,
        finished: false,
        finishTime: null,
        color: this.duckColors[i], // Use stored color
        lastStateChangeTime: 0, // Time when current speed state started
        positionAtStateChange: 0, // Position when current speed state started
        bobPhase: Math.random() * Math.PI * 2, // Random phase for bobbing animation
      });
    }
  }

  getUniqueColors(count) {
    // Generate evenly spaced colors around the color wheel for maximum distinction
    const colors = [];
    const hueStep = 360 / count; // Divide color wheel evenly by number of ducks

    // Use a fixed starting hue for consistent color palette in GIF
    // This prevents color strobing/flickering in the exported GIF
    const startHue = 0; // Start at red and distribute evenly around the wheel

    for (let i = 0; i < count; i++) {
      const hue = (startHue + i * hueStep) % 360;
      // Use consistent saturation and lightness for more distinct colors
      // High saturation (80%) for vibrant colors
      // Medium lightness (60%) for good visibility on blue background
      const saturation = 80;
      const lightness = 60;
      colors.push(this.hslToHex(hue, saturation, lightness));
    }

    return colors;
  }

  hslToHex(h, s, l) {
    l /= 100;
    const a = (s * Math.min(l, 1 - l)) / 100;
    const f = (n) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color)
        .toString(16)
        .padStart(2, "0");
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  }

  startRace() {
    if (this.raceActive) return;

    let raceDuration =
      parseInt(document.getElementById("raceDuration").value) || 10;

    // Validate and enforce limits
    if (raceDuration < 10) {
      raceDuration = 10;
      document.getElementById("raceDuration").value = 10;
      this.showStatus("Minimum 10 seconds required!", "info");
      return;
    } else if (raceDuration > 300) {
      raceDuration = 300;
      document.getElementById("raceDuration").value = 300;
      this.showStatus("Maximum 5 minutes (300 seconds) allowed!", "info");
      return;
    }

    this.raceDuration = raceDuration;
    // Hide export preview when starting new race
    const preview = document.querySelector(".export-preview-inline");
    if (preview) {
      preview.classList.remove("show");
    }
    const mediaContainer = document.getElementById("exportMedia");
    if (mediaContainer) {
      mediaContainer.innerHTML = "";
    }
    if (this.exportBlobURL) {
      URL.revokeObjectURL(this.exportBlobURL);
      this.exportBlobURL = null;
    }
    this.exportBlob = null;
    document.getElementById("downloadRace").disabled = true;

    this.initializeDucks();
    // Don't set raceActive or startTime yet - wait until countdown finishes
    this.raceActive = false;
    this.raceFinished = false;
    this.finishedDucks = [];
    this.frameCount = 0;

    document.getElementById("startRace").disabled = true;
    document.getElementById("exportRace").disabled = true;
    document.getElementById("downloadRace").disabled = true;

    this.capturedFrames = [];

    const resultsDiv = document.getElementById("results");
    resultsDiv.innerHTML = "";
    resultsDiv.classList.remove("show");

    // Show countdown, then start race
    this.showCountdown();
  }

  loadQuackAudio() {
    // Load quack sound effect
    this.quackAudio = new Audio("./media/quack.mp3");
    this.quackAudio.volume = 0.5; // Set volume to 50%
    this.quackAudio.preload = "auto";

    this.quackAudio.addEventListener("error", (e) => {
      console.error("Error loading quack audio:", e);
    });

    this.quackAudio.addEventListener("loadeddata", () => {
      console.log("Quack audio loaded");
    });
  }

  playQuack() {
    if (!this.quackAudio || this.quackMuted) return;

    // Record timestamp for export (relative to race start)
    if (this.raceActive && this.startTime) {
      const elapsed = (Date.now() - this.startTime) / 1000;
      this.quackTimestamps.push(elapsed);
    }

    // Play the quack sound
    const audio = this.quackAudio.cloneNode(); // Clone to allow overlapping quacks
    audio.volume = 0.5;
    audio.play().catch((err) => {
      console.error("Error playing quack:", err);
    });
  }

  startQuackInterval() {
    // Clear any existing interval
    if (this.quackInterval) {
      clearInterval(this.quackInterval);
    }

    // Play quacks randomly every 2-5 seconds
    const scheduleNextQuack = () => {
      const delay = 2000 + Math.random() * 3000; // 2-5 seconds
      this.quackInterval = setTimeout(() => {
        if (this.raceActive) {
          this.playQuack();
          scheduleNextQuack(); // Schedule next quack
        }
      }, delay);
    };

    scheduleNextQuack();
  }

  stopQuackInterval() {
    if (this.quackInterval) {
      clearTimeout(this.quackInterval);
      this.quackInterval = null;
    }
  }

  toggleMute() {
    this.quackMuted = !this.quackMuted;
    const muteButton = document.getElementById("muteQuacks");
    muteButton.textContent = this.quackMuted ? "Audio Off" : "Audio On";
  }

  updateStopwatch(elapsed) {
    const stopwatchEl = document.getElementById("stopwatch");
    if (!stopwatchEl) return;

    const minutes = Math.floor(elapsed / 60);
    const seconds = Math.floor(elapsed % 60);
    const centiseconds = Math.floor((elapsed % 1) * 100);

    const formatted = `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}.${centiseconds.toString().padStart(2, "0")}`;
    stopwatchEl.textContent = formatted;
  }

  async loadFFmpeg() {
    try {
      console.log("Initializing FFmpeg");

      // Wait for FFmpeg libraries to be available (they load from CDN)
      let attempts = 0;
      const maxAttempts = 50; // Wait up to 5 seconds
      while (
        typeof FFmpegWASM === "undefined" ||
        typeof FFmpegUtil === "undefined"
      ) {
        if (attempts >= maxAttempts) {
          throw new Error("FFmpeg library not loaded after waiting");
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
        attempts++;
      }

      // Use the global FFmpegWASM from the CDN script
      const { FFmpeg } = FFmpegWASM;
      const { fetchFile } = FFmpegUtil;

      // Initialize FFmpeg instance
      this.ffmpeg = new FFmpeg();

      // Set up logging
      this.ffmpeg.on("log", ({ message }) => {
        //console.log("FFmpeg:", message);
      });

      // Set up progress tracking
      this.ffmpeg.on("progress", ({ progress }) => {
        if (progress >= 0 && progress <= 1) {
          const percent = Math.round(progress * 100);
          //console.log(`FFmpeg progress: ${percent}%`);
          // Update status with progress - encoding is 30-100% of total
          if (this.isExporting) {
            const totalPercent = Math.round(30 + progress * 70); // 30% base + 70% for encoding
            this.showStatus(`Processing: ${totalPercent}%`, "info", true);
          }
        }
      });

      // Use local files in the ffmpeg-core directory
      await this.ffmpeg.load({
        coreURL: "ffmpeg-core",
        wasmURL: "ffmpeg-core",
      });

      // Store fetchFile utility for later use
      this.fetchFile = fetchFile;

      this.ffmpegLoaded = true;
      console.log("✅ FFmpeg loaded");
    } catch (error) {
      console.error("Failed to load FFmpeg:", error);
      this.showStatus("⚠️ FFmpeg failed to load - Export disabled", "info");
    }
  }

  captureFrame() {
    // Capture current canvas as image data at reduced resolution for faster export
    // Scale to 800px width (maintaining aspect ratio) to reduce file processing time
    if (!this.captureCanvas) {
      const scale = 800 / this.canvas.width;
      this.captureCanvas = document.createElement("canvas");
      this.captureCanvas.width = 800;
      this.captureCanvas.height = Math.floor(this.canvas.height * scale);
      this.captureCtx = this.captureCanvas.getContext("2d", {
        willReadFrequently: true,
      });
    }

    // Draw scaled version of main canvas
    this.captureCtx.drawImage(
      this.canvas,
      0,
      0,
      this.canvas.width,
      this.canvas.height,
      0,
      0,
      this.captureCanvas.width,
      this.captureCanvas.height
    );

    const imageData = this.captureCtx.getImageData(
      0,
      0,
      this.captureCanvas.width,
      this.captureCanvas.height
    );
    this.capturedFrames.push(imageData);
  }

  showCountdown() {
    const countdownSequence = ["3", "2", "1", "GO!"];
    let index = 0;
    let countdownAnimationId = null;

    // Show countdown overlay
    const overlay = document.getElementById("countdownOverlay");
    const countdownText = overlay.querySelector(".countdown-text");
    overlay.style.display = "flex";

    // Continuously animate waves during countdown
    const animateCountdown = () => {
      this.draw(); // Continuously redraw to animate waves
      countdownAnimationId = requestAnimationFrame(animateCountdown);
    };

    // Start continuous animation
    animateCountdown();

    const showNext = () => {
      if (index < countdownSequence.length) {
        const text = countdownSequence[index];

        // Update countdown text in HTML overlay - THIS IS THE ONLY COUNTDOWN LAYER
        // DO NOT DRAW COUNTDOWN ON CANVAS DURING LIVE COUNTDOWN
        countdownText.textContent = text;
        countdownText.className =
          text === "GO!" ? "countdown-text go" : "countdown-text";

        index++;

        if (index < countdownSequence.length) {
          setTimeout(showNext, 800); // 800ms between counts
        } else {
          // Countdown finished - hide overlay and capture frames for export
          setTimeout(() => {
            // Stop continuous animation
            if (countdownAnimationId) {
              cancelAnimationFrame(countdownAnimationId);
            }
            overlay.style.display = "none";

            // NOW capture all countdown frames for export (with countdown on canvas)
            // This happens AFTER the live countdown, so user doesn't see it
            const allCounts = ["3", "2", "1", "GO!"];
            allCounts.forEach((countText) => {
              const frames = countText === "GO!" ? 20 : 16;
              for (let i = 0; i < frames; i++) {
                this.draw();
                this.drawCountdownOnCanvas(countText);
                this.captureFrame();
              }
            });

            // Clear the canvas of any countdown overlay before starting race
            this.draw();

            // Start race
            this.raceActive = true;
            this.startTime = Date.now();
            this.quackTimestamps = []; // Reset quack timestamps
            this.startQuackInterval(); // Start playing quacks
            // Show stopwatch
            const stopwatchEl = document.getElementById("stopwatch");
            if (stopwatchEl) {
              stopwatchEl.style.display = "block";
            }
            // Initialize duck state tracking for time-based movement
            for (let duck of this.ducks) {
              duck.lastStateChangeTime = 0;
              duck.positionAtStateChange = 0;
            }

            setTimeout(() => {
              this.animate();
            }, 100);
          }, 800);
        }
      }
    };

    showNext();
  }

  drawCountdownOnCanvas(text) {
    // Draw countdown on canvas for export (matches HTML overlay style)
    const isGo = text === "GO!";

    // No dimmed overlay - just the text with black border

    // Countdown text styling - matches HTML overlay
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    const fontSize = isGo ? 140 : 150;
    this.ctx.font = `bold ${fontSize}px Arial`;

    // Draw black stroke (border) first
    this.ctx.strokeStyle = "#000000";
    this.ctx.lineWidth = 4;
    this.ctx.lineJoin = "round";
    this.ctx.miterLimit = 2;
    this.ctx.strokeText(text, this.canvas.width / 2, this.canvas.height / 2);

    // Then draw the fill on top
    this.ctx.fillStyle = isGo ? "#4CAF50" : "#FFFFFF";
    this.ctx.fillText(text, this.canvas.width / 2, this.canvas.height / 2);

    // Reset
    this.ctx.textAlign = "left";
  }

  startContinuousAnimation() {
    // Continuous animation loop for water, bubbles, and duck bobbing
    // This runs independently of the race animation and never stops
    const animate = () => {
      // Update duck positions if race is finished (so they continue swimming slowly)
      if (this.raceFinished && this.startTime) {
        const currentTime = Date.now();
        // Use the time when the last duck finished as the base, then continue from there
        const lastFinishTime =
          this.finishedDucks.length > 0
            ? Math.max(...this.finishedDucks.map((d) => d.finishTime))
            : (currentTime - this.startTime) / 1000;
        // Continue elapsed time from when race finished
        const timeSinceRaceEnd =
          (currentTime - (this.startTime + lastFinishTime * 1000)) / 1000;
        const elapsed = lastFinishTime + timeSinceRaceEnd;
        this.updateDucks(elapsed);
      }

      // Always draw - this ensures water, bubbles, and duck bobbing are always animating
      // During race, the race animation also draws, but this ensures smooth animation
      this.draw();
      this.continuousAnimationId = requestAnimationFrame(animate);
    };
    animate();
  }

  animate() {
    if (!this.raceActive) return;

    const currentTime = Date.now();
    const elapsed = (currentTime - this.startTime) / 1000; // seconds

    // Update stopwatch
    this.updateStopwatch(elapsed);

    // Update duck positions using elapsed time directly (not frame-based)
    this.updateDucks(elapsed);

    // Draw everything
    this.draw();

    // Capture frame (limit to 20 FPS for faster export - every 100ms minimum)
    const now = Date.now();
    if (!this.lastCaptureTime || now - this.lastCaptureTime >= 50) {
      this.captureFrame();
      this.lastCaptureTime = now;
    }

    this.frameCount++;

    // Check if race should end - only when all ducks have finished
    if (this.allDucksFinished()) {
      this.endRace();
    } else {
      this.animationFrameId = requestAnimationFrame(() => this.animate());
    }
  }

  updateDucks(elapsed) {
    for (let duck of this.ducks) {
      // Allow finished ducks to continue moving slowly past the finish line
      if (duck.finished) {
        // Continue moving at slow speed after finishing
        const slowSpeed = duck.baseSpeed * 0.3; // Slow but still moving
        const timeSinceFinish = elapsed - duck.finishTime;
        // Use stored position at finish, or current position if not stored yet
        const positionAtFinish =
          duck.positionAtFinish !== undefined
            ? duck.positionAtFinish
            : duck.position;
        duck.position = positionAtFinish + timeSinceFinish * slowSpeed;

        // Still apply max distance limit
        const targetFinishLineX = this.canvas.width * 0.7;
        const effectiveTrackLength = targetFinishLineX - this.trackStart;
        const maxDistanceX = this.canvas.width * 0.92;
        const maxDistancePosition =
          (maxDistanceX - this.trackStart) / effectiveTrackLength;

        if (duck.position > maxDistancePosition) {
          duck.position = maxDistancePosition;
        }
        continue;
      }

      // Calculate time since last state change
      const timeInCurrentState = elapsed - duck.lastStateChangeTime;

      // Change speed state every 1.5-3.5 seconds for more dramatic, sustained changes
      if (timeInCurrentState >= duck.stateDuration) {
        // Save current position before state change
        duck.positionAtStateChange = duck.position;
        duck.lastStateChangeTime = elapsed;
        duck.stateDuration = 1.5 + Math.random() * 2.0; // 1.5-3.5 seconds per state

        // Calculate position rank for rubber-banding
        const sortedByPosition = [...this.ducks].sort(
          (a, b) => b.position - a.position
        );
        const myRank = sortedByPosition.findIndex((d) => d.id === duck.id);
        const totalDucks = this.ducks.length;
        const isLeader = myRank === 0;
        const isLastPlace = myRank === totalDucks - 1;
        const isBackHalf = myRank >= totalDucks / 2;

        // Adjust probabilities based on position
        let rand = Math.random();

        // Leaders more likely to get slow states
        if (isLeader) {
          rand = rand * 1.3; // Shift probabilities toward slower states
        }
        // Last place more likely to get fast states
        else if (isLastPlace) {
          rand = rand * 0.7; // Shift probabilities toward faster states
        }
        // Back half gets slight boost
        else if (isBackHalf) {
          rand = rand * 0.9;
        }

        // For races under 30 seconds, adjusted probabilities for more excitement
        // More normal/slow states, less surge to prevent finishing too fast
        if (this.raceDuration < 30) {
          if (rand < 0.25) {
            // SURGE - 2x speed! Moving up! (reduced from 35%)
            duck.speedState = "surge";
            duck.currentSpeed = duck.baseSpeed * 2.0;
          } else if (rand < 0.55) {
            // NORMAL - 1x speed (increased from 20% to 30%)
            duck.speedState = "normal";
            duck.currentSpeed = duck.baseSpeed * 1.0;
          } else if (rand < 0.8) {
            // SLOW - 0.2x speed or slightly negative! Falling behind (can go backwards)
            duck.speedState = "slow";
            // Allow slight backward movement
            duck.currentSpeed = duck.baseSpeed * (0.2 - Math.random() * 0.1); // -0.08x to 0.2x
          } else {
            // CRAWL - negative speed! Way behind! (definitely going backwards)
            duck.speedState = "crawl";
            // Negative speed to show falling back visibly
            duck.currentSpeed = duck.baseSpeed * (-0.1 - Math.random() * 0.15); // -0.25x to -0.1x
          }
        } else {
          // Full speed range for longer races (30+ seconds)
          if (rand < 0.25) {
            // ROCKET MODE - 3x speed! Way ahead!
            duck.speedState = "rocket";
            duck.currentSpeed = duck.baseSpeed * 3.0;
          } else if (rand < 0.5) {
            // SURGE - 2x speed! Moving up!
            duck.speedState = "surge";
            duck.currentSpeed = duck.baseSpeed * 2.0;
          } else if (rand < 0.65) {
            // NORMAL - 1x speed
            duck.speedState = "normal";
            duck.currentSpeed = duck.baseSpeed * 1.0;
          } else if (rand < 0.85) {
            // SLOW - 0.5x speed! Falling behind
            duck.speedState = "slow";
            duck.currentSpeed = duck.baseSpeed * 0.5;
          } else {
            // CRAWL - 0.2x speed! Way behind!
            duck.speedState = "crawl";
            duck.currentSpeed = duck.baseSpeed * 0.2;
          }
        }
      }

      // Calculate position based on elapsed time, not frame-based accumulation
      // Position = position at state change + (time in current state * current speed)
      // Allow negative speed to show ducks falling back
      duck.position =
        duck.positionAtStateChange +
        (elapsed - duck.lastStateChangeTime) * duck.currentSpeed;

      // Ensure position doesn't go below 0 (can't go backwards past start)
      if (duck.position < 0) {
        duck.position = 0;
      }

      // Progressive distance limiting - ducks can't go too far early in the race
      // This creates more excitement as ducks jockey for position
      // Ensure ducks can reach finish line (70%) by the time it appears
      const targetFinishLineX = this.canvas.width * 0.7; // Finish line at 70% of canvas
      const finishLineAppearTime = Math.max(0, this.raceDuration - 2.0);

      // Gradually increase max distance as race progresses
      // Start at 60% of canvas, reach 75% when finish line appears, then 92% by race end
      const earlyMaxDistance = this.canvas.width * 0.6; // 60% early in race
      const finishLineMaxDistance = this.canvas.width * 0.75; // 75% when finish line appears (allows passing it)
      const finalMaxDistance = this.canvas.width * 0.92; // 92% at race end

      let maxDistanceX;
      if (elapsed < finishLineAppearTime) {
        // Before finish line appears: 60% to 75%
        const progressToFinishLine = Math.min(
          1,
          elapsed / finishLineAppearTime
        );
        maxDistanceX =
          earlyMaxDistance +
          (finishLineMaxDistance - earlyMaxDistance) * progressToFinishLine;
      } else {
        // After finish line appears: 75% to 92%
        const remainingTime = this.raceDuration - finishLineAppearTime;
        const progressAfterFinishLine = Math.min(
          1,
          (elapsed - finishLineAppearTime) / remainingTime
        );
        maxDistanceX =
          finishLineMaxDistance +
          (finalMaxDistance - finishLineMaxDistance) * progressAfterFinishLine;
      }

      // Convert max distance to position scale using target finish line as reference
      const effectiveTrackLength = targetFinishLineX - this.trackStart;
      const maxDistancePosition =
        (maxDistanceX - this.trackStart) / effectiveTrackLength;

      // Limit duck position to progressive maximum distance (but allow backwards movement)
      if (duck.position > maxDistancePosition) {
        duck.position = maxDistancePosition;
      }

      // Check if duck has reached the finish line (mark as finished)
      // Finish line is at 70% of canvas, but ducks can continue past it
      // IMPORTANT: Ducks can only be marked as finished AFTER the finish line appears
      let finishLineHasAppeared = false;

      // If race is active, check if finish line has appeared
      if (this.raceActive && this.startTime) {
        // Finish line appears 2 seconds before race duration to ensure ducks can cross it
        const finishLineStartTime = Math.max(0, this.raceDuration - 2.0);

        if (elapsed >= finishLineStartTime) {
          // Finish line has appeared - ducks can now finish
          finishLineHasAppeared = true;
        }
      }

      // Convert finish line X position to position value (0-1 scale)
      // IMPORTANT: Always use target finish line position (70% of canvas) for consistent calculation
      // This matches how ducks are drawn on screen
      const effectiveTrackLengthForFinish = targetFinishLineX - this.trackStart;
      const finishLinePosition = 1.0; // Finish line at 70% of canvas = position 1.0

      // Mark duck as finished as soon as they cross the finish line position
      // (once the finish line has appeared, even if it's still animating)
      // Use precise elapsed time for accurate finish times
      if (
        finishLineHasAppeared &&
        duck.position >= finishLinePosition &&
        !duck.finished
      ) {
        duck.finished = true;
        // Use actual elapsed time when duck crosses - this is the precise finish time
        // Add tiny random offset (0.1ms) only to break ties if ducks cross in same frame
        // This ensures unique finish times while maintaining accuracy
        duck.finishTime = elapsed + Math.random() * 0.0001;
        duck.positionAtFinish = duck.position; // Store position when crossing finish line
        this.finishedDucks.push(duck);
      }
    }
  }

  allDucksFinished() {
    return this.ducks.every((duck) => duck.finished);
  }

  draw() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw sky/grass background for top section
    this.drawScenery();

    // Draw water background - darker blue
    const gradient = this.ctx.createLinearGradient(
      0,
      this.waterTop,
      0,
      this.canvas.height
    );
    gradient.addColorStop(0, "#5B9BD5"); // Lighter royal blue
    gradient.addColorStop(1, "#2E5C8A"); // Medium royal blue (lighter than before)
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(
      0,
      this.waterTop,
      this.canvas.width,
      this.canvas.height - this.waterTop
    );

    // Draw waves
    this.drawWaves();

    // Draw bubbles
    this.drawBubbles();

    // Draw lanes
    this.drawLanes();

    // Draw start and finish lines
    this.drawStartFinishLines();

    // Draw ducks (with bobbing animation)
    this.drawDucks();

    // Draw results leaderboard on top if race is finished
    if (this.raceFinished) {
      this.drawResultsOnCanvas();
    }
  }

  drawScenery() {
    // Draw sky - top 65% of scenery area
    const skyGradient = this.ctx.createLinearGradient(
      0,
      0,
      0,
      this.groundLevel
    );
    skyGradient.addColorStop(0, "#87CEEB");
    skyGradient.addColorStop(1, "#B0E0E6");
    this.ctx.fillStyle = skyGradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.groundLevel);

    // Calculate parallax based on elapsed time for consistent scrolling
    const currentTime = Date.now();
    const elapsed =
      this.raceActive && this.startTime
        ? (currentTime - this.startTime) / 1000
        : 0;
    // Scroll based on time - scenery moves at constant rate regardless of duck speed
    const parallaxOffset = elapsed * 50; // 50 pixels per second scroll rate

    // Draw trees with parallax (they sit on the ground - same speed as grass)
    this.trees.forEach((tree) => {
      const parallaxX =
        ((tree.x + tree.offset - parallaxOffset * 0.8) %
          (this.canvas.width + 150)) -
        50;
      const trunkHeight = tree.size * 0.7;
      const trunkWidth = tree.size * 0.15;
      const trunkBottom = this.groundLevel;

      // Tree trunk
      this.ctx.fillStyle = "#8B4513";
      this.ctx.fillRect(
        parallaxX - trunkWidth / 2,
        trunkBottom - trunkHeight,
        trunkWidth,
        trunkHeight
      );

      // Tree foliage (sits on top of trunk)
      const foliageY = trunkBottom - trunkHeight - tree.size * 0.2;
      this.ctx.fillStyle = "#2D5016";
      this.ctx.beginPath();
      this.ctx.arc(parallaxX, foliageY, tree.size * 0.6, 0, Math.PI * 2);
      this.ctx.fill();

      // Lighter foliage layer
      this.ctx.fillStyle = "#228B22";
      this.ctx.beginPath();
      this.ctx.arc(parallaxX, foliageY, tree.size * 0.5, 0, Math.PI * 2);
      this.ctx.fill();

      // Highlight
      this.ctx.fillStyle = "#32CD32";
      this.ctx.beginPath();
      this.ctx.arc(
        parallaxX - tree.size * 0.15,
        foliageY - tree.size * 0.15,
        tree.size * 0.25,
        0,
        Math.PI * 2
      );
      this.ctx.fill();
    });

    // Draw grass layer (35% of scenery height)
    const grassHeight = this.sceneryHeight * 0.25;
    const grassGradient = this.ctx.createLinearGradient(
      0,
      this.groundLevel,
      0,
      this.groundLevel + grassHeight
    );
    grassGradient.addColorStop(0, "#228B22");
    grassGradient.addColorStop(1, "#1a6b1a");
    this.ctx.fillStyle = grassGradient;
    this.ctx.fillRect(0, this.groundLevel, this.canvas.width, grassHeight);

    // Draw grass patches with parallax
    this.grassPatches.forEach((patch) => {
      const parallaxX =
        ((patch.x + patch.offset - parallaxOffset * 0.8) %
          (this.canvas.width + 100)) -
        20;
      const grassY = this.groundLevel + 5;

      this.ctx.fillStyle = "#32CD32";
      // Draw grass blades with consistent heights
      patch.blades.forEach((blade) => {
        const bladeX = parallaxX + blade.xOffset;
        this.ctx.fillRect(bladeX, grassY, 2, blade.height);
      });
    });

    // Draw dirt/ground layer (bottom 10% of scenery)
    const dirtHeight = this.sceneryHeight * 0.1;
    const dirtGradient = this.ctx.createLinearGradient(
      0,
      this.sceneryHeight - dirtHeight,
      0,
      this.sceneryHeight
    );
    dirtGradient.addColorStop(0, "#8B7355");
    dirtGradient.addColorStop(1, "#6B5344");
    this.ctx.fillStyle = dirtGradient;
    this.ctx.fillRect(
      0,
      this.sceneryHeight - dirtHeight,
      this.canvas.width,
      dirtHeight
    );

    // Add some texture to dirt with small rocks/patches
    this.ctx.fillStyle = "rgba(101, 67, 33, 0.3)";
    for (let i = 0; i < 30; i++) {
      const rockX = (i * 50 + parallaxOffset * 0.3) % this.canvas.width;
      const rockY =
        this.sceneryHeight - dirtHeight + Math.random() * dirtHeight;
      this.ctx.fillRect(rockX, rockY, 3 + Math.random() * 4, 2);
    }
  }

  drawWaves() {
    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    this.ctx.lineWidth = 2;

    const time = Date.now() * 0.001;
    const numWaves = 8;
    const waveSpacing = (this.canvas.height - this.waterTop - 100) / numWaves;

    for (let i = 0; i < numWaves; i++) {
      this.ctx.beginPath();
      for (let x = 0; x < this.canvas.width; x += 10) {
        const y =
          this.waterTop +
          50 +
          i * waveSpacing +
          Math.sin(x * 0.02 + time * 2 + i) * 10;
        if (x === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      }
      this.ctx.stroke();
    }
  }

  initializeBubbles() {
    // Pre-populate 5-10 bubbles distributed across the canvas horizontally
    const waterStart = this.waterTop + 50;
    const waterEnd = this.canvas.height - 50;
    const currentTime = Date.now();
    const baseTime = currentTime * 0.001; // Current time in seconds for parallax calculation
    const numBubbles = 5 + Math.floor(Math.random() * 3); // 5-7 bubbles

    // Create bubbles distributed across the canvas horizontally
    for (let i = 0; i < numBubbles; i++) {
      // Distribute bubbles evenly across the canvas width with some randomness
      const baseX = (i / numBubbles) * this.canvas.width;
      const randomX =
        baseX +
        Math.random() * (this.canvas.width / numBubbles) -
        this.canvas.width / numBubbles / 2;
      const clampedX = Math.max(0, Math.min(this.canvas.width, randomX));
      const randomY = waterStart + Math.random() * (waterEnd - waterStart);
      const ageOffset = Math.random() * 2; // Random age (0-2 seconds) so they're at different positions

      // Calculate initial X position accounting for parallax
      // Bubbles spawn in place, so we need to account for current parallax offset
      const parallaxAtCreation = baseTime * 50;
      const bubbleSpeed = 40 + Math.random() * 30;
      const movementFromAge = bubbleSpeed * ageOffset;

      // Initial X should be the current screen position plus parallax offset
      // This makes bubbles appear "in place" on the canvas
      const initialX = clampedX + parallaxAtCreation + movementFromAge;

      this.bubbles.push({
        initialX: initialX,
        y: randomY,
        size: 4 + Math.random() * 6,
        speed: bubbleSpeed,
        opacity: 0.4 + Math.random() * 0.3,
        createdAt: currentTime - ageOffset * 1000, // Make some bubbles older
        verticalOffset: Math.random() * 15 - 7.5,
      });
    }
  }

  drawBubbles() {
    const currentTime = Date.now();

    // Calculate parallax offset for bubbles (same as scenery)
    // Use a base time for continuous movement even before race starts
    const baseTime = currentTime * 0.001; // Convert to seconds
    const parallaxOffset = baseTime * 50; // 50 pixels per second scroll rate

    // Create new bubbles constantly from the right side
    // Spawn probability: 1-2% (reduced for fewer bubbles)
    const spawnChance = 0.01 + Math.random() * 0.01; // 1-2%
    if (Math.random() < spawnChance) {
      // Create bubbles at random vertical positions in the water area
      const waterStart = this.waterTop + 50;
      const waterEnd = this.canvas.height - 50;
      const randomY = waterStart + Math.random() * (waterEnd - waterStart);

      // Spawn bubbles off-screen right, accounting for current parallax
      // This ensures they appear to come from the right edge
      const spawnX = this.canvas.width + 50 + parallaxOffset;

      this.bubbles.push({
        initialX: spawnX,
        y: randomY,
        size: 4 + Math.random() * 6,
        speed: 40 + Math.random() * 30, // Horizontal speed (pixels per second)
        opacity: 0.4 + Math.random() * 0.3,
        createdAt: currentTime,
        verticalOffset: Math.random() * 15 - 7.5, // Slight vertical variation
      });
    }

    // Update and draw bubbles
    this.bubbles = this.bubbles.filter((bubble) => {
      // Calculate bubble's current x position based on elapsed time
      // Bubbles move left at their speed, and also move with the water parallax
      const timeSinceCreation = (currentTime - bubble.createdAt) / 1000;

      // Calculate where bubble would be without parallax
      const bubbleMovement = bubble.speed * timeSinceCreation;
      // Bubble moves left with the water flow (parallax) plus its own speed
      // The parallax offset represents how much the water has moved left
      const bubbleX = bubble.initialX - bubbleMovement - parallaxOffset;

      // Add slight vertical bobbing
      const bobAmount = Math.sin(timeSinceCreation * 2) * bubble.verticalOffset;
      const bubbleY = bubble.y + bobAmount;

      // Draw bubble if it's on screen or near the edges
      if (bubbleX > -100 && bubbleX < this.canvas.width + 100) {
        // Only draw if actually visible on screen
        if (bubbleX > -50 && bubbleX < this.canvas.width + 50) {
          // Draw bubble
          this.ctx.save();
          this.ctx.globalAlpha = bubble.opacity;
          this.ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
          this.ctx.lineWidth = 1.5;
          this.ctx.beginPath();
          this.ctx.arc(bubbleX, bubbleY, bubble.size, 0, Math.PI * 2);
          this.ctx.stroke();
          // Inner highlight
          this.ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
          this.ctx.beginPath();
          this.ctx.arc(
            bubbleX - bubble.size * 0.3,
            bubbleY - bubble.size * 0.3,
            bubble.size * 0.3,
            0,
            Math.PI * 2
          );
          this.ctx.fill();
          this.ctx.restore();
        }
      }

      // Remove bubbles that have moved completely off the left side of the canvas
      return bubbleX > -150;
    });
  }

  drawLanes() {
    // Lane dividers removed - no dotted lines
  }

  drawStartFinishLines() {
    const waterStart = this.waterTop + 50;
    const waterEnd = this.canvas.height - 50;

    // Calculate parallax offset for moving start line (same as scenery)
    // Use final elapsed time if race is finished, otherwise current time
    const currentTime = Date.now();
    let elapsed = 0;
    if (this.startTime) {
      if (this.raceFinished && this.finishedDucks.length > 0) {
        // Use the time when the last duck finished to freeze the start line position
        const lastFinishTime = Math.max(
          ...this.finishedDucks.map((d) => d.finishTime)
        );
        elapsed = lastFinishTime;
      } else if (this.raceActive) {
        elapsed = (currentTime - this.startTime) / 1000;
      }
    }
    const parallaxOffset = elapsed * 50; // 50 pixels per second scroll rate

    // Start line - moves left with scenery as race progresses
    // Don't draw start line if race is finished (it's off-screen by then)
    if (!this.raceFinished) {
      const initialStartLineX = this.trackStart + 25;
      const startLineX = initialStartLineX - parallaxOffset;

      // Only draw start line if it's still on screen
      if (startLineX > -50) {
        // Draw start line with white fill and black border
        this.ctx.strokeStyle = "#000"; // Black border
        this.ctx.lineWidth = 6;
        this.ctx.beginPath();
        this.ctx.moveTo(startLineX, waterStart);
        this.ctx.lineTo(startLineX, waterEnd);
        this.ctx.stroke();
        this.ctx.strokeStyle = "#FFF"; // White fill
        this.ctx.lineWidth = 4;
        this.ctx.stroke();

        // START label - white fill with black border
        this.ctx.font = "bold 20px Arial";
        this.ctx.textAlign = "center";
        // Draw black border (stroke)
        this.ctx.strokeStyle = "#000";
        this.ctx.lineWidth = 4;
        this.ctx.strokeText("START", startLineX, waterStart - 20);
        // Draw white fill
        this.ctx.fillStyle = "#FFF";
        this.ctx.fillText("START", startLineX, waterStart - 20);
        this.ctx.textAlign = "left"; // Reset
      }
    }

    // Finish line - comes in from the right at race duration
    // Always show finish line if race has started (even if finished)
    const squareSize = 20;
    // Target position is 70% of canvas width
    const targetFinishLineX = this.canvas.width * 0.7;

    // Show finish line if race has started (active or finished)
    let finishLineX = this.canvas.width + 50; // Default: off-screen

    if (this.raceActive || this.raceFinished) {
      // Use final elapsed time if race is finished
      let elapsedForFinish = elapsed;
      if (this.raceFinished && this.startTime) {
        // Use the time when the last duck finished to freeze finish line position
        const lastFinishTime =
          this.finishedDucks.length > 0
            ? Math.max(...this.finishedDucks.map((d) => d.finishTime))
            : (currentTime - this.startTime) / 1000;
        elapsedForFinish = lastFinishTime;
      }

      // Start showing finish line 2 seconds before race duration to ensure ducks can cross it
      const finishLineStartTime = Math.max(0, this.raceDuration - 2.0);
      const finishAnimationDuration = 2.0; // 2 seconds to float in

      if (elapsedForFinish >= finishLineStartTime) {
        // Calculate how far into the finish line animation we are (0 to 1)
        const finishProgress = Math.min(
          1,
          (elapsedForFinish - finishLineStartTime) / finishAnimationDuration
        );

        // Animate finish line coming in from the right
        // Start off-screen to the right, end at 70% of canvas
        const startX = this.canvas.width + 50;
        finishLineX = startX - (startX - targetFinishLineX) * finishProgress;
      }
      // If before finish line appears, finishLineX stays off-screen (default)
    }

    // Store finish line position for duck position limiting
    this.currentFinishLineX = finishLineX;

    // Draw finish line if it's on screen and race has started (active or finished)
    if (
      (this.raceActive || this.raceFinished) &&
      finishLineX < this.canvas.width + 50 &&
      finishLineX > -50
    ) {
      // Draw checkered pattern (vertical line)
      for (let y = waterStart; y < waterEnd; y += squareSize) {
        const squareIndex = Math.floor((y - waterStart) / squareSize);
        const isBlack = squareIndex % 2 === 0;
        this.ctx.fillStyle = isBlack ? "#000" : "#FFF";
        this.ctx.fillRect(
          finishLineX - squareSize / 2,
          y,
          squareSize,
          squareSize
        );
      }

      // FINISH label with padding below
      this.ctx.fillStyle = "#000";
      this.ctx.font = "bold 20px Arial";
      this.ctx.textAlign = "center";
      this.ctx.fillText("FINISH", finishLineX, waterStart - 20);
      this.ctx.textAlign = "left"; // Reset
    }
  }

  drawDucks() {
    // Calculate bobbing offset based on time (works even before race starts)
    const currentTime = Date.now();
    // Use a base time for consistent bobbing animation
    const timeForBob = currentTime / 1000; // Convert to seconds
    const bobSpeed = 1; // Bobs per second
    const bobAmplitude = 3; // Pixels up and down

    // Scale ducks based on number of ducks: 2x for 2 ducks, scaling down with more ducks
    const numDucks = this.ducks.length;
    let duckScale = 1.0;
    if (numDucks === 2) {
      duckScale = 2.0; // 2x for 2 ducks
    } else if (numDucks === 3) {
      duckScale = 1.75; // 1.75x for 3 ducks
    } else if (numDucks === 4) {
      duckScale = 1.5; // 1.5x for 4 ducks
    } else if (numDucks === 5) {
      duckScale = 1.25; // 1.25x for 5 ducks
    } else {
      duckScale = 1.0; // Normal size for 6+ ducks
    }

    for (let duck of this.ducks) {
      // Use target finish line position (70% of canvas) for consistent drawing
      // This matches the finish line position calculation in updateDucks
      const targetFinishLineX = this.canvas.width * 0.7;
      const effectiveTrackLength = targetFinishLineX - this.trackStart;
      const x = this.trackStart + duck.position * effectiveTrackLength;
      // Add bobbing effect using sine wave with duck's unique phase
      const bobOffset =
        Math.sin(timeForBob * bobSpeed * Math.PI * 2 + duck.bobPhase) *
        bobAmplitude;
      const y = duck.y + bobOffset;

      // Draw duck body
      this.ctx.save();
      this.ctx.translate(x, y);
      this.ctx.scale(duckScale, duckScale);

      // Duck body (circle)
      this.ctx.fillStyle = duck.color;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 20, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.strokeStyle = "#FFA500";
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      // Duck head (smaller circle)
      this.ctx.fillStyle = duck.color;
      this.ctx.beginPath();
      this.ctx.arc(12, -8, 12, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.strokeStyle = "#FFA500";
      this.ctx.stroke();

      // Duck beak - bigger and more visible
      this.ctx.fillStyle = "#FFA500";
      this.ctx.beginPath();
      this.ctx.moveTo(20, -8);
      this.ctx.lineTo(32, -8);
      this.ctx.lineTo(26, -3);
      this.ctx.closePath();
      this.ctx.fill();

      // Duck eye
      this.ctx.fillStyle = "#000";
      this.ctx.beginPath();
      this.ctx.arc(16, -10, 2, 0, Math.PI * 2);
      this.ctx.fill();

      // Speed lines when moving fast
      if (duck.currentSpeed > duck.baseSpeed) {
        this.ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
        this.ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          this.ctx.beginPath();
          this.ctx.moveTo(-25 - i * 8, -10 + i * 8);
          this.ctx.lineTo(-15 - i * 8, -10 + i * 8);
          this.ctx.stroke();
        }
      }

      this.ctx.restore();

      // Draw duck name - white fill with black border
      // Scale name position, font size, and stroke width with duck scale
      const baseNameOffset = 40;
      const nameOffset = baseNameOffset * duckScale;
      const baseFontSize = 14;
      const fontSize = baseFontSize * duckScale;
      const baseStrokeWidth = 3;
      const strokeWidth = baseStrokeWidth * duckScale;

      this.ctx.font = `bold ${fontSize}px Arial`;
      this.ctx.textAlign = "center";
      // Draw black border (stroke)
      this.ctx.strokeStyle = "#000";
      this.ctx.lineWidth = strokeWidth;
      this.ctx.strokeText(duck.name, x, y + nameOffset);
      // Draw white fill
      this.ctx.fillStyle = "#FFF";
      this.ctx.fillText(duck.name, x, y + nameOffset);
    }

    this.ctx.textAlign = "left"; // Reset
  }

  endRace() {
    this.raceActive = false;
    this.raceFinished = true;
    this.stopQuackInterval(); // Stop playing quacks
    // Hide stopwatch
    const stopwatchEl = document.getElementById("stopwatch");
    if (stopwatchEl) {
      stopwatchEl.style.display = "none";
    }

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    // Draw everything including results leaderboard on top
    this.draw();

    // Capture final result frames (60 frames = 3 seconds at 20fps)
    for (let i = 0; i < 60; i++) {
      this.draw(); // Redraw to ensure results are on top
      this.captureFrame();
    }

    console.log(`Race complete!`);

    document.getElementById("startRace").disabled = false;

    // Enable export controls
    document.getElementById("exportRace").disabled = false;
  }

  drawResultsOnCanvas() {
    // Draw a semi-transparent overlay
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Dynamic sizing based on number of ducks
    const numDucks = this.ducks.length;
    let lineHeight,
      titleSize,
      nameSize,
      timeSize,
      emojiSize,
      rankSize,
      circleRadius;
    let useColumns = false;
    let boxWidth, columnWidth;

    if (numDucks <= 6) {
      // Standard size for 6 or fewer ducks
      lineHeight = 60;
      titleSize = 40;
      nameSize = 24;
      timeSize = 20;
      emojiSize = 30;
      rankSize = 18;
      circleRadius = 20;
      boxWidth = 500;
    } else if (numDucks <= 8) {
      // Slightly smaller for 7-8 ducks
      lineHeight = 50;
      titleSize = 36;
      nameSize = 20;
      timeSize = 18;
      emojiSize = 26;
      rankSize = 16;
      circleRadius = 18;
      boxWidth = 500;
    } else if (numDucks <= 12) {
      // Two columns for 9-12 ducks
      lineHeight = 50;
      titleSize = 36;
      nameSize = 18;
      timeSize = 16;
      emojiSize = 24;
      rankSize = 14;
      circleRadius = 16;
      boxWidth = 750; // Wider for two columns
      columnWidth = 350;
      useColumns = true;
    } else if (numDucks <= 16) {
      // Compact two columns for 13-16 ducks
      lineHeight = 42;
      titleSize = 32;
      nameSize = 16;
      timeSize = 14;
      emojiSize = 22;
      rankSize = 12;
      circleRadius = 14;
      boxWidth = 750;
      columnWidth = 350;
      useColumns = true;
    } else {
      // Extra compact two columns for 17-20 ducks
      lineHeight = 38;
      titleSize = 30;
      nameSize = 15;
      timeSize = 13;
      emojiSize = 20;
      rankSize = 11;
      circleRadius = 13;
      boxWidth = 750;
      columnWidth = 350;
      useColumns = true;
    }

    const headerHeight = 100;
    const ducksPerColumn = useColumns ? Math.ceil(numDucks / 2) : numDucks;
    const boxHeight = Math.min(
      headerHeight + ducksPerColumn * lineHeight + 30,
      this.canvas.height - 80
    );
    const boxX = (this.canvas.width - boxWidth) / 2;
    const boxY = (this.canvas.height - boxHeight) / 2;

    // Draw white background with shadow
    this.ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    this.ctx.shadowBlur = 20;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 10;

    this.ctx.fillStyle = "#ffffff";
    this.ctx.beginPath();

    // Draw rounded rectangle (with fallback for older browsers)
    if (this.ctx.roundRect) {
      this.ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 20);
    } else {
      // Fallback: draw rectangle with manual rounded corners
      const radius = 20;
      this.ctx.moveTo(boxX + radius, boxY);
      this.ctx.lineTo(boxX + boxWidth - radius, boxY);
      this.ctx.arcTo(
        boxX + boxWidth,
        boxY,
        boxX + boxWidth,
        boxY + radius,
        radius
      );
      this.ctx.lineTo(boxX + boxWidth, boxY + boxHeight - radius);
      this.ctx.arcTo(
        boxX + boxWidth,
        boxY + boxHeight,
        boxX + boxWidth - radius,
        boxY + boxHeight,
        radius
      );
      this.ctx.lineTo(boxX + radius, boxY + boxHeight);
      this.ctx.arcTo(
        boxX,
        boxY + boxHeight,
        boxX,
        boxY + boxHeight - radius,
        radius
      );
      this.ctx.lineTo(boxX, boxY + radius);
      this.ctx.arcTo(boxX, boxY, boxX + radius, boxY, radius);
    }
    this.ctx.fill();

    // Reset shadow
    this.ctx.shadowColor = "transparent";
    this.ctx.shadowBlur = 0;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 0;

    // Draw title
    this.ctx.fillStyle = "#495057";
    this.ctx.font = `bold ${titleSize}px Arial`;
    this.ctx.textAlign = "center";
    this.ctx.fillText("🏆 Race Results", this.canvas.width / 2, boxY + 60);

    // Sort ducks by finish time
    const sortedDucks = [...this.ducks].sort((a, b) => {
      if (a.finished && b.finished) {
        return a.finishTime - b.finishTime;
      } else if (a.finished) {
        return -1;
      } else if (b.finished) {
        return 1;
      } else {
        return b.position - a.position;
      }
    });

    // Draw results list
    const startY = boxY + 100;

    sortedDucks.forEach((duck, index) => {
      // Calculate position (single column or two columns)
      let columnIndex, rowIndex, columnX;

      if (useColumns) {
        columnIndex = index < ducksPerColumn ? 0 : 1;
        rowIndex = index % ducksPerColumn;
        columnX = boxX + 30 + columnIndex * columnWidth;
      } else {
        columnX = boxX;
        rowIndex = index;
      }

      const y = startY + rowIndex * lineHeight;

      // Draw rank circle
      const rankX = columnX + 40;
      let gradient;

      if (index === 0) {
        gradient = this.ctx.createLinearGradient(
          rankX - circleRadius,
          y - circleRadius,
          rankX + circleRadius,
          y + circleRadius
        );
        gradient.addColorStop(0, "#FFD700");
        gradient.addColorStop(1, "#FFA500");
      } else if (index === 1) {
        gradient = this.ctx.createLinearGradient(
          rankX - circleRadius,
          y - circleRadius,
          rankX + circleRadius,
          y + circleRadius
        );
        gradient.addColorStop(0, "#C0C0C0");
        gradient.addColorStop(1, "#999999");
      } else if (index === 2) {
        gradient = this.ctx.createLinearGradient(
          rankX - circleRadius,
          y - circleRadius,
          rankX + circleRadius,
          y + circleRadius
        );
        gradient.addColorStop(0, "#CD7F32");
        gradient.addColorStop(1, "#8B4513");
      } else {
        gradient = this.ctx.createLinearGradient(
          rankX - circleRadius,
          y - circleRadius,
          rankX + circleRadius,
          y + circleRadius
        );
        gradient.addColorStop(0, "#667eea");
        gradient.addColorStop(1, "#764ba2");
      }

      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(rankX, y, circleRadius, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = index < 3 && index !== 1 ? "#333" : "#fff";
      this.ctx.font = `bold ${rankSize}px Arial`;
      this.ctx.textAlign = "center";
      this.ctx.fillText((index + 1).toString(), rankX, y + rankSize / 3);

      // Draw colored duck icon instead of emoji
      const duckX = columnX + (useColumns ? 80 : 110);
      const duckScale = useColumns ? 0.6 : 0.8;
      this.ctx.save();
      this.ctx.translate(duckX, y);
      this.ctx.scale(duckScale, duckScale);

      // Duck body (circle)
      this.ctx.fillStyle = duck.color;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 12, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.strokeStyle = "#FFA500";
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();

      // Duck head (smaller circle)
      this.ctx.fillStyle = duck.color;
      this.ctx.beginPath();
      this.ctx.arc(7, -5, 7, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.strokeStyle = "#FFA500";
      this.ctx.stroke();

      // Duck beak - bigger and more visible
      this.ctx.fillStyle = "#FFA500";
      this.ctx.beginPath();
      this.ctx.moveTo(12, -5);
      this.ctx.lineTo(19, -5);
      this.ctx.lineTo(15.5, -2);
      this.ctx.closePath();
      this.ctx.fill();

      // Duck eye
      this.ctx.fillStyle = "#000";
      this.ctx.beginPath();
      this.ctx.arc(9, -6, 1.5, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.restore();

      // Draw duck name
      this.ctx.fillStyle = "#495057";
      this.ctx.font = `bold ${nameSize}px Arial`;
      this.ctx.textAlign = "left";
      const nameX = columnX + (useColumns ? 110 : 150);
      this.ctx.fillText(duck.name, nameX, y + nameSize / 4);

      // Draw time
      this.ctx.font = `${timeSize}px Arial`;
      this.ctx.textAlign = "right";
      const timeText = duck.finished ? `${duck.finishTime.toFixed(2)}s` : "DNF";
      const timeX = columnX + (useColumns ? columnWidth - 20 : boxWidth - 40);
      this.ctx.fillText(timeText, timeX, y + timeSize / 4);
    });
  }

  displayResults(sortedDucks) {
    const resultsDiv = document.getElementById("results");
    resultsDiv.innerHTML =
      '<div class="results-overlay"><h2>🏆 Race Results</h2></div>';

    const ol = document.createElement("ol");
    sortedDucks.forEach((duck, index) => {
      const li = document.createElement("li");
      li.innerHTML = `
                <span class="duck-emoji" style="color: ${duck.color};">🦆</span>
                <span class="duck-name">${duck.name}</span>
                <span>${
                  duck.finished ? `${duck.finishTime.toFixed(2)}s` : "DNF"
                }</span>
            `;
      ol.appendChild(li);
    });

    resultsDiv.querySelector(".results-overlay").appendChild(ol);
    resultsDiv.classList.add("show");
  }

  resetRace() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    this.raceActive = false;
    this.raceFinished = false;
    this.finishedDucks = [];
    this.capturedFrames = [];
    this.stopQuackInterval(); // Stop playing quacks
    this.quackTimestamps = []; // Clear quack timestamps

    // Hide export preview and revoke blob URL
    const preview = document.querySelector(".export-preview-inline");
    if (preview) {
      preview.classList.remove("show");
    }
    const mediaContainer = document.getElementById("exportMedia");
    if (mediaContainer) {
      mediaContainer.innerHTML = "";
    }
    if (this.exportBlobURL) {
      URL.revokeObjectURL(this.exportBlobURL);
      this.exportBlobURL = null;
    }
    this.exportBlob = null;
    document.getElementById("downloadRace").disabled = true;

    document.getElementById("startRace").disabled = false;
    document.getElementById("exportRace").disabled = true;
    document.getElementById("downloadRace").disabled = true;

    const resultsDiv = document.getElementById("results");
    resultsDiv.innerHTML = "";
    resultsDiv.classList.remove("show");

    // Initialize ducks at start line
    this.initializeDucksAtStart();

    this.showStatus("Race reset!", "info");
  }

  async exportRace() {
    if (!this.ffmpegLoaded) {
      this.showStatus(
        "⚠️ FFmpeg is still loading or failed to load. Check console for details.",
        "info"
      );
      //   console.log("FFmpeg loaded status:", this.ffmpegLoaded);
      //   console.log("FFmpeg instance:", this.ffmpeg);
      return;
    }

    if (this.capturedFrames.length === 0) {
      this.showStatus("No frames to export!", "info");
      return;
    }

    this.isExporting = true;
    this.showStatus("Processing: 0%", "info", true);

    // Disable buttons during processing
    document.getElementById("exportRace").disabled = true;
    document.getElementById("downloadRace").disabled = true;

    try {
      // Use the fetchFile utility we stored during initialization
      const fetchFile = this.fetchFile;

      console.log(
        "Starting MP4 export with",
        this.capturedFrames.length,
        "frames"
      );

      // Convert ImageData frames to JPEG files for FFmpeg
      // Frame preparation is 0-30% of total progress
      for (let i = 0; i < this.capturedFrames.length; i++) {
        const imageData = this.capturedFrames[i];

        // Create temporary canvas to convert ImageData to blob
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = imageData.width;
        tempCanvas.height = imageData.height;
        const tempCtx = tempCanvas.getContext("2d");
        tempCtx.putImageData(imageData, 0, 0);

        // Convert to blob (JPEG is faster to encode than PNG for temporary files)
        const blob = await new Promise((resolve) =>
          tempCanvas.toBlob(resolve, "image/jpeg", 0.92)
        );
        const data = await fetchFile(blob);

        // Write frame to FFmpeg filesystem
        const frameNum = String(i).padStart(5, "0");
        await this.ffmpeg.writeFile(`frame${frameNum}.jpg`, data);

        // Update progress every 5 frames - frame prep is 0-30% of total
        if (i % 5 === 0 || i === this.capturedFrames.length - 1) {
          const framePercent = i / this.capturedFrames.length;
          const totalPercent = Math.round(framePercent * 30); // 0-30% for frame prep
          this.showStatus(`Processing: ${totalPercent}%`, "info", true);
        }
      }

      // Load quack audio file if we have quack timestamps
      let hasAudio = false;
      if (this.quackTimestamps && this.quackTimestamps.length > 0) {
        try {
          const quackResponse = await fetch("./media/quack.mp3");
          const quackBlob = await quackResponse.blob();
          const quackData = await fetchFile(quackBlob);
          await this.ffmpeg.writeFile("quack.mp3", quackData);
          hasAudio = true;
        } catch (error) {
          console.error("Error loading quack audio for export:", error);
        }
      }

      // Run FFmpeg for MP4 only
      // Match capture FPS (20 FPS) to ensure correct playback speed
      const fps = 20;
      const outputFile = "output.mp4";
      const mimeType = "video/mp4";

      // Calculate video duration from frame count
      const videoDuration = this.capturedFrames.length / fps;

      // Build FFmpeg command
      let ffmpegArgs = ["-framerate", String(fps), "-i", "frame%05d.jpg"];

      // Add audio if we have quacks
      if (hasAudio && this.quackTimestamps.length > 0) {
        // Create filter complex to add quacks at specific timestamps
        // We'll create multiple delayed copies of the quack and mix them
        const filterParts = [];
        const mixInputs = [];

        // Trim each quack to its actual duration (estimate 0.5 seconds per quack)
        // Then delay each one to its timestamp to prevent stacking
        this.quackTimestamps.forEach((timestamp, index) => {
          const delayMs = Math.round(timestamp * 1000); // Convert to milliseconds
          const inputLabel = `quack${index}`;
          const trimmedLabel = `quack_trimmed${index}`;
          // Trim quack to 0.5 seconds (estimate) to prevent stacking
          // Each quack instance is trimmed to just its duration before being delayed
          filterParts.push(`[1:a]atrim=0:0.5[${trimmedLabel}]`);
          // Delay the trimmed quack to its timestamp
          filterParts.push(
            `[${trimmedLabel}]adelay=${delayMs}|${delayMs}[${inputLabel}]`
          );
          mixInputs.push(`[${inputLabel}]`);
        });

        // Create a silent audio track for the video duration
        filterParts.push(
          `anullsrc=channel_layout=stereo:sample_rate=44100[silence]`
        );
        filterParts.push(`[silence]atrim=0:${videoDuration}[silence_trim]`);

        // Mix all quacks with silence
        const allInputs = mixInputs.join("");
        filterParts.push(
          `${allInputs}[silence_trim]amix=inputs=${
            this.quackTimestamps.length + 1
          }:duration=longest:dropout_transition=0[audio]`
        );

        ffmpegArgs.push(
          "-i",
          "quack.mp3",
          "-filter_complex",
          filterParts.join(";"),
          "-map",
          "0:v", // Map video
          "-map",
          "[audio]", // Map mixed audio
          "-c:v",
          "libx264",
          "-preset",
          "ultrafast",
          "-tune",
          "animation",
          "-pix_fmt",
          "yuv420p",
          "-crf",
          "22",
          "-c:a",
          "aac",
          "-b:a",
          "128k",
          "-shortest", // End when video ends
          outputFile
        );
      } else {
        // No audio, just video
        ffmpegArgs.push(
          "-c:v",
          "libx264",
          "-preset",
          "ultrafast",
          "-tune",
          "animation",
          "-pix_fmt",
          "yuv420p",
          "-crf",
          "22",
          outputFile
        );
      }

      await this.ffmpeg.exec(ffmpegArgs);

      this.showStatus("Processing: 100%", "info", true);

      // Read the output file
      const data = await this.ffmpeg.readFile(outputFile);
      // data is a Uint8Array in the new API
      this.exportBlob = new Blob([data], { type: mimeType });

      const fileSizeMB = (this.exportBlob.size / 1024 / 1024).toFixed(2);
      console.log(`MP4 ready! Size: ${fileSizeMB} MB`);

      // Show embedded media preview
      this.showExportedMedia();

      // Enable download button, re-enable export button
      document.getElementById("downloadRace").disabled = false;
      document.getElementById("exportRace").disabled = false;

      this.isExporting = false;
      this.showStatus(
        `✅ Converted successfully! (${fileSizeMB} MB)`,
        "success"
      );
    } catch (error) {
      console.error("Export failed:", error);
      this.isExporting = false;
      this.showStatus(`❌ Export failed: ${error.message}`, "info");
    }
  }

  showExportedMedia() {
    const mediaContainer = document.getElementById("exportMedia");

    if (!mediaContainer) {
      console.error("Export media container not found");
      return;
    }

    if (!this.exportBlob) {
      console.error("Export blob not available");
      return;
    }

    console.log(
      "Showing exported MP4:",
      "Blob size:",
      this.exportBlob.size,
      "Type:",
      this.exportBlob.type
    );

    // Revoke previous blob URL if it exists
    if (this.exportBlobURL) {
      URL.revokeObjectURL(this.exportBlobURL);
    }

    // Clear previous media
    mediaContainer.innerHTML = "";

    // Create new blob URL and store it
    this.exportBlobURL = URL.createObjectURL(this.exportBlob);

    // Create MP4 video element
    const video = document.createElement("video");
    video.src = this.exportBlobURL;
    video.controls = true;
    video.autoplay = false;
    video.loop = true;
    video.style.maxWidth = "100%";
    video.style.width = "100%";
    video.style.height = "auto";
    video.style.display = "block";
    video.onloadeddata = () => {
      console.log("Video loaded successfully");
      // Show preview container once video is loaded
      const preview = document.querySelector(".export-preview-inline");
      if (preview) {
        preview.classList.add("show");
      }
    };
    video.onerror = (e) => {
      console.error("Error loading video:", e, "URL:", this.exportBlobURL);
    };
    mediaContainer.appendChild(video);
  }

  downloadFile() {
    if (!this.exportBlob) return;

    const url = URL.createObjectURL(this.exportBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `duck-race-${Date.now()}.mp4`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);

    this.showStatus("Downloaded!", "success");
  }

  showStatus(message, type, persistent = false) {
    const statusDiv = document.getElementById("status");

    // Clear any existing timeout
    if (this.statusTimeout) {
      clearTimeout(this.statusTimeout);
      this.statusTimeout = null;
    }

    statusDiv.textContent = message;
    statusDiv.className = `status show ${type}`;

    // Only auto-hide if not persistent
    if (!persistent) {
      this.statusTimeout = setTimeout(() => {
        statusDiv.classList.remove("show");
      }, 5000);
    }
  }
}

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Check if running from file:// protocol
  if (window.location.protocol === "file:") {
    const warning = document.getElementById("serverWarning");
    if (warning) {
      warning.style.display = "block";
    }
    console.warn("=====================================================");
    console.warn("⚠️  WARNING: Running from file:// protocol");
    console.warn("Video export may not work without a web server!");
    console.warn("");
    console.warn("To run properly, use one of these commands:");
    console.warn("");
    console.warn("Option 1 - Python (easiest):");
    console.warn("  python3 -m http.server 8000");
    console.warn("  Then open: http://localhost:8000");
    console.warn("");
    console.warn("Option 2 - Use the provided script:");
    console.warn("  ./start-server.sh");
    console.warn("=====================================================");
  }

  // FFmpeg will be loaded by the DuckRace constructor
  console.log("Initializing Duck Race");

  new DuckRace();
});
