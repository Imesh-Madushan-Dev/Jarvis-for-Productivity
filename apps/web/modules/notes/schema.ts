import { z } from "zod";

export const NOTE_COLUMNS = "id,title,body,updated_at,project_id" as const;

export type NoteListItem = {
  id: string;
  title: string;
  body: string;
  updated_at: string;
  project_id: string | null;
};

export const createNoteSchema = z.object({
  title: z.string().trim().max(200).default(""),
  body: z.string().max(50_000).default(""),
});
export type CreateNoteInput = z.infer<typeof createNoteSchema>;

export const saveScratchPadSchema = z.object({
  body: z.string().max(50_000),
});
export type SaveScratchPadInput = z.infer<typeof saveScratchPadSchema>;
