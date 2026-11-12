/*
 * Direct Gamepad API controller selection for OBS.
 * A browser index is not stable across reconnects, USB ports, or virtual devices,
 * so selection is based on current meaningful input instead of a fixed array slot.
 */
const SELECTOR_LOG = "[ChefCorey Overlay]";
const ACTIVITY_THRESHOLD = 0.16;
const SWITCH_GRACE_MS = 900;

const nodes = {
  triggerLeft: document.querySelector(".trigger.left"), triggerRight: document.querySelector(".trigger.right"),
  triggerButtonLeft: document.querySelector(".trigger-button.left"), triggerButtonRight: document.querySelector(".trigger-button.right"),
  bumperLeft: document.querySelector(".bumper.left"), bumperRight: document.querySelector(".bumper.right"),
  view: document.querySelector(".back"), menu: document.querySelector(".start"), guide: document.querySelector(".meta"),
  a: document.querySelector(".button.a"), b: document.querySelector(".button.b"), x: document.querySelector(".button.x"), y: document.querySelector(".button.y"),
  leftStick: document.querySelector(".stick.left"), rightStick: document.querySelector(".stick.right"),
  up: document.querySelector(".face.up"), down: document.querySelector(".face.down"), left: document.querySelector(".face.left"), right: document.querySelector(".face.right"),
};

let selectedIndex = null;
let selectedId = null;
let selectedLastActivityAt = 0;

function log(event, detail) { console.info(SELECTOR_LOG, event, detail ?? ""); }
function buttonValue(gamepad, index) { const button = gamepad.buttons[index]; return button ? Math.max(button.value || 0, button.pressed ? 1 : 0) : 0; }
function pressed(gamepad, index) { return buttonValue(gamepad, index) >= ACTIVITY_THRESHOLD; }
function axis(gamepad, index) { const value = gamepad.axes[index] || 0; return Math.abs(value) < 0.08 ? 0 : value; }

function activityScore(gamepad) {
  const buttonScore = gamepad.buttons.reduce((score, button) => score + Math.max(button.value || 0, button.pressed ? 1 : 0), 0);
  const axisScore = gamepad.axes.reduce((score, value) => score + Math.max(0, Math.abs(value) - 0.08), 0);
  return buttonScore + axisScore;
}

function controllerPreference(gamepad) {
  const id = gamepad.id.toLowerCase();
  if (/(virtual|vigem|vgamepad|x360ce|rewasd)/.test(id)) return -1;
  if (/(xbox|xinput)/.test(id)) return 1;
  return 0;
}

/*
 * Local XInput bridge (bridge/xinput_bridge.py). Since OBS 31 the Browser Source
 * gets no Gamepad API input while OBS is unfocused, so in-game the overlay froze.
 * When the bridge is streaming, its data is used; otherwise we fall back to the
 * Gamepad API. Add ?bridge=off to disable, or ?bridge=<url> to override.
 */
const BRIDGE_FRESH_MS = 2000;
const bridgeParam = new URLSearchParams(window.location.search).get("bridge");
const servedByBridge = window.location.protocol === "http:" && window.location.hostname === "127.0.0.1";
const BRIDGE_URL = bridgeParam && bridgeParam !== "off" ? bridgeParam : servedByBridge ? "/events" : "http://127.0.0.1:27645/events";
let bridgePads = [];
let bridgeLastAt = 0;
let bridgeLive = false;

function toBridgeGamepad(pad) {
  return { index: pad.index, id: pad.id, axes: pad.axes, buttons: pad.buttons.map((value) => ({ value, pressed: value >= 0.5 })) };
}

function connectBridge() {
  if (bridgeParam === "off" || typeof EventSource === "undefined") return;
  const source = new EventSource(BRIDGE_URL);
  source.onmessage = (event) => {
    try {
      bridgePads = JSON.parse(event.data).pads.map(toBridgeGamepad);
      bridgeLastAt = performance.now();
      if (!bridgeLive) { bridgeLive = true; log("bridge connected; using XInput bridge", BRIDGE_URL); }
    } catch (error) { log("bridge message error", error); }
  };
  source.onerror = () => { if (bridgeLive) { bridgeLive = false; log("bridge lost; falling back to Gamepad API"); } };
}

function connectedGamepads() {
  if (performance.now() - bridgeLastAt < BRIDGE_FRESH_MS) return bridgePads;
  return [...navigator.getGamepads()].filter(Boolean);
}
function select(gamepad, reason) {
  if (selectedIndex === gamepad.index && selectedId === gamepad.id) return;
  selectedIndex = gamepad.index;
  selectedId = gamepad.id;
  selectedLastActivityAt = performance.now();
  log("selected controller", { index: gamepad.index, id: gamepad.id, reason });
}

