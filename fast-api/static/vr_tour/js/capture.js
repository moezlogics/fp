/**
 * 360° Guided Capture Engine — Foodies Pakistan
 * 
 * Google Street View-style guided photo capture with 3-ring system.
 * Uses phone gyroscope + camera for auto-snap when aligned.
 * 
 * Ring 1 (Horizon):  12 shots at pitch=0°,  every 30° yaw
 * Ring 2 (Upper):      8 shots at pitch=+50°, every 45° yaw
 * Ring 3 (Lower):      8 shots at pitch=-50°, every 45° yaw
 * Ring 4 (Ceiling):    2 shots at pitch=+85° (zenith cap)
 * Total:              30 shots — fuller vertical coverage so the stitched
 *                     equirectangular has far smaller black caps at the poles.
 *
 * NOTE: device-orientation (compass/gyro) reliability varies by phone/OS and
 * needs on-device QA; webkitCompassHeading can further improve iOS yaw.
 */

// ═══ State ═══
let currentRing = 0;       // 0, 1, 2
let currentYaw = 0;        // Device compass heading (0-360)
let currentPitch = 0;      // Device pitch (-90 to +90)
let isStable = false;      // Is phone stable enough to capture?
let cameraStream = null;
let frameIndex = 0;
let capturedFrames = [];   // { blob, yaw, pitch, dataUrl }
let isCapturing = false;
let lastCaptureTime = 0;
const CAPTURE_COOLDOWN = 800; // ms between auto-captures
const ALIGN_THRESHOLD = 12;   // degrees tolerance for auto-snap
const STABILITY_THRESHOLD = 2.5; // max rotation rate for stability

// ═══ Ring Definitions ═══
const RINGS = [
    {
        name: "Horizon",
        pitch: 0,
        count: 12,
        yawStep: 30,
        targets: [],
    },
    {
        name: "Upper",
        pitch: 50,
        count: 8,
        yawStep: 45,
        targets: [],
    },
    {
        name: "Lower",
        pitch: -50,
        count: 8,
        yawStep: 45,
        targets: [],
    },
    {
        name: "Ceiling",
        pitch: 85,
        count: 2,
        yawStep: 180,
        targets: [],
    },
];

// Generate target positions for each ring
RINGS.forEach(ring => {
    for (let i = 0; i < ring.count; i++) {
        ring.targets.push({
            yaw: i * ring.yawStep,
            pitch: ring.pitch,
            captured: false,
            index: ring.targets.length,
        });
    }
});


// ═══ Permission Handling ═══

async function requestPermissions() {
    try {
        // 1. Camera permission
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: "environment",
                width: { ideal: 2560 },
                height: { ideal: 1920 },
            },
            audio: false,
        });

        const video = document.getElementById("camera-feed");
        video.srcObject = cameraStream;
        await video.play();

        // 2. Motion sensor permission (iOS requires explicit request)
        if (typeof DeviceOrientationEvent !== "undefined" &&
            typeof DeviceOrientationEvent.requestPermission === "function") {
            const perm = await DeviceOrientationEvent.requestPermission();
            if (perm !== "granted") {
                alert("Motion sensor permission is required for guided capture.");
                return;
            }
        }

        // 3. Start orientation tracking
        window.addEventListener("deviceorientation", onDeviceOrientation, true);
        window.addEventListener("devicemotion", onDeviceMotion, true);

        // 4. Show capture view
        document.getElementById("permission-gate").classList.add("hidden");
        document.getElementById("capture-view").classList.remove("hidden");

        // 5. Initialize ring progress + compass dots
        buildRingProgress();
        updateCompassDots();
        updateRingUI();

        // 6. Start alignment check loop
        requestAnimationFrame(alignmentLoop);

    } catch (err) {
        console.error("Permission error:", err);
        alert("Could not access camera or motion sensors. Please ensure permissions are granted and try again.");
    }
}


// ═══ Device Orientation ═══

let rawAlpha = 0, rawBeta = 0, rawGamma = 0;
let alphaOffset = null;

