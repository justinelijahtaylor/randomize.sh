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
  /** ID of the currently-applied preset, if any. */
  appliedPresetId: string | null;
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
 * the Settings string card. The active preset (if any) is highlighted.
 */
export function PresetPicker({ generation, romName, appliedPresetId, onApply, onReset }: Props) {
  const applicable = presetsForRom(generation, romName);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground mr-1">Presets:</span>
      <Button
        type="button"
        variant={appliedPresetId === null ? "default" : "outline"}
        size="sm"
        onClick={onReset}
      >
        Default
      </Button>
      {applicable.map((p) => {
        const active = appliedPresetId === p.id;
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
