# Implementation Plan: Getting the CLI Operational

## The Gap

The TS port has all the **pieces** but they aren't **wired together**. Specifically:

- `AbstractRomHandler` declares **168 abstract methods** — the contract every gen handler must fulfill
- The concrete gen handlers currently implement **3-6 methods each** (mostly getters for Pokemon/Moves)
- **Zero handlers** implement: `saveRomFile`, `getEncounters`/`setEncounters`, `getTrainers`/`setTrainers`, `getStarters`/`setStarters`, or any randomization action methods
- `getDefaultFactories()` in the CLI returns `[]` — no factories are registered
- Gen1-5 handlers don't even extend `AbstractRomHandler` yet

## Strategy: Gen1 First, Full Vertical Slice

Get **one generation fully working end-to-end** before touching the others. Gen1 (Red/Blue/Yellow) is the best candidate:
- Simplest binary format (raw GB ROM, no archives)
- No abilities, no alt formes, no megas — **~53 of the 168 methods are trivial stubs** returning empty/false/0
- The Java Gen1RomHandler has 108 override methods: 22 trivial, 31 simple, 39 medium, 16 complex
- Estimated ~1,560 lines of new TypeScript to get fully functional

## Phase A: Wire Up Gen1 as a Complete RomHandler (~1,560 LOC)

### Step 1 — Trivial stubs (22 methods, ~50 LOC)

Methods that return constants/empty values because Gen1 doesn't have the feature:

- `abilitiesPerPokemon() → 0`
- `highestAbilityIndex() → 0`
- `getAbilityVariations() → new Map()`
- `hasMegaEvolutions() → false`
- `getPokemonInclFormes() → pokemonList`
- `getAltFormes() → []`
- `getMegaEvolutions() → []`
- `getAltFormeOfPokemon(pk) → pk`
- `getIrregularFormes() → []`
- `hasFunctionalFormes() → false`
- `hasWildAltFormes() → false`
- `hasStarterAltFormes() → false`
- `getMainPlaythroughTrainers() → []`
- `getEliteFourTrainers() → []`
- `hasRivalFinalBattle() → false`
- `hasStaticAltFormes() → false`
- `hasMainGameLegendaries() → false`
- `getMainGameLegendaries() → []`
- `getSpecialMusicStatics() → []`
- `getTotemPokemon() → []`
- `setTotemPokemon() → void`
- `getEggMoves() → new Map()`
- `setEggMoves() → void`
- `hasMoveTutors() → false`
- `getMoveTutorMoves() → []`
- `setMoveTutorMoves() → void`
- `getMoveTutorCompatibility() → new Map()`
- `setMoveTutorCompatibility() → void`

### Step 2 — Simple metadata (31 methods, ~150 LOC)

One-liners or small methods:

- `generationOfPokemon() → 1`
- `getDefaultExtension() → "sgb"`
- `isYellow()` — checks romEntry flag
- `starterCount()` — returns 2 or 3
- `canChangeStaticPokemon()` — checks romEntry
- `hasPhysicalSpecialSplit() → false`
- `supportsFourStartingMoves() → false`
- `supportsStarterHeldItems() → false`
- `getStarterHeldItems() → []`
- `setStarterHeldItems() → void`
- `getGameBreakingMoves()` — returns Gen1Constants list
- `getFieldMoves()` — returns Gen1Constants list
- `getEarlyRequiredHMMoves()` — returns Gen1Constants list
- `getMovesBannedFromLevelup()` — returns hardcoded list
- `getDoublesTrainerClasses() → []`
- `fixedTrainerClassNamesLength() → true`
- `canChangeTrainerText()` — checks romEntry
- `hasDVs() → true`
- `getHMCount() → Gen1Constants.hmCount`
- `getTMCount() → Gen1Constants.tmCount`
- `getHMMoves()` — reads from ROM
- `typeInGame()` — checks Gen1Constants.typeTable
- `getUpdatedPokemonStats() → new Map()`
- `isEffectivenessUpdated()` — returns flag
- `internalStringLength()` — translates and measures
- `hasShopRandomization()` — checks romEntry
- `setShopPrices() → void`
- `miscTweaksAvailable()` — bitwise OR of available tweaks
- `applyMiscTweak()` — switches on tweak type
- `getROMName()` / `getROMCode()`
- `getSupportLevel()`

