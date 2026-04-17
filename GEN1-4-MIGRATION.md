# Gen 1-4 TypeScript Migration Summary

This document summarizes the port of the Universal Pokemon Randomizer ZX from Java to TypeScript, covering Generations 1 through 4.

## Scope

The original Java codebase (~23,800 lines across 5 ROM handler files) was ported to TypeScript (~20,600 lines across 115 source files), including a CLI, domain model, constants, text encoding, NDS archive handling, and the full randomization engine.

| Component | Lines |
|---|---|
| AbstractRomHandler | 5,318 |
| Gen1RomHandler (Red/Blue/Yellow) | 3,685 |
| Gen2RomHandler (Gold/Silver/Crystal) | 2,724 |
| Gen3RomHandler (Ruby/Sapphire/Emerald/FRLG) | 3,980 |
| Gen4RomHandler (Diamond/Pearl/Platinum/HGSS) | 4,179 |
| AbstractDSRomHandler | 340 |
| CLI | 381 |
| Constants (Gen 1-4 + Global) | 3,573 |
| **Total source** | **~49,680** |
| **Total tests** | **~16,778** |

**Test results**: 58 test suites, 1,140 tests, all passing.

## Architecture Decisions

### ESM-first
The project uses ES modules throughout (`"type": "module"` in package.json). All imports use the `import` syntax. The `__dirname` workaround uses `fileURLToPath(import.meta.url)`.

### Abstract base class pattern
`AbstractRomHandler` contains the core randomization logic (~5,300 lines), with generation-specific handlers overriding data access methods. This mirrors the Java architecture. Shared randomization methods (egg moves, move tutors, wild held items, trainer move selection) live in the base class rather than being duplicated across handlers.

### ROM entry system
Each ROM is identified by a `.ini` file containing offsets, NARC paths, array entries, and static Pokemon definitions. The TypeScript port parses these files identically to Java, using the same `.ini` files in `src/com/dabomstew/pkrandom/config/`.

### NDS ROM handling (Gen 4)
Gen 4 introduced NDS ROM format support via `AbstractDSRomHandler`:
- NARC archive read/write for structured game data
- ARM9 binary patching for code-level modifications
- Overlay read/write for field/battle code
- PokeTextData encryption/decryption with `Generation4.tbl` Unicode mapping

### Settings strings
The CLI supports both binary settings files (`-s`) and settings strings (`-ss`) from the Java GUI. Settings strings have a 3-digit version prefix that gets stripped before decoding.

## Generation-Specific Notes

### Gen 1 (Red/Blue/Yellow)
- GB ROM format with direct byte offset addressing
- No abilities, no held items, no physical/special split
- Pokemon use internal RBY index (not National Dex order) requiring mapping tables
- Move data is 6 bytes per move at a fixed ROM offset
- TM compatibility stored as a bitmask in base stats data

### Gen 2 (Gold/Silver/Crystal)
- GBC ROM format, banked addressing with pointer tables
- Introduced held items, breeding, egg moves, time-of-day encounters
- Trainer data uses a class-based structure with variable Pokemon counts
- Move tutor support (Crystal only, 3 tutors)
- Evolution methods expanded (happiness, trade with item, time-of-day)

### Gen 3 (Ruby/Sapphire/Emerald/FireRed/LeafGreen)
- GBA ROM format, flat 32-bit addressing
- Two distinct game families: RSE and FRLG with different data layouts
- Introduced abilities (two per Pokemon)
- Pokemon data stored in a repointed table structure
- Trainer Pokemon can have custom movesets (flag-based)
- Field items stored as script commands requiring pattern matching

