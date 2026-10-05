export const config = {
  runtime: 'edge',
  regions: ['iad1'], 
};

export default async function handler(request) {
  const url = new URL(request.url);
  const text = url.searchParams.get("text");
  
  if (!text) return new Response("Teks kosong", { status: 400 });

  // Mengambil API Key secara aman dari Environment Variables Vercel
  const apiKey = process.env.VOICERSS_API_KEY;

  if (!apiKey) {
    return new Response("API Key VoiceRSS belum diatur di Vercel", { status: 500 });
  }

  const ttsUrl = `http://api.voicerss.org/?key=${apiKey}&hl=id-id&v=Budi&c=MP3&f=24khz_16bit_mono&src=${encodeURIComponent(text)}`;

  try {
    const response = await fetch(ttsUrl);

    if (!response.ok) {
      return new Response("Gagal mengambil audio dari VoiceRSS", { status: response.status });
    }

    const arrayBuffer = await response.arrayBuffer();

    return new Response(arrayBuffer, {
      headers: { 
        "Content-Type": "audio/mpeg", 
        "Content-Length": arrayBuffer.byteLength.toString(),
        "Content-Disposition": 'inline; filename="hago_budi.mp3"'
      }
    });
  } catch (e) {
    return new Response(e.message, { status: 500 });
  }
}
