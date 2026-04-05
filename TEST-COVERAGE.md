# Test Coverage Analysis

**Last updated:** 2026-04-05
**Current tests:** 58 files, 1134 tests passing
**Test framework:** vitest

## Overview

All tests currently use **mocked ROM handlers** with synthetic byte arrays. No tests load real ROM files to verify end-to-end randomization results. The only real ROM verification is manual CLI testing.

## Coverage by Setting Category

### Well Tested

| Category | Enum Modes | Notes |
|---|---|---|
| Base Stats | UNCHANGED, SHUFFLE, RANDOM | Determinism verified with seeded random |
| Starters | UNCHANGED, CUSTOM, COMPLETELY_RANDOM, RANDOM_WITH_TWO_EVOLUTIONS | All modes covered |
| Types | UNCHANGED, RANDOM_FOLLOW_EVOLUTIONS, COMPLETELY_RANDOM | Dual/single type modes tested |
| Abilities | UNCHANGED, RANDOMIZE | Type assignment and determinism verified |
| Evolutions | UNCHANGED, RANDOM, RANDOM_EVERY_LEVEL | Determinism verified |
| TM Moves | UNCHANGED, RANDOM | TM move parsing and round-trip tested |
| Trainer Pokemon | All 6 modes in enum | RANDOM mode verified in integration |
| In-Game Trades | RANDOMIZE_GIVEN_AND_REQUESTED | Integration test coverage |
| Settings Serialization | All 22 enums | Serialize/deserialize round-trip verified |
| Misc Tweaks | All 23 tweaks | Bitmask validation tested |

### Partially Tested

| Category | What's Tested | What's Missing |
|---|---|---|
| Movesets | COMPLETELY_RANDOM mode | RANDOM_PREFER_SAME_TYPE, METRONOME_ONLY |
| Wild Pokemon | RANDOM mode only | AREA_MAPPING, GLOBAL_MAPPING modes |
| Wild Pokemon Restrictions | Enum values only | SIMILAR_STRENGTH, CATCH_EM_ALL, TYPE_THEME_AREAS behavior |
| TM/HM Compatibility | COMPLETELY_RANDOM mode | RANDOM_PREFER_TYPE, FULL modes |
| Field Items | RANDOM mode | SHUFFLE, RANDOM_EVEN modes |
| Static Pokemon | Stub/enum only | RANDOM_MATCHING, COMPLETELY_RANDOM, SIMILAR_STRENGTH behavior |

### Not Tested

| Category | Notes |
|---|---|
| Totem Pokemon | Gen 7 only (RANDOM, SIMILAR_STRENGTH) |
| Ally Pokemon | Gen 7 only (RANDOM, SIMILAR_STRENGTH) |
| Aura | Gen 7 only (RANDOM, SAME_STRENGTH) |
| Move Tutor Moves | Gen 3-7 (RANDOM mode) |
| Move Tutor Compatibility | Gen 3-7 (RANDOM_PREFER_TYPE, COMPLETELY_RANDOM, FULL) |
| Shop Items | SHUFFLE, RANDOM behavior |
| Pickup Items | RANDOM behavior |
| EXP Curve Standardization | No behavior tests |
| Wild Pokemon Held Items | No behavior tests |
| Trainer Held Items | No behavior tests |

## Biggest Gap: No Real ROM Integration Tests

None of the 1134 tests verify:
- Correct byte offsets for ROM data reading/writing
- ROM format detection against real game files
- End-to-end randomization producing valid game data
- Cross-generation compatibility

### Recommended Future Work

1. **Real ROM test suite** — Load at least one representative ROM per generation (Gen 1-7), randomize with known seed, verify log output and ROM validity
2. **Mode coverage** — Add tests for every enum mode, especially AREA_MAPPING/GLOBAL_MAPPING wild encounters and restriction modes
3. **Gen 7 features** — Totem/Ally/Aura randomization has 0% coverage
4. **Item randomization** — Shop items, pickup items, and held items have no behavior tests
5. **Move tutors** — No functional tests across any generation
6. **Edge cases** — Single-move pools, banned lists, empty encounter areas, etc.

## Test File Locations

| File | Purpose |
|---|---|
| `ts-src/__tests__/integration.test.ts` | Full pipeline integration with mock ROM handler |
| `ts-src/__tests__/randomizer.test.ts` | Method call ordering verification |
| `ts-src/config/__tests__/settings.test.ts` | Settings serialization and enum validation |
| `ts-src/romhandlers/__tests__/abstract-rom-handler.test.ts` | Core randomization logic (partial) |
| `ts-src/romhandlers/__tests__/gen1-rom-handler.test.ts` | Gen 1 ROM parsing |
| `ts-src/romhandlers/__tests__/gen1-movesets-tms.test.ts` | Gen 1 TM/moveset round-trip |
| `ts-src/pokemon/__tests__/*.test.ts` | Data structure tests |
| `ts-src/utils/__tests__/misc-tweak.test.ts` | Misc tweaks bitmask validation |
