"use client";

import * as React from "react";
import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import type { RandomizerClient, DetectResult } from "@/lib/worker/client";

export interface LoadedRom {
  filename: string;
  bytes: ArrayBuffer;
  detect: DetectResult;
}

interface Props {
  client: RandomizerClient | null;
  onRomLoaded: (rom: LoadedRom | null) => void;
  loadedRom: LoadedRom | null;
}

export function RomUpload({ client, onRomLoaded, loadedRom }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      if (!client) {
        setError("Worker not ready yet. Please wait a moment and try again.");
        return;
      }
      setError(null);
      setIsLoading(true);
      try {
        const buf = await file.arrayBuffer();
        const detect = await client.detect(buf, file.name);
        onRomLoaded({ filename: file.name, bytes: buf, detect });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        onRomLoaded(null);
      } finally {
        setIsLoading(false);
      }
    },
    [client, onRomLoaded],
  );

  const onInputChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDrop = (ev: React.DragEvent) => {
    ev.preventDefault();
    setDragging(false);
    const file = ev.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>1. Upload your ROM</CardTitle>
        <CardDescription>
          Your ROM is processed entirely in your browser and never uploaded to any
          server. Supported formats: <code>.gb</code>, <code>.gbc</code>,{" "}
          <code>.gba</code>, <code>.nds</code>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!loadedRom && (
          <label
            htmlFor="rom-input"
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`flex flex-col items-center justify-center cursor-pointer rounded-lg border-2 border-dashed p-10 text-center transition-colors ${
              dragging
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-accent/50"
            }`}
          >
            <input
              id="rom-input"
              type="file"
              className="sr-only"
              accept=".gb,.gbc,.sgb,.gba,.nds"
              onChange={onInputChange}
              disabled={isLoading}
            />
            <p className="text-lg font-medium mb-1">
              {isLoading ? "Detecting ROM…" : "Drop a ROM here or click to select"}
            </p>
            <p className="text-sm text-muted-foreground">
              Gen 1–4 supported (Red/Blue/Yellow, Gold/Silver/Crystal,
              Ruby/Sapphire/Emerald/FR/LG, Diamond/Pearl/Platinum/HG/SS)
            </p>
          </label>
        )}

        {loadedRom && (
          <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
            <div>
              <div className="font-medium">{loadedRom.filename}</div>
              <div className="text-sm text-muted-foreground flex gap-2 mt-1 flex-wrap">
                <Badge variant="secondary">Gen {loadedRom.detect.generation}</Badge>
                {loadedRom.detect.romName && (
                  <Badge variant="outline">{loadedRom.detect.romName}</Badge>
                )}
                {loadedRom.detect.romCode && (
                  <Badge variant="outline" className="font-mono">
                    {loadedRom.detect.romCode}
                  </Badge>
                )}
                <span className="text-muted-foreground">
                  {(loadedRom.bytes.byteLength / (1024 * 1024)).toFixed(1)} MB
                </span>
              </div>
            </div>
            <Button variant="outline" onClick={() => onRomLoaded(null)}>
              Change ROM
            </Button>
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertTitle>Could not read ROM</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
