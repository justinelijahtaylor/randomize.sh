import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "About — randomize.sh",
};

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-3xl p-4 sm:p-8 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">About</h1>
        <p className="text-sm text-muted-foreground">
          An in-browser fork of{" "}
          <a
            href="https://github.com/Ajarmar/universal-pokemon-randomizer-zx"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Universal Pokemon Randomizer ZX
          </a>
          .
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>What is this?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-foreground/80 leading-relaxed">
          <p>
            <span className="text-primary font-semibold">randomize.sh</span> is a
            web front-end for the Universal Pokemon Randomizer ZX. The original
            project is a Java application that shuffles virtually every aspect of
            a Pokemon ROM — wild encounters, trainer teams, starters, moves,
            items, evolutions, and much more.
          </p>
          <p>
            This fork ports the Java engine to TypeScript and runs it entirely
            in your browser via a Web Worker. Your ROM never leaves your device.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Why web?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-foreground/80 leading-relaxed">
          <p>
            The original randomizer is a desktop Java app — great if you&apos;re
            at your computer, awkward if you&apos;re not. A lot of Pokemon is
            played on the go these days: phones running Delta, GBA4iOS, or
            DraStic, handheld retro devices like the Miyoo Mini, Anbernic, or
            Retroid, and the Steam Deck.
          </p>
          <p>
            Running the randomizer in the browser means you can drop in a ROM,
            tweak a few options, and download a fresh seed directly on whatever
            device you&apos;re playing on — without shuttling files back to a
            laptop and re-transferring them to your handheld each time.
          </p>
          <p>
            Same engine, same settings strings, same output. Just accessible
            from anywhere with a browser.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Supported games</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-foreground/80 leading-relaxed">
          <p>
            <span className="text-primary">Gen 1</span> — Red, Blue, Yellow
          </p>
          <p>
            <span className="text-primary">Gen 2</span> — Gold, Silver, Crystal
          </p>
          <p>
            <span className="text-primary">Gen 3</span> — Ruby, Sapphire, Emerald,
            FireRed, LeafGreen
          </p>
          <p>
            <span className="text-primary">Gen 4</span> — Diamond, Pearl,
            Platinum, HeartGold, SoulSilver
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Privacy</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-foreground/80 leading-relaxed">
          Everything runs in your browser. Your ROM bytes are read into memory,
          passed to a Web Worker, randomized there, and returned as a download.
          No server, no uploads, no telemetry.
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Credits</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-foreground/80 leading-relaxed space-y-2">
          <p>
            TypeScript port and web front-end by{" "}
            <a
              href="https://github.com/justinelijahtaylor"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              @justinelijahtaylor
            </a>
            .
          </p>
          <p>
            The underlying randomization logic is from{" "}
            <a
              href="https://github.com/Ajarmar/universal-pokemon-randomizer-zx"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Universal Pokemon Randomizer ZX
            </a>{" "}
            by Ajarmar and many contributors, which itself extends Dabomstew's
            original Universal Pokemon Randomizer.
          </p>
          <p>
            Pokemon and related names/likenesses are trademark & © Nintendo
            1996–present. This project is not affiliated with or endorsed by
            Nintendo, Game Freak, or The Pokemon Company.
          </p>
        </CardContent>
      </Card>

      <div className="pt-2">
        <Link href="/" className="text-sm text-primary hover:underline">
          ← Back to the randomizer
        </Link>
      </div>
    </main>
  );
}
