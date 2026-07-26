export function extractOutputText(payload: {
  output_text?: string;
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
}): string | null {
  if (payload.output_text) return payload.output_text;
  for (const output of payload.output ?? []) {
    for (const item of output.content ?? []) {
      if (item.type === "output_text" && item.text) return item.text;
    }
  }
  return null;
}
