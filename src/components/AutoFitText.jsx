import React, { useRef, useEffect, useState } from 'react';

/**
 * AutoFitText renders text into a container of fixed height.
 * If the text exceeds the container's height, it progressively reduces
 * the font size until it fits, up to a minimum font size.
 */
export default function AutoFitText({ 
  text, 
  maxHeight, 
  defaultFontSize = 11, // pt
  minFontSize = 6,      // pt
  style = {},
  className = ""
}) {
  const containerRef = useRef(null);
  const [fontSize, setFontSize] = useState(defaultFontSize);
  const [isFitting, setIsFitting] = useState(true);

  // Reset if text or height changes
  useEffect(() => {
    setFontSize(defaultFontSize);
    setIsFitting(true);
  }, [text, maxHeight, defaultFontSize]);

  useEffect(() => {
    if (!isFitting || !containerRef.current || !text) return;

    const el = containerRef.current;
    
    // Check if content overflows vertically
    if (el.scrollHeight > el.clientHeight) {
      if (fontSize > minFontSize) {
        // Reduce font size and try again
        setFontSize(prev => prev - 0.5);
      } else {
        // Reached minimum font size, stop fitting
        setIsFitting(false);
      }
    } else {
      // It fits perfectly
      setIsFitting(false);
    }
  }, [fontSize, isFitting, text, minFontSize]);

  return (
    <div 
      ref={containerRef}
      className={className}
      style={{
        ...style,
        maxHeight: `${maxHeight}px`,
        height: `${maxHeight}px`,
        overflow: 'hidden',
        fontSize: `${fontSize}pt`,
        lineHeight: 1.2,
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
        opacity: isFitting ? 0 : 1, // Hide while calculating to prevent flicker
        transition: 'opacity 0.1s ease-in'
      }}
    >
      {text}
    </div>
  );
}
