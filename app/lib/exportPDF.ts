import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { Hive, Inspection, Treatment, Harvest, Disease, Weight } from '../types';

function fmtDate(d: string) {
  const dt = new Date(d + 'T00:00:00');
  return `${String(dt.getDate()).padStart(2,'0')}.${String(dt.getMonth()+1).padStart(2,'0')}.${dt.getFullYear()}`;
}

const STRENGTH: Record<string,string> = { strong: 'Jako', medium: 'Srednje', weak: 'Slabo' };

function rows(cells: string[]) {
  return `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
}

function table(headers: string[], bodyRows: string[]) {
  if (!bodyRows.length) return '<p style="color:#888">Nema unosa.</p>';
  return `
    <table>
      <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
      <tbody>${bodyRows.join('')}</tbody>
    </table>`;
}

export async function exportHivePDF(
  hive: Hive,
  inspections: Inspection[],
  treatments: Treatment[],
  harvests: Harvest[],
  diseases: Disease[],
  weights: Weight[],
  season: number,
) {
  const seasonFrames = harvests
    .filter(h => h.date.startsWith(String(season)))
    .reduce((sum, h) => sum + h.frames_count, 0);

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
  <style>
    body { font-family: Arial, sans-serif; font-size: 13px; color: #222; padding: 24px; }
    h1 { color: #2b6cb0; } h2 { color: #4a5568; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-top: 24px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { background: #ebf8ff; text-align: left; padding: 6px 10px; font-size: 12px; }
    td { padding: 6px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: bold; }
    .strong { background:#c6f6d5; color:#276749; } .medium { background:#fefcbf; color:#744210; } .weak { background:#fed7d7; color:#9b2c2c; }
    .meta { color: #718096; font-size: 12px; }
  </style></head><body>
  <h1>Košnica ${hive.number}</h1>
  <p class="meta">Izvještaj za sezonu ${season} &nbsp;|&nbsp; Generisano: ${fmtDate(new Date().toISOString().split('T')[0])}</p>
  ${hive.note ? `<p><strong>Napomena:</strong> ${hive.note}</p>` : ''}
  <p><strong>Ukupno izvrcano ramova ${season}:</strong> ${seasonFrames}</p>
  ${hive.has_scale ? `<p><strong>Ima vagu:</strong> Da</p>` : ''}

  <h2>Pregledi</h2>
  ${table(
    ['Datum','Stanje','Napomena'],
    inspections.map(i => rows([fmtDate(i.date), `<span class="badge ${i.colony_strength}">${STRENGTH[i.colony_strength]}</span>`, i.note ?? '']))
  )}

  <h2>Tretmani</h2>
  ${table(
    ['Datum','Razlog','Napomena'],
    treatments.map(t => rows([fmtDate(t.date), t.reason, t.note ?? '']))
  )}

  <h2>Vrcanja</h2>
  ${table(
    ['Datum','Ramova','Napomena'],
    harvests.map(h => rows([fmtDate(h.date), String(h.frames_count), h.note ?? '']))
  )}

  <h2>Bolesti</h2>
  ${table(
    ['Bolest','Otkrivena','Izlijecena'],
    diseases.map(d => rows([d.name, fmtDate(d.detected_date), d.resolved_date ? fmtDate(d.resolved_date) : 'Aktivna']))
  )}

  ${hive.has_scale && weights.length ? `
  <h2>Vaga</h2>
  ${table(['Datum','Kilaza (kg)'], weights.map(w => rows([fmtDate(w.date), Number(w.weight_kg).toFixed(1)])))}
  ` : ''}
  </body></html>`;

  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Košnica ${hive.number} - izvještaj` });
}

export async function exportApiarySummaryPDF(
  hives: Hive[],
  allHarvests: { hive_id: string; frames_count: number; date: string }[],
  activeDiseaseCounts: Record<string, number>,
  season: number,
) {
  const totalFrames = allHarvests
    .filter(h => h.date.startsWith(String(season)))
    .reduce((sum, h) => sum + h.frames_count, 0);

  const sickCount = Object.values(activeDiseaseCounts).filter(c => c > 0).length;

  const hiveRows = hives.map(hive => {
    const frames = allHarvests
      .filter(h => h.hive_id === hive.id && h.date.startsWith(String(season)))
      .reduce((sum, h) => sum + h.frames_count, 0);
    const sick = activeDiseaseCounts[hive.id] ?? 0;
    return rows([String(hive.number), String(frames), sick > 0 ? 'DA' : '-']);
  });

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
  <style>
    body { font-family: Arial, sans-serif; font-size: 13px; color: #222; padding: 24px; }
    h1 { color: #2b6cb0; } h2 { color: #4a5568; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-top: 24px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { background: #ebf8ff; text-align: left; padding: 6px 10px; font-size: 12px; }
    td { padding: 6px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
    .summary { display: flex; gap: 24px; margin: 16px 0; }
    .card { background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 20px; }
    .card-num { font-size: 28px; font-weight: bold; color: #2b6cb0; }
    .card-label { font-size: 12px; color: #718096; }
  </style></head><body>
  <h1>Pcelinjak — Sezona ${season}</h1>
  <p style="color:#718096;font-size:12px">Generisano: ${fmtDate(new Date().toISOString().split('T')[0])}</p>

  <div class="summary">
    <div class="card"><div class="card-num">${hives.length}</div><div class="card-label">Košnica</div></div>
    <div class="card"><div class="card-num">${totalFrames}</div><div class="card-label">Ramova ${season}</div></div>
    <div class="card"><div class="card-num" style="color:#e53e3e">${sickCount}</div><div class="card-label">Sa aktivnom bolešcu</div></div>
  </div>

  <h2>Prinos po košnici</h2>
  ${table(['Košnica','Ramova ' + season,'Aktivna bolest'], hiveRows)}
  </body></html>`;

  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Pcelinjak ${season} - izvještaj` });
}
