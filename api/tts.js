// Menggunakan Vercel Edge Runtime untuk performa ultra-cepat
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
    // Memanggil API ElevenLabs TTS
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_22050_32`,
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

    // Ambil seluruh buffer audio di memori Edge Vercel
    const arrayBuffer = await response.arrayBuffer();

    // Kirimkan ke ESP32 lengkap dengan Content-Length
    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-cache",
        "Content-Length": arrayBuffer.byteLength.toString(), // Kunci pencegah terpotong pada ESP32
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
