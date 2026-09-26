const SITE_URL = 'http://localhost:5173';
const SITE_NAME = 'AI Chatbot App';

const OPENROUTER_TIMEOUT_MS = 60_000;

const contentMsg = `
You are an AI-powered assistant.
Creator: Clay
Models used: Ling 3.0 Flash Fin (inclusionai/ling-3.0-flash-fin:free, LLM model, from OpenRouter)
Your version: v0.1.0
`;

export async function sendChatMessage(prompt: string) {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: AbortSignal.timeout(OPENROUTER_TIMEOUT_MS),
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': SITE_URL,
        'X-Title': SITE_NAME,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'inclusionai/ling-3.0-flash-fin:free',
        messages: [
          {
            role: 'system',
            content: contentMsg,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('OpenRouter Error Data:', data);
      return `Error dari API: ${data.error?.message || 'Gagal terhubung ke AI.'}`;
    }

    if (data.choices && data.choices.length > 0) {
      let replyMessage = data.choices[0].message?.content || 'Respons kosong dari AI.';
      return replyMessage;
    } else {
      return 'Duh, respons dari AI kosong atau format tidak dikenali.';
    }

  } catch (error) {
    console.error('Error fetching AI:', error);
    return 'Duh, koneksi ke server gagal atau timeout nih bro!';
  }
}