function onDeviceOrientation(e) {
    // Prefer iOS's webkitCompassHeading — it is a calibrated absolute heading
    // (0 = magnetic north, clockwise) and far more reliable than `alpha`, which
    // on iOS is relative/unstable. Convert it to the same counter-clockwise sense
    // as Android's `alpha` so the rest of the alignment logic is unchanged.
    // (Sign may need a final tweak after on-device QA.)
    if (typeof e.webkitCompassHeading === "number" && !Number.isNaN(e.webkitCompassHeading)) {
        rawAlpha = (360 - e.webkitCompassHeading) % 360;
    } else if (e.alpha !== null && e.alpha !== undefined) {
        rawAlpha = e.alpha;  // 0-360 compass (Android)
    } else {
        return;
    }
    rawBeta = e.beta;    // -180 to 180 (front-back tilt)
    rawGamma = e.gamma;  // -90 to 90 (left-right tilt)

    // Set initial offset on first reading (so "forward" = 0°)
    if (alphaOffset === null) {
        alphaOffset = rawAlpha;
    }

    // Normalize yaw relative to starting direction
    currentYaw = (rawAlpha - alphaOffset + 360) % 360;

    // Convert beta to pitch (-90 to +90, where 0 = level, +90 = up)
    // When phone is held upright (portrait), beta ≈ 90
    // We subtract 90 so level = 0
    currentPitch = rawBeta - 90;

    // Clamp pitch
    currentPitch = Math.max(-90, Math.min(90, currentPitch));
}

let rotationRate = 0;

function onDeviceMotion(e) {
    if (!e.rotationRate) return;
    const rr = e.rotationRate;
    rotationRate = Math.sqrt(
        (rr.alpha || 0) ** 2 + (rr.beta || 0) ** 2 + (rr.gamma || 0) ** 2
    );
    isStable = rotationRate < STABILITY_THRESHOLD;
}


// ═══ Compass Visualization ═══

function updateCompassDots() {
    const svg = document.getElementById("target-dots");
    svg.innerHTML = "";

    const ring = RINGS[currentRing];
    const cx = 150, cy = 150, r = 110;

    ring.targets.forEach((target, i) => {
        // Position on the compass circle
        const angle = (target.yaw - 90) * (Math.PI / 180); // -90 to start from top
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);

        const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        dot.setAttribute("cx", x);
        dot.setAttribute("cy", y);
        dot.setAttribute("r", target.captured ? 8 : 10);
        dot.setAttribute("class", `target-dot ${target.captured ? "captured" : ""}`);
        dot.setAttribute("fill", target.captured ? "#22c55e" : "rgba(255,255,255,0.25)");
        dot.setAttribute("stroke", target.captured ? "none" : "rgba(255,255,255,0.15)");
        dot.setAttribute("stroke-width", "1");
        dot.id = `dot-${i}`;
        svg.appendChild(dot);
    });
}

function updateAimDot() {
    const aimDot = document.getElementById("aim-dot");
    const cx = 150, cy = 150, r = 110;

    // Map current yaw to compass position
    const angle = (currentYaw - 90) * (Math.PI / 180);
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);

    aimDot.setAttribute("cx", x);
    aimDot.setAttribute("cy", y);

    // Color based on alignment
    const ring = RINGS[currentRing];
    const nearest = findNearestTarget(ring);
    if (nearest && nearest.distance < ALIGN_THRESHOLD) {
        aimDot.setAttribute("fill", "rgba(34, 197, 94, 0.9)");
        aimDot.setAttribute("r", "15");
    } else {
        aimDot.setAttribute("fill", "rgba(255, 165, 0, 0.8)");
        aimDot.setAttribute("r", "12");
    }
}


// ═══ Alignment Detection ═══

function findNearestTarget(ring) {
    let nearest = null;
    let minDist = Infinity;

    for (const target of ring.targets) {
        if (target.captured) continue;

        // Angular distance for yaw (circular)
        let yawDiff = Math.abs(currentYaw - target.yaw);
        if (yawDiff > 180) yawDiff = 360 - yawDiff;

        // Angular distance for pitch
        const pitchDiff = Math.abs(currentPitch - target.pitch);

        // Combined angular distance
        const dist = Math.sqrt(yawDiff * yawDiff + pitchDiff * pitchDiff);

        if (dist < minDist) {
            minDist = dist;
            nearest = { target, distance: dist, yawDiff, pitchDiff };
        }
    }

    return nearest;
}