function clearVisuals() {
  for (const node of [nodes.triggerButtonLeft, nodes.triggerButtonRight, nodes.bumperLeft, nodes.bumperRight, nodes.view, nodes.menu, nodes.guide, nodes.a, nodes.b, nodes.x, nodes.y, nodes.leftStick, nodes.rightStick, nodes.up, nodes.down, nodes.left, nodes.right]) setPressed(node, false);
  nodes.triggerLeft.style.opacity = 0; nodes.triggerRight.style.opacity = 0;
  nodes.triggerLeft.style.setProperty("--value", 0); nodes.triggerRight.style.setProperty("--value", 0);
  nodes.leftStick.style.transform = "translate(0, 0)"; nodes.rightStick.style.transform = "translate(0, 0)";
}

function clearSelection(reason) {
  if (selectedIndex !== null) log("selection cleared", { index: selectedIndex, id: selectedId, reason });
  selectedIndex = null;
  selectedId = null;
  selectedLastActivityAt = 0;
  clearVisuals();
}

function getSelected(gamepads) {
  const selected = gamepads.find((gamepad) => gamepad.index === selectedIndex && gamepad.id === selectedId);
  if (!selected && selectedIndex !== null) clearSelection("controller disappeared");
  return selected || null;
}

function chooseActiveController(gamepads, now) {
  const candidates = gamepads
    .map((gamepad) => ({ gamepad, score: activityScore(gamepad) }))
    .filter(({ score }) => score >= ACTIVITY_THRESHOLD)
    .sort((a, b) => b.score - a.score || controllerPreference(b.gamepad) - controllerPreference(a.gamepad));
  const current = getSelected(gamepads);
  const currentScore = current ? activityScore(current) : 0;

  if (currentScore >= ACTIVITY_THRESHOLD) selectedLastActivityAt = now;
  if (!candidates.length) return current;
  const mostActive = candidates[0];
  if (!current) { select(mostActive.gamepad, "first meaningful input"); return mostActive.gamepad; }
  if (mostActive.gamepad.index === current.index && mostActive.gamepad.id === current.id) return current;

  // Keep a proven controller through brief idle periods; change only when another device is actively used.
  if (now - selectedLastActivityAt >= SWITCH_GRACE_MS && currentScore < ACTIVITY_THRESHOLD) {
    select(mostActive.gamepad, "other controller produced meaningful input");
    return mostActive.gamepad;
  }
  return current;
}

function setPressed(node, isPressed) { node.classList.toggle("pressed", Boolean(isPressed)); }
function setStick(node, x, y, clicked) {
  node.style.transform = `translate(${x * 18}%, ${y * 18}%)`;
  setPressed(node, clicked);
}

function render(gamepad) {
  if (!gamepad) return;
  const lt = buttonValue(gamepad, 6), rt = buttonValue(gamepad, 7);
  nodes.triggerLeft.style.opacity = lt; nodes.triggerRight.style.opacity = rt;
  nodes.triggerLeft.style.setProperty("--value", lt); nodes.triggerRight.style.setProperty("--value", rt);
  setPressed(nodes.triggerButtonLeft, pressed(gamepad, 6)); setPressed(nodes.triggerButtonRight, pressed(gamepad, 7));
  setPressed(nodes.a, pressed(gamepad, 0)); setPressed(nodes.b, pressed(gamepad, 1)); setPressed(nodes.x, pressed(gamepad, 2)); setPressed(nodes.y, pressed(gamepad, 3));
  setPressed(nodes.bumperLeft, pressed(gamepad, 4)); setPressed(nodes.bumperRight, pressed(gamepad, 5));
  setPressed(nodes.view, pressed(gamepad, 8)); setPressed(nodes.menu, pressed(gamepad, 9)); setPressed(nodes.guide, pressed(gamepad, 16));
  setStick(nodes.leftStick, axis(gamepad, 0), axis(gamepad, 1), pressed(gamepad, 10));
  setStick(nodes.rightStick, axis(gamepad, 2), axis(gamepad, 3), pressed(gamepad, 11));
  setPressed(nodes.up, pressed(gamepad, 12)); setPressed(nodes.down, pressed(gamepad, 13)); setPressed(nodes.left, pressed(gamepad, 14)); setPressed(nodes.right, pressed(gamepad, 15));
}

function tick(now) { render(chooseActiveController(connectedGamepads(), now)); requestAnimationFrame(tick); }
window.addEventListener("gamepadconnected", (event) => log("controller connected", { index: event.gamepad.index, id: event.gamepad.id }));
window.addEventListener("gamepaddisconnected", (event) => { log("controller disconnected", { index: event.gamepad.index, id: event.gamepad.id }); if (event.gamepad.index === selectedIndex && event.gamepad.id === selectedId) clearSelection("disconnect event"); });
document.addEventListener("visibilitychange", () => log(document.hidden ? "overlay hidden" : "overlay shown; rescanning controllers"));
connectBridge();
log("overlay ready; press any controller input to select the active device");
requestAnimationFrame(tick);
