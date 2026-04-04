import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { getDefaultFactories } from '../cli-randomizer';
import {
  Gen1RomHandlerFactory,
  knownGen1RomEntries,
  createDefaultRomEntry,
} from '../../romhandlers/gen1-rom-handler';
import * as GBConstants from '../../constants/gb-constants';

// Helper to build a synthetic Gen 1 ROM file on disk
function buildSyntheticRomFile(sig: string, version: number = 0, nonJapanese: number = 1): string {
  const size = GBConstants.minRomSize;
  const rom = Buffer.alloc(size);
  // Write signature at romSigOffset (0x134)
  for (let i = 0; i < sig.length; i++) {
    rom[GBConstants.romSigOffset + i] = sig.charCodeAt(i);
  }
  rom[GBConstants.versionOffset] = version;
  rom[GBConstants.jpFlagOffset] = nonJapanese;

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-factory-'));
  const filePath = path.join(tmpDir, 'test.gb');
  fs.writeFileSync(filePath, rom);
  return filePath;
}

function cleanupFile(filePath: string): void {
  try {
    fs.unlinkSync(filePath);
    fs.rmdirSync(path.dirname(filePath));
  } catch {
    // ignore cleanup errors
  }
}

describe('getDefaultFactories', () => {
  it('returns at least one factory', () => {
    const factories = getDefaultFactories();
    expect(factories.length).toBeGreaterThanOrEqual(1);
  });

  it('includes a Gen1 factory', () => {
    const factories = getDefaultFactories();
    const hasGen1 = factories.some((f) => f instanceof Gen1RomHandlerFactory);
    expect(hasGen1).toBe(true);
  });
});

describe('Gen1RomHandlerFactory', () => {
  describe('isLoadable', () => {
    it('returns true for a valid Gen 1 Red ROM file', () => {
      // Use the known ROM entry name format - pad to 16 chars
      const filePath = buildSyntheticRomFile('POKEMON RED\x00\x00\x00\x00\x00');
      try {
        const factory = new Gen1RomHandlerFactory();
        expect(factory.isLoadable(filePath)).toBe(true);
      } finally {
        cleanupFile(filePath);
      }
    });

    it('returns true for a valid Gen 1 Blue ROM file', () => {
      const filePath = buildSyntheticRomFile('POKEMON BLUE\x00\x00\x00\x00');
      try {
        const factory = new Gen1RomHandlerFactory();
        expect(factory.isLoadable(filePath)).toBe(true);
      } finally {
        cleanupFile(filePath);
      }
    });

    it('returns true for a valid Gen 1 Yellow ROM file', () => {
      const filePath = buildSyntheticRomFile('POKEMON YELLOW\x00\x00');
      try {
        const factory = new Gen1RomHandlerFactory();
        expect(factory.isLoadable(filePath)).toBe(true);
      } finally {
        cleanupFile(filePath);
      }
    });

    it('returns false for a non-existent file', () => {
      const factory = new Gen1RomHandlerFactory();
      expect(factory.isLoadable('/nonexistent/path/rom.gb')).toBe(false);
    });

    it('returns false for a file with wrong signature', () => {
      const filePath = buildSyntheticRomFile('NOT A POKEMON');
      try {
        const factory = new Gen1RomHandlerFactory();
        expect(factory.isLoadable(filePath)).toBe(false);
      } finally {
        cleanupFile(filePath);
      }
    });

    it('returns false for a file that is too small', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-factory-'));
      const filePath = path.join(tmpDir, 'tiny.gb');
      fs.writeFileSync(filePath, Buffer.alloc(100));
      try {
        const factory = new Gen1RomHandlerFactory();
        expect(factory.isLoadable(filePath)).toBe(false);
      } finally {
        cleanupFile(filePath);
      }
    });

    it('accepts custom ROM entries', () => {
      const customEntry = {
        ...createDefaultRomEntry(),
        name: 'Custom ROM',
        romName: 'CUSTOM GAME\x00\x00\x00\x00\x00',
        version: 0,
        nonJapanese: 1,
        crcInHeader: -1,
      };
      const filePath = buildSyntheticRomFile('CUSTOM GAME\x00\x00\x00\x00\x00');
      try {
        const factory = new Gen1RomHandlerFactory([customEntry]);
        expect(factory.isLoadable(filePath)).toBe(true);
      } finally {
        cleanupFile(filePath);
      }
    });
  });

  describe('createWithLog', () => {
    it('creates a Gen1RomHandler instance', () => {
      const factory = new Gen1RomHandlerFactory();
      const handler = factory.create({ nextInt: () => 0, nextDouble: () => 0 } as any);
      expect(handler).toBeDefined();
    });
  });
});
