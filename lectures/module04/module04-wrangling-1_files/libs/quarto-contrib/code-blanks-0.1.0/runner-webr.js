let webR;
let shelter;
let webRReady = false;
let webRLoading = null;

const plotWidth = window.codeBlanksPlotWidth || 600;
const plotHeight = window.codeBlanksPlotHeight || 300;

function enableRunButtons() {
  document.querySelectorAll(".code-blanks-run").forEach(btn => {
    btn.disabled = false;
    btn.classList.remove("code-blanks-disabled");
  });
}

function getStatusDiv() {
  let status = document.getElementById("code-blanks-status");

  if (!status) {
    status = document.createElement("div");
    status.id = "code-blanks-status";
    document.body.prepend(status);
  }

  return status;
}

function setStatus(message) {
  getStatusDiv().innerHTML = message;
}

function cleanErrorText(text) {
  if (!text) return text;

  text = text.replace(/Error in `eval\(ei, envir\)`:\s*/g, "Error:\n");
  text = text.replace(/Error in eval\(ei, envir\):\s*/g, "Error:\n");
  text = text.replace(/Execution halted/g, "");

  text = text.replace(/^Error:\s*Error:\s*/s, "Error:\n");
  text = text.replace(/^Error:\s*\n\s*Error:\s*/s, "Error:\n");

  text = text.replace(/\n{3,}/g, "\n\n");

  return text.trim();
}

async function initCodeBlanksWebR() {
  if (webRReady) return;

  if (webRLoading) {
    await webRLoading;
    return;
  }

  webRLoading = (async () => {
    try {
      setStatus("Importing WebR...");
      
      const { WebR } = await import(
        "https://webr.r-wasm.org/v0.4.2/webr.mjs"
      );

      setStatus("Starting WebR...");

      webR = new WebR();
      await webR.init();

      const packages = window.codeBlanksPackages || [];

      if (packages.length > 0) {
        setStatus("Installing packages...");
        await webR.installPackages(packages);
      }

      const setupCode = window.codeBlanksSetup || "";

      if (setupCode.trim() !== "") {
        setStatus("Running setup code...");
        await webR.evalRVoid(setupCode);
      }

      shelter = await new webR.Shelter();

      webRReady = true;
      enableRunButtons();

      setStatus("WebR ready");

      setTimeout(() => {
        getStatusDiv().style.display = "none";
      }, 1500);

    } catch (err) {
      console.error("WebR init failed:", err);
      setStatus(
        `<strong>WebR failed:</strong><br><pre>${err.message || err}</pre>`
      );
      throw err;
    }
  })();

  await webRLoading;
}

document.addEventListener("DOMContentLoaded", () => {
  initCodeBlanksWebR().catch(err => {
    console.error("Background WebR load failed:", err);
  });
});

window.codeBlanksRun = async function(code, outputDiv) {
  try {
    if (!webRReady) {
      setStatus("Loading WebR...");
      await initCodeBlanksWebR();
    }

    await shelter.purge();

    const result = await shelter.captureR(code, {
      withAutoprint: true,
      captureStreams: true,
      captureConditions: true,
      captureGraphics: {
        width: plotWidth,
        height: plotHeight
      }
    });

    let output = result.output
      .filter(evt =>
        evt.type === "stdout" ||
        evt.type === "stderr"
      )
      .map(evt => evt.data)
      .join("\n");

    output = cleanErrorText(output);

    outputDiv.innerHTML = "";

    if (output && output.trim() !== "") {
      const pre = document.createElement("pre");
      pre.textContent = output;
      outputDiv.appendChild(pre);
    }

    if (result.images && result.images.length > 0) {
      const img = result.images[result.images.length - 1];

      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.className = "code-blanks-plot";

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      outputDiv.appendChild(canvas);
    }

    if (
      (!output || output.trim() === "") &&
      (!result.images || result.images.length === 0)
    ) {
      outputDiv.innerHTML =
        "<em>Code ran with no output.</em>";
    }

  } catch (err) {
    console.error("Code run failed:", err);

    outputDiv.innerHTML =
  `<pre>${cleanErrorText(err.message || err)}</pre>`;
  }
};