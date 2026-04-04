import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  parseArgs,
  invoke,
  performDirectRandomization,
} from "../cli-randomizer";
import type { CliArgs } from "../cli-randomizer";
import { RomHandlerFactory } from "../../romhandlers/rom-handler";
import type { RomHandler, LogStream } from "../../romhandlers/rom-handler";
import type { RandomInstance } from "../../utils/random-source";
import { Settings } from "../../config/settings";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockFactory(
  loadable: boolean,
  handler?: Partial<RomHandler>,
): RomHandlerFactory {
  class MockFactory extends RomHandlerFactory {
    createWithLog(
      _random: RandomInstance,
      _log: LogStream | null,
    ): RomHandler {
      return {
        loadRom: vi.fn().mockReturnValue(true),
        saveRomFile: vi.fn().mockReturnValue(true),
        saveRomDirectory: vi.fn().mockReturnValue(true),
        loadedFilename: vi.fn().mockReturnValue("/some/other/path.gba"),
        hasGameUpdateLoaded: vi.fn().mockReturnValue(false),
        loadGameUpdate: vi.fn().mockReturnValue(true),
        removeGameUpdate: vi.fn(),
        getGameUpdateVersion: vi.fn().mockReturnValue(null),
        setLog: vi.fn(),
        printRomDiagnostics: vi.fn(),
        isRomValid: vi.fn().mockReturnValue(true),
        generationOfPokemon: vi.fn().mockReturnValue(3),
        getDefaultExtension: vi.fn().mockReturnValue("gba"),
        getROMName: vi.fn().mockReturnValue("Test ROM"),
        getROMCode: vi.fn().mockReturnValue("TEST"),
        getSupportLevel: vi.fn().mockReturnValue("Complete"),
        ...handler,
      } as unknown as RomHandler;
    }

    isLoadable(_filename: string): boolean {
      return loadable;
    }
  }
  return new MockFactory();
}

/**
 * Create a temporary settings file that Settings.read can parse.
 */
function createTempSettingsFile(): string {
  const settings = new Settings();
  const data = settings.write();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cli-test-"));
  const settingsPath = path.join(tmpDir, "test.rnqs");
  fs.writeFileSync(settingsPath, data);
  return settingsPath;
}

/**
 * Create a temporary file with arbitrary content.
 */
function createTempFile(name: string, content: string = "dummy"): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cli-test-"));
  const filePath = path.join(tmpDir, name);
  fs.writeFileSync(filePath, content);
  return filePath;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CLI argument parsing", () => {
  it("parses -i, -o, -s flags correctly", () => {
    const result = parseArgs([
      "-s",
      "settings.rnqs",
      "-i",
      "input.gba",
      "-o",
      "output.gba",
    ]);
    expect(result.settingsFilePath).toBe("settings.rnqs");
    expect(result.sourceRomFilePath).toBe("input.gba");
    expect(result.outputRomFilePath).toBe("output.gba");
    expect(result.saveAsDirectory).toBe(false);
    expect(result.updateFilePath).toBeNull();
    expect(result.saveLog).toBe(false);
    expect(result.showHelp).toBe(false);
  });

  it("parses -d flag for save-as-directory", () => {
    const result = parseArgs([
      "-s",
      "s.rnqs",
      "-i",
      "in.3ds",
      "-o",
      "out.3ds",
      "-d",
    ]);
    expect(result.saveAsDirectory).toBe(true);
  });

  it("parses -u flag for game update path", () => {
    const result = parseArgs([
      "-s",
      "s.rnqs",
      "-i",
      "in.3ds",
      "-o",
      "out.3ds",
      "-u",
      "update.cxi",
    ]);
    expect(result.updateFilePath).toBe("update.cxi");
  });

  it("parses -l flag for saving log", () => {
    const result = parseArgs([
      "-s",
      "s.rnqs",
      "-i",
      "in.gba",
      "-o",
      "out.gba",
      "-l",
    ]);
    expect(result.saveLog).toBe(true);
  });

  it("parses --help flag", () => {
    const result = parseArgs(["--help"]);
    expect(result.showHelp).toBe(true);
  });

  it("parses all flags together", () => {
    const result = parseArgs([
      "-s",
      "settings.rnqs",
      "-i",
      "input.gba",
      "-o",
      "output.gba",
      "-d",
      "-u",
      "update.cxi",
      "-l",
    ]);
    expect(result.settingsFilePath).toBe("settings.rnqs");
    expect(result.sourceRomFilePath).toBe("input.gba");
    expect(result.outputRomFilePath).toBe("output.gba");
    expect(result.saveAsDirectory).toBe(true);
    expect(result.updateFilePath).toBe("update.cxi");
    expect(result.saveLog).toBe(true);
  });

  it("leaves null for missing optional args", () => {
    const result = parseArgs([]);
    expect(result.settingsFilePath).toBeNull();
    expect(result.sourceRomFilePath).toBeNull();
    expect(result.outputRomFilePath).toBeNull();
    expect(result.updateFilePath).toBeNull();
  });
});

