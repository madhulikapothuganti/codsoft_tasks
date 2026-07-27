/* ==========================================================
   AI Image Caption Generator - script.js
   Handles drag & drop, file preview, AJAX upload, and UI state
   ========================================================== */

document.addEventListener("DOMContentLoaded", () => {
    // Element references
    const dropZone = document.getElementById("dropZone");
    const dropZoneContent = document.getElementById("dropZoneContent");
    const browseBtn = document.getElementById("browseBtn");
    const fileInput = document.getElementById("fileInput");
    const previewWrapper = document.getElementById("previewWrapper");
    const imagePreview = document.getElementById("imagePreview");
    const fileNameLabel = document.getElementById("fileNameLabel");

    const generateBtn = document.getElementById("generateBtn");
    const resetBtn = document.getElementById("resetBtn");
    const loadingSpinner = document.getElementById("loadingSpinner");

    const captionCard = document.getElementById("captionCard");
    const captionText = document.getElementById("captionText");
    const copyBtn = document.getElementById("copyBtn");
    const copyBtnLabel = document.getElementById("copyBtnLabel");

    const errorAlert = document.getElementById("errorAlert");
    const errorMessage = document.getElementById("errorMessage");

    const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
    const MAX_SIZE_BYTES = 8 * 1024 * 1024; // 8MB

    let selectedFile = null;

    // ---------------- Helpers ----------------
    function showError(message) {
        errorMessage.textContent = message;
        errorAlert.classList.remove("d-none");
    }

    function hideError() {
        errorAlert.classList.add("d-none");
        errorMessage.textContent = "";
    }

    function resetUI() {
        selectedFile = null;
        fileInput.value = "";
        imagePreview.src = "";
        fileNameLabel.textContent = "";

        dropZoneContent.classList.remove("d-none");
        previewWrapper.classList.add("d-none");

        generateBtn.classList.add("d-none");
        resetBtn.classList.add("d-none");
        loadingSpinner.classList.add("d-none");
        captionCard.classList.add("d-none");
        captionText.textContent = "";

        hideError();
    }

    function validateFile(file) {
        if (!file) {
            return "No file selected.";
        }
        if (!ALLOWED_TYPES.includes(file.type)) {
            return "Unsupported file type. Please upload a PNG, JPG, JPEG, or WEBP image.";
        }
        if (file.size > MAX_SIZE_BYTES) {
            return "The image is too large. Maximum allowed size is 8MB.";
        }
        return null;
    }

    function handleFileSelection(file) {
        hideError();
        captionCard.classList.add("d-none");

        const validationError = validateFile(file);
        if (validationError) {
            showError(validationError);
            return;
        }

        selectedFile = file;

        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            fileNameLabel.textContent = file.name;

            dropZoneContent.classList.add("d-none");
            previewWrapper.classList.remove("d-none");

            generateBtn.classList.remove("d-none");
            resetBtn.classList.remove("d-none");
        };
        reader.onerror = () => {
            showError("Could not read the selected file. Please try another image.");
        };
        reader.readAsDataURL(file);
    }

    // ---------------- Browse Button ----------------
    browseBtn.addEventListener("click", () => {
        fileInput.click();
    });

    fileInput.addEventListener("change", (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFileSelection(e.target.files[0]);
        }
    });

    // ---------------- Drag & Drop ----------------
    ["dragenter", "dragover"].forEach((eventName) => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add("drag-over");
        });
    });

    ["dragleave", "drop"].forEach((eventName) => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove("drag-over");
        });
    });

    dropZone.addEventListener("drop", (e) => {
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            handleFileSelection(files[0]);
        }
    });

    // Clicking anywhere on the drop zone (while empty) opens the file picker
    dropZone.addEventListener("click", (e) => {
        if (!dropZoneContent.classList.contains("d-none") && e.target !== browseBtn) {
            fileInput.click();
        }
    });

    // ---------------- Generate Caption ----------------
    generateBtn.addEventListener("click", async () => {
        if (!selectedFile) {
            showError("Please select an image first.");
            return;
        }

        hideError();
        captionCard.classList.add("d-none");
        loadingSpinner.classList.remove("d-none");
        generateBtn.disabled = true;
        generateBtn.classList.add("disabled");

        const formData = new FormData();
        formData.append("image", selectedFile);

        try {
            const response = await fetch("/upload", {
                method: "POST",
                body: formData,
            });

            let data;
            try {
                data = await response.json();
            } catch (parseErr) {
                throw new Error("Received an invalid response from the server.");
            }

            if (!response.ok || !data.success) {
                throw new Error(data.error || "Failed to generate a caption. Please try again.");
            }

            captionText.textContent = data.caption;
            captionCard.classList.remove("d-none");
        } catch (err) {
            showError(err.message || "Something went wrong. Please try again.");
        } finally {
            loadingSpinner.classList.add("d-none");
            generateBtn.disabled = false;
            generateBtn.classList.remove("disabled");
        }
    });

    // ---------------- Reset ----------------
    resetBtn.addEventListener("click", resetUI);

    // ---------------- Copy Caption ----------------
    copyBtn.addEventListener("click", async () => {
        const text = captionText.textContent;
        if (!text) return;

        try {
            await navigator.clipboard.writeText(text);
            const original = copyBtnLabel.textContent;
            copyBtnLabel.textContent = "Copied!";
            setTimeout(() => {
                copyBtnLabel.textContent = original;
            }, 1800);
        } catch (err) {
            showError("Could not copy the caption to clipboard.");
        }
    });
});
