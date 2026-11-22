import { pickInstallHint } from "../../core/install-hint.js";
import { commandExists, run, runInherit } from "../../core/runner.js";
import { localize } from "../../core/i18n/localized.js";
import type { OutdatedPackage, Provider, UpdateOutcome } from "../../core/types.js";

interface VpOutdatedEntry {
  current?: string;
  wanted?: string;
  latest?: string;
}

/**
 * The global packages Vite+ installs (`vp install -g <pkg>`). They live in
 * Vite+'s own data directory (`%LOCALAPPDATA%\vite-plus\data\packages` on
 * Windows), not in npm's or pnpm's global prefix, so no other provider sees
 * them. Vite+ itself is updated by the `self` provider (`self:vp`).
 *
 * `vp outdated -g --format json` prints npm's report shape, an object keyed
 * by package, and exits 1 when something is outdated. `vp update -g --latest`
 * moves past the semver range a package was installed with.
 */
export class VpGlobalProvider implements Provider {
  readonly id = "vp-g";
  readonly displayName = "vp (global)";
  readonly installHint = pickInstallHint({
    win32: "irm https://vite.plus/ps1 | iex",
    fallback: "curl -fsSL https://vite.plus | bash",
  });

  async isAvailable(): Promise<boolean> {
    return commandExists("vp");
  }

  /**
   * Throws when vp reports its own failure (an `error:` line and no report),
   * so the scan shows an error instead of "nothing outdated".
   */
  async listOutdated(): Promise<OutdatedPackage[]> {
    const result = await run("vp", ["outdated", "-g", "--format", "json"]);
    const parsed = parseReport(result.stdout);
    if (parsed === null) {
      const failure = result.failed ? vpFailure(`${result.stderr}\n${result.stdout}`) : null;
      if (failure !== null) throw new Error(failure);
      return [];
    }

    const outdated: OutdatedPackage[] = [];
    for (const [name, info] of Object.entries(parsed)) {
      const { current, latest } = info;
      if (!current || !latest || current === latest) continue;
      outdated.push({ id: name, name, current, latest });
    }
    return outdated;
  }

  async update(packageId: string): Promise<UpdateOutcome> {
    const res = await runInherit("vp", ["update", "-g", "--latest", packageId]);
    return { id: packageId, success: !res.failed };
  }

  async updateAll(packages: OutdatedPackage[]): Promise<UpdateOutcome[]> {
    if (packages.length === 0) return [];
    const res = await runInherit("vp", ["update", "-g", "--latest", ...packages.map((p) => p.id)]);
    return packages.map((p) => ({ id: p.id, success: !res.failed }));
  }
}

/** vp's report as an object, or null when stdout holds none. */
function parseReport(stdout: string): Record<string, VpOutdatedEntry> | null {
  try {
    const parsed: unknown = JSON.parse(stdout);
    const isObject = typeof parsed === "object" && parsed !== null && !Array.isArray(parsed);
    return isObject ? (parsed as Record<string, VpOutdatedEntry>) : null;
  } catch {
    return null;
  }
}

/** The scan error for vp's own `error: …` line, or null when vp said no such thing. */
function vpFailure(output: string): string | null {
  const line = output
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => /^error:/i.test(l));
  if (line === undefined) return null;
  const message = line.replace(/^error:\s*/i, "");
  return localize({
    en: `vp outdated failed: ${message}`,
    fr: `vp outdated a échoué : ${message}`,
  });
}
