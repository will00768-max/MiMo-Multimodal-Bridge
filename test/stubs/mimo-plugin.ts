/**
 * Test stub for the host-provided `@@mimocode/cli/plugin` module.
 * MiMo Code / OpenCode injects this module at runtime, so it is not installable
 * from npm. The stub mirrors the small surface the plugin uses: `tool()` returns
 * its definition unchanged and `tool.schema` builds inert chainable descriptors.
 */

export interface ToolContext {
  sessionID: string
  metadata(value: { title: string }): void
}

export interface ToolDefinition<Args> {
  description: string
  args: Record<string, unknown>
  execute(args: Args, context: ToolContext): Promise<string>
}

interface SchemaField {
  type: string
  optional(): SchemaField
  describe(description: string): SchemaField
}

function field(type: string): SchemaField {
  const self: SchemaField = {
    type,
    optional: () => field(`${type}?`),
    describe: () => self,
  }
  return self
}

export const tool = Object.assign(
  <Args>(definition: ToolDefinition<Args>) => definition,
  {
    schema: {
      string: () => field("string"),
      number: () => field("number"),
      boolean: () => field("boolean"),
    },
  },
)
