export const config = {
  runtime: 'edge',
  regions: ['iad1'], 
};

export default async function handler(request) {
  const url = new URL(request.url);
  const text = url.searchParams.get("text");
  
  if (!text) return new Response("Teks kosong", { status: 400 });

  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return new Response("ERROR: Variable ELEVENLABS_API_KEY belum diatur", { 
      status: 500,
      headers: { "Content-Type": "text/plain" }
    });
  }

  // Voice ID default (Contoh: pNInz6obpgDQGcFmaJgB adalah suara "Adam")
  // Anda bisa menggantinya dengan Voice ID lain dari dashboard ElevenLabs
  const voiceId = url.searchParams.get("v") || "pNInz6obpgDQGcFmaJgB";

  const ttsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

  try {
    const response = await fetch(ttsUrl, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: text,
        model_id: "eleven_multilingual_v2", // Model terbaik untuk Bahasa Indonesia
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(`Error ElevenLabs: ${errorText}`, { 
        status: response.status,
        headers: { "Content-Type": "text/plain" }
      });
    }

    const arrayBuffer = await response.arrayBuffer();

    return new Response(arrayBuffer, {
      headers: { 
        "Content-Type": "audio/mpeg", 
        "Content-Length": arrayBuffer.byteLength.toString(),
        "Content-Disposition": 'inline; filename="hago_elevenlabs.mp3"'
      }
    });
  } catch (e) {
    return new Response(e.message, { status: 500 });
  }
}
