import { z } from "zod";

const textEntrySchema = z.object({ text: z.string().trim().min(1).max(20_000) }).strict();

export function validateTextEntryInput(input: unknown): z.infer<typeof textEntrySchema> {
  return textEntrySchema.parse(input);
}

export { textEntrySchema };
