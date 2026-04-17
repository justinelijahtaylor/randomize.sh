# Universal Pokemon Randomizer ZX — Web UI

A browser-based front-end for the TypeScript randomizer. Everything runs on
your device: ROM bytes never leave the browser.

## How it works

1. **Bootstrap** — on page load, a Web Worker fetches the bundled `.ini`/`.tbl`
   config files (from `/public/config/`) and registers them in an in-memory
   virtual filesystem.
2. **ROM detection** — when you upload a ROM, the worker writes its bytes to
   the virtual FS and tries each `RomHandlerFactory` (Gen 1–4) until one
   reports `isLoadable()`. The detected generation drives which form tabs/fields
   appear.
3. **Form** — `lib/form-schema.ts` is a declarative description of every
   setting (8 tabs, ~150 fields). `components/settings-form.tsx` renders it
   with react-hook-form + shadcn/ui.
4. **Bidirectional sync** — `lib/settings-sync.ts` converts between form
   values, `Settings` instances, and Java-compatible settings strings.
5. **Randomize** — clicking the button transfers ROM bytes to the worker,
   which runs `performDirectRandomization()` from `ts-src` against the
   virtual FS. Output bytes are read back and offered as a download.

## Browser shim for `ts-src`

The randomizer was written for Node.js (fs, path, os, crypto, url, Buffer).
We alias those modules to hand-rolled browser shims in `shims/`:

| Node module | Shim                    | Notes                                   |
| ----------- | ----------------------- | --------------------------------------- |
| `fs`        | `shims/fs.ts`           | Backed by `VirtualFS` (in-memory)       |
| `path`      | `shims/path.ts`         | POSIX-style, minimal subset             |
| `os`        | `shims/os.ts`           | `EOL`, `homedir`, `tmpdir`              |
| `crypto`    | `shims/crypto.ts`       | `randomBytes` via Web Crypto            |
| `url`       | `shims/url.ts`          | `fileURLToPath` strips `file://` prefix |
| `Buffer`    | `buffer` npm polyfill   | Set as a worker global                  |

The aliases are configured in `next.config.ts` under `webpack.resolve.alias`
(client bundle only — the server build keeps real Node modules).

## Scripts

```bash
npm run dev        # next dev --webpack (Turbopack can't alias per-bundle)
npm run build      # next build --webpack (produces static export in ./out)
npm run start      # serves the built app
```

## Layout

```
web/
  app/
    page.tsx              # main UI
    layout.tsx
  components/
    rom-upload.tsx
    settings-form.tsx
    progress-panel.tsx
    ui/                   # shadcn/ui primitives
  lib/
    bootstrap.ts          # fetches configs, registers in VFS
    form-schema.ts        # declarative form fields
    settings-sync.ts      # form <-> Settings <-> string
    worker/
      randomizer.worker.ts  # runs the randomizer off the main thread
      client.ts             # main-thread Promise API for the worker
  shims/                  # Node built-in shims
  public/config/          # bundled .ini/.tbl files
```

## Known limitations / TODO

- `multi-select-pokemon` field type (custom starter picker) is not rendered
  yet — shown as a placeholder.
- `GenRestrictions` (limit-pokemon-by-generation nested object) has no UI.
- `MiscTweaks` is exposed only as a raw bitfield. The Java GUI renders a
  dynamic checkbox per ROM-supported tweak; TODO is to surface
  `RomHandler.miscTweaksAvailable()` into the form.
- Custom names editor is not ported.
- Gen 5+ code paths compile but ROMs aren't registered with the CLI
  factories yet — generation detection will reject them.
- Runtime verification: the build succeeds end-to-end, but only a handful of
  happy-path scenarios have been exercised with real ROMs. Expect some Node
  APIs used deep in the GB/NDS handlers to need additional shim coverage.
