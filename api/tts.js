export default async function handler(req, res) {
  const { text } = req.query;

  if (!text) {
    return res.status(400).json({ error: "Parameter 'text' wajib diisi." });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  // Mengambil Voice ID dari Environment Variable Vercel atau menggunakan fallback ID
  const voiceId = process.env.ELEVENLABS_VOICE_ID || "pNInz6obpgDQGcFmaJgB";

  if (!apiKey) {
    return res.status(500).json({ error: "ELEVENLABS_API_KEY belum dikonfigurasi di Vercel." });
  }

  try {
    // optimize_streaming_latency=2 dan mp3_22050_32 untuk proses cepat dan file audio ringan
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
      return res.status(response.status).json({ error: errorText });
    }

    const audioBuffer = await response.arrayBuffer();

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-cache");
    return res.status(200).send(Buffer.from(audioBuffer));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
