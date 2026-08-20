(function () {

  const pageKey = `code-blanks:${location.pathname}:${document.title}`;
  let saveTimer = null;

  function storageKey(name) {
    return `${pageKey}:${name}`;
  }

  function debounceSave(callback) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(callback, 2000);
  }

  function saveCodeInputs() {
    const values = Array.from(
      document.querySelectorAll(".code-blank-input")
    ).map(input => input.value);

    localStorage.setItem(
      storageKey("inputs"),
      JSON.stringify(values)
    );
  }

  function restoreCodeInputs() {
    const saved = localStorage.getItem(storageKey("inputs"));
    if (!saved) return;

    const values = JSON.parse(saved);

    document.querySelectorAll(".code-blank-input").forEach((input, i) => {
      if (values[i] !== undefined) {
        input.value = values[i];
        input.dispatchEvent(new Event("input"));
      }
    });
  }

  function saveResponses() {
    const values = Array.from(
      document.querySelectorAll(".code-blanks-response")
    ).map(textarea => textarea.value);

    localStorage.setItem(
      storageKey("responses"),
      JSON.stringify(values)
    );
  }

  function restoreResponses() {
    const saved = localStorage.getItem(storageKey("responses"));
    if (!saved) return;

    const values = JSON.parse(saved);

    document.querySelectorAll(".code-blanks-response").forEach((textarea, i) => {
      if (values[i] !== undefined) {
        textarea.value = values[i];
      }
    });
  }

  function serialiseOutput(outputDiv) {
    const clone = outputDiv.cloneNode(true);

    const originalCanvases = outputDiv.querySelectorAll("canvas");
    const clonedCanvases = clone.querySelectorAll("canvas");

    clonedCanvases.forEach((canvas, i) => {
      const originalCanvas = originalCanvases[i];
      if (!originalCanvas) return;

      const img = document.createElement("img");
      img.src = originalCanvas.toDataURL("image/png");
      img.className = canvas.className || "code-blanks-plot";

      if (canvas.width) img.width = canvas.width;
      if (canvas.height) img.height = canvas.height;

      canvas.replaceWith(img);
    });

    return clone.innerHTML;
  }

  function saveOutputs() {
    const values = Array.from(
      document.querySelectorAll(".code-blanks-output")
    ).map(outputDiv => serialiseOutput(outputDiv));

    localStorage.setItem(
      storageKey("outputs"),
      JSON.stringify(values)
    );
  }

  function restoreOutputs() {
    const saved = localStorage.getItem(storageKey("outputs"));
    if (!saved) return;

    const values = JSON.parse(saved);

    document.querySelectorAll(".code-blanks-output").forEach((outputDiv, i) => {
      if (values[i] !== undefined) {
        outputDiv.innerHTML = values[i];
      }
    });
  }

  function addClearButton() {
    const button = document.createElement("button");
    button.type = "button";
    button.id = "code-blanks-clear-storage";
    button.textContent = "Clear saved work";

    button.addEventListener("click", () => {
      if (!confirm("Clear saved work for this page?")) return;

      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(pageKey)) {
          localStorage.removeItem(key);
        }
      });

      location.reload();
    });

    const title =
      document.querySelector("h1.title") ||
      document.querySelector("main h1") ||
      document.querySelector("h1");

    if (title) {
      title.insertAdjacentElement("afterend", button);
    } else {
      document.body.prepend(button);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    restoreCodeInputs();
    restoreResponses();
    restoreOutputs();

    document.addEventListener("input", event => {
      if (event.target.classList.contains("code-blank-input")) {
        debounceSave(saveCodeInputs);
      }

      if (event.target.classList.contains("code-blanks-response")) {
        debounceSave(saveResponses);
      }
    });

    addClearButton();
  });

  window.codeBlanksStorageKey = storageKey;
  window.codeBlanksSaveOutputs = saveOutputs;
  window.codeBlanksSaveInputs = saveCodeInputs;
  window.codeBlanksSaveResponses = saveResponses;

})();