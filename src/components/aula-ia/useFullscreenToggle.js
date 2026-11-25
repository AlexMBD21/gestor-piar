import { useState, useEffect, useCallback } from 'react';

/**
 * Hook reutilizable para alternar pantalla completa (Fullscreen API con fallback CSS).
 */
export function useFullscreenToggle(targetRef, { fallbackToDocument = false } = {}) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const el = targetRef?.current || (fallbackToDocument ? document.documentElement : null);
    if (!el) return;
    try {
      if (!document.fullscreenElement && el.requestFullscreen) {
        await el.requestFullscreen();
        return;
      }
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
        return;
      }
    } catch {
      // Fallback CSS fullscreen si el navegador lo restringe
    }
    setIsFullscreen((prev) => !prev);
  }, [targetRef, fallbackToDocument]);

  return { isFullscreen, toggleFullscreen };
}
