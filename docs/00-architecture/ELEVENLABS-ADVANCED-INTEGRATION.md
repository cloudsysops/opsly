---
title: "ElevenLabs Advanced Integration for Opsly 2.0"
date: 2026-05-08
status: blueprint
---

# ElevenLabs Advanced Features for Opsly 2.0

## Current Status (Phase 5.2)

**Already Implemented:**
- ✅ Text-to-speech (32+ voices)
- ✅ Stability control (0-1 scale)
- ✅ Similarity boost (voice identity)
- ✅ Multi-language support (basic)
- ✅ Batch processing (Bull queue)

---

## Advanced Features to Add (Phased)

### Phase 5.2a: Voice Cloning (Week 2)
**Business Case:** Let agents + tenants use branded voices

**Implementation:**
```typescript
// apps/rendering-service/src/adapters/VoiceCloningAdapter.ts

interface VoiceCloneJob {
  tenant_id: string
  voice_name: string
  sample_audio_url: string  // 30s min
  description?: string
}

class VoiceCloningAdapter {
  async cloneVoice(job: VoiceCloneJob): Promise<string> {
    // 1. Download + validate audio sample
    const audio = await downloadAndValidate(job.sample_audio_url)
    
    // 2. Call ElevenLabs voice cloning API
    const response = await fetch('https://api.elevenlabs.io/v1/voice-cloning', {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'multipart/form-data'
      },
      body: formData
    })
    
    // 3. Get cloned voice ID
    const { voice_id } = await response.json()
    
    // 4. Store in database
    await db.cloned_voices.create({
      tenant_id: job.tenant_id,
      voice_id,
      voice_name: job.voice_name,
      created_at: new Date()
    })
    
    return voice_id
  }
  
  async listTenantVoices(tenant_id: string) {
    return db.cloned_voices.findByTenant(tenant_id)
  }
  
  async deleteVoice(tenant_id: string, voice_id: string) {
    // Call ElevenLabs to delete
    await fetch(`https://api.elevenlabs.io/v1/voices/${voice_id}`, {
      method: 'DELETE',
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY }
    })
    
    // Remove from database
    await db.cloned_voices.delete(voice_id)
  }
}
```

**API Endpoints:**
```typescript
// apps/api/src/routes/voices.ts

export default async function voiceRoutes(app: FastifyInstance) {
  // Clone a voice
  app.post('/api/v1/voices/clone', async (req, reply) => {
    const { voice_name, sample_audio_url } = req.body
    
    const voice_id = await voiceCloningAdapter.cloneVoice({
      tenant_id: req.user.tenant_id,
      voice_name,
      sample_audio_url
    })
    
    return {
      voice_id,
      voice_name,
      status: 'cloned',
      ready_in_seconds: 120
    }
  })
  
  // List cloned voices
  app.get('/api/v1/voices/custom', async (req, reply) => {
    const voices = await voiceCloningAdapter.listTenantVoices(req.user.tenant_id)
    
    return {
      voices: voices.map(v => ({
        id: v.voice_id,
        name: v.voice_name,
        created_at: v.created_at,
        status: 'ready'
      }))
    }
  })
  
  // Delete cloned voice
  app.delete('/api/v1/voices/:voiceId', async (req, reply) => {
    await voiceCloningAdapter.deleteVoice(
      req.user.tenant_id,
      req.params.voiceId
    )
    
    return { success: true }
  })
}
```

**Database Schema:**
```sql
CREATE TABLE cloned_voices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  voice_id VARCHAR NOT NULL UNIQUE,
  voice_name VARCHAR NOT NULL,
  sample_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, voice_name)
);
```

**Cost:** $10 per voice clone setup (one-time) + standard TTS rates

---

### Phase 5.2b: Voice Profiling & Emotion Control (Week 2-3)
**Business Case:** Agents choose voice tone based on context (professional, excited, empathetic, etc.)

**Implementation:**
```typescript
interface VoiceProfile {
  voice_id: string
  emotion: 'neutral' | 'professional' | 'friendly' | 'excited' | 'empathetic' | 'authoritative'
  energy_level: number (0-1)  // 0 = calm, 1 = energetic
  pace_variation: number (0-1)  // 0 = monotone, 1 = very dynamic
}

