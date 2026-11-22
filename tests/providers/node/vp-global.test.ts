import { describe, expect, it } from "vitest";
import { VpGlobalProvider } from "../../../src/providers/node/vp-global.js";
import { system } from "../../support/system/fake-system.js";
import { vpMachine } from "./node.cases.js";

/** `vp outdated -g --format json`: npm's report shape, an object keyed by package. */

describe("VpGlobalProvider.listOutdated", () => {
  it("lists nothing when every global package is current", async () => {
    await system.load(vpMachine("{}", "", 0));
    await expect(new VpGlobalProvider().listOutdated()).resolves.toEqual([]);
  });

  it("reports vp's own error as a scan error, not as nothing outdated", async () => {
    await system.load(vpMachine("", "error: failed to fetch package metadata for neon\n", 2));
    await expect(new VpGlobalProvider().listOutdated()).rejects.toThrow(
      "vp outdated a échoué : failed to fetch package metadata for neon",
    );
  });

  it("lists nothing when vp fails without saying why", async () => {
    await system.load(vpMachine("", "", 2));
    await expect(new VpGlobalProvider().listOutdated()).resolves.toEqual([]);
  });

  it("skips an entry missing a version", async () => {
    const report = JSON.stringify({
      neon: { current: "9.9.1", latest: "9.9.3" },
      broken: { current: "1.0.0" },
    });
    await system.load(vpMachine(report));
    await expect(new VpGlobalProvider().listOutdated()).resolves.toEqual([
      { id: "neon", name: "neon", current: "9.9.1", latest: "9.9.3" },
    ]);
  });
});
