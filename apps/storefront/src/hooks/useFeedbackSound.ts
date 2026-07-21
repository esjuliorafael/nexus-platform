"use client";

import { useCallback, useEffect, useRef } from "react";

const FEEDBACK_SOUNDS = {
  confirmation: "/audio/feedback-confirmation.mp3",
  error: "/audio/feedback-error.mp3",
} as const;

type FeedbackSound = keyof typeof FEEDBACK_SOUNDS;

export function useFeedbackSound(sound: FeedbackSound) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(FEEDBACK_SOUNDS[sound]);
    audio.preload = "auto";
    audio.volume = 0.6;
    audioRef.current = audio;
    audio.load();

    return () => {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      audioRef.current = null;
    };
  }, [sound]);

  const prepare = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.muted = true;
    try {
      await audio.play();
      audio.pause();
      audio.currentTime = 0;
    } catch {
      // Playback permission varies by browser; checkout remains fully functional.
    } finally {
      audio.muted = false;
    }
  }, []);

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    audio.muted = false;
    void audio.play().catch(() => {
      // Auditory feedback is supplementary; browser policies must not block checkout.
    });
  }, []);

  return { play, prepare };
}
