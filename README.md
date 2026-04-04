Universal Pokemon Randomizer ZX by Ajarmar

With significant contributions from darkeye, cleartonic

Based on the Universal Pokemon Randomizer by Dabomstew

# Info

This fork was originally made to make some minor tweaks and fixes, but became a bit more ambitious since 2020. There are several new features and supported games (including 3DS games) compared to the original Universal Pokemon Randomizer.

Have a look at the [release page](https://github.com/Ajarmar/universal-pokemon-randomizer-zx/releases) for changelogs and downloads.

# Contributing

If you want to contribute something to the codebase, we'd recommend creating an issue for it first (using the`Contribution Idea` template). This way, we can discuss whether or not it's a good fit for the randomizer before you put in the work to implement it. This is just to save you time in the event that we don't think it's something we want to accept.

See [the Wiki Page](https://github.com/Ajarmar/universal-pokemon-randomizer-zx/wiki/Building-Universal-Pokemon-Randomizer-ZX) for setting up to build/test locally.

### What is a good fit for the randomizer?

In general, we try to make settings as universal as possible. This means that it preferably should work in as many games as possible, and also that it's something that many people will find useful. If the setting is very niche, it will mostly just bloat the GUI.

If your idea is a change to an existing setting rather than a new setting, it needs to be well motivated.

# TypeScript Migration Plan

This project is being migrated from Java to pure TypeScript. The migration is structured in phases, with each phase validated by **golden tests** — run the Java code, capture outputs, then verify the TypeScript produces identical results.

**Current state:** 117 Java source files, ~77K LOC, 0 existing tests.

## Phase 0: Build System & Test Infrastructure

- Add a Gradle build to the Java project for compilation and test execution
- Add JUnit 5 as a test dependency
- Scaffold the TypeScript project: `tsconfig.json`, `package.json`, Vitest, `ts-src/` directory mirroring Java package structure
- Binary I/O via Node.js `Buffer` (no external deps needed)

## Phase 1: Domain Model + Golden Tests

Port the ~35 "leaf" data classes (no ROM dependencies) first:

| Java Class | TS Equivalent | Complexity |
|---|---|---|
| `Pokemon.java` | `pokemon.ts` | Medium (stats, abilities, formes) |
| `Move.java` | `move.ts` | Low |
| `Type.java` | `type.ts` (enum) | Low |
| `Trainer.java`, `TrainerPokemon.java` | `trainer.ts` | Low |
| `Evolution.java`, `EvolutionType.java` | `evolution.ts` | Low |
| `Encounter.java`, `EncounterSet.java` | `encounter.ts` | Low |
| `StaticEncounter.java`, `IngameTrade.java` | corresponding `.ts` | Low |
| `Effectiveness.java` | `effectiveness.ts` | Low |
| `ExpCurve.java` | `exp-curve.ts` | Low |

Also port ~17 constants files (`Species.java`, `Moves.java`, `Items.java`, `Abilities.java`, `Gen1-7Constants.java`) — mostly mechanical `export const` translations.

**Testing:** Java unit tests serialize domain objects to JSON. TypeScript must produce identical JSON output.

## Phase 2: Utilities & Binary I/O

| Java | TS | Test Strategy |
|---|---|---|
| `FileFunctions.java` | `file-functions.ts` | Unit tests on INI parsing, file detection |
| `RomFunctions.java` | `rom-functions.ts` | Golden tests: same byte arrays → same outputs |
| `GFXFunctions.java` | `gfx-functions.ts` | Golden tests on sprite data transforms |
| `RandomSource.java` | `random-source.ts` | Same seed must produce same sequence (1000 draws) |
| `Gen1Decmp.java`, `Gen2Decmp.java` | `gen1-decmp.ts`, `gen2-decmp.ts` | Compress→decompress roundtrip on known byte blobs |
| `DSDecmp.java`, `BLZCoder.java` | `ds-decmp.ts`, `blz-coder.ts` | Same roundtrip approach |
| `CRC16.java` | `crc16.ts` | Exact output match on test vectors |

**Key risk:** Java's `java.util.Random` uses a 48-bit LCG — must be replicated exactly in TypeScript (via BigInt or manual implementation) so that a given seed produces identical randomization.

## Phase 3: Settings Serialization

Port `Settings.java` (2,389 lines) — the bridge between UI and engine.

1. Write Java tests that serialize various `Settings` configurations to binary/Base64
2. Port `Settings.ts` with identical `read()`/`write()` methods
3. Golden tests: Java-serialized settings strings must round-trip correctly through TypeScript
4. Port `SettingsUpdater` for legacy format migration

## Phase 4: ROM Container Formats

Port the file format wrappers (not game-specific data parsing):

| Java Package | TS Module | Test Strategy |
|---|---|---|
| `newnds/NDSRom.java` | `nds/nds-rom.ts` | Load NDS ROM, verify FNT/FAT parsing, file extraction checksums |
| `newnds/NARCArchive.java` | `nds/narc-archive.ts` | Extract→repack roundtrip with checksum verification |
| `ctr/NCCH.java` | `ctr/ncch.ts` | Load 3DS ROM, verify section parsing |
| `ctr/GARCArchive.java` | `ctr/garc-archive.ts` | Extract→repack roundtrip |
| `pptxt/PPTxtHandler.java` | `text/pptxt-handler.ts` | Decode→encode roundtrip on known text blocks |
| `thenewpoketext/*` | `text/poketext.ts` | Same roundtrip approach |

**Test data:** Small binary blobs extracted from ROMs committed as test fixtures (data fragments, not full ROMs).

## Phase 5: ROM Handlers — Abstract Layer

Port the abstract handler hierarchy:

```
RomHandler (interface)        →  rom-handler.ts (TypeScript interface)
AbstractRomHandler (7,563 L)  →  abstract-rom-handler.ts
AbstractGBRomHandler          →  abstract-gb-rom-handler.ts
AbstractGBCRomHandler         →  abstract-gbc-rom-handler.ts
AbstractDSRomHandler          →  abstract-ds-rom-handler.ts
Abstract3DSRomHandler         →  abstract-3ds-rom-handler.ts
```

**Testing:** Create `MockRomHandler` in both Java and TypeScript returning deterministic data. Run `AbstractRomHandler` methods (e.g., `randomizePokemonStats`, `randomizeWildEncounters`) against the mock and compare outputs.

## Phase 6: Concrete ROM Handlers

Port one generation at a time, ordered by complexity:

| Order | Handler | LOC | Rationale |
|---|---|---|---|
| 1 | `Gen1RomHandler` | 2,919 | Simplest binary format (raw GB ROM) |
| 2 | `Gen2RomHandler` | 3,000 | Similar to Gen1, slightly more complex |
| 3 | `Gen3RomHandler` | 4,474 | Direct GBA binary, no archive layer |
| 4 | `Gen5RomHandler` | 4,344 | NDS+NARC, well-structured data |
| 5 | `Gen4RomHandler` | 5,842 | NDS+NARC, most complex DS handler |
| 6 | `Gen6RomHandler` | 4,270 | 3DS+GARC |
| 7 | `Gen7RomHandler` | 3,821 | 3DS+GARC, latest features |

**Testing per generation:**
1. Java integration tests: Load ROM → extract all data → serialize to JSON golden file
2. Port handler to TypeScript
3. TypeScript loads same ROM → compare JSON to golden file
4. Randomization roundtrip: Load → randomize (fixed seed) → save → reload → verify match

Generations can be parallelized after Gen1 establishes the pattern.

## Phase 7: Randomizer Engine

Port `Randomizer.java` (1,341 lines) — the orchestration layer.

**Testing:** Deterministic seed tests — run full randomization in Java with seed X, capture the log and all modified data, run same seed in TypeScript, outputs must match exactly.

## Phase 8: CLI

Port `CliRandomizer.java` to a Node.js CLI (e.g., `commander`).

Same flags: `-i`, `-o`, `-s`, `-d`, `-u`, `-l`. Test by running Java CLI and TypeScript CLI with same inputs and seed — diff the output ROMs (should be byte-identical).

## Phase 9: GUI (Separate Project)

The Java Swing GUI cannot be directly ported. Options:
- **Electron + React/Solid** desktop app
- **Web app** (browser-based, File API for ROM I/O)
- **Tauri** for lightweight native wrapper

Scoped independently from the core migration.

## Config Files

The `.ini` offset files, `.tbl` character tables, and `customnames.rncn` are data files read at runtime — just port the INI/TBL parsers. No migration of the data files themselves.

## Key Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| PRNG divergence | Different randomization results | Reimplement Java's `java.util.Random` LCG exactly in TypeScript |
| Binary I/O correctness | Corrupted ROMs | Extensive roundtrip tests (load→save→load→compare) |
| Settings compatibility | Can't load old presets | Golden test against every settings version |
| No existing tests | No safety net | Every phase begins by writing tests against Java first |
| ROM availability for testing | Can't run integration tests | Extract small binary fixtures; full ROM tests run locally only |
| Endianness handling | Data corruption | TypeScript `DataView` handles endianness explicitly |

## LOC Summary

| Phase | What | Approx LOC | Test Strategy |
|---|---|---|---|
| 0 | Infrastructure | — | Build system setup |
| 1 | Domain model + constants | ~8K | JSON golden tests |
| 2 | Utilities + binary I/O | ~4K | Roundtrip + golden tests |
| 3 | Settings | ~2.5K | Serialization golden tests |
| 4 | ROM containers | ~3K | Extract/repack roundtrips |
| 5 | Abstract handlers | ~8K | Mock handler golden tests |
| 6 | Concrete handlers | ~29K | Full ROM load/compare golden tests |
| 7 | Randomizer engine | ~1.3K | Seed-deterministic full pipeline tests |
| 8 | CLI | ~0.2K | Byte-identical output ROMs |
| 9 | GUI | New code | Separate project |

**Total Java to port: ~56K LOC** (excluding GUI). TypeScript will likely be 30-40% fewer lines due to language ergonomics.

---

# Feature requests

We do not take feature requests.

# Bug reports

If you encounter something that seems to be a bug, submit an issue using the `Bug Report` issue template.

# Other problems

If you have problems using the randomizer, it could be because of some problem with Java or your operating system. **If you have problems with starting the randomizer specifically, [read this page first before creating an issue.](https://github.com/Ajarmar/universal-pokemon-randomizer-zx/wiki/About-Java)** If that page does not solve your problem, submit an issue using the `Need Help` issue template.