describe("CLI invoke - missing required args", () => {
  it("returns 1 and prints error when -i is missing", () => {
    const errors: string[] = [];
    const stderr = (msg: string) => errors.push(msg);
    const stdout = vi.fn();

    const code = invoke(
      ["-s", "settings.rnqs", "-o", "output.gba"],
      [],
      stderr,
      stdout,
    );

    expect(code).toBe(1);
    expect(errors.some((e) => e.includes("Missing required argument"))).toBe(
      true,
    );
  });

  it("returns 1 and prints error when -s is missing", () => {
    const errors: string[] = [];
    const stderr = (msg: string) => errors.push(msg);

    const code = invoke(["-i", "input.gba", "-o", "output.gba"], [], stderr);

    expect(code).toBe(1);
    expect(errors.some((e) => e.includes("Missing required argument"))).toBe(
      true,
    );
  });

  it("returns 1 and prints error when -o is missing", () => {
    const errors: string[] = [];
    const stderr = (msg: string) => errors.push(msg);

    const code = invoke(["-s", "settings.rnqs", "-i", "input.gba"], [], stderr);

    expect(code).toBe(1);
    expect(errors.some((e) => e.includes("Missing required argument"))).toBe(
      true,
    );
  });

  it("returns 0 for --help", () => {
    const errors: string[] = [];
    const stderr = (msg: string) => errors.push(msg);

    const code = invoke(["--help"], [], stderr);

    expect(code).toBe(0);
    expect(errors.some((e) => e.includes("Usage:"))).toBe(true);
  });
});

describe("CLI invoke - invalid files", () => {
  it("returns 1 when settings file does not exist", () => {
    const romPath = createTempFile("test.gba");
    const errors: string[] = [];
    const stderr = (msg: string) => errors.push(msg);

    const code = invoke(
      [
        "-s",
        "/nonexistent/settings.rnqs",
        "-i",
        romPath,
        "-o",
        "/tmp/output.gba",
      ],
      [],
      stderr,
    );

    expect(code).toBe(1);
    expect(
      errors.some((e) => e.includes("Could not read settings file")),
    ).toBe(true);

    // Cleanup
    fs.unlinkSync(romPath);
    fs.rmdirSync(path.dirname(romPath));
  });

  it("returns 1 when source ROM file does not exist", () => {
    const settingsPath = createTempSettingsFile();
    const errors: string[] = [];
    const stderr = (msg: string) => errors.push(msg);

    const code = invoke(
      [
        "-s",
        settingsPath,
        "-i",
        "/nonexistent/rom.gba",
        "-o",
        "/tmp/output.gba",
      ],
      [],
      stderr,
    );

    expect(code).toBe(1);
    expect(
      errors.some((e) => e.includes("Could not read source ROM file")),
    ).toBe(true);

    // Cleanup
    fs.unlinkSync(settingsPath);
    fs.rmdirSync(path.dirname(settingsPath));
  });
});

describe("CLI invoke - settings file loading", () => {
  it("loads a valid settings file and proceeds to ROM detection", () => {
    const settingsPath = createTempSettingsFile();
    const romPath = createTempFile("test.gba");
    const outputPath = path.join(path.dirname(romPath), "output.gba");
    const errors: string[] = [];
    const outputs: string[] = [];
    const stderr = (msg: string) => errors.push(msg);
    const stdout = (msg: string) => outputs.push(msg);

    // Use a factory that says "not loadable" -- we just want to verify
    // that settings loading succeeds and we get to the factory detection step.
    const factory = createMockFactory(false);

    const code = invoke(
      ["-s", settingsPath, "-i", romPath, "-o", outputPath],
      [factory],
      stderr,
      stdout,
    );

    // Should fail with "Randomization failed" (because no factory matched),
    // NOT with "Could not read settings file".
    expect(code).toBe(1);
    expect(
      errors.some((e) => e.includes("Could not read settings file")),
    ).toBe(false);
    expect(errors.some((e) => e.includes("Randomization failed"))).toBe(true);

    // Cleanup
    fs.unlinkSync(settingsPath);
    fs.rmdirSync(path.dirname(settingsPath));
    fs.unlinkSync(romPath);
    fs.rmdirSync(path.dirname(romPath));
  });
});

