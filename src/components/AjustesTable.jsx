import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import CollaborativeSection from './CollaborativeSection';
import CustomSelect from './CustomSelect';

const TRIMESTRE_OPTIONS = [
  { value: 'Primer Cuatrimestre', label: '1er Trimestre' },
  { value: 'Segundo Cuatrimestre', label: '2do Trimestre' },
  { value: 'Tercer Cuatrimestre', label: '3er Trimestre' },
  { value: 'Transversal', label: 'Transversal' }
];

const STORAGE_KEY_AREAS = 'piar_areas_catalog_v1';

const DEFAULT_AREAS_CATALOG = [
  {
    area: 'Matemáticas',
    asignaturas: ['Aritmética', 'Álgebra', 'Geometría', 'Estadística', 'Trigonometría', 'Cálculo']
  },
  {
    area: 'Ciencias Naturales',
    asignaturas: ['Biología', 'Química', 'Física', 'Educación Ambiental']
  },
  {
    area: 'Ciencias Sociales',
    asignaturas: ['Historia', 'Geografía', 'Constitución y Democracia', 'Cátedra de la Paz', 'Filosofía']
  },
  {
    area: 'Español y Literatura',
    asignaturas: ['Lengua Castellana', 'Literatura', 'Comprensión Lectora', 'Lectoescritura']
  },
  {
    area: 'Inglés (Idioma Extranjero)',
    asignaturas: []
  },
  {
    area: 'Educación Artística',
    asignaturas: ['Artes Plásticas', 'Música', 'Danza', 'Teatro']
  },
  {
    area: 'Educación Física',
    asignaturas: ['Educación Física', 'Recreación y Deporte']
  },
  {
    area: 'Tecnología e Informática',
    asignaturas: ['Informática', 'Tecnología']
  },
  {
    area: 'Educación Ética y Valores',
    asignaturas: []
  },
  {
    area: 'Educación Religiosa',
    asignaturas: []
  }
];

function loadSavedAreasCatalog() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AREAS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Fallback to default catalog
  }
  return DEFAULT_AREAS_CATALOG;
}

function normalizeTrimestre(val) {
  if (!val) return '';
  const s = String(val).trim().toLowerCase();
  if (s.includes('primer') || s.includes('1er') || s.includes('1°')) return 'Primer Cuatrimestre';
  if (s.includes('segundo') || s.includes('2do') || s.includes('2°')) return 'Segundo Cuatrimestre';
  if (s.includes('tercer') || s.includes('3er') || s.includes('3°')) return 'Tercer Cuatrimestre';
  if (s.includes('transversal')) return 'Transversal';
  return val;
}

