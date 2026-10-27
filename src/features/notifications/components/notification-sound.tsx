"use client";

import * as React from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";

const SOUND_PREF_KEY = "ahs_crm_sound_enabled";

/**
 * Checks whether audio alerts are enabled in client local storage (defaults to true)
 */
export function getNotificationSoundPreference(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(SOUND_PREF_KEY) !== "false";
}

/**
 * Persists the user's notification sound preference
 */
export function setNotificationSoundPreference(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SOUND_PREF_KEY, enabled ? "true" : "false");
}

/**
 * Synthesizes a subtle, pleasant two-tone audio chime (D5 -> A5) via Web Audio API.
 * Requires zero external audio files or network requests.
 */
export function playNotificationSound(): void {
  if (typeof window === "undefined") return;
  if (!getNotificationSoundPreference()) return;

  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Tone 1: D5 (587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now);

    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.12, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.18);

    // Tone 2: A5 (880 Hz) - Higher harmonic chime
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.08);

    gain2.gain.setValueAtTime(0, now + 0.08);
    gain2.gain.linearRampToValueAtTime(0.15, now + 0.10);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now + 0.08);
    osc2.stop(now + 0.38);

    // Clean up audio context
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 450);
  } catch (err) {
    // AudioContext might be blocked if user has not interacted with document yet
    console.debug("Web Audio alert suppressed or blocked:", err);
  }
}

interface NotificationSoundToggleProps {
  className?: string;
}

/**
 * Functional toggle button for enabling/muting in-app notification audio alerts
 */
export function NotificationSoundToggle({ className = "" }: NotificationSoundToggleProps) {
  const [enabled, setEnabled] = React.useState<boolean>(true);

  React.useEffect(() => {
    setEnabled(getNotificationSoundPreference());
  }, []);

  const handleToggle = () => {
    const nextState = !enabled;
    setEnabled(nextState);
    setNotificationSoundPreference(nextState);
    if (nextState) {
      playNotificationSound();
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      className={`h-8 w-8 p-0 text-muted-foreground hover:text-foreground ${className}`}
      title={enabled ? "Mute notification sound" : "Unmute notification sound"}
      aria-label={enabled ? "Mute notification sound" : "Unmute notification sound"}
    >
      {enabled ? (
        <Volume2 className="h-4 w-4 text-primary" />
      ) : (
        <VolumeX className="h-4 w-4 text-muted-foreground" />
      )}
    </Button>
  );
}
