/* train.js — starts training and polls /api/train_status for live progress */

(function () {
  const trainBtn = document.getElementById("trainBtn");
  const fill = document.getElementById("trainProgressFill");
  const countLabel = document.getElementById("trainProgressCount");
  const pctLabel = document.getElementById("trainProgressPct");
  const pill = document.getElementById("trainStatusPill");
  const messageText = document.getElementById("trainMessageText");
  const modelBadge = document.getElementById("modelBadge");

  let polling = null;

  function setPill(state, label) {
    pill.className = "status-pill " + state;
    pill.innerHTML = `<span class="dot"></span>${label}`;
  }

  function render(status) {
    const total = status.total || 0;
    const progress = status.progress || 0;
    const pct = total > 0 ? Math.round((progress / total) * 100) : 0;

    fill.style.width = pct + "%";
    countLabel.textContent = `${progress} / ${total} images`;
    pctLabel.textContent = pct + "%";
    messageText.textContent = status.message || "Idle";

    if (status.running) {
      setPill("pending", "Training…");
      trainBtn.disabled = true;
      trainBtn.innerHTML = '<span class="spinner"></span> Training…';
    } else if (status.done && status.success) {
      setPill("online", "Complete");
      trainBtn.disabled = false;
      trainBtn.innerHTML = "Retrain Model";
      modelBadge.textContent = "Trained";
      modelBadge.className = "badge success";
    } else if (status.done && !status.success) {
      setPill("offline", "Failed");
      trainBtn.disabled = false;
      trainBtn.innerHTML = "Retry Training";
    } else {
      setPill("pending", "Idle");
      trainBtn.disabled = false;
      trainBtn.innerHTML = "Start Training";
    }
  }

  async function pollStatus() {
    const { data } = await apiFetch("/api/train_status");
    render(data);
    if (!data.running) {
      clearInterval(polling);
      polling = null;
      if (data.done && data.success) {
        toast(data.message, "success");
      } else if (data.done && !data.success) {
        toast(data.message || "Training failed.", "error");
      }
    }
  }

  trainBtn.addEventListener("click", async () => {
    trainBtn.disabled = true;
    trainBtn.innerHTML = '<span class="spinner"></span> Starting…';

    const { data } = await apiFetch("/api/train_start", { method: "POST" });
    if (!data.success) {
      toast(data.message || "Could not start training.", "error");
      trainBtn.disabled = false;
      trainBtn.innerHTML = "Start Training";
      return;
    }

    toast("Training started…", "info");
    if (!polling) {
      polling = setInterval(pollStatus, 400);
    }
  });

  // If a training job is already running when the page loads, resume polling
  (async function initialCheck() {
    const { data } = await apiFetch("/api/train_status");
    render(data);
    if (data.running) {
      polling = setInterval(pollStatus, 400);
    }
  })();

  // Auto-suggest training if the user just finished registering
  if (new URLSearchParams(window.location.search).get("justRegistered")) {
    toast("Face captured. Ready to train the model!", "info");
  }
})();
