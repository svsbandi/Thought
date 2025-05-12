'use server';

/**
 * @fileOverview An AI agent that summarizes an expanded thought.
 *
 * - summarizeExpandedThought - A function that summarizes an expanded thought.
 * - SummarizeExpandedThoughtInput - The input type for the summarizeExpandedThought function.
 * - SummarizeExpandedThoughtOutput - The return type for the summarizeExpandedThought function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeExpandedThoughtInputSchema = z.object({
  expandedThought: z
    .string()
    .describe('The expanded thought that needs to be summarized.'),
});
export type SummarizeExpandedThoughtInput = z.infer<typeof SummarizeExpandedThoughtInputSchema>;

const SummarizeExpandedThoughtOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the expanded thought.'),
});
export type SummarizeExpandedThoughtOutput = z.infer<typeof SummarizeExpandedThoughtOutputSchema>;

export async function summarizeExpandedThought(
  input: SummarizeExpandedThoughtInput
): Promise<SummarizeExpandedThoughtOutput> {
  return summarizeExpandedThoughtFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeExpandedThoughtPrompt',
  input: {schema: SummarizeExpandedThoughtInputSchema},
  output: {schema: SummarizeExpandedThoughtOutputSchema},
  prompt: `You are an expert summarizer, skilled at condensing complex text into its key points.

  Please summarize the following expanded thought:

  {{expandedThought}}`,
});

const summarizeExpandedThoughtFlow = ai.defineFlow(
  {
    name: 'summarizeExpandedThoughtFlow',
    inputSchema: SummarizeExpandedThoughtInputSchema,
    outputSchema: SummarizeExpandedThoughtOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
