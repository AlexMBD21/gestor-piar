import CollaborativeSection from './CollaborativeSection';

export default function PmiTable({ studentData, onUpdate }) {
  const recommendations = studentData?.anexo2?.pmiRecomendaciones || [];

  const handleChange = (actor, field, value) => {
    const updated = recommendations.map(item =>
      item.actor === actor ? { ...item, [field]: value } : item
    );
    onUpdate('anexo2', 'pmiRecomendaciones', updated);
  };

  return (
    <CollaborativeSection sectionKey="anexo2-pmi" className="print-page">
      <div className="card-title-container">
        <h3 className="card-title">
          7. Recomendaciones para el Plan de Mejoramiento Institucional
        </h3>
      </div>
      <p className="card-description no-print" style={{ marginBottom: 16 }}>
        Recomendaciones dirigidas a los distintos actores de la comunidad educativa para la eliminación de barreras.
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
                <td data-label="Actor" style={{ fontWeight: 600, fontSize: '0.85rem', verticalAlign: 'middle' }}>
                  {item.actor}
                </td>
                <td data-label="Acciones">
                  <textarea
                    className="table-textarea"
                    value={item.acciones || ''}
                    onChange={e => handleChange(item.actor, 'acciones', e.target.value)}
                    placeholder="Acciones requeridas..."
                  />
                </td>
                <td data-label="Estrategias a implementar">
                  <textarea
                    className="table-textarea"
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
