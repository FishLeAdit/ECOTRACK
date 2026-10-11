import React, { useEffect, useRef, useState } from 'react';

const reducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// A number that counts up (or down) to its value, and pops briefly when the value changes.
// On first render it counts from 0; afterwards it animates from wherever it currently is.
function AnimatedNumber({ value, decimals = 0, duration = 900, prefix = '', suffix = '', signed = false, style, className }) {
  const target = Number.isFinite(value) ? value : 0;
  const [display, setDisplay] = useState(reducedMotion() ? target : 0);
  const [pulseKey, setPulseKey] = useState(0);
  const current = useRef(reducedMotion() ? target : 0);
  const previous = useRef(null);

  useEffect(() => {
    // Pop only when the value really changed (not on mount, and not on StrictMode's double effect)
    if (previous.current !== null && previous.current !== target) setPulseKey(k => k + 1);
    previous.current = target;

    if (reducedMotion()) {
      current.current = target;
      setDisplay(target);
      return undefined;
    }

    const from = current.current;
    if (from === target) {
      setDisplay(target);
      return undefined;
    }

    let frame;
    const start = performance.now();
    const tick = now => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      current.current = from + (target - from) * eased;
      setDisplay(current.current);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  const format = n => new Intl.NumberFormat(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n);
  const shown = (signed && display > 0 ? '+' : '') + prefix + format(display) + suffix;
  // Screen readers get the final value, not every frame of the count
  const finalText = (signed && target > 0 ? '+' : '') + prefix + format(target) + suffix;

  return (
    <span aria-label={finalText} className={className} style={style}>
      <span key={pulseKey} className={pulseKey ? 'num-pulse' : undefined} aria-hidden="true">{shown}</span>
    </span>
  );
}

export default AnimatedNumber;
