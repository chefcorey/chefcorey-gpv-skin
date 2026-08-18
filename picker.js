const baseUrl = new URL(".", window.location.href);
const skinSelect = document.querySelector("#skin");
const playerSelect = document.querySelector("#player");
const description = document.querySelector("#skin-description");
const preview = document.querySelector("#preview");
const viewerUrl = document.querySelector("#viewer-url");
const copyButton = document.querySelector("#copy");
const copyStatus = document.querySelector("#copy-status");

let skins = [];

function updateSelection() {
  const skin = skins.find((item) => item.id === skinSelect.value);
  if (!skin) return;
  const cssUrl = new URL(skin.css, baseUrl).href;
  const gpvUrl = new URL("https://gamepadviewer.com/");
  gpvUrl.searchParams.set("skin", "xbox");
  gpvUrl.searchParams.set("p", playerSelect.value);
  gpvUrl.searchParams.set("editcss", cssUrl);
  description.textContent = `${skin.status} · ${skin.description}`;
  preview.src = new URL(skin.preview, baseUrl).href;
  viewerUrl.value = gpvUrl.href;
  copyStatus.textContent = "";
}

async function loadSkins() {
  /* Bump this query only when the catalog itself changes, so the picker never shows stale artwork. */
  const response = await fetch("skins/catalog.json?v=4");
  skins = await response.json();
  for (const skin of skins) {
    const option = new Option(`${skin.name} (${skin.id.toUpperCase()})`, skin.id);
    skinSelect.add(option);
  }
  updateSelection();
}

skinSelect.addEventListener("change", updateSelection);
playerSelect.addEventListener("change", updateSelection);
copyButton.addEventListener("click", async () => {
  await navigator.clipboard.writeText(viewerUrl.value);
  copyStatus.textContent = "Copied. Paste it into an OBS Browser Source URL.";
});

loadSkins().catch(() => {
  copyStatus.textContent = "Could not load the skin catalog. Refresh the page and try again.";
});