function alignmentLoop() {
    if (!document.getElementById("capture-view").classList.contains("hidden")) {
        updateAimDot();

        const ring = RINGS[currentRing];
        const nearest = findNearestTarget(ring);
        const alignText = document.getElementById("align-text");

        if (nearest) {
            if (nearest.distance < ALIGN_THRESHOLD) {
                alignText.textContent = isStable ? "✅ Hold steady..." : "Almost there — hold still";
                alignText.className = "align-text aligned";

                // Highlight the target dot
                const dotEl = document.getElementById(`dot-${nearest.target.index}`);
                if (dotEl) dotEl.classList.add("active");

                // Auto-capture if aligned + stable + cooldown passed
                if (isStable && Date.now() - lastCaptureTime > CAPTURE_COOLDOWN) {
                    captureFrame(nearest.target);
                }
            } else {
                alignText.textContent = `↻ Turn ${nearest.yawDiff > 5 ? (currentYaw < nearest.target.yaw ? "right" : "left") : ""}${nearest.pitchDiff > 10 ? (currentPitch < nearest.target.pitch ? " and tilt up" : " and tilt down") : ""}`;
                alignText.className = "align-text";

                // Remove active class from all dots
                document.querySelectorAll(".target-dot.active").forEach(d => d.classList.remove("active"));
            }
        } else {
            // All targets in this ring captured
            advanceRing();
        }

        requestAnimationFrame(alignmentLoop);
    }
}


// ═══ Frame Capture ═══

function captureFrame(target) {
    if (isCapturing) return;
    isCapturing = true;
    lastCaptureTime = Date.now();

    const video = document.getElementById("camera-feed");
    const canvas = document.getElementById("snap-canvas");
    const ctx = canvas.getContext("2d");

    // Set canvas to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame
    ctx.drawImage(video, 0, 0);

    // Convert to blob (JPEG for quality/size balance)
    canvas.toBlob((blob) => {
        // Create data URL for thumbnail
        const thumbCanvas = document.createElement("canvas");
        thumbCanvas.width = 120;
        thumbCanvas.height = 90;
        const tCtx = thumbCanvas.getContext("2d");
        tCtx.drawImage(video, 0, 0, 120, 90);
        const dataUrl = thumbCanvas.toDataURL("image/jpeg", 0.5);

        // Store frame
        capturedFrames.push({
            blob,
            yaw: currentYaw,
            pitch: currentPitch,
            dataUrl,
            index: frameIndex,
        });

        // Mark target as captured
        target.captured = true;
        frameIndex++;

        // Update UI
        updateCompassDots();
        updateFrameCounter();
        addPhotoStrip(dataUrl);
        flashEffect();
        hapticFeedback();

        isCapturing = false;
    }, "image/jpeg", 0.92);
}

function manualCapture() {
    const ring = RINGS[currentRing];
    const nearest = findNearestTarget(ring);
    if (nearest) {
        captureFrame(nearest.target);
    }
}


// ═══ Ring Management ═══

function advanceRing() {
    const ring = RINGS[currentRing];
    const allCaptured = ring.targets.every(t => t.captured);
    if (!allCaptured) return;

    // Mark ring step as done
    const stepEl = document.getElementById(`ring-step-${currentRing + 1}`);
    if (stepEl) {
        stepEl.classList.remove("active");
        stepEl.classList.add("done");
    }

    currentRing++;

    if (currentRing >= RINGS.length) {
        // All rings complete!
        showReviewScreen();
        return;
    }

    // Update UI for next ring
    const nextStepEl = document.getElementById(`ring-step-${currentRing + 1}`);
    if (nextStepEl) nextStepEl.classList.add("active");

    updateRingUI();
    updateCompassDots();
}

function buildRingProgress() {
    const container = document.getElementById("ring-progress");
    if (!container) return;
    container.innerHTML = "";
    RINGS.forEach((ring, i) => {
        if (i > 0) {
            const conn = document.createElement("div");
            conn.className = "ring-connector";
            container.appendChild(conn);
        }
        const step = document.createElement("div");
        step.className = "ring-step" + (i === 0 ? " active" : "");
        step.id = `ring-step-${i + 1}`;
        step.innerHTML = `<div class="ring-dot"></div><span>${ring.name}</span>`;
        container.appendChild(step);
    });
}

