// SPDX-License-Identifier: GPL-3.0-or-later
// Part of "randomize.sh" (https://github.com/justinelijahtaylor/randomizer)
// A web fork of Universal Pokemon Randomizer ZX. Licensed under GPLv3-or-later.
// See LICENSE.txt for the full license text.

"use client";

import * as React from "react";
import { useMemo } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { FORM_TABS, type Field, type FieldGroup, type Tab } from "@/lib/form-schema";

interface Props {
  generation: number;
}

function FieldRenderer({ field }: { field: Field }) {
  const { control, watch } = useFormContext();
  const values = watch();

  if (field.showIf && !field.showIf(values)) return null;

  const name = field.name;
  const id = `field-${name}`;

  if (field.kind.type === "radio") {
    return (
      <div className="space-y-2">
        <Label htmlFor={id} className="text-sm font-medium">
          {field.label}
        </Label>
        <Controller
          control={control}
          name={name}
          render={({ field: f }) => (
            <RadioGroup
              value={String(f.value ?? "")}
              onValueChange={f.onChange}
              className="grid grid-cols-1 sm:grid-cols-2 gap-1"
            >
              {field.kind.type === "radio" &&
                field.kind.options.map((opt) => (
                  <div key={opt.value} className="flex items-center gap-2">
                    <RadioGroupItem value={opt.value} id={`${id}-${opt.value}`} />
                    <Label htmlFor={`${id}-${opt.value}`} className="font-normal">
                      {opt.label}
                    </Label>
                  </div>
                ))}
            </RadioGroup>
          )}
        />
        {field.help && <p className="text-xs text-muted-foreground">{field.help}</p>}
      </div>
    );
  }

  if (field.kind.type === "checkbox") {
    return (
      <Controller
        control={control}
        name={name}
        render={({ field: f }) => (
          <div className="flex items-start gap-2">
            <Checkbox
              id={id}
              checked={Boolean(f.value)}
              onCheckedChange={f.onChange}
            />
            <div className="space-y-0.5">
              <Label htmlFor={id} className="font-normal cursor-pointer">
                {field.label}
              </Label>
              {field.help && <p className="text-xs text-muted-foreground">{field.help}</p>}
            </div>
          </div>
        )}
      />
    );
  }

  if (field.kind.type === "slider") {
    return (
      <Controller
        control={control}
        name={name}
        render={({ field: f }) => (
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor={id} className="text-sm">
                {field.label}
              </Label>
              <span className="text-sm text-muted-foreground tabular-nums">
                {Number(f.value ?? 0)}
              </span>
            </div>
            {field.kind.type === "slider" && (
              <Slider
                id={id}
                value={[Number(f.value ?? 0)]}
                min={field.kind.min}
                max={field.kind.max}
                step={field.kind.step}
                onValueChange={(v) => {
                  const arr = Array.isArray(v) ? v : [v];
                  f.onChange(arr[0]);
                }}
              />
            )}
          </div>
        )}
      />
    );
  }

  if (field.kind.type === "select") {
    return (
      <div className="space-y-2">
        <Label htmlFor={id} className="text-sm">
          {field.label}
        </Label>
        <Controller
          control={control}
          name={name}
          render={({ field: f }) => (
            <Select value={String(f.value ?? "")} onValueChange={f.onChange}>
              <SelectTrigger id={id}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {field.kind.type === "select" &&
                  field.kind.options.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>
    );
  }

  if (field.kind.type === "number") {
    return (
      <Controller
        control={control}
        name={name}
        render={({ field: f }) => (
          <div className="space-y-2">
            <Label htmlFor={id} className="text-sm">
              {field.label}
            </Label>
            {field.kind.type === "number" && (
              <Input
                id={id}
                type="number"
                min={field.kind.min}
                max={field.kind.max}
                value={Number(f.value ?? 0)}
                onChange={(e) => f.onChange(Number(e.target.value))}
              />
            )}
          </div>
        )}
      />
    );
  }

  // multi-select-pokemon / unhandled - show placeholder
  return (
    <div className="text-xs text-muted-foreground">
      (Unsupported field type: {field.kind.type} — <code>{field.name}</code>)
    </div>
  );
}

function GroupRenderer({ group, gen }: { group: FieldGroup; gen: number }) {
  if (group.minGen && gen < group.minGen) return null;
  if (group.maxGen && gen > group.maxGen) return null;

  const visibleFields = group.fields.filter((f) => {
    if (f.minGen && gen < f.minGen) return false;
    if (f.maxGen && gen > f.maxGen) return false;
    return true;
  });
  if (visibleFields.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-primary">
        {group.title}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
        {visibleFields.map((f) => (
          <FieldRenderer key={f.name} field={f} />
        ))}
      </div>
    </div>
  );
}

function SectionRenderer({ tab, gen }: { tab: Tab; gen: number }) {
  const visibleGroups = tab.groups.filter((g) => {
    if (g.minGen && gen < g.minGen) return false;
    if (g.maxGen && gen > g.maxGen) return false;
    return g.fields.some((f) => {
      if (f.minGen && gen < f.minGen) return false;
      if (f.maxGen && gen > f.maxGen) return false;
      return true;
    });
  });

  if (visibleGroups.length === 0) return null;

  return (
    <Card id={`section-${tab.id}`} className="scroll-mt-6">
      <CardHeader>
        <CardTitle className="text-primary">{tab.label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {visibleGroups.map((g, i) => (
            <React.Fragment key={g.title}>
              {i > 0 && <Separator />}
              <GroupRenderer group={g} gen={gen} />
            </React.Fragment>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function SettingsForm({ generation }: Props) {
  const visibleTabs = useMemo(() => {
    return FORM_TABS.filter((t) => {
      if (t.minGen && generation < t.minGen) return false;
      if (t.maxGen && generation > t.maxGen) return false;
      const hasGroups = t.groups.some((g) => {
        if (g.minGen && generation < g.minGen) return false;
        if (g.maxGen && generation > g.maxGen) return false;
        return g.fields.some((f) => {
          if (f.minGen && generation < f.minGen) return false;
          if (f.maxGen && generation > f.maxGen) return false;
          return true;
        });
      });
      return hasGroups;
    });
  }, [generation]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Randomization Options</CardTitle>
          <CardDescription>
            Editing any option updates the settings string above so you can copy
            and share it. Jump to a section:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <nav className="flex flex-wrap gap-2 text-xs">
            {visibleTabs.map((t) => (
              <a
                key={t.id}
                href={`#section-${t.id}`}
                className="rounded-md border border-border px-2.5 py-1 text-foreground/80 hover:border-primary hover:text-primary transition-colors"
              >
                {t.label}
              </a>
            ))}
          </nav>
        </CardContent>
      </Card>

      {visibleTabs.map((t) => (
        <SectionRenderer key={t.id} tab={t} gen={generation} />
      ))}
    </div>
  );
}
