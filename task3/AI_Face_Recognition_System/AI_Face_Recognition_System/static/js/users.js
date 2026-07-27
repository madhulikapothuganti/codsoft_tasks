/* users.js — handle user deletion with confirmation + automatic retraining feedback */

(function () {
  const tableBody = document.getElementById("usersTableBody");
  if (!tableBody) return;

  tableBody.addEventListener("click", async (e) => {
    const btn = e.target.closest(".delete-btn");
    if (!btn) return;

    const id = btn.dataset.id;
    const name = btn.dataset.name;

    if (!confirm(`Delete "${name}"? This will remove their face data and retrain the model. This cannot be undone.`)) {
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';

    const { data } = await apiFetch(`/api/delete_user/${id}`, { method: "POST" });

    if (data.success) {
      const row = tableBody.querySelector(`tr[data-db-id="${id}"]`);
      if (row) row.remove();
      toast(`${name} deleted. Model retrained automatically.`, "success");

      if (!tableBody.querySelector("tr")) {
        setTimeout(() => window.location.reload(), 700);
      }
    } else {
      toast(data.message || "Could not delete user.", "error");
      btn.disabled = false;
      btn.innerHTML = "Delete";
    }
  });
})();
