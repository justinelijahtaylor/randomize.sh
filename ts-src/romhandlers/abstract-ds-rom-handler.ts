/**
 * AbstractDSRomHandler.ts - a base class for DS ROM handlers
 * which standardises common DS functions.
 *
 * Ported from AbstractDSRomHandler.java
 */

import { AbstractRomHandler } from "./abstract-rom-handler";
import type { LogStream } from "./rom-handler";
import type { RandomInstance } from "../utils/random-source";
import { Type } from "../pokemon/type";

export abstract class AbstractDSRomHandler extends AbstractRomHandler {
  protected dataFolder: string = "";
  private loadedFN: string = "";

  constructor(random: RandomInstance, logStream: LogStream | null) {
    super(random, logStream);
  }

  protected abstract detectNDSRom(ndsCode: string, version: number): boolean;

  loadRom(filename: string): boolean {
    // In a real implementation, this would detect and load the NDS ROM
    this.loadedFN = filename;
    return true;
  }

  loadedFilename(): string {
    return this.loadedFN;
  }

  saveRomFile(_filename: string, _seed: number): boolean {
    return true;
  }

  saveRomDirectory(_filename: string): boolean {
    return true;
  }

  hasGameUpdateLoaded(): boolean {
    return false;
  }

  loadGameUpdate(_filename: string): boolean {
    return true;
  }

  removeGameUpdate(): void {
    // do nothing
  }

  getGameUpdateVersion(): string | null {
    return null;
  }

  printRomDiagnostics(logStream: LogStream): void {
    logStream.println("DS ROM loaded: " + this.loadedFN);
  }

  canChangeStaticPokemon(): boolean {
    return false;
  }

  hasPhysicalSpecialSplit(): boolean {
    return true;
  }

  protected get3byte(amount: number): Uint8Array {
    const ret = new Uint8Array(3);
    ret[0] = amount & 0xff;
    ret[1] = (amount >> 8) & 0xff;
    ret[2] = (amount >> 16) & 0xff;
    return ret;
  }

  protected readByte(data: Uint8Array, offset: number): number {
    return data[offset] & 0xff;
  }

  protected readWord(data: Uint8Array, offset: number): number {
    return (data[offset] & 0xff) | ((data[offset + 1] & 0xff) << 8);
  }

  protected readLong(data: Uint8Array, offset: number): number {
    return (
      (data[offset] & 0xff) |
      ((data[offset + 1] & 0xff) << 8) |
      ((data[offset + 2] & 0xff) << 16) |
      ((data[offset + 3] & 0xff) << 24)
    );
  }

  protected readRelativePointer(data: Uint8Array, offset: number): number {
    return this.readLong(data, offset) + offset + 4;
  }

  protected writeWord(data: Uint8Array, offset: number, value: number): void {
    data[offset] = value & 0xff;
    data[offset + 1] = (value >> 8) & 0xff;
  }

  protected writeLong(data: Uint8Array, offset: number, value: number): void {
    data[offset] = value & 0xff;
    data[offset + 1] = (value >> 8) & 0xff;
    data[offset + 2] = (value >> 16) & 0xff;
    data[offset + 3] = (value >> 24) & 0xff;
  }

  protected writeRelativePointer(
    data: Uint8Array,
    offset: number,
    pointer: number
  ): void {
    const relPointer = pointer - (offset + 4);
    this.writeLong(data, offset, relPointer);
  }

  protected readByteIntoFlags(
    data: Uint8Array,
    flags: boolean[],
    offsetIntoFlags: number,
    offsetIntoData: number
  ): void {
    const thisByte = data[offsetIntoData] & 0xff;
    for (let i = 0; i < 8 && i + offsetIntoFlags < flags.length; i++) {
      flags[offsetIntoFlags + i] = ((thisByte >> i) & 0x01) === 0x01;
    }
  }

  protected getByteFromFlags(
    flags: boolean[],
    offsetIntoFlags: number
  ): number {
    let thisByte = 0;
    for (let i = 0; i < 8 && i + offsetIntoFlags < flags.length; i++) {
      thisByte |= (flags[offsetIntoFlags + i] ? 1 : 0) << i;
    }
    return thisByte & 0xff;
  }

  protected typeTMPaletteNumber(t: Type | null): number {
    if (t == null) return 411; // CURSE
    switch (t) {
      case Type.FIGHTING:
        return 398;
      case Type.DRAGON:
        return 399;
      case Type.WATER:
        return 400;
      case Type.PSYCHIC:
        return 401;
      case Type.NORMAL:
        return 402;
      case Type.POISON:
        return 403;
      case Type.ICE:
        return 404;
      case Type.GRASS:
        return 405;
      case Type.FIRE:
        return 406;
      case Type.DARK:
        return 407;
      case Type.STEEL:
        return 408;
      case Type.ELECTRIC:
        return 409;
      case Type.GROUND:
        return 410;
      case Type.GHOST:
        return 411;
      case Type.ROCK:
        return 412;
      case Type.FLYING:
        return 413;
      case Type.BUG:
        return 610;
      default:
        return 411;
    }
  }
}
