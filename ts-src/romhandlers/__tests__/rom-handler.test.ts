import { describe, it, expect } from "vitest";
import { RomHandlerFactory, TrainerNameMode } from "../rom-handler";
import type { RomHandler, LogStream } from "../rom-handler";
import type { RandomInstance } from "../../utils/random-source";

describe("RomHandler interface", () => {
  it("TrainerNameMode enum has expected values", () => {
    expect(TrainerNameMode.SAME_LENGTH).toBe(0);
    expect(TrainerNameMode.MAX_LENGTH).toBe(1);
    expect(TrainerNameMode.MAX_LENGTH_WITH_CLASS).toBe(2);
  });

  it("RomHandlerFactory abstract class can be subclassed", () => {
    class TestFactory extends RomHandlerFactory {
      createWithLog(
        _random: RandomInstance,
        _log: LogStream | null
      ): RomHandler {
        return {} as RomHandler;
      }

      isLoadable(_filename: string): boolean {
        return true;
      }
    }

    const factory = new TestFactory();
    expect(factory.isLoadable("test.rom")).toBe(true);
  });

  it("RomHandlerFactory.create delegates to createWithLog with null log", () => {
    let receivedLog: LogStream | null | undefined;

    class TestFactory extends RomHandlerFactory {
      createWithLog(
        _random: RandomInstance,
        log: LogStream | null
      ): RomHandler {
        receivedLog = log;
        return {} as RomHandler;
      }

      isLoadable(_filename: string): boolean {
        return false;
      }
    }

    const factory = new TestFactory();
    const mockRandom: RandomInstance = {
      nextInt: () => 0,
      nextDouble: () => 0,
      nextBoolean: () => false,
      nextFloat: () => 0,
      nextLong: () => 0n,
      nextGaussian: () => 0,
      setSeed: () => {},
      nextBytes: () => {},
    };

    factory.create(mockRandom);
    expect(receivedLog).toBeNull();
  });
});
