import { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

export default function SignaturePad({ label, savedSignature, onSave, onClear }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isDrawingRef = useRef(false);
  const hasDrawnRef = useRef(false);

  // Sincronizar refs con el estado para los listeners de eventos
  useEffect(() => {
    isDrawingRef.current = isDrawing;
  }, [isDrawing]);

  useEffect(() => {
    hasDrawnRef.current = hasDrawn;
  }, [hasDrawn]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const initializeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    // Si el elemento no es visible aún (ancho 0), no inicializar
    if (rect.width === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const isRotated = isMobile && (window.innerHeight > window.innerWidth);
    
    // Si está rotado, el ancho lógico es el alto físico en pantalla y viceversa
    const logicalWidth = isRotated ? rect.height : rect.width;
    const logicalHeight = isRotated ? rect.width : rect.height;

    const targetWidth = Math.round(logicalWidth * dpr);
    const targetHeight = Math.round(logicalHeight * dpr);

    // Solo re-dimensionar si las dimensiones del canvas son verdaderamente incorrectas (redondeado a entero)
    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      ctx.scale(dpr, dpr);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Rellenar fondo blanco
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, logicalWidth, logicalHeight);
      setHasDrawn(false);
    }
  }, [isMobile]);

  useEffect(() => {
    if (savedSignature) return;
    
    if (!isMobile) {
      // En PC inicializar en el montaje
      initializeCanvas();
      window.addEventListener('resize', initializeCanvas);
      return () => window.removeEventListener('resize', initializeCanvas);
    }
  }, [savedSignature, isMobile, initializeCanvas]);

  // Inicializar canvas cuando el modal móvil se abre
  useEffect(() => {
    if (isModalOpen && !savedSignature) {
      const timer = setTimeout(() => {
        initializeCanvas();
      }, 50); // Pequeño delay para que el modal se renderice en el DOM
      return () => clearTimeout(timer);
    }
  }, [isModalOpen, savedSignature, initializeCanvas]);

  const getCoordinates = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    // Obtener coordenadas del cliente
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const isRotated = isMobile && (window.innerHeight > window.innerWidth);

    if (isRotated) {
      // Coordenadas relativas al centro del canvas
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = clientX - centerX;
      const dy = clientY - centerY;
      
      // Rotar coordenadas -90 grados (antihorario) para mapear el viewport al canvas rotado 90 grados (horario)
      return {
        x: dy + rect.height / 2,
        y: -dx + rect.width / 2
      };
    } else {
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    }
  }, [isMobile]);

  const startDrawing = useCallback((e) => {
    if (e.cancelable) {
      e.preventDefault();
    }
    
    // Garantizar que el canvas esté correctamente dimensionado al iniciar el trazo
    initializeCanvas();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e);
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  }, [initializeCanvas, getCoordinates]);

  const draw = useCallback((e) => {
    if (!isDrawingRef.current) return;
    if (e.cancelable) {
      e.preventDefault();
    }
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e);
    
    ctx.lineTo(x, y);
    ctx.stroke();
  }, [getCoordinates]);

  const stopDrawing = useCallback(() => {
    if (!isDrawingRef.current) return;
    setIsDrawing(false);
  }, []);

  // Vincular eventos táctiles no pasivos manualmente
  useEffect(() => {
    if (savedSignature) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouchStart = (e) => {
      startDrawing(e);
    };

    const handleTouchMove = (e) => {
      draw(e);
    };

    const handleTouchEnd = () => {
      stopDrawing();
    };

    // Attach listeners with passive: false to allow e.preventDefault()
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [savedSignature, isMobile, isModalOpen, startDrawing, draw, stopDrawing]);

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (canvas && hasDrawn) {
      onSave(canvas.toDataURL('image/png'));
    }
  };

  const clearCanvas = () => {
    onClear();
    setHasDrawn(false);
    
    // Si estamos en móvil, abrir el modal de firma inmediatamente al reintentar
    if (isMobile) {
      setIsModalOpen(true);
    }
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const isRotated = isMobile && (window.innerHeight > window.innerWidth);
    const logicalWidth = isRotated ? rect.height : rect.width;
    const logicalHeight = isRotated ? rect.width : rect.height;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, logicalWidth, logicalHeight);
  };

  return (
    <div className="signature-pad-container" style={{ width: '100%', boxSizing: 'border-box' }}>
      <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '8px', color: 'var(--text-main)' }}>
        {label}
      </label>

      {savedSignature ? (
        // Firma guardada (Vista Previa de la Firma)
        <div style={{
          border: '1px dashed var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '8px',
          backgroundColor: 'var(--bg-input)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          position: 'relative'
        }}>
          <img 
            src={savedSignature} 
            alt={`Firma ${label}`} 
            style={{ 
              maxHeight: '120px', 
              maxWidth: '100%', 
              objectFit: 'contain'
            }} 
          />
          <button
            type="button"
            className="btn-md3-outlined btn-sm"
            onClick={clearCanvas}
            title="Borrar y volver a trazar la firma"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>history</span>
            <span>Volver a Firmar</span>
          </button>
        </div>
      ) : isMobile ? (
        // En Móvil: Botón para abrir modal de firma
        <>
          <button
            type="button"
            className="btn-md3-filled"
            onClick={() => setIsModalOpen(true)}
            style={{
              width: '100%',
              justifyContent: 'center',
              height: '40px'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>gesture</span>
            <span>Trazar Firma</span>
          </button>

          {/* Modal Overlay para Dibujar la Firma */}
          {isModalOpen && createPortal(
            <div className="signature-modal-overlay">
              <div className="signature-modal-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {label}
                  </h4>
                  <button 
                    type="button" 
                    className="modal-close"
                    onClick={() => { setIsModalOpen(false); setHasDrawn(false); }}
                    aria-label="Cerrar modal"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
                  </button>
                </div>
                
                <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                  Firma de forma horizontal. Gira tu dispositivo si deseas más espacio físico.
                </p>

                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: '#ffffff',
                    cursor: 'crosshair',
                    touchAction: 'none',
                    display: 'block',
                    width: '100%',
                    flex: 1,
                    minHeight: '140px'
                  }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                  <button
                    type="button"
                    className="btn-md3-outlined"
                    onClick={clearCanvas}
                    disabled={!hasDrawn}
                    style={{ flex: 1, justifyContent: 'center', padding: '10px', height: 'auto' }}
                  >
                    Limpiar
                  </button>
                  <button
                    type="button"
                    className="btn-md3-success"
                    onClick={() => {
                      saveSignature();
                      setIsModalOpen(false);
                    }}
                    disabled={!hasDrawn}
                    style={{ flex: 1, justifyContent: 'center', gap: '6px', padding: '10px', height: 'auto' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check</span>
                    Guardar
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}
        </>
      ) : (
        // En PC: Panel de dibujo inline
        <div style={{ position: 'relative' }}>
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            style={{
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#ffffff',
              cursor: 'crosshair',
              touchAction: 'none',
              display: 'block',
              width: '100%',
              height: '150px'
            }}
          />
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginTop: '10px'
          }}>
            <button
              type="button"
              className="btn-md3-outlined btn-sm"
              onClick={clearCanvas}
              disabled={!hasDrawn}
              title="Limpiar trazo"
            >
              <span>Limpiar</span>
            </button>
            <button
              type="button"
              className="btn-md3-success btn-sm"
              onClick={saveSignature}
              disabled={!hasDrawn}
              title="Guardar firma"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check</span>
              <span>Guardar Firma</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
