import { tool } from "ai";

import { createEvent } from "./actions";
import { createEventSchema } from "./schema";

export function eventTools() {
  return {
    createEvent: tool({
      description:
        "Put an event on the calendar. startsAt and endsAt must be full ISO timestamps with an offset, resolved against the user's timezone from context.",
      inputSchema: createEventSchema,
      execute: async (input) => {
        const result = await createEvent(input);
        return result.ok
          ? { created: true, id: result.data.id }
          : { created: false, error: result.error };
      },
    }),
  };
}
