// SPDX-License-Identifier: GPL-3.0-or-later
// Part of "randomize.sh" (https://github.com/justinelijahtaylor/randomizer)
// A web fork of Universal Pokemon Randomizer ZX. Licensed under GPLv3-or-later.
// See LICENSE.txt for the full license text.

"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { presetsForRom } from "@/lib/presets";

interface Props {
  generation: number;
  romName: string | null;
  /**
   * Which preset-row entry should appear highlighted:
   *   - "default" → the Default button is highlighted
   *   - "custom"  → nothing is highlighted (user has a custom config)
   *   - any other string → preset with that id is highlighted
   */
  activeSelection: string;
  onApply: (presetId: string, settingsString: string) => void;
  /**
   * Reset every setting back to the randomizer's neutral defaults and keep
   * the full options form visible. Treated as the implicit "no preset"
   * option on the left of the preset row.
   */
  onReset: () => void;
}

/**
 * Inline preset picker — renders as a row of buttons, meant to sit inside
 * the Settings string card. The currently-active choice is highlighted.
 */
export function PresetPicker({ generation, romName, activeSelection, onApply, onReset }: Props) {
  const applicable = presetsForRom(generation, romName);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground mr-1">Presets:</span>
      <Button
        type="button"
        variant={activeSelection === "default" ? "default" : "outline"}
        size="sm"
        onClick={onReset}
      >
        Default
      </Button>
      {applicable.map((p) => {
        const active = activeSelection === p.id;
        return (
          <Button
            key={p.id}
            type="button"
            variant={active ? "default" : "outline"}
            size="sm"
            onClick={() => onApply(p.id, p.settingsString)}
          >
            {p.name}
          </Button>
        );
      })}
    </div>
  );
}