describe("ROM factory detection", () => {
  it("tries each factory until one matches", () => {
    const settingsPath = createTempSettingsFile();
    const romPath = createTempFile("test.gba");
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "cli-out-"));
    const outputPath = path.join(outputDir, "output.gba");

    const isLoadableSpy1 = vi.fn().mockReturnValue(false);
    const isLoadableSpy2 = vi.fn().mockReturnValue(false);
    const isLoadableSpy3 = vi.fn().mockReturnValue(false);

    class Factory1 extends RomHandlerFactory {
      createWithLog(): RomHandler {
        return {} as RomHandler;
      }
      isLoadable(filename: string): boolean {
        return isLoadableSpy1(filename);
      }
    }
    class Factory2 extends RomHandlerFactory {
      createWithLog(): RomHandler {
        return {} as RomHandler;
      }
      isLoadable(filename: string): boolean {
        return isLoadableSpy2(filename);
      }
    }
    class Factory3 extends RomHandlerFactory {
      createWithLog(): RomHandler {
        return {} as RomHandler;
      }
      isLoadable(filename: string): boolean {
        return isLoadableSpy3(filename);
      }
    }

    const factories = [new Factory1(), new Factory2(), new Factory3()];
    const errors: string[] = [];
    const stderr = (msg: string) => errors.push(msg);

    // None match, so it should try all three
    performDirectRandomization(
      settingsPath,
      romPath,
      outputPath,
      false,
      null,
      false,
      factories,
      stderr,
    );

    expect(isLoadableSpy1).toHaveBeenCalledTimes(1);
    expect(isLoadableSpy2).toHaveBeenCalledTimes(1);
    expect(isLoadableSpy3).toHaveBeenCalledTimes(1);

    // Verify the error mentions unsupported ROM
    expect(errors.some((e) => e.includes("Unsupported ROM file"))).toBe(true);

    // Cleanup
    fs.unlinkSync(settingsPath);
    fs.rmdirSync(path.dirname(settingsPath));
    fs.unlinkSync(romPath);
    fs.rmdirSync(path.dirname(romPath));
    fs.rmdirSync(outputDir);
  });

  it("stops at the first factory that matches", () => {
    const settingsPath = createTempSettingsFile();
    const romPath = createTempFile("test.gba");
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "cli-out-"));
    const outputPath = path.join(outputDir, "output.gba");

    const isLoadableSpy1 = vi.fn().mockReturnValue(false);
    const isLoadableSpy3 = vi.fn().mockReturnValue(false);

    const mockRandomize = vi.fn();

    class Factory1 extends RomHandlerFactory {
      createWithLog(): RomHandler {
        return {} as RomHandler;
      }
      isLoadable(filename: string): boolean {
        return isLoadableSpy1(filename);
      }
    }

    // Factory2 matches and returns a handler
    const matchingFactory = createMockFactory(true);

    class Factory3 extends RomHandlerFactory {
      createWithLog(): RomHandler {
        return {} as RomHandler;
      }
      isLoadable(filename: string): boolean {
        return isLoadableSpy3(filename);
      }
    }

    const factories = [
      new Factory1(),
      matchingFactory,
      new Factory3(),
    ];
    const errors: string[] = [];
    const outputs: string[] = [];
    const stderr = (msg: string) => errors.push(msg);
    const stdout = (msg: string) => outputs.push(msg);

    // The matching factory's handler will throw when randomize is called
    // (because the mock handler doesn't have all methods), but that's fine --
    // we just want to verify factory 3 was NOT checked.
    performDirectRandomization(
      settingsPath,
      romPath,
      outputPath,
      false,
      null,
      false,
      factories,
      stderr,
      stdout,
    );

    // Factory1 was checked (and said no)
    expect(isLoadableSpy1).toHaveBeenCalledTimes(1);
    // Factory3 should NOT have been checked (factory2 matched)
    expect(isLoadableSpy3).not.toHaveBeenCalled();

    // Cleanup
    fs.unlinkSync(settingsPath);
    fs.rmdirSync(path.dirname(settingsPath));
    fs.unlinkSync(romPath);
    fs.rmdirSync(path.dirname(romPath));
    fs.rmdirSync(outputDir);
  });
});
