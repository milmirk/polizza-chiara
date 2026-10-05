import { useEffect, useState, useSyncExternalStore } from 'react';

const FEMALE_PREFS = [
  /isabella.*natural/i,
  /elsa.*natural/i,
  /(fiamma|imelda|irma|palmira|pierina|fabiola).*natural/i,
  /natural/i,
  /google italiano/i,
  /(alice|federica|paola|emma)/i,
  /elsa/i,
];
const MALE = /(cosimo|diego|giuseppe|benigno|calimero|cataldo|gianni|lisandro|rinaldo|luca)/i;
const STORAGE_KEY = 'polizza-chiara-voice';

const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

export function italianVoices(): SpeechSynthesisVoice[] {
  if (!supported) return [];
  return speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('it'));
}

function bestVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const saved = localStorage.getItem(STORAGE_KEY);
  const byName = voices.find((v) => v.name === saved);
  if (byName) return byName;
  for (const re of FEMALE_PREFS) {
    const v = voices.find((x) => re.test(x.name) && !MALE.test(x.name));
    if (v) return v;
  }
  return voices.find((v) => !MALE.test(v.name)) ?? voices[0];
}

export function toSpeech(text: string): string {
  return text
    .replace(/(\d)\.(\d{3})/g, '$1$2')
    .replace(/(\d),00\b/g, '$1')
    .replace(/€\s?(\d[\d,]*)/g, '$1 euro')
    .replace(/(\d[\d,]*)\s?€/g, '$1 euro')
    .replace(/€/g, 'euro')
    .replace(/(\d+)\s?%/g, '$1 per cento')
    .replace(/\bArt\.\s?/g, 'articolo ')
    .replace(/\blett\.\s?/g, 'lettera ')
    .replace(/\bRMN\b/g, 'risonanza magnetica')
    .replace(/\bes\.\s/g, 'per esempio ')
    .replace(/[“”"«»]/g, '')
    .replace(/[▶✓✗→›]/g, '')
    .replace(/\s*\(\s*/g, ', ')
    .replace(/\s*\)\s*/g, ', ')
    .replace(/\s+,/g, ',')
    .replace(/,(\s*,)+/g, ',')
    .replace(/,\s*([.!?])/g, '$1');
}

let speakingId: string | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function stop() {
  if (!supported) return;
  speechSynthesis.cancel();
  speakingId = null;
  emit();
}

export function speak(id: string, text: string) {
  if (!supported) return;
  stop();
  const voice = bestVoice(italianVoices());
  const sentences = toSpeech(text).match(/[^.!?;:]+[.!?;:]*/g)?.map((s) => s.trim()).filter(Boolean) ?? [text];
  speakingId = id;
  emit();
  sentences.forEach((s, i) => {
    const u = new SpeechSynthesisUtterance(s);
    u.lang = 'it-IT';
    if (voice) u.voice = voice;
    const natural = voice && /natural|google/i.test(voice.name);
    u.rate = natural ? 1 : 0.92;
    u.pitch = natural ? 1 : 1.05;
    if (i === sentences.length - 1) {
      u.onend = () => {
        if (speakingId === id) {
          speakingId = null;
          emit();
        }
      };
    }
    speechSynthesis.speak(u);
  });
}

export function useSpeaking(id: string): boolean {
  return useSyncExternalStore(subscribe, () => speakingId === id);
}

export function useVoices() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() => italianVoices());
  useEffect(() => {
    if (!supported) return;
    const update = () => setVoices(italianVoices());
    update();
    speechSynthesis.addEventListener('voiceschanged', update);
    return () => speechSynthesis.removeEventListener('voiceschanged', update);
  }, []);
  const current = bestVoice(voices);
  const choose = (name: string) => {
    localStorage.setItem(STORAGE_KEY, name);
    setVoices(italianVoices());
  };
  return { supported, voices, current, choose };
}
