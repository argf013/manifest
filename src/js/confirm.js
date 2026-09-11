export function confirm(message, options = {}) {
  return new Promise(function (resolve) {
    const title = options.title || "Confirm";
    const confirmText = options.confirmText || "Confirm";
    const cancelText = options.cancelText || "Cancel";

    const backdrop = document.createElement("div");
    backdrop.classList.add("manifest-modal-backdrop");

    const modal = document.createElement("div");
    modal.classList.add("manifest-modal");
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");

    const header = document.createElement("div");
    header.classList.add("modal-header");

    const titleEl = document.createElement("span");
    titleEl.classList.add("modal-title");
    titleEl.textContent = `❏ ${title}`;
    header.appendChild(titleEl);

    const closeBtn = document.createElement("button");
    closeBtn.classList.add("modal-close-btn");
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.textContent = "×";
    header.appendChild(closeBtn);

    modal.appendChild(header);

    const body = document.createElement("div");
    body.classList.add("modal-body");
    const msgEl = document.createElement("p");
    msgEl.textContent = message;
    body.appendChild(msgEl);
    modal.appendChild(body);

    const footer = document.createElement("div");
    footer.classList.add("modal-footer");

    const cancelBtn = document.createElement("button");
    cancelBtn.classList.add("modal-btn", "modal-btn-cancel");
    cancelBtn.textContent = cancelText;

    const confirmBtn = document.createElement("button");
    confirmBtn.classList.add("modal-btn", "modal-btn-confirm");
    confirmBtn.textContent = confirmText;

    footer.appendChild(cancelBtn);
    footer.appendChild(confirmBtn);
    modal.appendChild(footer);

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    function cleanup(result) {
      document.removeEventListener("keydown", onKeyDown);
      if (backdrop.parentNode) {
        backdrop.parentNode.removeChild(backdrop);
      }
      resolve(result);
    };

    function onKeyDown(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        cleanup(false);
      } else if (e.key === "Enter") {
        e.preventDefault();
        cleanup(true);
      }
    };

    backdrop.addEventListener("mousedown", function (e) {
      e.stopPropagation();
      if (e.target === backdrop) {
        cleanup(false);
      }
    });
    backdrop.addEventListener("touchstart", function (e) { e.stopPropagation(); });
    modal.addEventListener("mousedown", function (e) { e.stopPropagation(); });
    modal.addEventListener("touchstart", function (e) { e.stopPropagation(); });

    cancelBtn.addEventListener("click", function () { cleanup(false); });
    closeBtn.addEventListener("click", function () { cleanup(false); });
    confirmBtn.addEventListener("click", function () { cleanup(true); });

    document.addEventListener("keydown", onKeyDown);
    confirmBtn.focus();
  });
};
