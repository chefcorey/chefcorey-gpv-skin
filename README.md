# Chef Corey GamePad Viewer skin

This skin uses the supplied controller art as-is. The copy at `assets/chefcoreycontrolleroverlay.png` is the only image used by the stylesheet; the original at `C:\Users\user\Documents\chefcoreycontrolleroverlay.png` was not modified.

## Publish and use

1. Upload this folder to a GitHub repository and enable GitHub Pages, or serve it from any HTTPS host.
2. Use the raw, publicly accessible URL to `chef-corey-xbox.css` as `editcss` in GamePad Viewer. For example:

   `https://gamepadviewer.com/?skin=xbox&p=1&editcss=https://YOUR-USER.github.io/YOUR-REPO/chef-corey-xbox.css`

3. For Controller 2, change the player value to `p=2`:

   `https://gamepadviewer.com/?skin=xbox&p=2&editcss=https://YOUR-USER.github.io/YOUR-REPO/chef-corey-xbox.css`

The same CSS supports GPV's live controller slots `#gamepad-0` and `#gamepad-1`; no separate second-controller stylesheet is needed.

## Resize safely

The artwork's native 3:2 aspect ratio is held by `--chefcorey-width` and `--chefcorey-height`. Before publishing, you may change the first variable near the top of the CSS—for example, to `960px`. Percent-based control positions then scale with the artwork. In OBS, set the browser source dimensions in the same 3:2 ratio (for example 1536×1024, 960×640, or 768×512) and leave its background transparent.

## Input coverage

- A/B/X/Y: bright press glow.
- D-pad: individual directional highlights.
- Left/right sticks: preserves GamePad Viewer's own stick movement and adds click glow.
- LT/RT: preserves the viewer's analog-opacity output, with a digital-button fallback.
- LB/RB, Menu, View, and Xbox/Guide (when exposed): press glow.

The selectors were checked against GamePad Viewer's current live Xbox template on 2026-08-18. GPV adds `.pressed` to buttons, bumpers, sticks, D-pad faces, Menu/View, and Guide; triggers use their input-driven opacity.
