export const config = {
  runtime: 'edge',
  regions: ['iad1'], 
};

export default async function handler(request) {
  const url = new URL(request.url);
  const text = url.searchParams.get("text");
  
  if (!text) return new Response("Teks kosong", { status: 400 });

  const apiKey = process.env.VOICERSS_API_KEY;

  if (!apiKey) {
    return new Response("ERROR: Variable VOICERSS_API_KEY belum diatur di Vercel Environment Variables", { 
      status: 500,
      headers: { "Content-Type": "text/plain" }
    });
  }

  // Menggunakan HTTPS
  const ttsUrl = `https://api.voicerss.org/?key=${apiKey}&hl=id-id&v=Budi&c=MP3&f=24khz_16bit_mono&src=${encodeURIComponent(text)}`;

  try {
    const response = await fetch(ttsUrl);

    if (!response.ok) {
      return new Response("Gagal terhubung ke VoiceRSS", { status: response.status });
    }

    const arrayBuffer = await response.arrayBuffer();
    
    // Deteksi jika VoiceRSS mengembalikan teks error
    const textDecoder = new TextDecoder();
    const responseText = textDecoder.decode(arrayBuffer);

    if (responseText.startsWith("ERROR:")) {
      return new Response(`VoiceRSS ${responseText}`, { 
        status: 400,
        headers: { "Content-Type": "text/plain" }
      });
    }

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
