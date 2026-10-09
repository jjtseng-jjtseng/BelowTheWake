# Below the Wake

A small, complete browser salvage adventure. Sail a tug through the Marrow
Isles, unlock nine wrecks and eight islands, recover treasure and letters, upgrade your equipment,
and bring the Bellwether strongbox home. You can continue exploring after the
story ending.

Play at **https://belowthewake.web.app/**.

## Publish an update

The static game is hosted on Firebase Hosting in the dedicated `belowthewake`
project. Install the Firebase CLI (`npm install -g firebase-tools`), sign in
with `firebase login`, then run:

```sh
npm ci
npm run deploy
```

The deploy command runs the automated tests and production build before
publishing only `dist/`. It does not deploy a database or backend. Firebase
credentials are kept outside this repository. GitHub stores the source; a Git
push by itself does not publish the website. The included GitHub Actions
workflow checks tests and builds without requiring deployment credentials.

Saves belong to a browser origin. The hosted website starts a separate voyage
from the local `http://localhost:5173/` copy; the local save stays intact.

## Run locally

Requires a current Node.js LTS installation and a browser with WebGL support.

```sh
npm ci
npm run dev
```

Open the localhost URL printed by Vite. To produce a static build, run
`npm run build`; the resulting site is in `dist/`. Run `npm run preview` to
serve that production build at http://localhost:5173/. Run `npm test` for the
progression, economy, transaction, save validation, and loading timeout tests.

Startup runs asynchronously after entry module evaluation to avoid a circular
wait with Babylon's lazy material imports in production. Each model load has
a 20-second timeout and an asset-specific progress or retry message.

## Controls

| Action | Control |
| --- | --- |
| Throttle / reverse | W / S |
| Steer the boat | A / D |
| Swim | W / A / S / D |
| Look underwater | Click the scene, then move the mouse; arrow keys also work |
| Ascend / descend | Space / Shift (or C to descend) |
| Interact / dive / recover / dock | E or the onscreen prompt |
| Sonar pulse | Q |
| Fire the guardian-tracking roof harpoon (hold to repeat) | F, left mouse in the scene, or crosshair button |
| Follow the return line automatically | R |
| Chart and journal | M |
| Change camera view | V or camera icon |
| Pause / release mouse | Escape |

Follow the chart to the Copper Finch, dive, and look for gold salvage markers and
blue bottled letters. Return aboard to secure small finds, then sail back to
Marrow Harbor to sell cargo and fit upgrades. The reinforced suit opens the
Lantern; the abyssal rig opens the Bellwether. Heavy finds need the deck crane
and its lift bags.
Both route fragments are needed to recover the final strongbox.

Exploration now has ten levels. First wreck dives earn 60 XP, secured finds
earn 45 XP each, first island landings earn 70 XP, and guardians earn 240 XP.
Rewards only count once. New wrecks, islands and sea guardians physically
appear as their chart level unlocks. The level badge opens the chart; its
gold underline shows progress toward the next level. A wreck receives a
permanent flag buoy and descent line after its first dive, including after
reloading. Existing recovered cargo migrates its associated discovery buoys.

At a new island, approach the shore and press E to recover its cache and
repair the hull. Visited islands remain free repair stops. Optional guardians
appear at levels 3 (Reef Jaw, an animated shark), 6 (Ink Maw, an animated
tentacle kraken), and 9 (The Old King, a larger kraken). The roof harpoon swivels
to track the active guardian through a full circle, independently of steering.
Hold F, the left mouse button in the scene, or the crosshair button to fire.
Teal marks a target lock within 90 m. Bolts are unlimited with a 1.1-second reload.
Red warning markers lock the attack position, giving time to steer away;
gold exposure windows double harpoon damage. The bearing arrow tracks the
active monster. Victory banks guarded treasure and fits a trophy chest on
deck. Retreat outside the encounter region to reset it. A broken hull gets
a safety tow to harbor without losing secured cargo or equipment. All ten
levels are reachable without combat.

The bag and air supply create short expedition decisions. Air refills aboard.
Running out of air safely rescues you; unsecured small finds return to their
original locations. Equipment can be traded back at full value, allowing you
to experiment without blocking progression.

The first voyage shows one illustrated controls guide. Once dismissed, it
stays dismissed for that save; reopen it using Pause > question mark. The
playing HUD uses sourced icons, a bearing arrow, air and depth gauges, cargo
pips, prices and distances. Names and story text live in the optional chart
journal and harbor menus rather than covering the ocean.

