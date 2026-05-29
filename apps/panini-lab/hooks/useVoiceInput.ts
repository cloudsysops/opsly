'use client';

import { useState, useCallback } from 'react';

interface WindowWithMediaRecorder extends Window {
  mediaRecorder?: MediaRecorder;
}

export function useVoiceInput() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e: BlobEvent) => {
        chunks.push(e.data);
      };

      recorder.onstop = async () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        // TODO: Send to transcription API
        setTranscript('');
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      (window as unknown as WindowWithMediaRecorder).mediaRecorder = recorder;
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  }, []);

  const stopRecording = useCallback(() => {
    const recorder = (window as unknown as WindowWithMediaRecorder).mediaRecorder;
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