class VoiceProfileAdapter {
  async synthesizeWithEmotion(
    text: string,
    voice_id: string,
    profile: VoiceProfile
  ): Promise<{ audio_url: string; metadata: object }> {
    // Map emotion to ElevenLabs voice settings
    const emotionMap = {
      'neutral': { stability: 0.5, similarity_boost: 0.75 },
      'professional': { stability: 0.8, similarity_boost: 0.8 },
      'friendly': { stability: 0.6, similarity_boost: 0.7 },
      'excited': { stability: 0.4, similarity_boost: 0.9 },
      'empathetic': { stability: 0.65, similarity_boost: 0.85 },
      'authoritative': { stability: 0.85, similarity_boost: 0.8 }
    }
    
    const settings = emotionMap[profile.emotion]
    
    // Call ElevenLabs with emotion-adjusted settings
    const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech', {
      method: 'POST',
      body: JSON.stringify({
        text,
        voice_id,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: settings.stability * (0.5 + profile.energy_level * 0.5),
          similarity_boost: settings.similarity_boost
        }
      })
    })
    
    const audio = await response.arrayBuffer()
    const audio_url = await uploadToS3(audio)
    
    return {
      audio_url,
      metadata: {
        emotion: profile.emotion,
        energy_level: profile.energy_level,
        duration_seconds: estimateDuration(text)
      }
    }
  }
}
```

**Agent Integration:**
```typescript
// Billy (Developer Agent) uses voice profiles
const brissaVoiceProfile: VoiceProfile = {
  voice_id: 'brissa-cloned-voice-id',
  emotion: 'professional',
  energy_level: 0.7,
  pace_variation: 0.6
}

// Lili (QA Agent) uses different profile
const liliVoiceProfile: VoiceProfile = {
  voice_id: 'lili-cloned-voice-id',
  emotion: 'friendly',
  energy_level: 0.6,
  pace_variation: 0.7
}

// Michelle (Performance Agent) uses authoritative tone
const michelleVoiceProfile: VoiceProfile = {
  voice_id: 'michelle-cloned-voice-id',
  emotion: 'authoritative',
  energy_level: 0.8,
  pace_variation: 0.5
}
```

---

### Phase 5.2c: Real-time Streaming Audio (Week 3)
**Business Case:** Live agent notifications + WebSocket support for low-latency audio

**Implementation:**
```typescript
// apps/rendering-service/src/services/StreamingAudioService.ts

class StreamingAudioService {
  private ws: Map<string, WebSocket> = new Map()
  
  async startStream(
    job_id: string,
    text: string,
    voice_id: string
  ): Promise<ReadableStream> {
    // Open WebSocket to ElevenLabs streaming API
    const wsUrl = 'wss://api.elevenlabs.io/v1/text-to-speech-stream'
    
    const ws = new WebSocket(wsUrl)
    
    return new ReadableStream({
      start: (controller) => {
        ws.onmessage = (event) => {
          // Audio chunks arrive in real-time
          const audioChunk = event.data
          controller.enqueue(audioChunk)
        }
        
        ws.onerror = (error) => {
          controller.error(error)
        }
        
        ws.onclose = () => {
          controller.close()
        }
      }
    })
  }
  
  async notifyAgentRealtime(
    agent_name: string,
    message: string,
    voice_profile: VoiceProfile
  ) {
    // Stream audio directly to agent interface (low latency)
    const stream = await this.startStream(
      `agent-${agent_name}`,
      message,
      voice_profile.voice_id
    )
    
    // Broadcast via WebSocket to connected clients
    const readers = this.getConnectedClients(agent_name)
    for (const reader of readers) {
      const { value } = await stream.getReader().read()
      reader.send(value)
    }
  }
}
```

**API Endpoint:**
```typescript
app.post('/api/v1/audio/stream', async (req, reply) => {
  const { text, voice_id } = req.body
  
  // Return streaming response
  reply.type('audio/mpeg')
  
  const stream = await streamingAudioService.startStream(
    req.id,
    text,
    voice_id
  )
  
  return stream
})
```

---

### Phase 5.2d: Pronunciation Guides & SSML Control (Week 3)
**Business Case:** Ensure correct pronunciation of technical terms, proper names, brand names

**Implementation:**
```typescript
interface PronunciationGuide {
  word: string
  pronunciation: string  // IPA format
  language_code: string
}