### Gen 4 (Diamond/Pearl/Platinum/HeartGold/SoulSilver)
- NDS ROM format with NARC archives for structured data storage
- Two distinct game families: DPPt and HGSS with substantially different code paths
- Introduced physical/special split (`hasPhysicalSpecialSplit() = true`)
- Text data uses PokeTextData encryption (XOR-based with Pokemon-specific encoding)
- Wild encounters differ dramatically between DPPt (rate-based) and HGSS (block-based with swarm/radar/slot modifiers)
- Starter setting requires patching rival teams across multiple trainers
- Move tutors exist in Platinum and HGSS only (not Diamond/Pearl)
- Overlay-based code patching for battle mechanics and field scripts

## Key Challenges and Solutions

### Text encoding (Gen 4)
**Problem**: `FileFunctions.openConfig("Generation4.tbl")` threw ENOENT because the config file lookup only checked the TypeScript config directory.
**Solution**: Added a fallback path in `openConfig()` to search `src/com/dabomstew/pkrandom/config/` (the Java config directory) when the TypeScript directory doesn't have the file.

### Enum display in logs
**Problem**: Pokemon types displayed as numeric indices (e.g., `3/13`) instead of names (`GRASS/POISON`) in randomization logs.
**Resolution**: This is expected behavior for TypeScript numeric enums. `Type[3]` correctly resolves to `"GRASS"` at runtime. The underlying data is correct.

### Settings string decoding
**Problem**: `MoveDataMod` was undefined when decoding settings strings from the Java GUI.
**Solution**: Used generic enum lookup with null checks for all settings enum values during deserialization.

### Shared vs per-gen randomization methods
**Problem**: Methods like `randomizeEggMoves`, `randomizeMoveTutorMoves`, `randomizeMoveTutorCompatibility`, `randomizeWildHeldItems`, and `getMoveSelectionPoolAtLevel` were declared abstract but had identical implementations across gens (or were left as empty stubs).
**Solution**: Moved all five to concrete implementations in `AbstractRomHandler`, eliminating ~400 lines of duplication across Gen 1-4 handlers. Gens that lack the feature (e.g., Gen 1 has no egg moves) return empty data from their getters, so the base class methods naturally no-op.

### Concurrent file editing (Gen 4)
**Problem**: Eight parallel work streams all needed to edit `gen4-rom-handler.ts` simultaneously.
**Solution**: Each stream wrote to distinct method regions. Final integration produced 0 compile errors.

## What Remains Stubbed

| Method | Status | Notes |
|---|---|---|
| `updatePokedexAreaDataDPPt/HGSS()` | No-op | Very complex, not essential for randomization |
| `getMainPlaythroughTrainers()` | Returns `[]` | Empty in Java source too |
| `getUniqueNoSellItems()` | Returns `[]` | Empty in Java source too |
| Totem Pokemon methods | Returns `[]` | Gen 7+ feature, N/A for Gen 1-4 |
| Mega Evolution methods | Returns `[]` | Gen 6+ feature, N/A for Gen 1-4 |
| Alt Forme methods | Returns `[]` | Gen 5+ feature, N/A for Gen 1-4 |

## Testing Strategy

- **Unit tests**: ROM detection, stats parsing, move data, ROM entry parsing for each generation
- **Integration tests**: Abstract ROM handler randomization logic tested with mock implementations
- **End-to-end**: Full randomization tested with real Platinum ROM, producing working output with complete log (starters, evolutions, trainers, encounters, TMs, static Pokemon, items)

## File Structure

```
ts-src/
  cli/              # CLI entry point and argument parsing
  config/           # Settings serialization/deserialization
  constants/        # Per-gen constants (offsets, tables, lists)
  compressors/      # DS decompression (LZ10/LZ11/Huffman)
  ctr/              # 3DS format support (NCCH, RomFS, etc.)
  nds/              # NDS ROM format, NARC archives
  pokemon/          # Domain model (Pokemon, Move, Trainer, etc.)
  romhandlers/      # Per-gen ROM handlers + abstract base
  text/             # Text encoding/decoding (PokeTextData)
  utils/            # File I/O, CRC, ROM functions
```