### Step 3 — ROM load/save (CRITICAL, ~200 LOC)

Reference: Java `Gen1RomHandler.loadRom()`, `AbstractGBRomHandler.saveRomFile()`

- `loadRom(filename)` — read raw bytes, detect ROM entry from signature/CRC, call `loadedRom()` to init all data
- `saveRomFile(filename, seed)` — write modified bytes back to file
- `saveRomDirectory(filename)` — not applicable for Gen1, can throw
- `isRomValid()` — validate ROM checksums
- `loadedFilename()` — return stored filename
- `printRomDiagnostics(logStream)` — print ROM info

### Step 4 — Pokemon and move data (CRITICAL, ~150 LOC)

Reference: Java `Gen1RomHandler.loadPokemonStats()`, `loadMoves()`

Individual parsers (`loadBasicPokeStats`, `loadMoveData`) already exist in the TS port. Need to add:

- `loadPokemonStats()` — bulk load all 151 from ROM using existing per-Pokemon parser
- `savePokemonStats()` — bulk save all 151
- `loadMoves()` — bulk load all moves using existing per-move parser
- `saveMoves()` — bulk save all moves
- `populateEvolutions()` — parse evolution chains from ROM
- `loadPokemonNames()` — read name table
- `loadPokedex()` — read Pokedex order mapping
- `constructPokemonList()` — assemble final Pokemon list

### Step 5 — Encounters (CRITICAL, ~200 LOC)

Reference: Java `Gen1RomHandler.getEncounters()`, `setEncounters()`

- `getEncounters(useTimeOfDay)` — parse wild Pokemon tables (grass, water, fishing rod encounters) from ROM offsets
- `setEncounters(useTimeOfDay, encounters)` — write encounter data back
- Wild Pokemon are stored as species+level pairs at known ROM offsets per area

### Step 6 — Trainers (CRITICAL, ~200 LOC)

Reference: Java `Gen1RomHandler.getTrainers()`, `setTrainers()`

- `getTrainers()` — parse trainer data structures from ROM (trainer class, Pokemon species+levels)
- `setTrainers(trainers, customNames)` — write modified trainer data
- Gen1 trainers are relatively simple: class byte, then a list of level+species pairs terminated by 0x00

### Step 7 — Starters + Movesets + TMs (~300 LOC)

Reference: Java `Gen1RomHandler.getStarters()`, `getMovesLearnt()`, `writeEvosAndMovesLearnt()`

- `getStarters()` / `setStarters(starters)` — read/write 2-3 starter species bytes, handle text/pokedex patching
- `getMovesLearnt()` — parse level-up moveset data for all Pokemon
- `setMovesLearnt(movesets)` — delegates to `writeEvosAndMovesLearnt()`
- `writeEvosAndMovesLearnt()` — **most complex method** (~200 LOC): manages bank switching, pointer table reconstruction, memory allocation for evolution and moveset data blocks
- `getTMMoves()` / `setTMMoves()` — read/write TM move indices
- `getTMHMCompatibility()` / `setTMHMCompatibility()` — read/write per-Pokemon TM compatibility bitfields

### Step 8 — Remaining features (~250 LOC)

Reference: Java Gen1RomHandler remaining methods

