import { useCallback, useEffect, useRef } from "react";

const MILESTONE_SOUND_SRC = "/audio/milestone-unlocked.mp3";

export function useMilestoneSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(MILESTONE_SOUND_SRC);
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
  }, []);

  return useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    void audio.play().catch(() => {
      // El audio es complementario; una política del navegador no debe bloquear el hito.
    });
  }, []);
}
