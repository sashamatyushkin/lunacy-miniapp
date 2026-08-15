import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import type { Story } from '../lib/types';
import { haptic } from '../lib/telegram';
import { track } from '../lib/analytics';
import { SixSeven } from './SixSeven';

const DURATION = 5000;

/** Poster shown while the photo loads and if the file is missing entirely. */
function Fallback({ story }: { story: Story }) {
  return (
    <div
      className="absolute inset-0 grid place-items-center"
      style={{ background: `radial-gradient(120% 90% at 50% 20%, ${story.accent}33, #0e0e0e 70%)` }}
    >
      <div className="text-center px-8">
        <SixSeven compact />
        <div className="mt-4 text-[13px] text-[var(--color-soft)]">{story.title}</div>
      </div>
    </div>
  );
}

function Media({ story, active }: { story: Story; active: boolean }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="absolute inset-0 overflow-hidden bg-[var(--color-bg)]">
      <Fallback story={story} />
      {!failed && (
        <img
          src={story.mediaUrl}
          alt={story.title}
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ animation: active ? 'kenburns 6s ease-out forwards' : undefined }}
        />
      )}
      <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[#0e0e0e] to-transparent" />
    </div>
  );
}

export default function StoryViewer({
  stories,
  index,
  onIndex,
  onClose,
}: {
  stories: Story[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const startedAt = useRef(0);
  const story = stories[index];

  const next = useCallback(() => {
    if (index + 1 >= stories.length) onClose();
    else onIndex(index + 1);
  }, [index, stories.length, onClose, onIndex]);

  const prev = useCallback(() => {
    if (index > 0) onIndex(index - 1);
  }, [index, onIndex]);

  useEffect(() => {
    if (!story) return;
    track('story_open', { storyId: story.id });
    startedAt.current = performance.now();
    setProgress(0);
    let frame = 0;
    const tick = () => {
      const p = Math.min(1, (performance.now() - startedAt.current) / DURATION);
      setProgress(p);
      if (p >= 1) next();
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [story, next]);

  if (!story) return null;

  return (
    <motion.div
      // The backdrop is opaque from the first frame on purpose: animating the
      // container's opacity leaves the feed showing through if the animation
      // is interrupted (backgrounded app, throttled rAF).
      className="fixed inset-0 z-50 bg-black"
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.5 }}
      onDragEnd={(_, info) => {
        if (info.offset.y > 110) {
          haptic.tap();
          onClose();
        }
      }}
    >
      {/* Slides never animate opacity either — a stalled animation would leave
          the story half transparent. The Ken Burns zoom carries the motion. */}
      <div key={story.id} className="absolute inset-0">
        <Media story={story} active />
      </div>

      {/* progress bars */}
      <div className="absolute inset-x-0 flex gap-1 px-3" style={{ top: 'calc(var(--safe-top) + 8px)' }}>
        {stories.map((s, i) => (
          <div key={s.id} className="h-[2px] flex-1 overflow-hidden rounded-full bg-white/25">
            <div
              className="h-full bg-white"
              style={{ width: i < index ? '100%' : i === index ? `${progress * 100}%` : '0%' }}
            />
          </div>
        ))}
      </div>

      <button
        onClick={onClose}
        className="absolute right-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/40 text-lg text-white"
        style={{ top: 'calc(var(--safe-top) + 20px)' }}
        aria-label="закрыть"
      >
        ✕
      </button>

      {/* tap zones */}
      <button className="absolute inset-y-0 left-0 w-1/3" onClick={prev} aria-label="назад" />
      <button className="absolute inset-y-0 right-0 w-2/3" onClick={next} aria-label="вперёд" />

      <div className="pointer-events-none absolute inset-x-0 px-5" style={{ bottom: 'calc(var(--safe-bottom) + 28px)' }}>
        <div className="text-[22px] font-semibold lowercase tracking-tight">{story.title}</div>
        {story.caption && <div className="mt-1 text-[13px] text-[var(--color-soft)]">{story.caption}</div>}
      </div>

      <style>{`
        @keyframes kenburns {
          from { transform: scale(1.12) translate3d(2%, 1%, 0); }
          to   { transform: scale(1) translate3d(0, 0, 0); }
        }
      `}</style>
    </motion.div>
  );
}
