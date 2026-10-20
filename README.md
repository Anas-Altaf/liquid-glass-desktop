# Glass Desktop

A Liquid Glass desktop for **Wallpaper Engine** and the web. It includes a menu bar, dock, Control Center, Settings, context and drop-down menus, and nine widgets (Clock, Weather, Music, Calendar, World Clock, Reminders, Notes, Focus Timer, System). They all sit on glass that refracts a live, sound-reactive wallpaper.

The glass uses **SVG displacement** (approach 3). Each surface runs `backdrop-filter` through an SVG filter that splits the red, green and blue channels and displaces each one by a slightly different amount. That bends the wallpaper at the rim and adds a chromatic fringe. The filter chain and pill displacement map come from [liquid-glass-react](https://github.com/rdev/liquid-glass-react) by rdev (MIT). The backdrop is the live page, so the animated wallpaper is refracted in real time.

## Use it in Wallpaper Engine

Import only the built `wallpaper/` folder (index.html, app.js, app.css, project.json, preview.jpg), copied flat into `wallpaper_engine/projects/myprojects/glass-desktop/`, then restart Wallpaper Engine. The source folders are not needed there.

- The properties panel has the theme, image/GIF/video file, slideshow folder, music folder, glass, top bar, shortcut bar, desktop clock (style, size, font, seconds, glass plate), weather city, reminders and notes text, and a switch for each card.
- Changes you make inside the wallpaper are saved and survive restarts. Wallpaper Engine properties are only applied when you change them, so they don't overwrite your in-wallpaper choices.
- Wallpaper Engine passes clicks but not typing or system pop-ups to wallpapers. Text fields (city search, reminders, notes, shortcuts) open an on-screen glass keyboard instead, and Settings uses glass pickers instead of drop-downs, colour dialogs and confirm boxes.
- Choose a **Wallpapers folder** in the properties panel once; every image, GIF and video in it can then be picked in Settings › Wallpaper.
- For the Music card to follow Spotify and other apps, turn on media integration in Wallpaper Engine's settings.

## Use it in a browser

Open `dist/glass-desktop.html`. Chrome and Edge show the full refraction; Safari and Firefox show blur without displacement. Drop audio files on the desktop to add them to the playlist, or an image/GIF/video to make it the wallpaper.

## Controls

- Drag any card or the desktop clock; it snaps to edges and other cards and stays put.
- Right-click the desktop, a card, or the clock for menus. The island's ••• button opens the main menu.
- **Themes**: one-click looks (Liquid Glass, Brutalist, Cyberpunk, Paper Desk, Retro OS, Clay, Zen, Deep Space, Acid, Lava Lamp), or mix your own: surface style (glass, brutalist, neon, paper, retro, clay, bare), layout (columns, sidebar left/right, bento grid, bottom row), accent colour and interface font.
- Settings covers glass (blur, saturation, light, tint, roundness, border, shine, refraction, shadow, quality, pointer light), wallpaper types, top bar modes, shortcuts, music playback and playlist, visualizers, weather, and backup/restore.
- **Cards**: any card can override width, content size, padding, every glass value, Clear/Tinted style, quality, text colour and its title. *Apply to all cards* copies one card's look to the rest.
- **Clock**: a shared time format (24-hour, leading zero, AM/PM, blinking colon, date format), then separate settings with a live preview for the desktop clock (style, font, weight, size, seconds, date, analog numerals, colour, opacity, shadow, glass plate, alignment), the Clock card and the top bar. Also the calendar's first weekday and World Clock cities.

## Project structure

```
glass-desktop/
├─ project.json            Wallpaper Engine project and user properties
├─ package.json            npm run build
├─ tools/build.mjs         bundles src → wallpaper/ and dist/
├─ assets/preview.jpg      Wallpaper Engine preview
├─ src/
│  ├─ index.html           markup template
│  ├─ styles/              tokens · base · glass · components · shell · widgets · skins
│  └─ js/
│     ├─ main.js           wiring and boot
│     ├─ core/             util, store (localStorage), idb (files), bus, settings, time
│     ├─ glass/            displacement maps · glass engine · liquid motion
│     ├─ components/       slider (glass droplet thumb) · switch · segmented · menu
│     ├─ shell/            island · dock (shortcuts) · control-center · settings-window · layout (drag + snap)
│     ├─ widgets/          clock faces · weather · music card · calendar · world-clock · reminders · notes · focus · system
│     ├─ wallpaper/        themes · renderer (theme/image/GIF/video/gradient/slideshow) · media storage
│     ├─ audio/            player (playlist, files) · visualizer · synth engine · tracks · cover art
│     └─ platform/         wallpaper-engine bridge (properties, audio, media)
├─ wallpaper/              build output to import into Wallpaper Engine
└─ dist/glass-desktop.html build output, single file
```

## Build

```
npm install
npm run build
```

`node_modules/` isn't in the repository; run `npm install` once after cloning (or after pulling this change).

## Glass rules (learned the hard way)

- Never put `opacity`, `filter` or `mix-blend-mode` on a glass element, or on a child that sits beside the warp layer. Any of these isolates the element and blanks its backdrop. To fade glass, fade its layers individually, as `glass/motion.js` does.
- Glass content lives in a `.pane` child, which sits above the warp, sheen and rim layers.
- Displacement maps are cached by size, and large panes compute them at reduced resolution.