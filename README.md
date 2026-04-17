# randomize.sh

In-browser Pokémon ROM randomizer. A TypeScript port of
[Universal Pokémon Randomizer ZX](https://github.com/Ajarmar/universal-pokemon-randomizer-zx)
with a Next.js front-end that runs entirely on-device.

Your ROM never leaves your browser. No server, no uploads, no telemetry.

## Why

The upstream Java app is great at a desk but awkward everywhere else.
`randomize.sh` lets you drop a ROM into a browser tab, tweak options, and
download a fresh seed — same engine, same settings strings, same output —
directly from your phone, Steam Deck, or handheld emulator.

## Supported games

| Gen | Titles |
|---|---|
| **1** | Red, Blue, Yellow |
| **2** | Gold, Silver, Crystal |
| **3** | Ruby, Sapphire, Emerald, FireRed, LeafGreen |
| **4** | Diamond, Pearl, Platinum, HeartGold, SoulSilver |

Gen 5–7 handlers are ported in the source but not yet wired into the web UI.

## Repository layout

```
ts-src/    TypeScript port of the UPR-ZX engine (AbstractRomHandler, Gen1-7)
web/       Next.js front-end (static export)
src/       Original Java source, preserved for reference
```

## Running locally

### Web UI

```bash
cd web
npm install
npm run dev        # http://localhost:3000
```

See [`web/README.md`](./web/README.md) for how the browser shim and Web
Worker integration work.

### CLI

The TypeScript engine also ships a CLI matching the original Java flags:

```bash
npm install
npm run build
npx randomizer-cli -i rom.gba -o out.gba -ss "<settings-string>"
```

### Tests

```bash
npm test           # vitest — ~1140 tests covering the engine
```

## Deploying

`web/` is a static Next.js export. Any static host works. The quickest
path is Vercel: import the repo and set **Root Directory** to `web`. The
`vercel.json` handles framework preset, build command, and output dir.

## How the port was done

See [`GEN1-4-MIGRATION.md`](./GEN1-4-MIGRATION.md) for a concise summary
of architecture decisions, per-generation challenges, and what remains
stubbed.

## Credits

- Original **Universal Pokémon Randomizer** — [Dabomstew](https://github.com/Dabomstew/universal-pokemon-randomizer)
- Successor **Universal Pokémon Randomizer ZX** — [Ajarmar](https://github.com/Ajarmar/universal-pokemon-randomizer-zx) and contributors (darkeye, cleartonic, and many more)
- TypeScript port & web front-end — [@justinelijahtaylor](https://github.com/justinelijahtaylor)

## License

[**GPL-3.0-or-later**](./LICENSE.txt), inherited from the upstream project.
This is a modified version — the Java engine has been ported to TypeScript
and wrapped in a Next.js front-end. See the git log for changes.

Pokémon and related names/likenesses are trademark & © Nintendo 1996–present.
This project is not affiliated with or endorsed by Nintendo, Game Freak, or
The Pokémon Company.
