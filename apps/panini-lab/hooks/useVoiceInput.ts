'use client';

import { useState, useCallback } from 'react';

export function useVoiceInput() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const mediaRecorder = typeof window !== 'undefined' ? (window as any).mediaRecorder : null;

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new (window as any).MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e: BlobEvent) => {
        chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        // TODO: Send to transcription API
        setTranscript('');
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      (window as any).mediaRecorder = recorder;
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  }, []);

  const stopRecording = useCallback(() => {
    const recorder = (window as any).mediaRecorder;
    if (recorder && isRecording) {
      recorder.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  return {
    isRecording,
    transcript,
    startRecording,
    stopRecording,
  };
}