function updateRingUI() {
    const ring = RINGS[currentRing];
    document.getElementById("ring-label").textContent = `Ring ${currentRing + 1} / ${RINGS.length}`;
    document.getElementById("ring-name").textContent = ring.name;

    // Update ring steps
    RINGS.forEach((_, i) => {
        const stepEl = document.getElementById(`ring-step-${i + 1}`);
        if (!stepEl) return;
        stepEl.classList.remove("active", "done");
        if (i < currentRing) stepEl.classList.add("done");
        if (i === currentRing) stepEl.classList.add("active");
    });
}


// ═══ UI Helpers ═══

function updateFrameCounter() {
    document.getElementById("frame-count").textContent = capturedFrames.length;
}

function addPhotoStrip(dataUrl) {
    const strip = document.getElementById("photo-strip");
    const img = document.createElement("img");
    img.src = dataUrl;
    img.className = "strip-thumb";
    strip.appendChild(img);
    // Auto-scroll to latest
    strip.scrollLeft = strip.scrollWidth;
}

function flashEffect() {
    const flash = document.getElementById("flash");
    flash.classList.add("active");
    setTimeout(() => flash.classList.remove("active"), 150);
}

function hapticFeedback() {
    if (navigator.vibrate) {
        navigator.vibrate([40, 20, 40]);
    }
}


// ═══ Review Screen ═══

function showReviewScreen() {
    document.getElementById("capture-view").classList.add("hidden");
    document.getElementById("review-screen").classList.remove("hidden");

    const grid = document.getElementById("review-grid");
    grid.innerHTML = "";

    capturedFrames.forEach(frame => {
        const img = document.createElement("img");
        img.src = frame.dataUrl;
        grid.appendChild(img);
    });

    document.getElementById("review-count").textContent = capturedFrames.length;
}

function restartCapture() {
    // Reset state
    currentRing = 0;
    frameIndex = 0;
    capturedFrames = [];
    lastCaptureTime = 0;
    alphaOffset = null;

    RINGS.forEach(ring => ring.targets.forEach(t => t.captured = false));

    // Reset UI
    document.getElementById("photo-strip").innerHTML = "";
    updateFrameCounter();
    updateRingUI();
    updateCompassDots();

    document.getElementById("review-screen").classList.add("hidden");
    document.getElementById("capture-view").classList.remove("hidden");
    requestAnimationFrame(alignmentLoop);
}


// ═══ Upload + Submit ═══

async function submitCapture() {
    document.getElementById("review-screen").classList.add("hidden");
    document.getElementById("upload-overlay").classList.remove("hidden");

    const total = capturedFrames.length;
    let uploaded = 0;

    try {
        // Upload frames one by one
        for (const frame of capturedFrames) {
            const formData = new FormData();
            formData.append("session_id", SESSION_ID);
            formData.append("frame_index", frame.index);
            formData.append("yaw", frame.yaw);
            formData.append("pitch", frame.pitch);
            formData.append("image", frame.blob, `frame_${frame.index}.jpg`);

            const resp = await fetch("/vr-tour/api/upload-frame", {
                method: "POST",
                body: formData,
            });

            if (!resp.ok) {
                const err = await resp.json().catch(() => ({}));
                throw new Error(err.detail || `Upload failed (${resp.status})`);
            }

            uploaded++;
            document.getElementById("upload-progress-text").textContent = `${uploaded} / ${total}`;
            document.getElementById("upload-bar").style.width = `${(uploaded / total) * 100}%`;
        }

        // Trigger stitching
        document.getElementById("upload-progress-text").textContent = "Starting panorama creation...";

        const completeResp = await fetch("/vr-tour/api/complete-capture", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: SESSION_ID }),
        });

        if (!completeResp.ok) {
            const err = await completeResp.json().catch(() => ({}));
            throw new Error(err.detail || "Failed to start stitching");
        }

        // Redirect to processing page
        window.location.href = `/vr-tour/processing/${SESSION_ID}`;

    } catch (err) {
        console.error("Upload error:", err);
        alert(`Upload failed: ${err.message}\n\nPlease try again.`);
        document.getElementById("upload-overlay").classList.add("hidden");
        document.getElementById("review-screen").classList.remove("hidden");
    }
}
