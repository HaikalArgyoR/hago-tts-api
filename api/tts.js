// Menggunakan Vercel Edge Runtime untuk performa ultra-cepat dan streaming
export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // Mengambil parameter dari URL di Edge Runtime
  const url = new URL(req.url);
  const text = url.searchParams.get("text");

  if (!text) {
    return new Response(JSON.stringify({ error: "Parameter 'text' wajib diisi." }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID || "pNInz6obpgDQGcFmaJgB";

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "API Key belum dikonfigurasi." }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?optimize_streaming_latency=2&output_format=mp3_22050_32`,
      {
        method: "POST",
        headers: {
          "Accept": "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text: text,
          model_id: "eleven_multilingual_v2"
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(errorText, { status: response.status });
    }

    // LANGSUNG STREAMING DATA KE ESP32 (Mencegah readSpace 0)
    return new Response(response.body, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-cache",
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
