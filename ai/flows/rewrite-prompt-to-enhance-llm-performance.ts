'use server';

/**
 * @fileOverview Rewrites the user's prompt to enhance LLM performance by tailoring it to the specific AI model.
 *
 * - rewritePrompt - A function that rewrites the prompt.
 * - RewritePromptInput - The input type for the rewritePrompt function.
 * - RewritePromptOutput - The return type for the rewritePrompt function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RewritePromptInputSchema = z.object({
  prompt: z.string().describe('The original user prompt.'),
  model: z.string().describe('The selected AI model.'),
});
export type RewritePromptInput = z.infer<typeof RewritePromptInputSchema>;

const RewritePromptOutputSchema = z.object({
  rewrittenPrompt: z.string().describe('The rewritten prompt optimized for the specified AI model.'),
});
export type RewritePromptOutput = z.infer<typeof RewritePromptOutputSchema>;

export async function rewritePrompt(input: RewritePromptInput): Promise<RewritePromptOutput> {
  return rewritePromptFlow(input);
}

const prompt = ai.definePrompt({
  name: 'rewritePromptPrompt',
  input: {schema: RewritePromptInputSchema},
  output: {schema: RewritePromptOutputSchema},
  prompt: `You are an AI prompt optimizer. Your job is to rewrite the user's prompt to be better suited for the specified AI model.

Original Prompt: {{{prompt}}}
AI Model: {{{model}}}

Rewrite the prompt to be more effective for the AI model. Consider the model's strengths and weaknesses, its training data, and its typical use cases. The rewritten prompt should be clear, concise, and specific.

Rewritten Prompt:`, // No Handlebars here, the rewritten prompt will be set as `rewrittenPrompt` in the output schema.
});

const rewritePromptFlow = ai.defineFlow(
  {
    name: 'rewritePromptFlow',
    inputSchema: RewritePromptInputSchema,
    outputSchema: RewritePromptOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
