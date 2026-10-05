export const config = {
  runtime: 'edge',
  regions: ['iad1'], // Memaksa server dieksekusi di Washington, D.C. (US)
};

export default async function handler(request) {
  const url = new URL(request.url);
  const text = url.searchParams.get("text");
  
  if (!text) return new Response("Teks kosong", { status: 400 });

  const apiKey = process.env.GEMINI_API_KEY;
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/interactions?key=${apiKey}`;

  const payload = {
    model: "gemini-3.8-flash-tts",
    input: text
  };

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (data.error) return new Response(JSON.stringify(data.error), { status: 400 });

    let base64Audio = null;
    if (data.output_audio && data.output_audio.data) {
      base64Audio = data.output_audio.data;
    } else if (data.steps) {
      // Sama seperti logika pencarian audio di Worker sebelumnya
      for (const step of data.steps) {
        if (step.content) {
          for (const block of step.content) {
            if (block.data) { base64Audio = block.data; break; }
            if (block.inlineData && block.inlineData.data) { base64Audio = block.inlineData.data; break; }
          }
        }
        if (base64Audio) break;
      }
    }

    if (!base64Audio) return new Response(JSON.stringify(data), { status: 500 });
    
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);

    return new Response(bytes.buffer, {
      headers: { "Content-Type": "audio/wav", "Content-Length": bytes.length.toString() }
    });
  } catch (e) {
    return new Response(e.message, { status: 500 });
  }
}
