// SPDX-License-Identifier: GPL-3.0-or-later
// Part of "randomize.sh" (https://github.com/justinelijahtaylor/randomizer)
// A web fork of Universal Pokemon Randomizer ZX. Licensed under GPLv3-or-later.
// See LICENSE.txt for the full license text.

"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { presetsForRom } from "@/lib/presets";

interface Props {
  generation: number;
  romName: string | null;
  onApply: (settingsString: string) => void;
}

export function Presets({ generation, romName, onApply }: Props) {
  const applicable = presetsForRom(generation, romName);

  if (applicable.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Presets</CardTitle>
        <CardDescription>
          Popular settings configurations for Gen {generation}
          {romName ? ` / ${romName}` : ""}. Clicking a preset overwrites every
          form option — you can still tweak individual fields afterward.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {applicable.map((p) => (
            <Button
              key={p.id}
              variant="outline"
              size="sm"
              title={p.description}
              onClick={() => onApply(p.settingsString)}
              className="flex flex-col items-start h-auto py-2 px-3 gap-0.5"
            >
              <span className="font-medium">{p.name}</span>
              {p.description && (
                <span className="text-xs text-muted-foreground font-normal">
                  {p.description}
                </span>
              )}
            </Button>
          ))}
          <Badge variant="outline" className="h-auto py-1 px-2 self-center">
            {applicable.length} preset{applicable.length === 1 ? "" : "s"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
