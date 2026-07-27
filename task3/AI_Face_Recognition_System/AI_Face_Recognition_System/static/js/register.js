/* register.js — handles webcam capture flow for face registration */

(function () {
  const detailsForm = document.getElementById("detailsForm");
  const startBtn = document.getElementById("startBtn");
  const cancelBtn = document.getElementById("cancelBtn");
  const video = document.getElementById("video");
  const overlay = document.getElementById("overlay");
  const scanline = document.getElementById("scanline");
  const placeholder = document.getElementById("cameraPlaceholder");
  const progressFill = document.getElementById("progressFill");
  const progressText = document.getElementById("progressText");
  const progressStatus = document.getElementById("progressStatus");

  const REQUIRED = window.REQUIRED_CAPTURES || 30;
  const CAPTURE_INTERVAL_MS = 350;

  let stream = null;
  let folder = null;
  let captureCount = 0;
  let captureTimer = null;
  let busy = false;

  function setProgress(count) {
    captureCount = count;
    const pct = Math.min(100, Math.round((count / REQUIRED) * 100));
    progressFill.style.width = pct + "%";
    progressText.textContent = `${count} / ${REQUIRED} samples`;
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
      placeholder.querySelector("span").textContent = msg;
      return false;
    }
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
    scanline.classList.remove("active");
  }

  function grabFrame() {
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85);
  }

  async function captureLoop() {
    if (busy || captureCount >= REQUIRED) return;
    busy = true;

    const imageData = grabFrame();
    const { ok, data } = await apiFetch("/api/capture_face", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder, image: imageData, index: captureCount }),
    });

    if (data.success) {
      setProgress(captureCount + 1);
      progressStatus.textContent = "Captured";
      progressStatus.style.color = "var(--success)";
    } else if (data.error === "no_face") {
      progressStatus.textContent = "No face — center your face";
      progressStatus.style.color = "var(--warning)";
    } else if (data.error === "multiple_faces") {
      progressStatus.textContent = "Multiple faces detected";
      progressStatus.style.color = "var(--danger)";
    } else {
      progressStatus.textContent = data.message || "Capture error";
      progressStatus.style.color = "var(--danger)";
    }

    busy = false;

    if (captureCount >= REQUIRED) {
      finishCapture();
    }
  }

  function finishCapture() {
    clearInterval(captureTimer);
    captureTimer = null;
    stopCamera();
    progressStatus.textContent = "Complete!";
    progressStatus.style.color = "var(--success)";
    cancelBtn.disabled = true;
    toast(`${REQUIRED} face samples captured successfully.`, "success");

    setTimeout(() => {
      window.location.href = "/train?justRegistered=1";
    }, 900);
  }

  detailsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    startBtn.disabled = true;
    startBtn.innerHTML = '<span class="spinner"></span> Starting…';

    const name = document.getElementById("fullName").value.trim();
    const userId = document.getElementById("userId").value.trim();
    const department = document.getElementById("department").value.trim();

    const { ok, data } = await apiFetch("/api/register_user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, user_id: userId, department }),
    });

    if (!data.success) {
      toast(data.message || "Registration failed.", "error");
      startBtn.disabled = false;
      startBtn.innerHTML = "Start Camera & Capture";
      return;
    }

    folder = data.folder;
    toast(`Profile created for ${name}. Starting camera…`, "success");

    const camOk = await startCamera();
    if (!camOk) {
      startBtn.disabled = false;
      startBtn.innerHTML = "Start Camera & Capture";
      return;
    }

    // Lock the form, enable cancel
    Array.from(detailsForm.elements).forEach((el) => (el.disabled = true));
    cancelBtn.disabled = false;
    setProgress(0);
    progressStatus.textContent = "Capturing…";
    progressStatus.style.color = "var(--scan-cyan)";

    // Give the video a moment to start rendering frames
    setTimeout(() => {
      captureTimer = setInterval(captureLoop, CAPTURE_INTERVAL_MS);
    }, 700);
  });

  cancelBtn.addEventListener("click", () => {
    if (captureTimer) clearInterval(captureTimer);
    captureTimer = null;
    stopCamera();
    toast("Capture cancelled. You can restart registration below.", "warning");
    setTimeout(() => window.location.reload(), 800);
  });

  window.addEventListener("beforeunload", stopCamera);
})();
