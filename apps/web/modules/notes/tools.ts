import { tool } from "ai";

import { createNote, saveScratchPad } from "./actions";
import { createNoteSchema, saveScratchPadSchema } from "./schema";

export function noteTools() {
  return {
    createNote: tool({
      description:
        "Create a note. Give it a short title and the body the user asked for.",
      inputSchema: createNoteSchema,
      execute: async (input) => {
        const result = await createNote(input);
        return result.ok
          ? { created: true, id: result.data.id }
          : { created: false, error: result.error };
      },
    }),

    replaceScratchPad: tool({
      description:
        "Replace the entire scratch pad contents. This overwrites what is there, so read it back to the user before replacing anything they may still want.",
      inputSchema: saveScratchPadSchema,
      execute: async (input) => {
        const result = await saveScratchPad(input);
        return result.ok
          ? { saved: true }
          : { saved: false, error: result.error };
      },
    }),
  };
}
