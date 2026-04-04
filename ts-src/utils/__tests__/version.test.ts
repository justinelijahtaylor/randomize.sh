import { describe, it, expect } from "vitest";
import { Version } from "../version";

describe("Version", () => {
  it("VERSION constant exists and is a number", () => {
    expect(typeof Version.VERSION).toBe("number");
    expect(Version.VERSION).toBe(322);
  });

  it("VERSION_STRING exists and matches expected format (X.Y.Z)", () => {
    expect(typeof Version.VERSION_STRING).toBe("string");
    expect(Version.VERSION_STRING).toMatch(/^\d+\.\d+\.\d+/);
    expect(Version.VERSION_STRING).toBe("4.6.1");
  });

  it("oldVersions map contains the current version", () => {
    expect(Version.oldVersions.get(Version.VERSION)).toBe(
      Version.VERSION_STRING
    );
  });

  it("oldVersions map contains known historical versions", () => {
    expect(Version.oldVersions.get(100)).toBe("1.0.1a");
    expect(Version.oldVersions.get(150)).toBe("1.5.0");
    expect(Version.oldVersions.get(310)).toBe("3.1.0");
    expect(Version.oldVersions.get(311)).toBe("4.0.0");
    expect(Version.oldVersions.get(321)).toBe("4.6.0");
  });

  describe("isReleaseVersionNewer", () => {
    it("returns true when release version is newer", () => {
      // Release "v5.0.0" is newer than "4.6.1"
      expect(Version.isReleaseVersionNewer("v5.0.0")).toBe(true);
    });

    it("returns true when release minor version is newer", () => {
      expect(Version.isReleaseVersionNewer("v4.7.0")).toBe(true);
    });

    it("returns true when release patch version is newer", () => {
      expect(Version.isReleaseVersionNewer("v4.6.2")).toBe(true);
    });

    it("returns false when release version is same", () => {
      expect(Version.isReleaseVersionNewer("v4.6.1")).toBe(false);
    });

    it("returns false when release version is older", () => {
      expect(Version.isReleaseVersionNewer("v4.5.0")).toBe(false);
      expect(Version.isReleaseVersionNewer("v3.0.0")).toBe(false);
      expect(Version.isReleaseVersionNewer("v4.6.0")).toBe(false);
    });

    it("returns false on invalid input", () => {
      expect(Version.isReleaseVersionNewer("vgarbage")).toBe(false);
    });

    it("handles version with extra segments", () => {
      // "v4.6.1.1" - compares up to smallest length
      expect(Version.isReleaseVersionNewer("v4.6.1.1")).toBe(false);
    });

    it("trims leading 'v' from release version", () => {
      // The method does substring(1) to remove first char
      expect(Version.isReleaseVersionNewer("v10.0.0")).toBe(true);
    });
  });
});
