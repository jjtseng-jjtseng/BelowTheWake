BELOW THE WAKE - EDITABLE BLENDER ART

Open the .blend files directly in Blender 5.1 or later.
The fitted final cockpit is tug-helm-fitted.blend, not tug-helm.blend.
deck-crane.blend includes the extended 26-link chain.
diver.blend contains the character rig, source animations, added swimming
animation and all attached equipment. Individual upgrade meshes have prefixes
air_, cutter_, suit_, bag_, fins_ and deep_.

Downloaded originals: Henry by Quaternius (CC0) and Crane by Max Hancock
(CC BY 3.0). The boat is from Kenney's CC0 Watercraft Kit. Attribution and
source URLs are in public/models/LICENSE-* at the repository root.
The crane adaptation retains its attribution requirement.

This folder is art-source/ inside the game repository. Scripts resolve the
game's public/models and public/thumbnails folders relative to this folder.
To reproduce the fitted assets, run these scripts with Blender's
--background --python option, in order:
1. build-fitted-assets.py
2. fit-boat-interior.py
3. add-salvage-lift.py
4. render-diver-guide.py
5. fit-harpoon.py
6. fit-cabin-clearview.py (apply the final raised-roof fix last)

The new harpoon-launcher.blend and harpoon-bolt.blend adapt the actual CC0
Quaternius spear from harpoon-spear-original.glb. The deck mount is authored
in Blender. fit-harpoon.py also renders the original animated shark and
tentacle from the game public/models folder. Their original skeletal clips
remain in sea-shark.glb and sea-tentacle.glb; no replacement monster is drawn.
Exact source links and CC0 terms are in LICENSE-sea-guardians.txt in this
folder and beside the game models.

The scripts use the actual downloaded meshes, Blender modelling operators and
Blender's rig/animation tools. No image generator is used. The guide and shop
equipment PNGs are Blender renders. Run npm run build in the game folder after
re-exporting assets to copy them into the browser build.
After step 5, run normalize-sea-rig.py with normal Python to correct the optional skeleton root reference in the original tentacle. It preserves all meshes and animation data; the original download remains sea-tentacle-original.glb.

October 9 clear helm refit: fit-cabin-clearview.py starts from boat-player.blend,
removes the six redundant cabin-cap faces overlapping the roof underside, raises
the roof/funnel by .35 Blender meters, and extends the window posts and mullion.
It saves boat-player-clearview.blend and exports the updated boat-player.glb.
The base boat-player.blend is retained as the original fitted source. Runtime
roof fittings are lifted by .84 world meters to match the 2.4-scale tug.

Harbor and weather assets:
build-harbor-workshop.py assembles the downloaded Kenney Furniture Kit CC0
props from furniture-originals/ and the existing licensed nautical props. It
authors the cutaway timber shell and helm wall decoration in Blender, then
saves harbor-workshop.blend and exports public/models/harbor-workshop.glb.
build-storm-rain.py creates the atmospheric rain curtain in Blender, saves
storm-rain.blend, and exports public/models/storm-rain.glb.
The original Furniture Kit download and license are retained in this folder.
