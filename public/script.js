/**
 * QR Code Generator — Frontend Logic
 * Handles form validation, preview generation, download, and link copying.
 */

(function () {
  "use strict";

  const form = document.getElementById("qr-form");
  const dataInput = document.getElementById("data-input");
  const sizeInput = document.getElementById("size-input");
  const formatSelect = document.getElementById("format-select");
  const ecSelect = document.getElementById("ec-select");
  const borderInput = document.getElementById("border-input");
  const fillColor = document.getElementById("fill-color");
  const backColor = document.getElementById("back-color");

  const previewArea = document.getElementById("preview-area");
  const placeholder = document.getElementById("placeholder");
  const actionsRow = document.getElementById("actions");
  const directLinkEl = document.getElementById("direct-link");
  const btnDownload = document.getElementById("btn-download");
  const btnCopyLink = document.getElementById("btn-copy-link");
  const toast = document.getElementById("toast");

  let currentUrl = null;
  let currentBlob = null;

  // --- Validation ---

  function showError(id, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.classList.add("visible");
  }

  function clearErrors() {
    document.querySelectorAll(".error-msg").forEach(function (el) {
      el.textContent = "";
      el.classList.remove("visible");
    });
  }

  function validate() {
    clearErrors();
    let valid = true;

    const data = dataInput.value.trim();
    if (!data) {
      showError("data-error", "This field is required.");
      valid = false;
    } else if (data.length > 4096) {
      showError("data-error", "Input exceeds 4096 characters.");
      valid = false;
    }

    const size = parseInt(sizeInput.value, 10);
    if (isNaN(size) || size < 100 || size > 1000) {
      showError("size-error", "Must be between 100 and 1000.");
      valid = false;
    }

    const border = parseInt(borderInput.value, 10);
    if (isNaN(border) || border < 0 || border > 10) {
      showError("border-error", "Must be between 0 and 10.");
      valid = false;
    }

    return valid;
  }

  // --- URL Builder ---

  function buildApiUrl() {
    const params = new URLSearchParams();
    params.set("data", dataInput.value.trim());
    params.set("size", sizeInput.value);
    params.set("format", formatSelect.value);
    params.set("error_correction", ecSelect.value);
    params.set("border", borderInput.value);
    params.set("fill_color", fillColor.value);
    params.set("back_color", backColor.value);
    return "/api/generate?" + params.toString();
  }

  function buildFullUrl() {
    return window.location.origin + buildApiUrl();
  }

  // --- Preview ---

  function showPreview(url) {
    // Remove old preview image if any
    const existingImg = previewArea.querySelector("img");
    if (existingImg) existingImg.remove();

    placeholder.style.display = "none";

    const img = document.createElement("img");
    img.src = url;
    img.alt = "Generated QR code for: " + dataInput.value.trim();
    img.width = 280;
    img.height = 280;
    previewArea.insertBefore(img, previewArea.firstChild);

    actionsRow.style.display = "flex";
    directLinkEl.style.display = "block";
    directLinkEl.textContent = buildFullUrl();
  }

  // --- Toast ---

  let toastTimeout = null;

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(function () {
      toast.classList.remove("show");
    }, 1800);
  }

  // --- Event Handlers ---

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validate()) return;

    const url = buildApiUrl();
    currentUrl = url;

    // Fetch as blob for download capability
    fetch(url)
      .then(function (res) {
        if (!res.ok) {
          return res.json().then(function (err) {
            throw new Error(err.detail || "Generation failed");
          });
        }
        return res.blob();
      })
      .then(function (blob) {
        currentBlob = blob;
        const objectUrl = URL.createObjectURL(blob);
        showPreview(objectUrl);
      })
      .catch(function (err) {
        showError("data-error", err.message);
      });
  });

  btnDownload.addEventListener("click", function () {
    if (!currentBlob) return;

    const ext = formatSelect.value;
    const filename = "qrcode." + ext;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(currentBlob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast("Downloaded");
  });

  btnCopyLink.addEventListener("click", function () {
    const fullUrl = buildFullUrl();
    navigator.clipboard.writeText(fullUrl).then(function () {
      showToast("Link copied");
    }).catch(function () {
      // Fallback: select the direct link text
      const range = document.createRange();
      range.selectNodeContents(directLinkEl);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      showToast("Select and copy manually");
    });
  });
})();
