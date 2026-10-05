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
    // Memastikan ada titik di akhir teks agar ElevenLabs menghasilkan hening (trailing silence)
    // Ini mencegah suara terpotong paksa di ujung kalimat
    let safeText = text.trim();
    if (!safeText.endsWith('.') && !safeText.endsWith('!') && !safeText.endsWith('?')) {
      safeText += "."; 
    }
    safeText += " ..."; // Tambahan jeda napas (silence padding)

    const response = await fetch(
      // UBAH format menjadi mp3_44100_128 (Dekoder ESP32 lebih stabil di bitrate ini)
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "Accept": "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text: safeText, // Gunakan teks yang sudah diberi padding
          model_id: "eleven_multilingual_v2"
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(errorText, { status: response.status });
    }

    const arrayBuffer = await response.arrayBuffer();

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-cache",
        "Content-Length": arrayBuffer.byteLength.toString(),
        "Connection": "close" // Beri tahu ESP32 bahwa stream benar-benar selesai
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
