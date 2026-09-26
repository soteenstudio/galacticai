const SYSTEM_MESSAGE = `
You are an AI-powered assistant.
Creator: Clay
Models used: Ling 3.0 Flash Fin (inclusionai/ling-3.0-flash-fin:free, LLM model, from OpenRouter)
Your version: v0.1.0
`;

function json(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(body));
}

export async function handleChat(request, response, {
  apiKey = process.env.OPENROUTER_API_KEY,
  fetchImpl = fetch,
} = {}) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return json(response, 405, { error: 'Method not allowed.' });
  }
  if (request.headers['content-type']?.split(';')[0].trim() !== 'application/json') {
    return json(response, 415, { error: 'Expected application/json.' });
  }

  let body;
  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of request) {
      size += chunk.length;
      if (size > 128 * 1024) {
        return json(response, 413, { error: 'Conversation is too large.' });
      }
      chunks.push(chunk);
    }
    body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return json(response, 400, { error: 'Invalid JSON.' });
  }

  const { prompt, history = [] } = body ?? {};
  const validContent = (value) => typeof value === 'string' && value.trim().length > 0;
  if (!validContent(prompt) || !Array.isArray(history) || history.length > 100 ||
    history.some((message) => !message ||
      !['user', 'assistant'].includes(message.role) || !validContent(message.content))) {
    return json(response, 400, { error: 'Invalid conversation.' });
  }
  if (!apiKey) {
    return json(response, 503, { error: 'Chat is not configured.' });
  }

  try {
    const upstream = await fetchImpl('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: AbortSignal.timeout(60_000),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'X-Title': 'AI Chatbot App',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'inclusionai/ling-3.0-flash-fin:free',
        messages: [
          { role: 'system', content: SYSTEM_MESSAGE },
          ...history.map(({ role, content }) => ({ role, content })),
          { role: 'user', content: prompt },
        ],
      }),
    });
    if (!upstream.ok) {
      return json(response, 502, { error: 'AI request failed.' });
    }
    const data = await upstream.json();
    const reply = data.choices?.[0]?.message?.content;
    if (!validContent(reply)) {
      return json(response, 502, { error: 'Empty AI response.' });
    }
    return json(response, 200, { reply });
  } catch {
    return json(response, 502, { error: 'AI request failed or timed out.' });
  }
}
