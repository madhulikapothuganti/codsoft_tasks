/* detect.js — upload an image and run face detection */

(function () {
  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");
  const fileNameRow = document.getElementById("fileNameRow");
  const fileNameLabel = document.getElementById("fileNameLabel");
  const clearFileBtn = document.getElementById("clearFileBtn");
  const detectBtn = document.getElementById("detectBtn");
  const resultImage = document.getElementById("resultImage");
  const resultPlaceholder = document.getElementById("resultPlaceholder");
  const faceCountLabel = document.getElementById("faceCountLabel");

  let selectedFile = null;

  function selectFile(file) {
    if (!file) return;
    const allowed = [".jpg", ".jpeg", ".png", ".bmp", ".webp"];
    const lower = file.name.toLowerCase();
    if (!allowed.some((ext) => lower.endsWith(ext))) {
      toast("Unsupported file type. Please choose a JPG, PNG, BMP or WEBP image.", "error");
      return;
    }
    selectedFile = file;
    fileNameLabel.textContent = file.name;
    fileNameRow.style.display = "flex";
    detectBtn.disabled = false;
  }

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.style.borderColor = "var(--scan-cyan)";
  });
  dropZone.addEventListener("dragleave", () => {
    dropZone.style.borderColor = "var(--glass-border)";
  });
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.style.borderColor = "var(--glass-border)";
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      selectFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener("change", () => {
    if (fileInput.files && fileInput.files[0]) selectFile(fileInput.files[0]);
  });

  clearFileBtn.addEventListener("click", () => {
    selectedFile = null;
    fileInput.value = "";
    fileNameRow.style.display = "none";
    detectBtn.disabled = true;
  });

  detectBtn.addEventListener("click", async () => {
    if (!selectedFile) return;
    detectBtn.disabled = true;
    detectBtn.innerHTML = '<span class="spinner"></span> Analyzing…';

    const formData = new FormData();
    formData.append("image", selectedFile);

    const { data } = await apiFetch("/api/detect_faces", { method: "POST", body: formData });

    detectBtn.disabled = false;
    detectBtn.innerHTML = "Run Detection";

    if (!data.success) {
      toast(data.message || "Detection failed.", "error");
      return;
    }

    resultImage.src = data.image;
    resultImage.style.display = "block";
    resultPlaceholder.style.display = "none";
    faceCountLabel.textContent = data.face_count;
    faceCountLabel.style.color = data.face_count > 0 ? "var(--success)" : "var(--text-hi)";

    if (data.face_count === 0) {
      toast("No faces detected in this image.", "warning");
    } else {
      toast(`Detected ${data.face_count} face${data.face_count === 1 ? "" : "s"}.`, "success");
    }
  });
})();
