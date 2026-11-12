# Chef Corey GamePad Viewer skin library

Open the live picker at [chefcorey.github.io/chefcorey-gpv-skin](https://chefcorey.github.io/chefcorey-gpv-skin/). Choose a design; it creates a ready-to-paste OBS URL that automatically follows the controller receiving meaningful input.

## Repository layout

Each design is self-contained, so previously used OBS links never change:

```
skins/
  catalog.json              # The picker’s list of designs
  v1/
    chef-corey-xbox.css     # Version-specific skin logic
    assets/                 # Version-specific artwork
```

`chef-corey-xbox.css` remains as a compatibility entry point for original v1 links. New links use the version-specific path.

## Add a new version

1. Create `skins/v2/` (then `skins/v3/`, etc.) with its own CSS and `assets/` folder.
2. Copy the v1 CSS as the starting point and point its image URL at the new artwork. Do not overwrite v1.
3. Add the new design to `skins/catalog.json`, using this shape:

   ```json
   {
     "id": "v2",
     "name": "Chef Corey Neon",
     "description": "A short description.",
     "css": "skins/v2/chef-corey-xbox.css",
     "preview": "skins/v2/assets/preview.png",
     "status": "New"
   }
   ```

4. Commit and push. The picker automatically shows the new version.

## Resize and input coverage

The original artwork’s 3:2 ratio is held by CSS variables. Use a 3:2 OBS Browser Source size such as 1536×1024, 960×640, or 768×512. Each version preserves GamePad Viewer input elements for A/B/X/Y, individual D-pad directions, both sticks, triggers, bumpers, Menu/View, and Guide where supported.

## Transparency and alignment

The GamePad Viewer page is forced transparent by the skin CSS for OBS. The v1 artwork is a 1536×1024 PNG with a transparent outer canvas, so it can be used directly in a transparent OBS Browser Source.

For pixel-level alignment, `skins/v1/chef-corey-xbox.css` names every control’s X, Y, width, and height as percentage variables with 1536×1024 reference-pixel comments. Set `--chefcorey-debug: 1` near the top of that file to display bright labeled translucent hitboxes for every control. Reset it to `0` before using the skin in OBS.

## Automatic controller selection

The picker now creates an `overlay.html` OBS URL instead of a GamePad Viewer URL with a fixed `p=` player number. `overlay.js` scans `navigator.getGamepads()` on every animation frame, ignores null slots, and selects the connected controller that produces meaningful button, trigger, or stick input. It keeps the selected controller through short idle periods and changes only after it disconnects or another controller becomes active. Controller connection, disconnection, selection, and visibility events are logged in the browser console with the `[ChefCorey Overlay]` prefix.

## Controller freezes while a game is focused (OBS 31+)

Since OBS 31, the OBS Browser Source receives no Gamepad API input while OBS is not the focused window, so the overlay stops moving in-game and resumes when you click back into OBS. A web page can't work around this, so the repo includes a small local bridge that reads Xbox/XInput controllers directly from Windows and streams them to the overlay.

1. Install Python 3 for Windows (python.org, or `winget install Python.Python.3.12`). No extra packages needed.
2. Clone or download this repo, then double-click `Start Controller Bridge.py`. Leave its window open while streaming. (A .bat launcher was removed because Windows Smart App Control blocks downloaded .bat files.)
3. Set the OBS Browser Source URL to `http://127.0.0.1:27645/overlay.html?skin=v1` (most reliable, served by the bridge). The GitHub Pages URL also connects to the bridge automatically.

If the bridge isn't running, the overlay falls back to the normal Gamepad API (works only while OBS is focused). Add `?bridge=off` to the URL to disable the bridge. Controllers must be in XInput/PC mode (GameSir: PC/XInput mode).

## v2: triggers above the controller

`?skin=v2` uses the v1 artwork with standalone LT/RT pieces above the controller that fill from the bottom as you squeeze (analog) and glow when fully pressed. Its canvas is 1536×1300 (a 276 px trigger band plus the 1536×1024 artwork), so use a matching OBS Browser Source size such as **1536×1300** or **768×650**:

`http://127.0.0.1:27645/overlay.html?skin=v2`
