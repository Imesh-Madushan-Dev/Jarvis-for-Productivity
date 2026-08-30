import { availableModels, defaultModelId } from "@/lib/ai/models";
import { AssistantBar } from "./assistant-bar";

/**
 * Which models exist is an environment question, so it is answered on the
 * server and handed down. The client never sees a key, only labels and whether
 * each one is usable.
 */
export function AssistantSlot() {
  return (
    <AssistantBar models={availableModels()} defaultModelId={defaultModelId()} />
  );
}
