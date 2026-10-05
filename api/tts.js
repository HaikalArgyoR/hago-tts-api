export const config = {
  runtime: 'edge',
  regions: ['iad1'], 
};

// Fungsi untuk membuat header WAV standar (24kHz, 16-bit, Mono)
function createWavHeader(dataLength) {
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);
  
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true); // chunkSize
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // subchunk1Size
  view.setUint16(20, 1, true); // audioFormat (1 = PCM)
  view.setUint16(22, 1, true); // numChannels (1 = Mono)
  view.setUint32(24, 24000, true); // sampleRate (24000 Hz)
  view.setUint32(28, 24000 * 2, true); // byteRate
  view.setUint16(32, 2, true); // blockAlign
  view.setUint16(34, 16, true); // bitsPerSample (16-bit)
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);
  
  return new Uint8Array(buffer);
}

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
    
    // Decode Base64 dari Gemini
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);

    let finalAudio = bytes;
    
    // Cek jika Gemini memberikan Raw PCM (tidak ada 'RIFF' di awal data)
    if (!(bytes.length > 4 && bytes[0] === 82 && bytes[1] === 73 && bytes[2] === 70 && bytes[3] === 70)) {
      // Sisipkan WAV Header buatan kita
      const header = createWavHeader(bytes.length);
      finalAudio = new Uint8Array(header.length + bytes.length);
      finalAudio.set(header, 0);
      finalAudio.set(bytes, header.length);
    }

    // Kembalikan sebagai file WAV utuh
    return new Response(finalAudio.buffer, {
      headers: { 
        "Content-Type": "audio/wav", 
        "Content-Length": finalAudio.length.toString(),
        "Content-Disposition": 'inline; filename="hago_voice.wav"'
      }
    });
  } catch (e) {
    return new Response(e.message, { status: 500 });
  }
}
