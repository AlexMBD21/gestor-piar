import { useState, useEffect } from 'react';

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let timeoutId;

    const toggleVisibility = () => {
      const scrollPos = window.pageYOffset || document.documentElement.scrollTop;
      if (scrollPos > 300) {
        setIsVisible(true);
        // Reiniciar temporizador
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          setIsVisible(false);
        }, 3000); // Se oculta tras 3 segundos de inactividad
      } else {
        setIsVisible(false);
        clearTimeout(timeoutId);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    const mainContent = document.querySelector('.main-content');
    let handleMainContentScroll;
    
    if (mainContent) {
      handleMainContentScroll = (e) => {
        if (e.target.scrollTop > 300) {
          setIsVisible(true);
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            setIsVisible(false);
          }, 3000);
        } else {
          setIsVisible(false);
          clearTimeout(timeoutId);
        }
      };
      mainContent.addEventListener('scroll', handleMainContentScroll);
    }

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('scroll', toggleVisibility);
      if (mainContent && handleMainContentScroll) {
        mainContent.removeEventListener('scroll', handleMainContentScroll);
      }
    };
  }, []);

  const scrollToTop = () => {
    // Scroll en window
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
    // Scroll en main-content
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
        transition: 'all 0.3s cubic-bezier(0.2, 0, 0, 1)',
        backgroundColor: '#1a1a1a',
        color: '#ffffff'
      }}
      title="Subir al inicio"
    >
      <span className="material-symbols-outlined">arrow_upward</span>
    </button>
  );
}
