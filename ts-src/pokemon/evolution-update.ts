import type { Pokemon } from "./pokemon";
import { EvolutionType } from "./evolution-type";

/**
 * Represents an update to an evolution, used for logging changes
 * to impossible evolutions, easier evolutions, and time-based evolutions.
 *
 * Ported from Java: com.dabomstew.pkrandom.pokemon.EvolutionUpdate
 */
export class EvolutionUpdate {
  public readonly from: Pokemon;
  public readonly to: Pokemon;
  public readonly fromName: string;
  public readonly toName: string;
  public readonly type: EvolutionType;
  public readonly extraInfo: string;
  public readonly condensed: boolean;
  public readonly additional: boolean;

  constructor(
    from: Pokemon,
    to: Pokemon,
    type: EvolutionType,
    extraInfo: string,
    condensed: boolean,
    additional: boolean,
  ) {
    this.from = from;
    this.to = to;
    this.fromName = from.fullName();
    this.toName = to.fullName();
    this.type = type;
    this.extraInfo = extraInfo;
    this.condensed = condensed;
    this.additional = additional;
  }

  isCondensed(): boolean {
    return this.condensed;
  }

  equals(other: EvolutionUpdate | null): boolean {
    if (this === other) return true;
    if (other == null) return false;
    return (
      this.from === other.from &&
      this.to === other.to &&
      this.type === other.type
    );
  }

  compareTo(o: EvolutionUpdate): number {
    if (this.from.number < o.from.number) {
      return -1;
    } else if (this.from.number > o.from.number) {
      return 1;
    } else {
      return this.to.number < o.to.number
        ? -1
        : this.to.number > o.to.number
          ? 1
          : 0;
    }
  }

  toString(): string {
    const NEWLINE = "\n";
    switch (this.type) {
      case EvolutionType.LEVEL:
        if (this.condensed) {
          const formatLength = this.additional ? 15 : 20;
          const also = this.additional ? " also" : "";
          return `${this.fromName.padEnd(15)} now${also} evolves into ${this.toName.padEnd(formatLength)} at minimum level ${this.extraInfo}`;
        } else {
          return `${this.fromName.padEnd(15)} -> ${this.toName.padEnd(15)} at level ${this.extraInfo}`;
        }
      case EvolutionType.STONE:
        return `${this.fromName.padEnd(15)} -> ${this.toName.padEnd(15)} using a ${this.extraInfo}`;
      case EvolutionType.HAPPINESS:
        return `${this.fromName.padEnd(15)} -> ${this.toName.padEnd(15)} by reaching high happiness`;
      case EvolutionType.LEVEL_ITEM_DAY:
        return `${this.fromName.padEnd(15)} -> ${this.toName.padEnd(15)} by leveling up holding ${this.extraInfo}`;
      case EvolutionType.LEVEL_WITH_OTHER:
        return `${this.fromName.padEnd(15)} -> ${this.toName.padEnd(15)} by leveling up with ${this.extraInfo} in the party`;
      default:
        return "";
    }
  }
}
