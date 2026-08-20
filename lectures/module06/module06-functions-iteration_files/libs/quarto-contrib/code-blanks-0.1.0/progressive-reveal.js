document.addEventListener("DOMContentLoaded", () => {
  if (!window.codeBlanksProgressiveReveal) return;

  const sections = Array.from(document.querySelectorAll("section.level2"));
  if (sections.length === 0) return;

  const key = window.codeBlanksStorageKey
    ? window.codeBlanksStorageKey("revealed-section")
    : "code-blanks:revealed-section";

  const firstSection = sections[0];

  const contentRoot =
    firstSection.closest("main") ||
    document.querySelector("main") ||
    document.body;

  const children = Array.from(contentRoot.children);
  const firstSectionIndex = children.indexOf(firstSection);

  const hasContentBeforeFirstH2 = children
    .slice(0, firstSectionIndex)
    .some(el => {
      if (el.id === "title-block-header") return false;
      if (el.tagName && el.tagName.toLowerCase() === "script") return false;
      if (el.tagName && el.tagName.toLowerCase() === "style") return false;
      return el.textContent.trim() !== "";
    });

  let revealed = parseInt(localStorage.getItem(key) || "", 10);

  if (Number.isNaN(revealed)) {
    revealed = hasContentBeforeFirstH2 ? -1 : 0;
  }

  function removeNextButtons() {
    document
      .querySelectorAll(".code-blanks-next-section")
      .forEach(button => button.remove());
  }

  function makeNextButton() {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "code-blanks-next-section";
    button.textContent = "Next";

   button.addEventListener("click", () => {
    revealed += 1;
    localStorage.setItem(key, String(revealed));
    renderSections();
  
    if (revealed >= 0 && sections[revealed]) {
      sections[revealed].scrollIntoView({ behavior: "smooth" });
    }
  });

    return button;
  }

  function insertButtonAfterIntro(button) {
    if (firstSectionIndex > 0) {
      const introChildren = children.slice(0, firstSectionIndex);
      const lastVisibleIntro = introChildren
        .reverse()
        .find(el => {
          if (el.id === "title-block-header") return false;
          return el.textContent.trim() !== "";
        });

      if (lastVisibleIntro) {
        lastVisibleIntro.insertAdjacentElement("afterend", button);
        return;
      }
    }

    firstSection.insertAdjacentElement("beforebegin", button);
  }

  function renderSections() {
    removeNextButtons();

    sections.forEach((section, index) => {
      section.hidden = index > revealed;
    });

    if (revealed < sections.length - 1) {
      const button = makeNextButton();

      if (revealed === -1) {
        insertButtonAfterIntro(button);
      } else {
        sections[revealed].appendChild(button);
      }
    }
  }

  renderSections();
});