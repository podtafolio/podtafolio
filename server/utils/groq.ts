export async function transcribeAudio(audioBuffer: Buffer, filename: string): Promise<{ text: string, language: string, segments: any[] }> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('GROQ_API_KEY environment variable is not set');
  }

  const formData = new FormData();
  const blob = new Blob([audioBuffer]);
  formData.append('file', blob, filename);
  formData.append('model', 'whisper-large-v3');
  // Use verbose_json to ensure we get the language field and segments
  formData.append('response_format', 'verbose_json');

  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const result = await response.json();

  return {
    text: result.text,
    language: result.language || 'en',
    segments: result.segments || [],
  };
}
