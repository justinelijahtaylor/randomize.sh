// SPDX-License-Identifier: GPL-3.0-or-later
// Part of "randomize.sh" (https://github.com/justinelijahtaylor/randomizer)
// A web fork of Universal Pokemon Randomizer ZX. Licensed under GPLv3-or-later.
// See LICENSE.txt for the full license text.

"use client";

import * as React from "react";
import { useEffect, useState, useCallback, useRef } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { RomUpload, type LoadedRom } from "@/components/rom-upload";
import { ProgressPanel, INITIAL_PROGRESS, type ProgressState } from "@/components/progress-panel";
import { SettingsForm } from "@/components/settings-form";
import { PresetPicker } from "@/components/presets";
import { DEFAULT_VALUES } from "@/lib/form-schema";
import type { RandomizerClient } from "@/lib/worker/client";

export default function Home() {
  const [client, setClient] = useState<RandomizerClient | null>(null);
  const [workerReady, setWorkerReady] = useState(false);
  const [workerError, setWorkerError] = useState<string | null>(null);
  const [loadedRom, setLoadedRom] = useState<LoadedRom | null>(null);
  const [settingsString, setSettingsString] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<ProgressState>(INITIAL_PROGRESS);
  const [result, setResult] = useState<{ url: string; filename: string; logUrl: string } | null>(null);
  /**
   * ID of the preset currently applied. While non-null, the full options
   * form is hidden — the user has committed to a preset and just wants to
   * randomize. Cleared when the user manually edits the settings string.
   */
  const [appliedPresetId, setAppliedPresetId] = useState<string | null>(null);

  const methods = useForm<Record<string, unknown>>({ defaultValues: DEFAULT_VALUES });
  const { watch, reset, getValues } = methods;

  // We need to break a feedback loop between two sync paths:
  //   form -> string  (user edits a field)
  //   string -> form  (user pastes a settings string)
  // Without a lock, reset(vals) from the string->form path would trigger the
  // form watcher, which would re-serialize the values and overwrite what the
  // user just pasted. `syncLock` is released on the next microtask so it
  // covers the synchronous reset + its downstream watch callbacks.
  const syncLock = useRef<"none" | "string-to-form" | "form-to-string">("none");

  // form -> string (subscription API only fires on actual value changes, NOT
  // on every render, which was the previous bug).
  useEffect(() => {
    const sub = watch((value, info) => {
      if (syncLock.current === "string-to-form") return;
      // info.type is 'change' for user edits, undefined for reset()
      if (info?.type !== "change") return;
      syncLock.current = "form-to-string";
      try {
        // Lazy import because settings-sync pulls in ts-src (which uses
        // Buffer globals set up in the worker / browser-globals module)
        import("@/lib/settings-sync").then(({ formValuesToSettingsString }) => {
          try {
            setSettingsString(formValuesToSettingsString(value as Record<string, unknown>));
          } catch {
            /* incomplete form state, ignore */
          } finally {
            queueMicrotask(() => {
              if (syncLock.current === "form-to-string") syncLock.current = "none";
            });
          }
        });
      } catch {
        syncLock.current = "none";
      }
    });
    return () => sub.unsubscribe();
  }, [watch]);

  // string -> form.
  // `fromPreset`: true when the change came from clicking a preset button,
  // false (default) when the user edited the settings input manually. Manual
  // edits clear the applied-preset state so the form reappears.
  const applySettingsString = useCallback(
    async (str: string, fromPreset = false) => {
      setSettingsString(str);
      if (!fromPreset) setAppliedPresetId(null);
      if (syncLock.current === "form-to-string") return;
      if (!str.trim()) return;
      try {
        const { settingsStringToFormValues } = await import("@/lib/settings-sync");
        const vals = settingsStringToFormValues(str);
        syncLock.current = "string-to-form";
        reset(vals);
        queueMicrotask(() => {
          if (syncLock.current === "string-to-form") syncLock.current = "none";
        });
      } catch {
        /* invalid or incomplete string, leave the form as-is */
      }
    },
    [reset],
  );

  const onSettingsStringChange = useCallback(
    (str: string) => applySettingsString(str, false),
    [applySettingsString],
  );

  const onApplyPreset = useCallback(
    (presetId: string, str: string) => {
      setAppliedPresetId(presetId);
      applySettingsString(str, true);
    },
    [applySettingsString],
  );

  /**
   * "Default" preset: clear any applied preset, reset the form to neutral
   * defaults, and refresh the settings-string box to match. Leaves the form
   * visible so the user can tweak from a clean baseline.
   */
  const onResetToDefault = useCallback(async () => {
    setAppliedPresetId(null);
    syncLock.current = "string-to-form";
    reset(DEFAULT_VALUES);
    queueMicrotask(() => {
      if (syncLock.current === "string-to-form") syncLock.current = "none";
    });
    try {
      const { formValuesToSettingsString } = await import("@/lib/settings-sync");
      setSettingsString(formValuesToSettingsString(DEFAULT_VALUES));
    } catch {
      /* ignore */
    }
  }, [reset]);

  // One-shot on mount: render the initial (default) settings string so the
  // user has something to compare against.
  useEffect(() => {
    (async () => {
      try {
        const { formValuesToSettingsString } = await import("@/lib/settings-sync");
        setSettingsString(formValuesToSettingsString(getValues()));
      } catch {
        /* ignore */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Spin up the worker once on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { RandomizerClient } = await import("@/lib/worker/client");
        const c = new RandomizerClient();
        await c.init();
        if (!cancelled) {
          setClient(c);
          setWorkerReady(true);
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : String(e);
          setWorkerError(msg);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRandomize = useCallback(async () => {
    if (!client || !loadedRom) return;
    setIsRunning(true);
    setResult(null);
    setProgress({ ...INITIAL_PROGRESS, stage: "Starting…" });

    try {
      const res = await client.randomize(
        loadedRom.bytes,
        loadedRom.filename,
        settingsString,
        {
          onLog: (line, level) =>
            setProgress((p) => ({
              ...p,
              logLines: [...p.logLines, { line, level }].slice(-500),
            })),
          onProgress: (stage, percent) =>
            setProgress((p) => ({ ...p, stage, percent })),
        },
      );
      const blob = new Blob([res.outputBytes], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const logBlob = new Blob([res.log], { type: "text/plain;charset=utf-8" });
      const logUrl = URL.createObjectURL(logBlob);
      const dot = loadedRom.filename.lastIndexOf(".");
      const base = dot >= 0 ? loadedRom.filename.slice(0, dot) : loadedRom.filename;
      const ext = loadedRom.detect.extension || (dot >= 0 ? loadedRom.filename.slice(dot + 1) : "bin");
      setResult({ url, filename: `${base}-randomized.${ext}`, logUrl });
      setProgress((p) => ({ ...p, completed: true, percent: 100, stage: "Done" }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setProgress((p) => ({
        ...p,
        errored: true,
        logLines: [...p.logLines, { line: msg, level: "error" }],
      }));
    } finally {
      setIsRunning(false);
    }
  }, [client, loadedRom, settingsString]);

  return (
    <main className="mx-auto w-full max-w-5xl p-4 sm:p-8 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          randomize.sh{" "}
          <span className="text-muted-foreground font-normal text-2xl">by</span>{" "}
          <a
            href="https://github.com/justinelijahtaylor"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            justinelijahtaylor
          </a>
        </h1>
        <p className="text-sm text-muted-foreground">
          Forked from{" "}
          <a
            href="https://github.com/Ajarmar/universal-pokemon-randomizer-zx"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Universal Pokemon Randomizer ZX
          </a>{" "}
          by Ajarmar
        </p>
        <p className="text-muted-foreground">
          Randomize your Pokemon ROMs entirely in your browser. Your ROM never
          leaves your device.
        </p>
      </header>

      {workerError && (
        <Alert variant="destructive">
          <AlertTitle>Worker failed to start</AlertTitle>
          <AlertDescription>{workerError}</AlertDescription>
        </Alert>
      )}

      {!workerError && !workerReady && (
        <Alert>
          <AlertTitle>Loading randomizer…</AlertTitle>
          <AlertDescription>
            Fetching game config files and warming up the Web Worker.
          </AlertDescription>
        </Alert>
      )}

      <RomUpload
        client={client}
        loadedRom={loadedRom}
        onRomLoaded={(r) => {
          setLoadedRom(r);
          setResult(null);
          setProgress(INITIAL_PROGRESS);
        }}
      />

      {loadedRom && (
        <Card>
          <CardHeader>
            <CardTitle>2. Settings string</CardTitle>
            <CardDescription>
              Pick a preset below, or paste a settings string from the Java GUI.
              Editing options further down updates this string so you can copy
              and share it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <PresetPicker
              generation={loadedRom.detect.generation}
              romName={loadedRom.detect.romName}
              appliedPresetId={appliedPresetId}
              onApply={onApplyPreset}
              onReset={onResetToDefault}
            />

            <div className="space-y-2">
              <Label htmlFor="settings-string">Settings string</Label>
              <Input
                id="settings-string"
                placeholder="Paste a settings string here, or pick a preset above"
                value={settingsString}
                onChange={(e) => onSettingsStringChange(e.target.value)}
                className="font-mono text-xs"
              />
              {appliedPresetId && (
                <p className="text-xs text-muted-foreground">
                  Preset applied — the full options form is hidden. Edit the
                  settings string above to switch to custom options.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {loadedRom && !appliedPresetId && (
        <FormProvider {...methods}>
          <SettingsForm generation={loadedRom.detect.generation} />
        </FormProvider>
      )}

      {loadedRom && (
        <Card>
          <CardHeader>
            <CardTitle>3. Randomize</CardTitle>
            <CardDescription>
              Click to run the randomizer on-device. This may take 10–60 seconds
              depending on the ROM size.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleRandomize}
              disabled={!client || !settingsString.trim() || isRunning}
              size="lg"
            >
              {isRunning ? "Randomizing…" : "Randomize ROM"}
            </Button>
          </CardContent>
        </Card>
      )}

      {(isRunning || progress.completed || progress.errored) && (
        <ProgressPanel state={progress} />
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Done</CardTitle>
            <CardDescription>
              Your randomized ROM is ready. Download it below.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <a href={result.url} download={result.filename}>
              <Button size="lg">Download ROM ({result.filename})</Button>
            </a>
            <a href={result.logUrl} download={result.filename + ".log.txt"}>
              <Button variant="outline">Download log</Button>
            </a>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
