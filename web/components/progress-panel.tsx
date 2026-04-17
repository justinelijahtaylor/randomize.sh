"use client";

import * as React from "react";
import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export interface ProgressState {
  percent: number;
  stage: string;
  logLines: Array<{ line: string; level: "info" | "error" }>;
  completed: boolean;
  errored: boolean;
}

export const INITIAL_PROGRESS: ProgressState = {
  percent: 0,
  stage: "",
  logLines: [],
  completed: false,
  errored: false,
};

export function ProgressPanel({ state }: { state: ProgressState }) {
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [state.logLines.length]);

  const activeStages = [
    "Base stats",
    "Types",
    "Abilities",
    "Evolutions",
    "Starters",
    "Moves",
    "Movesets",
    "Trainers",
    "Wild Pokemon",
    "Static Pokemon",
    "TMs",
    "TM compatibility",
    "Move Tutors",
    "Trades",
    "Field items",
    "Finalizing",
  ];
  const reachedSet = new Set<string>();
  {
    // All stages up to and including current should be "reached"
    let foundCurrent = false;
    for (const s of activeStages) {
      reachedSet.add(s);
      if (s === state.stage) {
        foundCurrent = true;
        break;
      }
    }
    if (!foundCurrent) {
      // Stage isn't in the predefined list; just mark current as reached
      reachedSet.clear();
      if (state.stage) reachedSet.add(state.stage);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Randomizing…</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium">{state.stage || "Starting…"}</span>
            <span className="text-zinc-500">{Math.round(state.percent)}%</span>
          </div>
          <Progress value={state.percent} />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {activeStages.map((s) => (
            <Badge
              key={s}
              variant={
                s === state.stage
                  ? "default"
                  : reachedSet.has(s)
                    ? "secondary"
                    : "outline"
              }
              className={
                reachedSet.has(s) && s !== state.stage
                  ? "opacity-60"
                  : undefined
              }
            >
              {s}
            </Badge>
          ))}
        </div>

        <div
          ref={logRef}
          className="h-48 overflow-auto rounded-md border bg-zinc-950 p-3 font-mono text-xs text-zinc-300"
        >
          {state.logLines.length === 0 && (
            <div className="text-zinc-500">Waiting for log output…</div>
          )}
          {state.logLines.map((l, i) => (
            <div
              key={i}
              className={
                l.level === "error" ? "text-red-400" : "text-zinc-300"
              }
            >
              {l.line}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