- **Static Pokemon**: `getStaticPokemon()` / `setStaticPokemon()` — read/write fixed encounter species
- **In-game trades**: `getIngameTrades()` / `setIngameTrades()` — parse NPC trade data
- **Field items**: `getRequiredFieldTMs()`, `getCurrentFieldTMs()`, `setFieldTMs()`, `getRegularFieldItems()`, `setRegularFieldItems()`
- **Shops**: `getShopItems()` / `setShopItems()`
- **Trainer names**: `getTrainerNames()` / `setTrainerNames()`, `getTrainerClassNames()` / `setTrainerClassNames()`
- **Type effectiveness**: `readTypeEffectivenessTable()` / `writeTypeEffectivenessTable()`
- **Misc**: `randomizeIntroPokemon()`, `removeEvosForPokemonPool()`

## Phase B: Register Gen1 Factory in CLI (~20 LOC)

- Wire `Gen1RomHandlerFactory` into `getDefaultFactories()` in `ts-src/cli/cli-randomizer.ts`
- Ensure the factory's `isLoadable()` checks file size + ROM signature
- Ensure the factory's `create()` returns a fully-initialized Gen1RomHandler

Test command:
```
npx ts-node ts-src/cli/index.ts -s settings.rnqs -i red.gb -o red_random.gb
```

## Phase C: Integration Test with Real ROM (~200 LOC)

Create `ts-src/romhandlers/__tests__/gen1-integration.test.ts`:

1. Load a Gen1 ROM → verify all 151 Pokemon parsed correctly (names, stats, types)
2. Verify all 165 moves loaded correctly
3. Verify encounters, trainers, starters loaded
4. Randomize with fixed seed → save → reload → verify data changed deterministically
5. Compare with Java output for same seed (the ultimate golden test)

Note: This test requires an actual ROM file and should be skipped in CI. Use `describe.skipIf(!romExists)`.

## Phase D: Repeat for Gen2-7

Once Gen1 is proven, the pattern is established. Each subsequent gen adds generation-specific features on top of the same 168-method interface:

| Gen | Key Additions | Estimated LOC |
|-----|--------------|---------------|
| Gen2 | Held items, egg moves, time-based evos, day/night encounters | ~2,000 |
| Gen3 | GBA binary, abilities, natures, double battles, contests | ~3,000 |
| Gen4 | NDS+NARC, physical/special split, underground items | ~4,000 |
| Gen5 | NDS+NARC, seasons, hidden abilities, PWT | ~4,000 |
| Gen6 | 3DS+GARC, mega evolution, fairy type, horde encounters | ~3,500 |
| Gen7 | 3DS+GARC, Z-moves, totem pokemon, Alolan forms, SOS battles | ~3,500 |

## Key Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| `writeEvosAndMovesLearnt()` bank management | Data corruption | Port exactly from Java, test with known ROM data |
| ROM offset miscalculation | Wrong data read/written | Golden test against Java output for same ROM |
| Text encoding bugs | Garbled Pokemon/move names | Compare full name tables between Java and TS |
| Pointer table corruption on save | Unplayable ROM | Load→save→reload roundtrip test |

## File Reference

| File | Current LOC | Estimated Final LOC |
|------|-------------|-------------------|
| `ts-src/romhandlers/gen1-rom-handler.ts` | 656 | ~2,200 |
| `ts-src/romhandlers/abstract-rom-handler.ts` | 1,605 | ~1,605 (no changes) |
| `ts-src/romhandlers/rom-handler.ts` | 352 | ~352 (no changes) |
| `ts-src/randomizer.ts` | 1,521 | ~1,521 (no changes) |
| `ts-src/cli/cli-randomizer.ts` | 334 | ~360 |

## Success Criteria

The CLI is operational when:
1. `npx ts-node ts-src/cli/index.ts -s <settings> -i <rom.gb> -o <output.gb>` completes without error
2. The output ROM is playable in a Game Boy emulator
3. Randomized data (Pokemon stats, wild encounters, trainers) differs from the original
4. Running with the same seed produces byte-identical output ROMs
5. (Stretch) Running with the same seed produces the same output as the Java version
