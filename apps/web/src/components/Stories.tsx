import type { Story } from '../lib/types';
import { haptic } from '../lib/telegram';

export function StoriesRow({ stories, onOpen }: { stories: Story[]; onOpen: (i: number) => void }) {
  return (
    <div className="scroll-y no-bar -mx-4 flex gap-3 overflow-x-auto px-4 py-1">
      {stories.map((s, i) => (
        <button
          key={s.id}
          onClick={() => {
            haptic.tap();
            onOpen(i);
          }}
          className="flex w-[68px] shrink-0 flex-col items-center gap-1.5"
        >
          <span className="relative grid h-[68px] w-[68px] place-items-center transition-transform active:scale-95">
            {/* вращающееся кольцо — «непросмотренная» сторис */}
            <span
              className="story-ring absolute inset-0 rounded-full"
              style={{ background: `conic-gradient(from 0deg, ${s.accent}, #f4f4f4, ${s.accent}, ${s.accent}, #f4f4f4)` }}
            />
            <span className="absolute inset-[2px] rounded-full bg-[var(--color-bg)]" />
            <span className="relative grid h-[62px] w-[62px] place-items-center overflow-hidden rounded-full bg-[var(--color-bg)] p-[3px]">
              {/* The "67" poster is the background; a real photo covers it. */}
              <span
                className="relative grid h-full w-full place-items-center overflow-hidden rounded-full text-[13px] font-bold tracking-[-0.05em] text-[var(--color-ink)]"
                style={{ background: `linear-gradient(160deg, ${s.accent}55, #1a1a1a)` }}
              >
                67
                <img
                  src={s.mediaUrl}
                  alt=""
                  loading="lazy"
                  // Framed above centre: the source clips carry a play glyph in
                  // the middle that would otherwise land inside the circle.
                  className="absolute inset-0 h-full w-full object-cover object-[50%_32%]"
                  onError={(e) => {
                    e.currentTarget.remove();
                  }}
                />
              </span>
            </span>
          </span>
          <span className="w-full truncate text-center text-[10px] text-[var(--color-muted)]">{s.title}</span>
        </button>
      ))}
    </div>
  );
}