class PronunciationService {
  async synthesizeWithSSML(
    ssml: string,  // Speech Synthesis Markup Language
    voice_id: string
  ): Promise<{ audio_url: string }> {
    // Example SSML:
    // <speak>
    //   Welcome to <emphasis level="strong">Opsly</emphasis>!
    //   We pronounce it <phoneme alphabet="ipa" ph="ˈɒpzli">Opsly</phoneme>.
    //   <break time="500ms"/>
    //   Meet <name>Hashi</name>, your architect.
    // </speak>
    
    const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech', {
      method: 'POST',
      body: JSON.stringify({
        text: ssml,
        voice_id,
        model_id: 'eleven_monolingual_v1',
        use_ssml: true  // Enable SSML parsing
      })
    })
    
    const audio = await response.arrayBuffer()
    const audio_url = await uploadToS3(audio)
    
    return { audio_url }
  }
  
  async createPronunciationGuide(
    words: PronunciationGuide[]
  ): Promise<string> {
    // Build SSML with phonemes for each word
    let ssml = '<speak>'
    
    for (const guide of words) {
      ssml += `
        <phoneme alphabet="ipa" ph="${guide.pronunciation}">
          ${guide.word}
        </phoneme>
      `
    }
    
    ssml += '</speak>'
    
    return ssml
  }
}
```

**Example Usage (Opsly Branding):**
```typescript
const opslyPronunciationGuide: PronunciationGuide[] = [
  { word: 'Opsly', pronunciation: 'ˈɒpzli', language_code: 'en-US' },
  { word: 'Hashi', pronunciation: 'ˈhɑːʃi', language_code: 'en-US' },
  { word: 'Brissa', pronunciation: 'ˈbrɪsə', language_code: 'en-US' },
  { word: 'Lili', pronunciation: 'ˈliːli', language_code: 'en-US' },
  { word: 'Kairo', pronunciation: 'kaɪˈroʊ', language_code: 'en-US' },
  { word: 'Aria', pronunciation: 'ˈɑːriə', language_code: 'en-US' },
  { word: 'Nyx', pronunciation: 'nɪks', language_code: 'en-US' },
  { word: 'Lousa', pronunciation: 'ˈlaʊsə', language_code: 'en-US' },
  { word: 'Michelle', pronunciation: 'mɪˈʃɛl', language_code: 'en-US' }
]

// Use in agent greetings
const ssml = await pronunciationService.createPronunciationGuide(opslyPronunciationGuide)
const { audio_url } = await pronunciationService.synthesizeWithSSML(
  `<speak>${ssml} Welcome to your autonomous development platform.</speak>`,
  'default-voice-id'
)
```

---

### Phase 5.2e: Speaker Diarization & Multi-Speaker Support (Week 4)
**Business Case:** Generate conversations between agents (e.g., Hashi interviewing Brissa about task progress)

**Implementation:**
```typescript
interface DialogueSegment {
  speaker: string  // Agent name
  text: string
  voice_id: string
  pause_before_ms?: number
  emotion?: string
}

class DialogueGenerationService {
  async generateDialogue(segments: DialogueSegment[]): Promise<{ audio_url: string; duration_seconds: number }> {
    let totalDuration = 0
    const audioChunks = []
    
    for (const segment of segments) {
      // Add pause if specified
      if (segment.pause_before_ms) {
        const silence = await this.generateSilence(segment.pause_before_ms)
        audioChunks.push(silence)
        totalDuration += segment.pause_before_ms / 1000
      }
      
      // Synthesize segment with agent voice + emotion
      const { audio, duration } = await this.synthesizeSegment(segment)
      audioChunks.push(audio)
      totalDuration += duration
    }
    
    // Concatenate all audio chunks
    const finalAudio = await this.concatenateAudio(audioChunks)
    const audio_url = await uploadToS3(finalAudio)
    
    return { audio_url, duration_seconds: totalDuration }
  }
  
  async generateMultiAgentDialogue(
    dialogue: {
      hashi?: string
      brissa?: string
      lili?: string
      kairo?: string
      aria?: string
      nyx?: string
      lousa?: string
      michelle?: string
    }[]
  ): Promise<{ audio_url: string }> {
    // Convert dialogue structure to segments
    const segments: DialogueSegment[] = dialogue.flatMap((turn, index) => {
      return Object.entries(turn).map(([agent, text]) => ({
        speaker: agent,
        text: text as string,
        voice_id: this.getAgentVoiceId(agent),
        emotion: this.getAgentEmotion(agent),
        pause_before_ms: index > 0 ? 500 : 0
      }))
    })
    
    return this.generateDialogue(segments)
  }
  
