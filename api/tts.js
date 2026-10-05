export const config = {
  runtime: 'edge',
  regions: ['iad1'], 
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

    // 1. Ekstrak Base64 Audio
    let base64Audio = null;
    if (data.output_audio && data.output_audio.data) {
      base64Audio = data.output_audio.data;
    } else if (data.steps) {
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

    if (!base64Audio) return new Response("Audio tidak ditemukan", { status: 500 });
    
    // 2. Decode Base64 menjadi Binary murni (tanpa disuntik apapun)
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);

    // 3. Deteksi Format Asli Audio (Magic Bytes) agar ESP32 tidak bingung
    let contentType = "application/octet-stream";
    let extension = "bin";

    if (bytes.length > 4) {
      if (bytes[0] === 82 && bytes[1] === 73 && bytes[2] === 70 && bytes[3] === 70) {
        // "RIFF" -> Format WAV
        contentType = "audio/wav";
        extension = "wav";
      } else if (bytes[0] === 255 && (bytes[1] === 251 || bytes[1] === 243 || bytes[1] === 242)) {
        // 0xFF 0xFB -> Format MP3
        contentType = "audio/mpeg";
        extension = "mp3";
      } else if (bytes[0] === 73 && bytes[1] === 68 && bytes[2] === 51) {
        // "ID3" -> Format MP3
        contentType = "audio/mpeg";
        extension = "mp3";
      } else if (bytes[0] === 79 && bytes[1] === 103 && bytes[2] === 103 && bytes[3] === 83) {
        // "OggS" -> Format OGG
        contentType = "audio/ogg";
        extension = "ogg";
      }
    }

    // 4. Kembalikan Audio Asli dengan Header yang tepat
    return new Response(bytes.buffer, {
      headers: { 
        "Content-Type": contentType, 
        "Content-Length": bytes.length.toString(),
        "Content-Disposition": `inline; filename="hago_voice.${extension}"`
      }
    });
  } catch (e) {
    return new Response(e.message, { status: 500 });
  }
}
