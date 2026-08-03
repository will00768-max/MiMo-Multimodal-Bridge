import { describe, expect, it } from "vitest"
import { MEDIA_TYPES, defaultQuestions, getMediaType } from "../index"

describe("getMediaType", () => {
  it("returns the registered entry for known MIME types", () => {
    for (const [mime, expected] of Object.entries(MEDIA_TYPES)) {
      expect(getMediaType(mime)).toEqual(expected)
    }
  })

  it("falls back to the modality prefix for unlisted media MIME types", () => {
    expect(getMediaType("image/avif")).toEqual({ name: "图片", modality: "image" })
    expect(getMediaType("audio/ogg")).toEqual({ name: "音频", modality: "audio" })
    expect(getMediaType("video/quicktime")).toEqual({ name: "视频", modality: "video" })
  })

  it("returns null for unsupported MIME types", () => {
    expect(getMediaType("text/plain")).toBeNull()
    expect(getMediaType("application/zip")).toBeNull()
    expect(getMediaType("")).toBeNull()
  })

  it("does not treat prefixes as case-insensitive or partial matches", () => {
    expect(getMediaType("IMAGE/PNG")).toBeNull()
    expect(getMediaType("myimage/png")).toBeNull()
  })

  it("has a default question for every registered modality", () => {
    const modalities = new Set(Object.values(MEDIA_TYPES).map((entry) => entry.modality))
    for (const modality of modalities) {
      expect(defaultQuestions[modality]).toBeTruthy()
    }
  })
})