  private getAgentVoiceId(agent: string): string {
    const voiceMap: Record<string, string> = {
      'hashi': 'hashi-voice-id',
      'brissa': 'brissa-voice-id',
      'lili': 'lili-voice-id',
      'kairo': 'kairo-voice-id',
      'aria': 'aria-voice-id',
      'nyx': 'nyx-voice-id',
      'lousa': 'lousa-voice-id',
      'michelle': 'michelle-voice-id'
    }
    return voiceMap[agent.toLowerCase()] || 'default-voice-id'
  }
  
  private getAgentEmotion(agent: string): string {
    const emotionMap: Record<string, string> = {
      'hashi': 'professional',
      'brissa': 'friendly',
      'lili': 'friendly',
      'kairo': 'authoritative',
      'aria': 'neutral',
      'nyx': 'curious',
      'lousa': 'authoritative',
      'michelle': 'excited'
    }
    return emotionMap[agent.toLowerCase()] || 'neutral'
  }
}
```

**Example Usage:**
```typescript
// Hashi + Brissa conversation about task progress
const dialogue = [
  { hashi: "Brissa, how's the implementation progressing?" },
  { brissa: "On track! I've completed the LLM router. Tests are passing." },
  { hashi: "Excellent. Any blockers?" },
  { brissa: "None so far. Lili's validating the code now." },
  { hashi: "Perfect. Keep up the pace." }
]

const { audio_url } = await dialogueGenerator.generateMultiAgentDialogue(dialogue)

// Use in status update video
await videoGenerator.createStatusVideo({
  title: 'Daily Standup: Opsly Team',
  dialogue_audio_url: audio_url,
  background: 'opsly-dashboard.png',
  captions: true
})
```

---

### Phase 5.2f: Dubbing & Video Support (Future - Week 5+)
**Business Case:** Auto-dub deployment videos in multiple languages, create agent intro videos

**Implementation:**
```typescript
interface DubbingJob {
  video_url: string
  target_language: string
  source_language?: string  // Auto-detect if not provided
  voice_id?: string
}

class DubbingService {
  async dubVideo(job: DubbingJob): Promise<{ dubbed_video_url: string; duration_seconds: number }> {
    // 1. Extract audio from video
    const { audio, transcript, timing } = await this.extractAudioAndTranscript(job.video_url)
    
    // 2. Translate transcript if needed
    let targetTranscript = transcript
    if (job.target_language !== job.source_language) {
      targetTranscript = await this.translateTranscript(transcript, job.target_language)
    }
    
    // 3. Generate speech for target language
    const dubAudio = await this.synthesizeWithTiming(
      targetTranscript,
      job.target_language,
      job.voice_id,
      timing
    )
    
    // 4. Replace audio in video
    const dubbedVideo = await this.replaceAudioInVideo(
      job.video_url,
      dubAudio
    )
    
    // 5. Add subtitles if needed
    const finalVideo = await this.addSubtitles(
      dubbedVideo,
      targetTranscript,
      job.target_language
    )
    
    return {
      dubbed_video_url: await uploadToS3(finalVideo),
      duration_seconds: timing.total_duration
    }
  }
  
  async createAgentIntroVideo(
    agent_name: string,
    agent_description: string,
    voice_id: string
  ): Promise<{ video_url: string }> {
    // Create animated intro video with agent voice
    const script = `Hi, I'm ${agent_name}. ${agent_description}`
    
    const audioUrl = await elevenlabsService.synthesize({
      text: script,
      voice_id
    })
    
    const video = await videoGenerator.createIntroAnimation({
      agent_name,
      audio_url: audioUrl,
      duration_seconds: 15,
      background_color: this.getAgentColor(agent_name),
      animation_style: 'modern'
    })
    
    return { video_url: await uploadToS3(video) }
  }
}
```

---

## Cost Analysis (Extended ElevenLabs Features)

| Feature | Cost | Frequency | Monthly Impact |
|---------|------|-----------|-----------------|
| Voice Cloning | $10/voice | 1-2x per tenant | ~$50-100 (5-10 tenants) |
| TTS Standard | $0.30/1M chars | Continuous | $0-50 (scaling) |
| Streaming | Same as TTS | On-demand | Included |
| SSML/Pronunciation | Same as TTS | Included | Included |
| Dubbing | $0.001/min video | Per video | ~$10-50 (monthly) |
| **Total Monthly** | | | **$60-200** |

---

## Integration Timeline (Phased Rollout)

```
Phase 5.2 (Week 2):
  ✅ Voice Cloning (Friday, May 22)
  ✅ Voice Profiling & Emotion (Friday, May 22)

