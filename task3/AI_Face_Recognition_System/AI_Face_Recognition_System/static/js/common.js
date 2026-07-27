/* common.js — shared across every page: mobile nav toggle + toast notifications */

(function () {
  const navToggle = document.getElementById("navToggle");
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("sidebarBackdrop");

  function closeNav() {
    sidebar && sidebar.classList.remove("open");
    backdrop && backdrop.classList.remove("open");
  }

  if (navToggle && sidebar) {
    navToggle.addEventListener("click", () => {
      sidebar.classList.toggle("open");
      backdrop && backdrop.classList.toggle("open");
    });
  }
  if (backdrop) {
    backdrop.addEventListener("click", closeNav);
  }
})();

function toast(message, type = "info", duration = 4200) {
  let stack = document.getElementById("toastStack");
  if (!stack) {
    stack = document.createElement("div");
    stack.id = "toastStack";
    document.body.appendChild(stack);
  }
  const icons = {
    success: "✓",
    error: "✕",
    warning: "!",
    info: "i",
  };
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${icons[type] || "i"}</span><span>${message}</span><span class="toast-close">&times;</span>`;
  el.querySelector(".toast-close").addEventListener("click", () => el.remove());
  stack.appendChild(el);
  setTimeout(() => {
    el.style.transition = "opacity .3s ease, transform .3s ease";
    el.style.opacity = "0";
    el.style.transform = "translateX(30px)";
    setTimeout(() => el.remove(), 300);
  }, duration);
}

async function apiFetch(url, options = {}) {
  try {
    const resp = await fetch(url, options);
    let data;
    try {
      data = await resp.json();
    } catch (e) {
      data = { success: false, message: "The server returned an unexpected response." };
    }
    return { ok: resp.ok, status: resp.status, data };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      data: { success: false, message: "Could not reach the server. Is the Flask app still running?" },
    };
  }
}
