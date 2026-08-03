import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { mkdtempSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import plugin from "../index"
import { defaultQuestions } from "../index"

const CONTENT = Buffer.from("fake-png-bytes")

interface Args {
  url: string
  mime: string
  filename?: string
  question?: string
}

function makeContext() {
  return { sessionID: "sess-1", metadata: vi.fn() }
}

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  }
}

function mockFetch(response: unknown) {
  const fetchMock = vi.fn(async () => response)
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

function lastRequestBody(fetchMock: ReturnType<typeof vi.fn>) {
  const [, init] = fetchMock.mock.calls.at(-1) as unknown as [string, { body: string }]
  return JSON.parse(init.body)
}

const execute = (args: Args, context = makeContext()) =>
  (plugin as unknown as {
    execute(args: Args, context: ReturnType<typeof makeContext>): Promise<string>
  }).execute(args, context)

describe("understand_media tool definition", () => {
  it("declares the documented arguments", () => {
    const definition = plugin as unknown as { args: Record<string, unknown>; description: string }
    expect(Object.keys(definition.args).sort()).toEqual(["filename", "mime", "question", "url"])
    expect(definition.description).toContain("PDF")
  })
})

describe("understand_media execute", () => {
  const originalServerUrl = process.env.MIMOCODE_SERVER_URL

  beforeEach(() => {
    delete process.env.MIMOCODE_SERVER_URL
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    if (originalServerUrl === undefined) delete process.env.MIMOCODE_SERVER_URL
    else process.env.MIMOCODE_SERVER_URL = originalServerUrl
  })

  it("rejects unsupported MIME types without calling the API", async () => {
    const fetchMock = mockFetch(jsonResponse({}))
    const context = makeContext()
    await expect(execute({ url: "data:text/plain;base64,aGk=", mime: "text/plain" }, context)).resolves.toBe(
      "不支持的文件类型: text/plain",
    )
    expect(fetchMock).not.toHaveBeenCalled()
    expect(context.metadata).not.toHaveBeenCalled()
  })

  it("posts the file and prompt to the session prompt endpoint", async () => {
    const fetchMock = mockFetch(jsonResponse({ parts: [{ type: "text", text: "一只猫" }] }))
    const context = makeContext()

    await expect(
      execute({ url: "https://example.com/cat.png", mime: "image/png", filename: "cat.png" }, context),
    ).resolves.toBe("一只猫")

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, { method: string; headers: Record<string, string> }]
    expect(url).toBe("http://localhost:3000/session/sess-1/prompt")
    expect(init.method).toBe("POST")
    expect(init.headers["Content-Type"]).toBe("application/json")
    expect(lastRequestBody(fetchMock)).toEqual({
      parts: [
        { type: "file", mime: "image/png", url: "https://example.com/cat.png", filename: "cat.png" },
        { type: "text", text: defaultQuestions.image },
      ],
      model: { providerID: "mimo", modelID: "mimo-v2.5" },
      source: "hook",
      noReply: true,
    })
    expect(context.metadata).toHaveBeenCalledWith({ title: "理解图片: cat.png" })
  })

  it("uses the caller's question instead of the modality default", async () => {
    const fetchMock = mockFetch(jsonResponse("ok"))
    await execute({ url: "data:audio/wav;base64,AAA=", mime: "audio/wav", question: "谁在说话?" })
    expect(lastRequestBody(fetchMock).parts[1]).toEqual({ type: "text", text: "谁在说话?" })
  })

  it("uses the modality default question for each supported modality", async () => {
    for (const [mime, modality] of [
      ["application/pdf", "pdf"],
      ["audio/mp3", "audio"],
      ["video/webm", "video"],
      ["image/heic", "image"],
    ] as const) {
      const fetchMock = mockFetch(jsonResponse("ok"))
      await execute({ url: `data:${mime};base64,AAA=`, mime })
      expect(lastRequestBody(fetchMock).parts[1].text).toBe(defaultQuestions[modality])
    }
  })

  it("labels the metadata title with a placeholder when no filename is given", async () => {
    mockFetch(jsonResponse("ok"))
    const context = makeContext()
    await execute({ url: "data:video/mp4;base64,AAA=", mime: "video/mp4" }, context)
    expect(context.metadata).toHaveBeenCalledWith({ title: "理解视频: 未命名文件" })
  })

  it("honours MIMOCODE_SERVER_URL", async () => {
    process.env.MIMOCODE_SERVER_URL = "http://127.0.0.1:9999"
    const fetchMock = mockFetch(jsonResponse("ok"))
    await execute({ url: "data:image/png;base64,AAA=", mime: "image/png" })
    expect(fetchMock.mock.calls[0][0]).toBe("http://127.0.0.1:9999/session/sess-1/prompt")
  })

  describe("local files", () => {
    let dir: string
    let file: string

    beforeEach(() => {
      dir = mkdtempSync(join(tmpdir(), "mimo-bridge-exec-"))
      file = join(dir, "shot.png")
      writeFileSync(file, CONTENT)
    })

    afterEach(() => {
      rmSync(dir, { recursive: true, force: true })
    })

    it("inlines local paths as base64 data URLs", async () => {
      const fetchMock = mockFetch(jsonResponse("ok"))
      await execute({ url: file, mime: "image/png" })
      expect(lastRequestBody(fetchMock).parts[0].url).toBe(
        `data:image/png;base64,${CONTENT.toString("base64")}`,
      )
    })

    it("reports unreadable local files without calling the API", async () => {
      const fetchMock = mockFetch(jsonResponse("ok"))
      const missing = join(dir, "missing.png")
      await expect(execute({ url: missing, mime: "image/png" })).resolves.toBe(`无法读取文件: ${missing}`)
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  it("surfaces API failures with status and body", async () => {
    mockFetch(jsonResponse("boom", { ok: false, status: 503 }))
    await expect(execute({ url: "data:image/png;base64,AAA=", mime: "image/png" })).resolves.toBe(
      "API 调用失败 (503): boom",
    )
  })

  it("joins every text part of the response", async () => {
    mockFetch(
      jsonResponse({
        parts: [
          { type: "text", text: "第一行" },
          { type: "file", url: "x" },
          { type: "text", text: "第二行" },
        ],
      }),
    )
    await expect(execute({ url: "data:image/png;base64,AAA=", mime: "image/png" })).resolves.toBe(
      "第一行\n第二行",
    )
  })

  it("accepts a plain string response", async () => {
    mockFetch(jsonResponse("纯文本描述"))
    await expect(execute({ url: "data:image/png;base64,AAA=", mime: "image/png" })).resolves.toBe(
      "纯文本描述",
    )
  })

  it("serialises unexpected response shapes", async () => {
    mockFetch(jsonResponse({ result: { ok: 1 } }))
    await expect(execute({ url: "data:image/png;base64,AAA=", mime: "image/png" })).resolves.toBe(
      '{"result":{"ok":1}}',
    )
  })

  it("falls back to a placeholder when the description is empty", async () => {
    mockFetch(jsonResponse({ parts: [] }))
    await expect(execute({ url: "data:image/png;base64,AAA=", mime: "image/png" })).resolves.toBe(
      "无法理解该内容",
    )
  })

  it("returns a modality-specific message when the request throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down")
      }),
    )
    await expect(execute({ url: "data:audio/wav;base64,AAA=", mime: "audio/wav" })).resolves.toBe(
      "处理音频时出错: Error: network down",
    )
  })
})
