import React, { useEffect, useRef, useState } from 'react';

export function AnimatedNumber({ value, format, duration = 600, from }) {
  const initial = from !== undefined ? from : value;
  const [displayValue, setDisplayValue] = useState(initial);
  const prevValueRef = useRef(initial);
  const animationRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    const startValue = prevValueRef.current;
    const endValue = value;

    if (startValue === endValue) return;

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    startTimeRef.current = null;

    const animate = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (endValue - startValue) * eased;

      setDisplayValue(current);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
        prevValueRef.current = endValue;
      }
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [value, duration]);

  return <span>{format ? format(displayValue) : displayValue.toFixed(2)}</span>;
}

export default AnimatedNumber;
