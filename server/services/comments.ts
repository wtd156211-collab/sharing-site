import { z } from "zod";

const commentSchema = z.object({
  nickname: z.string().trim().min(1).max(80),
  content: z.string().trim().min(1).max(2_000),
  entryId: z.number().int().positive().optional(),
  replyToCommentId: z.number().int().positive().optional(),
}).strict();

export function validateCommentInput(input: unknown): z.infer<typeof commentSchema> {
  return commentSchema.parse(input);
}

export { commentSchema };
