document.addEventListener("DOMContentLoaded", () => {

  function resizeCodeBlankInput(input) {
    const length = Math.max(
      input.value.length + 2,
      input.dataset.answer.length + 2,
      4
    );

    input.style.width = `${length}ch`;
  }

  function styleCommentLines() {
    document.querySelectorAll("pre.code-blanks code").forEach(code => {
      const lines = code.innerHTML.split("\n");

      const updated = lines.map(line => {
        const trimmed = line.replace(/^\s+/, "");

        if (trimmed.startsWith("#")) {
          return `<span class="code-blanks-comment">${line}</span>`;
        }

        return line;
      });

      code.innerHTML = updated.join("\n");
    });
  }

  function reconstructCode(pre) {
    const clone = pre.cloneNode(true);

    clone.querySelectorAll(".code-blank-input").forEach(input => {
      const text = document.createTextNode(input.value);
      input.replaceWith(text);
    });

    return clone.innerText;
  }

  function isErrorOutput(text) {
  if (!text) return false;

  const firstLine = text.trim().split("\n")[0].trim();

  return /^Error\b.*:/.test(firstLine);
}

  function showError(outputDiv, message) {
    outputDiv.innerHTML =
      `<div class="code-blanks-error-box"><pre>${message}</pre></div>`;
  }

  function addToolbar(pre) {
    const wrapper = document.createElement("div");
    wrapper.className = "code-blanks-wrapper";

    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);

    const toolbar = document.createElement("div");
    toolbar.className = "code-blanks-toolbar";

    const runBtn = document.createElement("button");
    runBtn.type = "button";
    runBtn.className = "code-blanks-run";
    runBtn.textContent = "▶ Run Code";
    runBtn.disabled = true;
    runBtn.classList.add("code-blanks-disabled");

    const resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.className = "code-blanks-reset";
    resetBtn.textContent = "↺ Reset Code";

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "code-blanks-copy";
    copyBtn.textContent = "📋 Copy Code";

    toolbar.appendChild(runBtn);
    toolbar.appendChild(resetBtn);
    toolbar.appendChild(copyBtn);

    wrapper.insertBefore(toolbar, pre);

    const outputDiv = document.createElement("div");
    outputDiv.className = "code-blanks-output";
    wrapper.appendChild(outputDiv);

    runBtn.addEventListener("click", async () => {
      const userCode = reconstructCode(pre);
      const functionsCode = window.codeBlanksFunctions || "";

      const code = functionsCode.trim()
        ? functionsCode + "\n\n" + userCode
        : userCode;

      runBtn.disabled = true;
      runBtn.textContent = "Running...";

      try {
        await window.codeBlanksRun(code, outputDiv);

        const txt = outputDiv.innerText.trim();

        if (isErrorOutput(txt)) {
          showError(outputDiv, txt);
        }

        if (window.codeBlanksSaveOutputs) {
          window.codeBlanksSaveOutputs();
        }

      } catch (err) {
        showError(outputDiv, "Error:\n" + (err.message || err));

      } finally {
        runBtn.disabled = false;
        runBtn.textContent = "▶ Run Code";
      }
    });

    resetBtn.addEventListener("click", () => {
      pre.querySelectorAll(".code-blank-input").forEach(input => {
        input.value = input.dataset.default || "";
        resizeCodeBlankInput(input);
      });

      outputDiv.innerHTML = "";

      if (window.codeBlanksSaveInputs) {
        window.codeBlanksSaveInputs();
      }

      if (window.codeBlanksSaveOutputs) {
        window.codeBlanksSaveOutputs();
      }
    });

    copyBtn.addEventListener("click", async () => {
      const userCode = reconstructCode(pre);
      const functionsCode = window.codeBlanksFunctions || "";

      const code = functionsCode.trim()
        ? functionsCode + "\n\n" + userCode
        : userCode;

      try {
        await navigator.clipboard.writeText(code);

        copyBtn.textContent = "✓ Copied";

        setTimeout(() => {
          copyBtn.textContent = "📋 Copy Code";
        }, 1200);

      } catch (err) {
        copyBtn.textContent = "Copy failed";
      }
    });
  }

  styleCommentLines();

  document.querySelectorAll("pre.code-blanks").forEach(pre => {
    addToolbar(pre);

    pre.querySelectorAll(".code-blank-input").forEach(input => {
      resizeCodeBlankInput(input);

      input.addEventListener("input", () => {
        resizeCodeBlankInput(input);
      });
    });
  });

});