V cycles chase, helm and side views aboard, or first and third person below.
The helm view sits above the wheel inside the fitted tug cabin, with a raised
roof and a clear forward window. The camera follows the cabin's complete bob,
pitch and roll so the roof and window frame stay stable relative to your eye.
Overlapping original cabin-cap/roof faces were removed in Blender to prevent
double-sided z-fighting. Third person shows the animated
diver and installed gear. In the workshop, click any equipment picture to
preview it in 3D before purchasing. Previewing does not spend currency or
change your installed gear. Tanks, cutter, suit, fins and breathing rig attach
to the diver; the crane, sonar and cargo locker appear on the boat. Heavy
recovery deploys a lift bag, animates the chain, and shows secured deck cargo.

## Saves and settings

Progress is stored in this browser on this device under `below-the-wake-v1`.
It saves on boarding, equipment transactions, selling, pausing, and other
voyage checkpoints. A reload during a dive preserves secured cargo but returns
unsecured small finds to their locations. Clearing browser site data removes
the save. Sound, look sensitivity, and lighter rendering are in the pause menu.

The primary target is a desktop or laptop with a keyboard and mouse. Basic
touch controls are included, but mobile play has not been validated on a
physical device.

## Artwork

Representational 3D artwork uses the following stylized nautical sources,
with fitted additions authored in Blender 5.1. No AI-generated artwork is used.
Code supplies terrain, water, lighting, motion, UI, and gameplay effects.

- [Kenney Pirate Kit](https://kenney.nl/assets/pirate-kit), CC0: wrecks,
  treasure, palms, rocks, docks, and harbor scenery.
- [Kenney Watercraft Kit](https://kenney.nl/assets/watercraft-kit), CC0: tug
  boat and navigation buoys.
- [Robin Lamb, Low Poly Angel Fish](https://opengameart.org/content/low-poly-angel-fish),
  CC0: reef fish, converted from the original Blender file.
- [Quaternius, Henry](https://poly.pizza/m/yEdSk8tRKc), CC0: downloaded rigged
  sailor with original Idle, Walk, Wave and Punch clips. Diving gear and a
  swimming animation are fitted in Blender.
- [Max Hancock, Crane](https://poly.pizza/m/aZFdGwasy60), CC BY 3.0: downloaded
  crane upper works, adapted in Blender with a deck mount, rescaling, brass
  and navy materials, and modelled chain. Attribution is retained in-game
  and in `public/models/LICENSE-crane.txt`.
- [Lucide](https://lucide.dev/license), ISC/MIT: downloaded interface icons,
  with full license text in `public/icons/LICENSE.txt`.
- [Quaternius Shark](https://poly.pizza/m/AyHTK3zUSG) and
  [Tentacle](https://poly.pizza/m/BR1vpIvvvv), CC0: actual downloaded animated
  sea guardians. Original skeletal swimming and tentacle animations retained.
- [Quaternius Spear](https://poly.pizza/m/3zA9NtYBEi), CC0: fitted in Blender
  into the harpoon bolt, with a Blender-authored navy/brass/wood deck mount.
  See `public/models/LICENSE-sea-guardians.txt`.

Developer QA uses the production build on a separate origin (port 5174),
leaving the main port 5173 save untouched. Run `npx tsx qa/build-trials.ts`
then `node qa/serve.mjs` and visit `http://localhost:5174/trials`. Fixtures
cover a fresh voyage, a first discovery, and all three guardian milestones.

The Kenney tug has Blender-adapted cabin windows and a fitted wooden wheel,
gauges and throttle. The sonar, locker, lift bag and rigged diving equipment
are also Blender-authored additions. Equipment pictures are renders of these
actual assets. Editable .blend files, original downloaded meshes, and Blender
scripts are included in `art-source/`; see `art-source/BLENDER-README.txt`.

The original palette images are embedded into their GLBs so the matching kits
retain their intended colors without conflicting texture paths. License files
are included beside the models. Fonts are DM Sans and Manrope via Google Fonts,
with local system fallbacks. The browser synthesizes ocean ambience and simple
feedback sounds after the first player interaction.

## Implementation

Vite, TypeScript, Babylon.js, and static GLB assets. No backend, account,
payments, analytics, or server save is required. The game also exposes bounded
WebMCP actions for reading voyage state, chart destination, ordinary navigation
controls, and the same harbor transactions available in the visible interface.