Phase 5.2b (Week 3):
  ✅ Real-time Streaming Audio (Mon-Wed, May 27-29)
  ✅ Pronunciation Guides (Thu-Fri, May 30-31)

Phase 5.2c (Week 4):
  ✅ Multi-Speaker Dialogue (Tue-Wed, Jun 3-4)
  ✅ Agent Intro Videos (Thu-Fri, Jun 5-6)

Phase 5.2d (Week 5+):
  🔄 Dubbing & Video Support (TBD)
```

---

## Agent Benefits (Per Agent)

### Hashi (Architect)
- Voice cloning: Professional architect tone
- Emotion: Authoritative, controlled
- Use case: Task briefings + standup updates

### Brissa (Developer)
- Voice cloning: Friendly, approachable
- Emotion: Excited, energetic
- Use case: Code implementation announcements + PR summaries

### Lili (QA)
- Voice cloning: Friendly, precise
- Emotion: Friendly, encouraging
- Use case: Test results + fix suggestions (audio feedback)

### Kairo (Security)
- Voice cloning: Authoritative, stern
- Emotion: Authoritative, professional
- Use case: Security alerts + approval announcements

### Aria (Docs)
- Voice cloning: Clear, articulate
- Emotion: Neutral, informative
- Use case: Documentation audio guides + API explanations

### Nyx (Researcher)
- Voice cloning: Curious, thoughtful
- Emotion: Curious, engaged
- Use case: Research findings + exploration narratives

### Lousa (Interventora)
- Voice cloning: Authoritative, commanding
- Emotion: Authoritative, decisive
- Use case: Quality gate enforcement + escalations

### Michelle (Performance)
- Voice cloning: Motivational, energetic
- Emotion: Excited, ambitious
- Use case: Performance optimization announcements + goal pushes

---

## Dashboard Features (Frontend)

**Voice Library Management:**
- List all cloned voices per tenant
- Clone new voice (upload 30s sample)
- Preview voice samples
- Delete unused voices
- Set agent-to-voice mappings

**Agent Voice Profiles:**
- Select emotion for each agent
- Test voice + emotion combination
- Preview dialogue between agents
- Create custom voice mixes

**Audio Generation Dashboard:**
- Track TTS usage + costs
- Monitor streaming latency
- View recent audio generation jobs
- Export audio transcripts

---

## Security Considerations

**Voice Cloning:**
- ✅ Only tenant admins can clone voices
- ✅ Voice samples stored encrypted
- ✅ Cost tracked per tenant + usage billing
- ✅ Voice IDs isolated per tenant (no cross-access)

**Streaming Audio:**
- ✅ WebSocket authentication required
- ✅ Rate limiting per tenant
- ✅ Bandwidth monitoring + alerts

**Dubbing & Video:**
- ✅ Video content validation (no malicious files)
- ✅ Language detection for accuracy
- ✅ Output video DRM if needed

---

## Recommended Rollout Strategy

**Week 1 Decision:**
1. Start with Voice Cloning + Emotion Control (high ROI)
2. Hold Streaming/Dubbing for Phase 5.3+
3. Prioritize multi-agent dialogue (cheap, high engagement)

**Timeline:**
- Voice features: Ready by May 22 (1 week dev + testing)
- Streaming: Ready by May 29 (add 1 week)
- Dubbing: Phase 5.3 onwards (requires video infra)

**Cost Control:**
- Set per-tenant voice cloning quota (max 5 voices/tenant)
- Monitor TTS usage + set alerts at $100/month
- Use batch processing for off-peak dubbing

---

## Next Steps

1. **Approve voice cloning** (Phase 5.2a) — highest priority
2. **Add emotion control** (Phase 5.2b) — pairs with cloning
3. **Implement streaming** (Phase 5.2c) — needed for real-time agent feedback
4. **Add pronunciation guides** (Phase 5.2d) — branding + correctness
5. **Multi-agent dialogue** (Phase 5.2e) — engagement + fun factor
6. **Dubbing** (Phase 5.2f) — future, depends on video roadmap

---

**Total Additional Development:** 40-60 hours over 4 weeks  
**ROI:** 10-15x (voice cloning alone justifies cost)  
**User Impact:** High (voice becomes brand identity)


---

## Enlaces relacionados

- [[00-architecture/README|00-architecture]]
- [[brain/README|Brain Central]]
