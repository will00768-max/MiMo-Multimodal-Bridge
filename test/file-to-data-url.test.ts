import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, chmodSync } from "fs"
import { tmpdir } from "os"
import { join, relative } from "path"
import { pathToFileURL } from "url"
import { fileToDataUrl } from "../index"

const CONTENT = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

describe("fileToDataUrl", () => {
  let dir: string
  let file: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "mimo-bridge-"))
    file = join(dir, "shot.png")
    writeFileSync(file, CONTENT)
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it("encodes an absolute path as a base64 data URL", () => {
    expect(fileToDataUrl(file, "image/png")).toBe(
      `data:image/png;base64,${CONTENT.toString("base64")}`,
    )
  })

  it("resolves relative paths against the current working directory", () => {
    expect(fileToDataUrl(relative(process.cwd(), file), "image/png")).toBe(
      `data:image/png;base64,${CONTENT.toString("base64")}`,
    )
  })

  it("accepts file:// URLs", () => {
    expect(fileToDataUrl(pathToFileURL(file).href, "image/png")).toBe(
      `data:image/png;base64,${CONTENT.toString("base64")}`,
    )
  })

  it("decodes percent-escapes in file:// URLs", () => {
    const spaced = join(dir, "my shot.png")
    writeFileSync(spaced, CONTENT)
    const url = pathToFileURL(spaced).href
    expect(url).toContain("%20")
    expect(fileToDataUrl(url, "image/png")).toBe(
      `data:image/png;base64,${CONTENT.toString("base64")}`,
    )
  })

  it("uses the given MIME type in the data URL prefix", () => {
    expect(fileToDataUrl(file, "audio/wav")).toMatch(/^data:audio\/wav;base64,/)
  })

  it("returns null when the file does not exist", () => {
    expect(fileToDataUrl(join(dir, "missing.png"), "image/png")).toBeNull()
  })

  it("returns null for a malformed file:// URL", () => {
    expect(fileToDataUrl("file://", "image/png")).toBeNull()
  })

  it("returns null when the path is not a readable file", () => {
    const nested = join(dir, "nested")
    mkdirSync(nested)
    expect(fileToDataUrl(nested, "image/png")).toBeNull()
  })

  it("returns null when reading is denied", () => {
    const denied = join(dir, "denied.png")
    writeFileSync(denied, CONTENT)
    chmodSync(denied, 0o000)
    try {
      const result = fileToDataUrl(denied, "image/png")
      // Root can read regardless of the mode bits.
      if (process.getuid?.() !== 0) expect(result).toBeNull()
    } finally {
      chmodSync(denied, 0o600)
    }
  })
})
