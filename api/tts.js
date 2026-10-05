try {
    // 1. Hapus optimize_streaming_latency=2 agar file MP3 utuh dan lebih stabil
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

    // 2. Tunggu seluruh buffer audio selesai di-generate oleh ElevenLabs
    const arrayBuffer = await response.arrayBuffer();

    // 3. Kirimkan ke ESP32 LENGKAP dengan Content-Length
    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-cache",
        "Content-Length": arrayBuffer.byteLength.toString(), // ESP32 butuh ini agar tidak terpotong!
      }
    });

  } catch (error) { ... }
