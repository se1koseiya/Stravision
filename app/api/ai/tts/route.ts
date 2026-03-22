import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { text, voice } = await req.json()
    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 })
    }

    const apiKey = process.env.DASHSCOPE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "DASHSCOPE_API_KEY not configured" }, { status: 500 })
    }
    const response = await fetch("https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "qwen3-tts-flash", 
        input: { 
          text: text,
          voice: voice || "Cherry" 
        },
        parameters: { 
          audio_format: "mp3",
          sample_rate: 24000
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("DashScope TTS API Error:", errorText)
      return NextResponse.json({ error: "Failed to synthesize speech" }, { status: response.status })
    }

    const data = await response.json()
    const audioUrl = data?.output?.audio?.url
    
    if (!audioUrl) {
      console.error("DashScope TTS returned no audio url:", data);
      return NextResponse.json({ error: "Invalid response from TTS API" }, { status: 500 })
    }

    // Fetch the actual audio file from OSS URL
    const audioResponse = await fetch(audioUrl)
    if (!audioResponse.ok) {
        return NextResponse.json({ error: "Failed to download generated audio" }, { status: 500 })
    }

    // Return the audio stream
    const audioBlob = await audioResponse.blob()
    return new NextResponse(audioBlob, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=3600"
      }
    })
  } catch (error) {
    console.error("TTS API Route Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
