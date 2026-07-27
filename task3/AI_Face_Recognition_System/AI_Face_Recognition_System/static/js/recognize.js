/* recognize.js — live webcam recognition loop with on-screen face boxes and a scrolling result feed */

(function () {
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");
  const video = document.getElementById("video");
  const overlay = document.getElementById("overlay");
  const scanline = document.getElementById("scanline");
  const placeholder = document.getElementById("cameraPlaceholder");
  const recognitionList = document.getElementById("recognitionList");
  const recognitionEmpty = document.getElementById("recognitionEmpty");

  const SCAN_INTERVAL_MS = 900;
  let stream = null;
  let scanTimer = null;
  let busy = false;
  const markedToday = new Set();

  function drawBoxes(faces, videoW, videoH) {
    const ctx = overlay.getContext("2d");
    overlay.width = overlay.clientWidth;
    overlay.height = overlay.clientHeight;
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    const scaleX = overlay.width / videoW;
    const scaleY = overlay.height / videoH;

    faces.forEach((f) => {
      const [x, y, w, h] = f.box;
      const bx = x * scaleX;
      const by = y * scaleY;
      const bw = w * scaleX;
      const bh = h * scaleY;
      const color = f.status === "known" ? "#2bd576" : "#ff4757";

      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.strokeRect(bx, by, bw, bh);

      const label = f.status === "known" ? `${f.name} (${f.confidence}%)` : "UNKNOWN";
      ctx.font = "600 13px 'JetBrains Mono', monospace";
      const textWidth = ctx.measureText(label).width;
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(5,7,13,0.85)";
      ctx.fillRect(bx - 1, by - 26, textWidth + 14, 22);
      ctx.fillStyle = color;
      ctx.fillText(label, bx + 6, by - 10);
    });
  }

  function addFeedItem(f) {
    if (recognitionEmpty) recognitionEmpty.remove();

    const item = document.createElement("div");
    item.className = "glass-card card-pad";
    item.style.padding = "14px 16px";
    item.style.animation = "fadeUp 0.3s ease both";

    const time = new Date().toLocaleTimeString();
    const isKnown = f.status === "known";

    item.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-12">
          <div class="stat-icon ${isKnown ? "success" : "danger"}" style="width:32px;height:32px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6"/></svg>
          </div>
          <div>
            <div style="font-family:var(--font-display); font-weight:600; font-size:14px; color:var(--text-hi);">${isKnown ? f.name : "UNKNOWN"}</div>
            <div class="text-low mono" style="font-size:11px;">${isKnown ? `ID ${f.user_id} · ${f.department}` : "Not in database"}</div>
          </div>
        </div>
        <div style="text-align:right;">
          <div class="mono" style="font-size:13px; color:${isKnown ? "var(--success)" : "var(--danger)"};">${f.confidence}%</div>
          <div class="text-low" style="font-size:10.5px;">${time}</div>
        </div>
      </div>
      ${f.attendance_marked ? '<div class="badge success mt-8" style="width:fit-content;">✓ Attendance marked</div>' : ""}
    `;

    recognitionList.prepend(item);

    const items = recognitionList.querySelectorAll(".glass-card");
    if (items.length > 25) items[items.length - 1].remove();
  }

  async function startCamera() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });
      video.srcObject = stream;
      placeholder.style.display = "none";
      scanline.classList.add("active");
      return true;
    } catch (err) {
      let msg = "Could not access the camera.";
      if (err && err.name === "NotFoundError") msg = "No camera was found on this device.";
      else if (err && err.name === "NotAllowedError") msg = "Camera access was denied. Please allow camera permissions and try again.";
      else if (err && err.name === "NotReadableError") msg = "The camera is already in use by another application.";
      toast(msg, "error");
      return false;
    }
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
    scanline.classList.remove("active");
    const ctx = overlay.getContext("2d");
    ctx.clearRect(0, 0, overlay.width, overlay.height);
  }

  function grabFrame() {
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return { dataUrl: canvas.toDataURL("image/jpeg", 0.85), w: canvas.width, h: canvas.height };
  }

  async function scanLoop() {
    if (busy || !stream) return;
    busy = true;

    const { dataUrl, w, h } = grabFrame();
    const { data } = await apiFetch("/api/recognize_face", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: dataUrl }),
    });

    if (data.success) {
      drawBoxes(data.faces, w, h);
      data.faces.forEach((f) => {
        const key = f.status === "known" ? f.user_id : null;
        if (f.status === "known" && !markedToday.has(key)) {
          addFeedItem(f);
          if (f.attendance_marked) markedToday.add(key);
        } else if (f.status === "unknown") {
          addFeedItem(f);
        }
      });
    } else if (data.message) {
      toast(data.message, "error");
      stopEverything();
    }

    busy = false;
  }

  function stopEverything() {
    if (scanTimer) clearInterval(scanTimer);
    scanTimer = null;
    stopCamera();
    startBtn.disabled = false;
    startBtn.innerHTML = 'Start Camera';
    stopBtn.disabled = true;
  }

  startBtn.addEventListener("click", async () => {
    startBtn.disabled = true;
    startBtn.innerHTML = '<span class="spinner"></span> Starting…';
    const ok = await startCamera();
    if (!ok) {
      startBtn.disabled = false;
      startBtn.innerHTML = "Start Camera";
      return;
    }
    startBtn.innerHTML = "Camera Running";
    stopBtn.disabled = false;
    setTimeout(() => {
      scanTimer = setInterval(scanLoop, SCAN_INTERVAL_MS);
    }, 600);
  });

  stopBtn.addEventListener("click", stopEverything);
  window.addEventListener("beforeunload", stopCamera);
})();
