'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import {
  isApprovedMediaUrl,
  type ApprovedCockpitMedia,
  type MediaAspect,
} from '@/lib/media/cockpit-media';

/** Global coordinator so at most one decorative cockpit video loop plays per viewport. */
let activeLoopVideo: HTMLVideoElement | null = null;

function claimActiveLoop(video: HTMLVideoElement): void {
  if (activeLoopVideo && activeLoopVideo !== video && !activeLoopVideo.paused) {
    activeLoopVideo.pause();
  }
  activeLoopVideo = video;
}

const ASPECT_CLASSES: Record<MediaAspect, string> = {
  video: 'aspect-video',
  portrait: 'aspect-[4/5]',
  vertical: 'aspect-[9/16]',
};

export interface CockpitMediaFrameProps {
  media: Pick<
    ApprovedCockpitMedia,
    'posterSrc' | 'width' | 'height' | 'aspect' | 'videoSrc' | 'webmSrc' | 'scenarioTag'
  >;
  alt: string;
  /** Optional localized label shown beside the LTR scenario metadata tag. */
  caption?: string;
  /** Above-the-fold hero posters may opt into eager priority; below-the-fold stays lazy. */
  priority?: boolean;
  /** Optional override for container height/aspect while keeping mapped border framing. */
  frameClassName?: string;
  playLabel?: string;
  pauseLabel?: string;
}

/**
 * Performance-safe marketing media frame enforcing AGENTS.md §2 & simdream-marketing-art-direction:
 * - Poster-first static image with explicit dimensions (never hides content without JS).
 * - Rejects `.gif` and unapproved hosts.
 * - Optional HTML5 `<video>` (H.264 MP4) with `muted`, `playsInline`, `loop`, `preload="none"`
 *   below the fold, `IntersectionObserver` viewport pausing, single-active-loop coordination,
 *   and `prefers-reduced-motion: reduce` static-poster fallback with a 44x44 manual play toggle.
 * - Mapped `border-slate-800` / `bg-slate-950` structural framing for AA contrast across all 3 themes.
 */
export function CockpitMediaFrame({
  media,
  alt,
  caption,
  priority = false,
  frameClassName,
  playLabel = 'Play cockpit clip',
  pauseLabel = 'Pause cockpit clip',
}: CockpitMediaFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [inView, setInView] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const hasValidPoster = isApprovedMediaUrl(media.posterSrc);
  const hasValidVideo = Boolean(media.videoSrc && isApprovedMediaUrl(media.videoSrc));
  const hasValidWebm = Boolean(media.webmSrc && isApprovedMediaUrl(media.webmSrc));

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, []);

  useEffect(() => {
    if (!hasValidVideo || !containerRef.current || typeof IntersectionObserver === 'undefined') {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const visible = Boolean(entry?.isIntersecting);
        setInView(visible);
        const el = videoRef.current;
        if (!el) return;
        if (!visible && !el.paused) {
          el.pause();
          setIsPlaying(false);
        }
      },
      { threshold: 0.25 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [hasValidVideo]);

  useEffect(() => {
    if (!hasValidVideo) return;
    const el = videoRef.current;
    if (!el) return;
    if (reducedMotion || !inView) {
      if (!el.paused) el.pause();
      setIsPlaying(false);
      return;
    }
    claimActiveLoop(el);
    const playPromise = el.play();
    if (playPromise && typeof playPromise.then === 'function') {
      playPromise
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  }, [hasValidVideo, inView, reducedMotion]);

  if (!hasValidPoster) return null;

  const togglePlayback = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      claimActiveLoop(el);
      const p = el.play();
      if (p && typeof p.then === 'function') {
        p.then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      } else {
        setIsPlaying(true);
      }
    } else {
      el.pause();
      setIsPlaying(false);
    }
  };

  return (
    <figure
      ref={containerRef}
      data-cockpit-media
      className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 group/media"
    >
      <div className={`relative w-full overflow-hidden bg-slate-950 ${frameClassName ?? ASPECT_CLASSES[media.aspect]}`}>
        {hasValidVideo ? (
          <>
            <video
              ref={videoRef}
              muted
              playsInline
              loop
              poster={media.posterSrc}
              preload={priority ? 'metadata' : 'none'}
              width={media.width}
              height={media.height}
              aria-label={alt}
              className="w-full h-full object-cover object-center"
            >
              {hasValidWebm && <source src={media.webmSrc} type="video/webm" />}
              <source src={media.videoSrc} type="video/mp4" />
              <img
                src={media.posterSrc}
                alt={alt}
                width={media.width}
                height={media.height}
                loading={priority ? 'eager' : 'lazy'}
                decoding="async"
                className="w-full h-full object-cover object-center"
              />
            </video>
            <button
              type="button"
              onClick={togglePlayback}
              aria-pressed={isPlaying}
              aria-label={isPlaying ? pauseLabel : playLabel}
              className="absolute bottom-2 end-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-950 text-white hover:border-sky-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Play className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </>
        ) : (
          <img
            src={media.posterSrc}
            alt={alt}
            width={media.width}
            height={media.height}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            className="w-full h-full object-cover object-center motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover/media:scale-105"
          />
        )}
      </div>

      {(media.scenarioTag || caption) && (
        <figcaption className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-t border-slate-800 bg-slate-950 text-xs">
          {caption && <span className="text-slate-300 font-medium">{caption}</span>}
          <span
            dir="ltr"
            className="font-mono tabular-nums font-semibold tracking-wider text-sky-400 text-[11px]"
          >
            {media.scenarioTag}
          </span>
        </figcaption>
      )}
    </figure>
  );
}
