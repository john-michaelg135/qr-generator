/**
 * QR Code Generator — Frontend Logic
 */

(function () {
  "use strict";

  var form = document.getElementById("qr-form");
  var dataInput = document.getElementById("data-input");
  var sizeInput = document.getElementById("size-input");
  var formatSelect = document.getElementById("format-select");
  var ecSelect = document.getElementById("ec-select");
  var borderInput = document.getElementById("border-input");
  var fillColor = document.getElementById("fill-color");
  var backColor = document.getElementById("back-color");

  var previewArea = document.getElementById("preview-area");
  var placeholder = document.getElementById("placeholder");
  var actionsRow = document.getElementById("actions");
  var directLinkEl = document.getElementById("direct-link");
  var btnDownload = document.getElementById("btn-download");
  var btnCopyLink = document.getElementById("btn-copy-link");
  var toast = document.getElementById("toast");

  var infoFormat = document.getElementById("info-format");
  var infoSize = document.getElementById("info-size");
  var infoEc = document.getElementById("info-ec");

  var currentBlob = null;

  // --- Validation ---

  function showError(id, msg) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.classList.add("visible");
  }

  function clearErrors() {
    var els = document.querySelectorAll(".error-msg");
    for (var i = 0; i < els.length; i++) {
      els[i].textContent = "";
      els[i].classList.remove("visible");
    }
  }

  function validate() {
    clearErrors();
    var valid = true;

    var data = dataInput.value.trim();
    if (!data) {
      showError("data-error", "This field is required.");
      valid = false;
    } else if (data.length > 4096) {
      showError("data-error", "Input exceeds 4096 characters.");
      valid = false;
    }

    var size = parseInt(sizeInput.value, 10);
    if (isNaN(size) || size < 100 || size > 1000) {
      showError("size-error", "Must be between 100 and 1000.");
      valid = false;
    }

    var border = parseInt(borderInput.value, 10);
    if (isNaN(border) || border < 0 || border > 10) {
      showError("border-error", "Must be between 0 and 10.");
      valid = false;
    }

    return valid;
  }

  // --- URL Builder ---

  function buildApiUrl() {
    var params = new URLSearchParams();
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

  // --- Info bar update ---

  function updateInfoBar() {
    infoFormat.textContent = formatSelect.value.toUpperCase();
    infoSize.textContent = sizeInput.value + " x " + sizeInput.value;
    infoEc.textContent = "EC: " + ecSelect.value;
  }

  // --- Preview ---

  function showPreview(objectUrl) {
    var existingImg = previewArea.querySelector("img");
    if (existingImg) {
      URL.revokeObjectURL(existingImg.src);
      existingImg.remove();
    }

    placeholder.style.display = "none";

    var img = document.createElement("img");
    img.src = objectUrl;
    img.alt = "Generated QR code for: " + dataInput.value.trim();
    previewArea.insertBefore(img, previewArea.firstChild);

    actionsRow.style.display = "flex";
    directLinkEl.style.display = "block";
    directLinkEl.textContent = buildFullUrl();

    updateInfoBar();
  }

  // --- Toast ---

  var toastTimeout = null;

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(function () {
      toast.classList.remove("show");
    }, 1600);
  }

  // --- Events ---

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validate()) return;

    var url = buildApiUrl();

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
        showPreview(URL.createObjectURL(blob));
      })
      .catch(function (err) {
        showError("data-error", err.message);
      });
  });

  btnDownload.addEventListener("click", function () {
    if (!currentBlob) return;

    var ext = formatSelect.value;
    var a = document.createElement("a");
    a.href = URL.createObjectURL(currentBlob);
    a.download = "qrcode." + ext;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast("Downloaded");
  });

  btnCopyLink.addEventListener("click", function () {
    var fullUrl = buildFullUrl();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(fullUrl).then(function () {
        showToast("Link copied");
      });
    } else {
      var range = document.createRange();
      range.selectNodeContents(directLinkEl);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      showToast("Select and copy");
    }
  });

  // Initialize info bar
  updateInfoBar();
})();