export default function AjustesTable({ list, studentData, onUpdate, docentesElaboran = '' }) {
  const rawAjustes = useMemo(
    () => list || studentData?.anexo2?.ajustesRazonables || [],
    [list, studentData?.anexo2?.ajustesRazonables]
  );

  const effectiveDocentesElaboran = docentesElaboran || studentData?.anexo2?.general?.docentesElaboran || '';

  const suggestedDocentes = useMemo(() => {
    if (!effectiveDocentesElaboran || typeof effectiveDocentesElaboran !== 'string') return [];
    const set = new Set();
    effectiveDocentesElaboran.split(',').forEach(entry => {
      const trimmed = entry.trim();
      if (!trimmed) return;
      set.add(trimmed);
      const cleanName = trimmed.replace(/\s*\([^)]*\)/g, '').trim();
      if (cleanName && cleanName !== trimmed) {
        set.add(cleanName);
      }
    });
    return Array.from(set);
  }, [effectiveDocentesElaboran]);

  // Migración y normalización al vuelo para compatibilidad con la estructura anterior y datos de BD
  const ajustes = rawAjustes.map(item => {
    const rawTrimestres = item.trimestres || [
      {
        id: item.id + '-t1',
        trimestre: item.trimestre || '',
        objetivos: item.objetivos || '',
        barreras: item.barreras || item.bareras || '',
        ajustes: item.ajustes || '',
        evaluacion: item.evaluacion || ''
      }
    ];

    return {
      ...item,
      trimestres: rawTrimestres.map(t => ({
        ...t,
        trimestre: normalizeTrimestre(t.trimestre)
      }))
    };
  });

  const [areasCatalog, setAreasCatalog] = useState(loadSavedAreasCatalog);
  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);
  const [isClosingAreaModal, setIsClosingAreaModal] = useState(false);
  const [newAreaName, setNewAreaName] = useState('');
  const [newAsignaturaInput, setNewAsignaturaInput] = useState('');
  const [tempAsignaturas, setTempAsignaturas] = useState([]);
  const [editingAreaOriginalName, setEditingAreaOriginalName] = useState(null);
  const [targetRowIdForNewArea, setTargetRowIdForNewArea] = useState(null);

  const [deleteModalAjuste, setDeleteModalAjuste] = useState(null);
  const [isClosingDeleteModal, setIsClosingDeleteModal] = useState(false);
  const [deleteModalTrimestre, setDeleteModalTrimestre] = useState(null); // { areaId, trimestreId, label }
  const [isClosingDeleteTrimestreModal, setIsClosingDeleteTrimestreModal] = useState(false);
  const [activeTabs, setActiveTabs] = useState({}); // { [areaId]: tabIndex }
  const [customDocenteIds, setCustomDocenteIds] = useState({}); // { [areaId]: true/false }

  // Combinar el catálogo guardado con cualquier área/asignatura que ya venga en el PIAR actual
  const effectiveAreasCatalog = useMemo(() => {
    const next = areasCatalog.map(c => ({ ...c, asignaturas: [...(c.asignaturas || [])] }));

    rawAjustes.forEach(item => {
      const areaName = (item.area || '').trim();
      if (!areaName || areaName.toLowerCase().includes('otras')) return;

      const existingIdx = next.findIndex(c => c.area.toLowerCase() === areaName.toLowerCase());
      const asigName = (item.asignatura || '').trim();

      if (existingIdx === -1) {
        next.push({
          area: areaName,
          asignaturas: asigName ? [asigName] : []
        });
      } else if (asigName) {
        const hasAsig = next[existingIdx].asignaturas.some(a => a.toLowerCase() === asigName.toLowerCase());
        if (!hasAsig) {
          next[existingIdx].asignaturas.push(asigName);
        }
      }
    });

    return next;
  }, [areasCatalog, rawAjustes]);

  const saveCatalog = (updatedCatalog) => {
    setAreasCatalog(updatedCatalog);
    try {
      localStorage.setItem(STORAGE_KEY_AREAS, JSON.stringify(updatedCatalog));
    } catch {
      // ignore storage errors
    }
  };

  const handleOpenAreaModal = (areaToEdit = null, targetRowId = null) => {
    setTargetRowIdForNewArea(targetRowId);
    if (areaToEdit) {
      setEditingAreaOriginalName(areaToEdit.area);
      setNewAreaName(areaToEdit.area);
      setTempAsignaturas([...(areaToEdit.asignaturas || [])]);
    } else {
      setEditingAreaOriginalName(null);
      setNewAreaName('');
      setTempAsignaturas([]);
    }
    setNewAsignaturaInput('');
    setIsAreaModalOpen(true);
  };

  const handleCloseAreaModal = () => {
    setIsClosingAreaModal(true);
    setTimeout(() => {
      setIsAreaModalOpen(false);
      setIsClosingAreaModal(false);
      setEditingAreaOriginalName(null);
      setNewAreaName('');
      setTempAsignaturas([]);
      setNewAsignaturaInput('');
      setTargetRowIdForNewArea(null);
    }, 250);
  };

  const handleAddTempAsignatura = () => {
    const trimmed = newAsignaturaInput.trim();
    if (!trimmed) return;
    if (!tempAsignaturas.some(a => a.toLowerCase() === trimmed.toLowerCase())) {
      setTempAsignaturas(prev => [...prev, trimmed]);
    }
    setNewAsignaturaInput('');
  };

  const handleRemoveTempAsignatura = (asigToRemove) => {
    setTempAsignaturas(prev => prev.filter(a => a !== asigToRemove));
  };

  const handleSaveAreaModal = () => {
    const trimmedArea = newAreaName.trim();
    if (!trimmedArea) return;

    // Si quedó texto escrito en el input de asignatura, agregarlo automáticamente al guardar
    const pendingAsig = newAsignaturaInput.trim();
    const finalAsignaturas = [...tempAsignaturas];
    if (pendingAsig && !finalAsignaturas.some(a => a.toLowerCase() === pendingAsig.toLowerCase())) {
      finalAsignaturas.push(pendingAsig);
    }

    let updatedCatalog;
    if (editingAreaOriginalName) {
      updatedCatalog = effectiveAreasCatalog.map(item =>
        item.area.toLowerCase() === editingAreaOriginalName.toLowerCase()
          ? { area: trimmedArea, asignaturas: finalAsignaturas }
          : item
      );
    } else {
      const existingIndex = effectiveAreasCatalog.findIndex(item => item.area.toLowerCase() === trimmedArea.toLowerCase());
      if (existingIndex !== -1) {
        const mergedAsigs = Array.from(new Set([...effectiveAreasCatalog[existingIndex].asignaturas, ...finalAsignaturas]));
        updatedCatalog = effectiveAreasCatalog.map((item, idx) =>
          idx === existingIndex ? { area: trimmedArea, asignaturas: mergedAsigs } : item
        );
      } else {
        updatedCatalog = [...effectiveAreasCatalog, { area: trimmedArea, asignaturas: finalAsignaturas }];
      }
    }

    saveCatalog(updatedCatalog);

    // Si se abrió desde una fila en particular o se renombró un área existente, actualizar las filas correspondientes
    if (targetRowIdForNewArea) {
      const updatedAjustes = ajustes.map(item =>
        item.id === targetRowIdForNewArea
          ? { ...item, area: trimmedArea, asignatura: finalAsignaturas[0] || '' }
          : item
      );
      handleUpdate(updatedAjustes);
      handleCloseAreaModal();
    } else if (editingAreaOriginalName && editingAreaOriginalName !== trimmedArea) {
      const updatedAjustes = ajustes.map(item =>
        (item.area || '').toLowerCase() === editingAreaOriginalName.toLowerCase()
          ? { ...item, area: trimmedArea }
          : item
      );
      handleUpdate(updatedAjustes);
    } else if (!editingAreaOriginalName && !targetRowIdForNewArea) {
      // Si se crea una nueva área desde el botón principal, agregarla directamente al inicio (arriba) de la tabla
      const newAjuste = {
        id: 'ar-' + Date.now(),
        area: trimmedArea,
        asignatura: finalAsignaturas[0] || '',
        docente: suggestedDocentes.length === 1 ? suggestedDocentes[0] : '',
        trimestres: [
          {
            id: 't-' + Date.now(),
            trimestre: 'Primer Cuatrimestre',
            objetivos: '',
            barreras: '',
            ajustes: '',
            evaluacion: ''
          }
        ]
      };
      handleUpdate([newAjuste, ...ajustes]);
      handleCloseAreaModal();
    }

    setEditingAreaOriginalName(null);
    setNewAreaName('');
    setTempAsignaturas([]);
    setNewAsignaturaInput('');
  };

  const handleDeleteAreaFromCatalog = (areaName) => {
    const updatedCatalog = effectiveAreasCatalog.filter(item => item.area.toLowerCase() !== areaName.toLowerCase());
    saveCatalog(updatedCatalog);
    if (editingAreaOriginalName && editingAreaOriginalName.toLowerCase() === areaName.toLowerCase()) {
      setEditingAreaOriginalName(null);
      setNewAreaName('');
      setTempAsignaturas([]);
    }
  };

  const handleUpdate = (updated) => {
    if (typeof onUpdate === 'function') {
      if (onUpdate.length >= 3) {
        onUpdate('anexo2', 'ajustesRazonables', updated);
      } else {
        onUpdate(updated);
      }
    }
  };

  const handleAddField = () => {
    const newAjuste = {
      id: 'ar-' + Date.now(),
      area: '',
      asignatura: '',
      docente: suggestedDocentes.length === 1 ? suggestedDocentes[0] : '',
      trimestres: [
        {
          id: 't-' + Date.now(),
          trimestre: 'Primer Cuatrimestre',
          objetivos: '',
          barreras: '',
          ajustes: '',
          evaluacion: ''
        }
      ]
    };

    // Insertar arriba (al inicio) para que el docente lo visualice y diligencie de inmediato
    const updated = [newAjuste, ...ajustes];
    handleUpdate(updated);
  };

  const handleAddTrimestre = (areaId) => {
    const updated = ajustes.map(item => {
      if (item.id === areaId) {
        const usedValues = item.trimestres.map(t => t.trimestre);
        const nextOption = TRIMESTRE_OPTIONS.find(opt => !usedValues.includes(opt.value));
        const autoPeriod = nextOption ? nextOption.value : '';

        const newTrimestre = {
          id: 't-' + Date.now(),
          trimestre: autoPeriod,
          objetivos: '',
          barreras: '',
          ajustes: '',
          evaluacion: ''
        };
        const newTrimestres = [...item.trimestres, newTrimestre];
        setActiveTabs(prev => ({ ...prev, [areaId]: newTrimestres.length - 1 }));
        return { ...item, trimestres: newTrimestres };
      }
      return item;
    });
    handleUpdate(updated);
  };

  const handleRequestRemoveTrimestre = (areaId, trimestre, trimestreId) => {
    const label = trimestre
      ? trimestre
          .replace('Primer Cuatrimestre', '1er Trimestre')
          .replace('Segundo Cuatrimestre', '2do Trimestre')
          .replace('Tercer Cuatrimestre', '3er Trimestre')
          .replace('Primer ', '1er ')
          .replace('Segundo ', '2do ')
          .replace('Tercer ', '3er ')
      : 'este trimestre';
    setDeleteModalTrimestre({ areaId, trimestreId, label });
  };

  const handleCloseDeleteTrimestreModal = () => {
    setIsClosingDeleteTrimestreModal(true);
    setTimeout(() => {
      setDeleteModalTrimestre(null);
      setIsClosingDeleteTrimestreModal(false);
    }, 300);
  };

  const handleConfirmDeleteTrimestre = () => {
    if (deleteModalTrimestre) {
      handleRemoveTrimestre(deleteModalTrimestre.areaId, deleteModalTrimestre.trimestreId);
      handleCloseDeleteTrimestreModal();
    }
  };

  const handleRemoveTrimestre = (areaId, trimestreId) => {
    const updated = ajustes.map(item => {
      if (item.id === areaId) {
        const newTrimestres = item.trimestres.filter(t => t.id !== trimestreId);
        const currentTab = activeTabs[areaId] || 0;
        if (currentTab >= newTrimestres.length) {
          setActiveTabs(prev => ({ ...prev, [areaId]: Math.max(0, newTrimestres.length - 1) }));
        }
        return { ...item, trimestres: newTrimestres };
      }
      return item;
    });
    handleUpdate(updated);
  };

  const handleChangeArea = (id, field, value) => {
    const updated = ajustes.map(item => {
      if (item.id !== id) return item;
      if (field === 'area') {
        // Al cambiar de Área en el desplegable, reiniciamos la asignatura para que elija una de la nueva área
        return { ...item, area: value, asignatura: '' };
      }
      return { ...item, [field]: value };
    });
    handleUpdate(updated);
  };

  const handleChangeTrimestre = (areaId, trimestreId, field, value) => {
    const updated = ajustes.map(item => {
      if (item.id === areaId) {
        const newTrimestres = item.trimestres.map(t => t.id === trimestreId ? { ...t, [field]: value } : t);
        return { ...item, trimestres: newTrimestres };
      }
      return item;
    });
    handleUpdate(updated);
  };

  const handleDeleteRequest = (id) => {
    setDeleteModalAjuste(id);
  };

  const handleCloseDeleteModal = () => {
    setIsClosingDeleteModal(true);
    setTimeout(() => {
      setDeleteModalAjuste(null);
      setIsClosingDeleteModal(false);
    }, 300);
  };

  const handleConfirmDelete = () => {
    if (deleteModalAjuste) {
      const updated = ajustes.filter(item => item.id !== deleteModalAjuste);
      handleUpdate(updated);
      handleCloseDeleteModal();
    }
  };

  return (
    <CollaborativeSection sectionKey="anexo2-ajustes" className="print-page">
      <div className="card-title-container" style={{ flexWrap: 'wrap', gap: '10px' }}>
        <h3 className="card-title">6. Ajustes Razonables</h3>
        <div className="no-print" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-md3-outlined btn-sm"
            onClick={() => handleOpenAreaModal(null, null)}
            title="Crear nueva área o asociar asignaturas a un área"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>category</span>
            <span>Crear / Área y Asignaturas</span>
          </button>
          <button type="button" id="btn-add-ajuste" className="btn-md3-filled btn-sm" onClick={handleAddField}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
            <span>Agregar Área al PIAR</span>
          </button>
        </div>
      </div>

      <div className="ajustes-areas-container" id="tabla-ajustes-razonables">
        {ajustes.length === 0 ? (
          <div className="ajuste-area-card" style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '28px', color: 'var(--primary)', opacity: 0.8 }}>playlist_add</span>
              <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.92rem' }}>Sin ajustes razonables registrados</span>
              <span style={{ fontSize: '0.82rem' }}>Haz clic en <strong>&ldquo;Agregar Área al PIAR&rdquo;</strong> para registrar la primera área o asignatura.</span>
            </div>
          </div>
        ) : (
          [
            ...ajustes.filter(item => !(item.area && item.area.toLowerCase().includes('otras'))),
            ...ajustes.filter(item => item.area && item.area.toLowerCase().includes('otras'))
          ].map(item => {
            const activeTab = activeTabs[item.id] || 0;
            const canAddMoreTrimestre = item.trimestres.length < TRIMESTRE_OPTIONS.length;
            const isOtrasRow = Boolean(item.area && item.area.toLowerCase().includes('otras'));

            // Buscar el área seleccionada en el catálogo para saber si tiene asignaturas asociadas
            const matchedAreaObj = effectiveAreasCatalog.find(
              c => c.area.toLowerCase() === (item.area || '').trim().toLowerCase()
            );
            const associatedAsignaturas = matchedAreaObj?.asignaturas || [];
            const hasAssociatedAsignaturas = associatedAsignaturas.length > 0;

            const areaSelectOptions = [
              ...effectiveAreasCatalog.map(c => ({
                value: c.area,
                label: c.area
              })),
              { value: '__create_new_area__', label: '➕ Crear nueva área / asociar asignaturas...' }
            ];

            const asignaturaSelectOptions = [
              { value: '', label: 'Solo el área (General)' },
              ...associatedAsignaturas.map(asig => ({ value: asig, label: asig })),
              { value: '__manage_asignaturas__', label: '⚙️ Asociar otra asignatura a esta área...' }
            ];

            const currentTrimestre = item.trimestres[activeTab] || item.trimestres[0] || {
              id: 't-' + Date.now(),
              trimestre: 'Primer Cuatrimestre',
              objetivos: '',
              barreras: '',
              ajustes: '',
              evaluacion: ''
            };

            return (
              <div key={item.id} className="ajuste-area-card">
                {/* Barra horizontal superior de datos del Área, Docente y Trimestres */}
                <div className="ajuste-area-toolbar no-print">
                  <div className="ajuste-toolbar-left">
                    {/* Área */}
                    <div className="ajuste-toolbar-field ajuste-toolbar-field--area">
                      <label className="ajuste-toolbar-label">
                        <span className="material-symbols-outlined">category</span>
                        Área
                      </label>
                      {isOtrasRow ? (
                        <input
                          type="text"
                          className="table-input ajuste-docente-input-compact"
                          value={item.area || ''}
                          onChange={e => handleChangeArea(item.id, 'area', e.target.value)}
                          style={{ fontWeight: 600 }}
                        />
                      ) : (
                        <CustomSelect
                          value={item.area || ''}
                          onChange={val => {
                            if (val === '__create_new_area__') {
                              handleOpenAreaModal(null, item.id);
                            } else {
                              handleChangeArea(item.id, 'area', val);
                            }
                          }}
                          options={areaSelectOptions}
                          placeholder="Seleccionar Área..."
                        />
                      )}
                    </div>

                    {/* Asignatura (si el área tiene asignaturas) */}
                    {item.area && hasAssociatedAsignaturas && (
                      <div className="ajuste-toolbar-field ajuste-toolbar-field--asig">
                        <label className="ajuste-toolbar-label">
                          <span className="material-symbols-outlined">menu_book</span>
                          Asignatura
                        </label>
                        <CustomSelect
                          value={item.asignatura || ''}
                          onChange={val => {
                            if (val === '__manage_asignaturas__') {
                              handleOpenAreaModal(matchedAreaObj || { area: item.area, asignaturas: [] }, item.id);
                            } else {
                              handleChangeArea(item.id, 'asignatura', val);
                            }
                          }}
                          options={asignaturaSelectOptions}
                          placeholder="Solo el área..."
                        />
                      </div>
                    )}

                    {/* Docente como DESPLEGABLE con los docentes que elaboran */}
                    <div className="ajuste-toolbar-field ajuste-toolbar-field--docente">
                      <label className="ajuste-toolbar-label" htmlFor={`docente-input-${item.id}`}>
                        <span className="material-symbols-outlined">person</span>
                        Docente
                      </label>
                      {customDocenteIds[item.id] ? (
                        <div className="ajuste-docente-custom-wrap">
                          <input
                            type="text"
                            id={`docente-input-${item.id}`}
                            className="ajuste-docente-input-compact"
                            value={item.docente || ''}
                            onChange={e => handleChangeArea(item.id, 'docente', e.target.value)}
                            placeholder="Nombre del docente..."
                            autoFocus
                          />
                          {suggestedDocentes.length > 0 && (
                            <button
                              type="button"
                              className="btn-switch-docente-mode"
                              onClick={() => setCustomDocenteIds(prev => ({ ...prev, [item.id]: false }))}
                              title="Volver al desplegable de docentes"
                            >
                              <span className="material-symbols-outlined">format_list_bulleted</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <CustomSelect
                          value={item.docente || ''}
                          onChange={val => {
                            if (val === '__custom_docente__') {
                              setCustomDocenteIds(prev => ({ ...prev, [item.id]: true }));
                            } else {
                              handleChangeArea(item.id, 'docente', val);
                            }
                          }}
                          options={
                            suggestedDocentes.length > 0
                              ? [
                                  ...suggestedDocentes.map(doc => ({ value: doc, label: doc })),
                                  ...(item.docente && !suggestedDocentes.includes(item.docente)
                                    ? [{ value: item.docente, label: item.docente }]
                                    : []),
                                  { value: '__custom_docente__', label: '✏️ Escribir otro docente...' }
                                ]
                              : [
                                  ...(item.docente ? [{ value: item.docente, label: item.docente }] : []),
                                  { value: '__custom_docente__', label: '✏️ Escribir docente...' }
                                ]
                          }
                          placeholder={suggestedDocentes.length > 0 ? "Seleccionar Docente..." : "Escribir docente..."}
                        />
                      )}
                    </div>
                  </div>

                  {/* Botón Eliminar Área a la derecha de la fila superior */}
                  <button
                    type="button"
                    className="btn-delete-area-card"
                    onClick={() => handleDeleteRequest(item.id)}
                    title="Eliminar esta área del PIAR"
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>

                {/* Fila 2: Trimestres Debajo (Barra horizontal dedicada con libertad de elección) */}
                <div className="ajuste-area-trimestres-bar no-print">
                  <div className="trimestres-tabs-horizontal">
                    <span className="ajuste-trimestres-bar-label">
                      <span className="material-symbols-outlined" style={{ fontSize: '15px', color: 'var(--primary)' }}>calendar_month</span>
                      Periodos:
                    </span>
                    {item.trimestres.map((t, index) => {
                      const rawLabel = t.trimestre || TRIMESTRE_OPTIONS[index]?.value || `Trimestre ${index + 1}`;
                      const pillLabel = rawLabel
                        .replace('Primer Cuatrimestre', '1er Trimestre')
                        .replace('Segundo Cuatrimestre', '2do Trimestre')
                        .replace('Tercer Cuatrimestre', '3er Trimestre')
                        .replace('Primer ', '1er ')
                        .replace('Segundo ', '2do ')
                        .replace('Tercer ', '3er ');

                      return (
                        <button
                          key={t.id}
                          type="button"
                          className={`trimestre-tab-pill ${activeTab === index ? 'active' : ''}`}
                          onClick={() => setActiveTabs(prev => ({ ...prev, [item.id]: index }))}
                        >
                          <span>{pillLabel}</span>
                          {item.trimestres.length > 1 && (
                            <span
                              className="material-symbols-outlined trimestre-tab-remove"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRequestRemoveTrimestre(item.id, t.trimestre, t.id);
                              }}
                              title="Eliminar periodo"
                              style={{ fontSize: '14px', marginLeft: '4px' }}
                            >
                              close
                            </span>
                          )}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      className="btn-add-trimestre-compact"
                      onClick={() => handleAddTrimestre(item.id)}
                      disabled={!canAddMoreTrimestre}
                      title={canAddMoreTrimestre ? "Agregar otro periodo a esta área" : "Todos los periodos han sido agregados"}
                    >
                      <span className="material-symbols-outlined">add</span>
                      <span>Periodo</span>
                    </button>
                  </div>
                </div>

                {/* Grid de 4 columnas para los campos de este periodo */}
                <div className="ajuste-area-fields-grid no-print">
                  <div className="ajuste-column">
                    <div className="ajuste-column-header">Objetivos / Propósitos (Grado - DBA)</div>
                    <textarea
                      className="table-textarea"
                      value={currentTrimestre.objetivos || ''}
                      onChange={e => handleChangeTrimestre(item.id, currentTrimestre.id, 'objetivos', e.target.value)}
                      placeholder="Objetivos o propósitos planteados para este periodo..."
                      rows={4}
                    />
                  </div>
                  <div className="ajuste-column">
                    <div className="ajuste-column-header">Barreras Evidenciadas</div>
                    <textarea
                      className="table-textarea"
                      value={currentTrimestre.barreras || ''}
                      onChange={e => handleChangeTrimestre(item.id, currentTrimestre.id, 'barreras', e.target.value)}
                      placeholder="Barreras que se evidencian en el contexto escolar..."
                      rows={4}
                    />
                  </div>
                  <div className="ajuste-column">
                    <div className="ajuste-column-header">Ajustes Razonables (Apoyos/Estrategias)</div>
                    <textarea
                      className="table-textarea"
                      value={currentTrimestre.ajustes || ''}
                      onChange={e => handleChangeTrimestre(item.id, currentTrimestre.id, 'ajustes', e.target.value)}
                      placeholder="Estrategias, metodologías, apoyos o materiales requeridos..."
                      rows={4}
                    />
                  </div>
                  <div className="ajuste-column">
                    <div className="ajuste-column-header">Evaluación de los Ajustes</div>
                    <textarea
                      className="table-textarea"
                      value={currentTrimestre.evaluacion || ''}
                      onChange={e => handleChangeTrimestre(item.id, currentTrimestre.id, 'evaluacion', e.target.value)}
                      placeholder="Observaciones o seguimiento a los ajustes aplicados..."
                      rows={4}
                    />
                  </div>
                </div>

                {/* Vista de Impresión Oficial: Preservada */}
                <div className="trimestre-print-view print-only">
                  {item.trimestres
                    .filter(t => Boolean(t.trimestre))
                    .map((t, index, array) => (
                      <div key={t.id} className="print-trimestre-block" style={{ display: 'flex', width: '100%', borderBottom: index < array.length - 1 ? '1px dashed #ccc' : 'none' }}>
                        <div style={{ flex: '1 1 30%', padding: '6px', borderRight: '1px solid var(--border-color)' }}>
                          <strong style={{ fontSize: '0.75rem', display: 'block', marginBottom: '4px' }}>{t.trimestre}</strong>
                          <div style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>{t.objetivos}</div>
                        </div>
                        <div style={{ flex: '1 1 30%', padding: '6px', borderRight: '1px solid var(--border-color)' }}>
                          <div style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>{t.barreras}</div>
                        </div>
                        <div style={{ flex: '1 1 25%', padding: '6px', borderRight: '1px solid var(--border-color)' }}>
                          <div style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>{t.ajustes}</div>
                        </div>
                        <div style={{ flex: '1 1 15%', padding: '6px' }}>
                          <div style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>{t.evaluacion}</div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal para Crear Área y Asociar Asignaturas */}
      {isAreaModalOpen && createPortal(
        <div
          id="modal-manage-areas"
          className={`modal-overlay active ${isClosingAreaModal ? 'closing' : ''}`}
          onClick={(e) => e.target.id === 'modal-manage-areas' && handleCloseAreaModal()}
        >
          <div className="modal-container" style={{ maxWidth: '560px', width: '100%', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header" style={{ paddingBottom: '12px' }}>
              <h3 className="modal-title" style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '24px' }}>category</span>
                {editingAreaOriginalName ? `Editar Área: ${editingAreaOriginalName}` : 'Crear Área y Asociar Asignaturas'}
              </h3>
              <button type="button" className="modal-close" onClick={handleCloseAreaModal} aria-label="Cerrar modal">
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
              </button>
            </div>

            <div className="modal-body" style={{ padding: '16px 24px', overflowY: 'auto', flex: 1 }}>
              <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: '10px', marginBottom: '20px', border: '1px solid var(--border-color)' }}>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px' }}>
                    1. Nombre del Área
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej. Matemáticas, Ciencias Naturales, Idiomas..."
                    value={newAreaName}
                    onChange={e => setNewAreaName(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '4px' }}>
                    2. Asignaturas asociadas a esta Área <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(Opcional)</span>
                  </label>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    Si esta área se divide en ramas o asignaturas (ej. Estadística, Geometría), agrégalas aquí para que aparezcan en su desplegable. Si no tiene ramas, déjalo vacío.
                  </p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ej. Estadística, Geometría, Biología..."
                      value={newAsignaturaInput}
                      onChange={e => setNewAsignaturaInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTempAsignatura();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={handleAddTempAsignatura}
                      style={{ whiteSpace: 'nowrap', borderRadius: '8px', padding: '0 14px', height: '38px', gap: '4px' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
                      <span>Asociar</span>
                    </button>
                  </div>

                  {tempAsignaturas.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                      {tempAsignaturas.map(asig => (
                        <span key={asig} className="asignatura-chip">
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>menu_book</span>
                          <span>{asig}</span>
                          <button
                            type="button"
                            className="asignatura-chip-remove"
                            onClick={() => handleRemoveTempAsignatura(asig)}
                            title="Quitar asignatura"
                            aria-label={`Quitar asignatura ${asig}`}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                  {editingAreaOriginalName && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setEditingAreaOriginalName(null);
                        setNewAreaName('');
                        setTempAsignaturas([]);
                        setNewAsignaturaInput('');
                      }}
                      style={{ borderRadius: '8px', padding: '0 14px', height: '36px' }}
                    >
                      Cancelar Edición
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleSaveAreaModal}
                    disabled={!newAreaName.trim()}
                    style={{ borderRadius: '8px', padding: '0 16px', height: '36px' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>save</span>
                    <span>{editingAreaOriginalName ? 'Actualizar Área' : 'Guardar Área'}</span>
                  </button>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 600, marginBottom: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Áreas disponibles en el desplegable</span>
                  <span className="area-catalog-mini-chip">{effectiveAreasCatalog.length} áreas</span>
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {effectiveAreasCatalog.map(cat => {
                    const isEditingThis = Boolean(
                      editingAreaOriginalName && editingAreaOriginalName.toLowerCase() === cat.area.toLowerCase()
                    );
                    return (
                      <div
                        key={cat.area}
                        className={`area-catalog-card ${isEditingThis ? 'is-editing' : ''}`}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span>{cat.area}</span>
                            {isEditingThis && (
                              <span style={{ fontSize: '0.68rem', background: 'var(--primary)', color: '#fff', padding: '1px 7px', borderRadius: '999px', fontWeight: 600 }}>
                                Editando
                              </span>
                            )}
                          </div>
                          {cat.asignaturas.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                              {cat.asignaturas.map(asig => (
                                <span key={asig} className="area-catalog-mini-chip">
                                  {asig}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '3px', fontStyle: 'italic' }}>
                              Sin asignaturas asociadas (Solo área)
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenAreaModal(cat, targetRowIdForNewArea)}
                            style={{ padding: '4px 10px', fontSize: '0.78rem', borderRadius: '6px' }}
                            title="Editar área o sus asignaturas"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>edit</span>
                            <span>Editar</span>
                          </button>
                          <button
                            type="button"
                            className="btn-icon-danger"
                            onClick={() => handleDeleteAreaFromCatalog(cat.area)}
                            title="Eliminar área del listado"
                            aria-label={`Eliminar área ${cat.area}`}
                            style={{ padding: '4px' }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal de Confirmación para Eliminar Ajuste */}
      {deleteModalAjuste && createPortal(
        <div id="modal-delete-ajuste" className={`modal-overlay active ${isClosingDeleteModal ? 'closing' : ''}`} onClick={(e) => e.target.id === 'modal-delete-ajuste' && handleCloseDeleteModal()}>
          <div className="modal-container" style={{ maxWidth: '420px', width: '100%' }}>
            <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: '8px' }}>
              <h3 className="modal-title" style={{ fontSize: '1.2rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--danger)', fontSize: '24px' }}>delete_forever</span>
                ¿Eliminar área?
              </h3>
              <button type="button" className="modal-close" onClick={handleCloseDeleteModal} aria-label="Cerrar modal">
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
              </button>
            </div>
            <div className="modal-body" style={{ padding: '0 24px 20px 24px', fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
              ¿Estás seguro de que deseas eliminar esta área del PIAR y todos sus trimestres? Esta acción no se puede deshacer.
            </div>
            <div className="modal-footer" style={{ borderTop: 'none', paddingTop: '0' }}>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmDelete}
                style={{ width: '100%', padding: '12px 16px', height: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                Eliminar Permanentemente
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal de Confirmación para Eliminar Trimestre */}
      {deleteModalTrimestre && createPortal(
        <div id="modal-delete-trimestre" className={`modal-overlay active ${isClosingDeleteTrimestreModal ? 'closing' : ''}`} onClick={(e) => e.target.id === 'modal-delete-trimestre' && handleCloseDeleteTrimestreModal()}>
          <div className="modal-container" style={{ maxWidth: '420px', width: '100%' }}>
            <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: '8px' }}>
              <h3 className="modal-title" style={{ fontSize: '1.2rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--danger)', fontSize: '24px' }}>delete_forever</span>
                ¿Eliminar trimestre?
              </h3>
              <button type="button" className="modal-close" onClick={handleCloseDeleteTrimestreModal} aria-label="Cerrar modal">
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
              </button>
            </div>
            <div className="modal-body" style={{ padding: '0 24px 20px 24px', fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
              ¿Estás seguro de que deseas eliminar <strong>{deleteModalTrimestre.label}</strong>? Se perderá la información ingresada en este periodo. Esta acción no se puede deshacer.
            </div>
            <div className="modal-footer" style={{ borderTop: 'none', paddingTop: '0', display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCloseDeleteTrimestreModal}
                style={{ flex: 1, padding: '10px 16px' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmDeleteTrimestre}
                style={{ flex: 1, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                Eliminar Trimestre
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </CollaborativeSection>
  );
}
