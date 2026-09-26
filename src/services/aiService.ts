export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function sendChatMessage(
  prompt: string,
  history: readonly ChatMessage[] = [],
): Promise<string> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    signal: AbortSignal.timeout(65_000),
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, history }),
  });

  if (!response.ok) {
    throw new Error('Gagal terhubung ke AI.');
  }

  const data = await response.json();
  if (typeof data.reply !== 'string' || !data.reply.trim()) {
    throw new Error('Respons kosong dari AI.');
  }

  return data.reply;
}
