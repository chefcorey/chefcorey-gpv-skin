# Chef Corey GamePad Viewer skin library

Open the live picker at [chefcorey.github.io/chefcorey-gpv-skin](https://chefcorey.github.io/chefcorey-gpv-skin/). Choose a design and Controller 1 or 2; it creates a ready-to-paste GamePad Viewer URL.

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
