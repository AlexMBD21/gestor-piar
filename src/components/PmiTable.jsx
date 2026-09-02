import CollaborativeSection from './CollaborativeSection';

const DEFAULT_ACTORS = [
  { actor: 'FAMILIA, CUIDADORES O CON QUIENES VIVE', acciones: '', estrategias: '' },
  { actor: 'DOCENTES', acciones: '', estrategias: '' },
  { actor: 'DIRECTIVOS', acciones: '', estrategias: '' },
  { actor: 'ADMINISTRATIVOS', acciones: '', estrategias: '' },
  { actor: 'PARES (Sus compañeros)', acciones: '', estrategias: '' }
];

export default function PmiTable({ list, studentData, onUpdate }) {
  const rawList = list || studentData?.anexo2?.pmiRecomendaciones || [];

  // Garantizar siempre los 5 actores oficiales requeridos por el MEN Decreto 1421
  const recommendations = DEFAULT_ACTORS.map(defaultItem => {
    const existing = rawList.find(
      r => r.actor && r.actor.trim().toUpperCase() === defaultItem.actor.toUpperCase()
    );
    return existing ? { ...defaultItem, ...existing } : defaultItem;
  });

  const handleChange = (actor, field, value) => {
    const updated = recommendations.map(item =>
      item.actor === actor ? { ...item, [field]: value } : item
    );
    if (typeof onUpdate === 'function') {
      if (onUpdate.length >= 3) {
        onUpdate('anexo2', 'pmiRecomendaciones', updated);
      } else {
        onUpdate(updated);
      }
    }
  };

  return (
    <CollaborativeSection sectionKey="anexo2-pmi" className="print-page">
      <div className="card-title-container">
        <h3 className="card-title">
          7. Recomendaciones para el Plan de Mejoramiento Institucional (PMI)
        </h3>
      </div>
      <p className="card-description no-print" style={{ marginBottom: 16 }}>
        Recomendaciones dirigidas a los distintos actores de la comunidad educativa para la eliminación de barreras y la creación de procesos para la participación, el aprendizaje y el progreso.
      </p>

      <div className="table-wrapper">
        <table className="custom-table" id="tabla-pmi-recomendaciones">
          <thead>
            <tr>
              <th style={{ width: '25%' }}>ACTORES</th>
              <th style={{ width: '35%' }}>ACCIONES</th>
              <th style={{ width: '40%' }}>ESTRATEGIAS A IMPLEMENTAR</th>
            </tr>
          </thead>
          <tbody id="tbody-pmi-recomendaciones">
            {recommendations.map(item => (
              <tr key={item.actor}>
                <td data-label="Actor" style={{ fontWeight: 700, fontSize: '0.82rem', verticalAlign: 'top', paddingTop: '14px', color: 'var(--text-main)' }}>
                  {item.actor}
                </td>
                <td data-label="Acciones">
                  <textarea
                    className="table-textarea"
                    rows="3"
                    style={{ minHeight: '68px', resize: 'vertical' }}
                    value={item.acciones || ''}
                    onChange={e => handleChange(item.actor, 'acciones', e.target.value)}
                    placeholder="Acciones requeridas..."
                  />
                </td>
                <td data-label="Estrategias a implementar">
                  <textarea
                    className="table-textarea"
                    rows="3"
                    style={{ minHeight: '68px', resize: 'vertical' }}
                    value={item.estrategias || ''}
                    onChange={e => handleChange(item.actor, 'estrategias', e.target.value)}
                    placeholder="Estrategias a implementar..."
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CollaborativeSection>
  );
}
