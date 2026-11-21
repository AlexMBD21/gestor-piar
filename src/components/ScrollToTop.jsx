import { useState, useEffect } from 'react';

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let timeoutId;

    const getCurrentScrollTop = () => {
      const viewport = document.querySelector('.main-scroll-viewport, .aia-student-scroll-viewport');
      const vpScroll = viewport ? viewport.scrollTop : 0;
      const winScroll = window.pageYOffset || document.documentElement.scrollTop || 0;
      return Math.max(vpScroll, winScroll);
    };

    const toggleVisibility = () => {
      const scrollPos = getCurrentScrollTop();
      if (scrollPos > 300) {
        setIsVisible(true);
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          setIsVisible(false);
        }, 1000);
      } else {
        setIsVisible(false);
        clearTimeout(timeoutId);
      }
    };

    window.addEventListener('scroll', toggleVisibility, { passive: true, capture: true });

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('scroll', toggleVisibility, { capture: true });
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
    const viewport = document.querySelector('.main-scroll-viewport, .aia-student-scroll-viewport');
    if (viewport) {
      viewport.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      mainContent.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={scrollToTop}
      className="btn-md3-filled no-print scroll-to-top"
      style={{
        position: 'fixed',
        width: '48px',
        height: '48px',
        borderRadius: '16px',
        padding: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
        pointerEvents: isVisible ? 'auto' : 'none',
        transition: 'all 0.3s cubic-bezier(0.2, 0, 1)',
        backgroundColor: '#1a1a1a',
        color: '#ffffff',
        border: '2px solid #ffffff'
      }}
      title="Subir al inicio"
    >
      <span className="material-symbols-outlined">arrow_upward</span>
    </button>
  );
}
