// Entrenamiento Clínico-IA: tareas de cada mañana (las ejecuta GitHub Actions con el usuario limitado correo_pruebas).
//  1) Correo de la prueba gratis de 15 días.  2) Correos de asignaciones nuevas, asignaciones por vencer, racha en riesgo y resumen mensual.
//  3) Facturas electrónicas con Factura-IA de lo que los clientes pagaron por Bold (solo si existe el secreto FACTURA_IA_LLAVE).
// Secretos: NEON_CORREO, BREVO_API_KEY y (opcional) FACTURA_IA_LLAVE. Variables opcionales: BREVO_REMITENTE, FACTURA_IVA ("19" si los precios
// incluyen IVA del 19 %, "EXCLUIDO" si el servicio está excluido; confírmelo con su contador), PRUEBA=1 (no envía nada, solo muestra).
import pg from 'pg';

const APP = 'https://entrenamiento-clinico-ia.skynetgenesis.com/';
const WA = 'https://wa.me/573044375758?text=' + encodeURIComponent('Hola. Estoy probando Entrenamiento Clínico-IA y quiero ayuda.');
const REMITENTE = process.env.BREVO_REMITENTE || 'contacto@skynetgenesis.com';
const fecha = f => new Date(String(f).slice(0, 10) + 'T12:00:00Z').toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function correo(c) {
  const inst = !!c.institucion, nombre = (c.nombre || '').split(' ')[0] || (inst ? 'coordinador(a)' : 'colega');
  const quien = inst ? `<strong>${esc(c.institucion)}</strong>` : 'usted';
  const asunto = c.dias === 0 ? (inst ? `Terminó la prueba gratis de ${c.institucion}` : 'Terminó su prueba gratis de Entrenamiento Clínico-IA')
    : c.dias === 1 ? 'Hoy es el último día de su prueba gratis'
    : `Le quedan ${c.dias} días de prueba gratis en Entrenamiento Clínico-IA`;
  const intro = c.dias === 0
    ? `La prueba gratis de ${quien} terminó hoy. <strong>Su progreso, puntos y gemas quedan guardados.</strong> ${inst ? 'Para que su equipo siga entrenando, active el plan en el Market con un solo pago en Bold: el acceso se abre apenas Bold confirma el pago.' : 'Para seguir, compre en el Market los módulos que quiera: cada uno da 12 meses de acceso. El caso de la semana sigue siendo gratis.'}`
    : c.dias === 1
      ? `Hoy es el último día de la prueba gratis de ${quien}. ${inst ? 'Si activa hoy el plan, su equipo sigue sin interrupciones y el resto del mes no se cobra.' : 'Aproveche para terminar los casos que tiene abiertos.'}`
      : `${inst ? 'A ' + quien + ' le quedan' : 'Le quedan'} <strong>${c.dias} días</strong> de prueba gratis (hasta el ${fecha(c.prueba_hasta)}).`;
  const consejo = inst
    ? (c.dias >= 8 ? 'Invite a su equipo con el código de su institución (menú Equipo) y cree una asignación de casos con fecha límite.' : 'Revise en «Informe de capacitación» quién ya entrenó y cuántas horas aprobó su equipo.')
    : (c.dias >= 8 ? 'En la prueba tiene los 3 primeros casos de cada módulo. Pruebe el modo examen: las gemas valen 1,5 veces.' : 'Mantenga su racha: entrar cada día suma gemas, y con gemas puede pedir interconsultas en los casos difíciles.');
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#1C2B39;max-width:560px;margin:auto">
    <div style="background:#1E3A4C;color:#fff;padding:16px 20px;border-radius:10px 10px 0 0;font-size:20px;font-weight:bold">Entrenamiento Clínico-IA</div>
    <div style="border:1px solid #DCE5EE;border-top:0;padding:20px;border-radius:0 0 10px 10px">
      <p>Hola, ${esc(nombre)}:</p><p>${intro}</p><p>${consejo}</p>
      <p style="margin:22px 0"><a href="${APP}" style="background:#14A38B;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold">Entrar a entrenar</a>
      &nbsp; <a href="${WA}" style="background:#1F8A4C;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold">Hablar con un asesor</a></p>
      <p style="color:#5D6B78;font-size:13px">SkyNet Genesis · contacto@skynetgenesis.com · WhatsApp 304 437 5758<br>Recibe este correo porque está en la prueba gratis de 15 días. Al terminar la prueba dejamos de escribirle.</p></div></div>`;
  return { asunto, html };
}

// ----- correos del entrenamiento (asignaciones, vencimientos, racha, resumen mensual)
const marco = (titulo, cuerpo, boton) => `<div style="font-family:Arial,Helvetica,sans-serif;color:#1C2B39;max-width:560px;margin:auto">
  <div style="background:#1E3A4C;color:#fff;padding:16px 20px;border-radius:10px 10px 0 0;font-size:20px;font-weight:bold">Entrenamiento Clínico-IA</div>
  <div style="border:1px solid #DCE5EE;border-top:0;padding:20px;border-radius:0 0 10px 10px"><p style="font-size:17px"><b>${titulo}</b></p>${cuerpo}
  <p style="margin:22px 0"><a href="${APP}" style="background:#14A38B;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold">${boton || 'Entrar a entrenar'}</a></p>
  <p style="color:#5D6B78;font-size:13px">SkyNet Genesis · contacto@skynetgenesis.com · WhatsApp 304 437 5758<br>Puede apagar estos correos en «Mi cuenta».</p></div></div>`;
function correoEntrenamiento(c) {
  const d = c.datos || {}, n = esc((c.nombre || '').split(' ')[0] || 'colega');
  if (c.tipo === 'asignacion') return { asunto: `Nueva asignación: ${d.titulo}`, html: marco(`Hola, ${n}: su institución le asignó «${esc(d.titulo)}»`, `<p>Son ${d.casos} casos y tiene plazo hasta el ${fecha(d.limite)}. Los encuentra en su inicio, en «Asignado por su institución».</p>`) };
  if (c.tipo === 'vence') return { asunto: `Le quedan 2 días para «${d.titulo}»`, html: marco(`Hola, ${n}: su asignación vence el ${fecha(d.limite)}`, `<p>Le faltan ${d.faltan} ${d.faltan === 1 ? 'caso' : 'casos'} por aprobar de «${esc(d.titulo)}».</p>`) };
  if (c.tipo === 'racha') return { asunto: `No pierda su racha de ${d.racha} días`, html: marco(`Hola, ${n}: lleva ${d.racha} días seguidos entrenando`, `<p>Entre hoy y atienda un caso para mantener su racha y ganar gemas. Si hoy no puede, un protector de racha la salva.</p>`) };
  if (c.tipo === 'mensual') return { asunto: `Resumen de capacitación de ${d.institucion} · ${d.mes}`, html: marco(`Resumen de ${esc(d.institucion)} en ${d.mes}`,
    `<table style="border-collapse:collapse;width:100%">${[['Personas en el equipo', d.personas], ['Personas que entrenaron', d.activas], ['Casos atendidos', d.casos], ['Casos aprobados', d.aprobados], ['Horas de práctica', String((d.aprobados || 0) * 0.5).replace('.', ',')], ['Promedio', d.promedio ?? '—']].map(([a, b]) => `<tr><td style="padding:6px;border-bottom:1px solid #DCE5EE">${a}</td><td style="padding:6px;border-bottom:1px solid #DCE5EE;text-align:right"><b>${b ?? 0}</b></td></tr>`).join('')}</table>
    <p>Descargue el informe completo con código de verificación en «Informe de capacitación».</p>`, 'Ver el informe') };
  return null;
}

async function enviar(to, nombre, asunto, html) {
  if (process.env.PRUEBA === '1') { console.log('PRUEBA →', asunto); return true; }
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST', headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ sender: { name: 'Entrenamiento Clínico-IA · SkyNet Genesis', email: REMITENTE }, to: [{ email: to, name: nombre || to }], subject: asunto, htmlContent: html }),
  });
  if (!r.ok) console.log('Brevo no envió un correo →', r.status, (await r.text()).slice(0, 200));
  return r.ok;
}

const db = new pg.Client({ connectionString: process.env.NEON_CORREO, ssl: { rejectUnauthorized: true } });
await db.connect();
const CUPO = 280;   // Brevo gratis permite 300 correos al día
let enviados = 0, fallas = 0;
const pruebas = (await db.query('select * from public.pruebas_para_correo()')).rows;
for (const c of pruebas) {
  if (enviados >= CUPO) break;
  const { asunto, html } = correo(c);
  if (await enviar(c.email, c.nombre || c.institucion, asunto, html)) { if (process.env.PRUEBA !== '1') await db.query('select public.prueba_correo_enviado($1)', [c.clave]); enviados++; } else fallas++;
}
const otros = (await db.query('select * from public.correos_del_dia()')).rows;
for (const c of otros) {
  if (enviados >= CUPO) { console.log('Cupo diario de Brevo alcanzado: lo demás sale mañana.'); break; }
  const m = correoEntrenamiento(c); if (!m) continue;
  if (await enviar(c.email, c.nombre, m.asunto, m.html)) { if (process.env.PRUEBA !== '1') await db.query('select public.correo_marcar($1)', [c.clave]); enviados++; } else fallas++;
}
console.log(`Correos: ${enviados} enviados, ${fallas} con error (prueba: ${pruebas.length}, entrenamiento: ${otros.length}).`);

// ----- facturas electrónicas con Factura-IA (lo que pagaron los clientes por Bold)
if (process.env.FACTURA_IA_LLAVE) {
  const iva = (process.env.FACTURA_IVA || '19').toUpperCase();
  const pend = (await db.query('select * from public.facturas_por_emitir()')).rows;
  let emitidas = 0;
  for (const f of pend) {
    const fa = f.factura || {}, items = f.items || [];
    const lineas = items.map(i => {
      const total = Number(i.valor) || 0, precio = iva === 'EXCLUIDO' ? total : Math.round(total / (1 + Number(iva) / 100));
      return { descripcion: 'Entrenamiento Clínico-IA · ' + String(i.concepto || 'Servicio'), cantidad: 1, precio, impuesto: iva === 'EXCLUIDO' ? 'EXCLUIDO' : 'IVA', tarifa: iva === 'EXCLUIDO' ? 0 : Number(iva) };
    });
    const cuerpo = { cliente: { tipoDoc: fa.tipoDoc || '13', num: fa.num || '222222222222', nombre: fa.nombre || 'Consumidor final', email: fa.email || '', direccion: fa.direccion || '', municipio: fa.municipio || '' },
      lineas, refApp: 'eci-pago-' + f.pago };
    if (process.env.PRUEBA === '1') { console.log('PRUEBA factura →', JSON.stringify(cuerpo).slice(0, 200)); continue; }
    try {
      const r = await fetch('https://factura-ia.skynetgenesis.com/api/documentos', { method: 'POST',
        headers: { 'content-type': 'application/json', 'user-agent': 'SkyNetGenesis-EntrenamientoClinico/1.0', authorization: 'Bearer ' + process.env.FACTURA_IA_LLAVE }, body: JSON.stringify(cuerpo) });
      const j = await r.json().catch(() => ({}));
      const numero = j.numero || j.consecutivo || (j.documento && (j.documento.numero || j.documento.consecutivo)) || '';
      if (r.ok && numero) { await db.query('select public.factura_resultado($1,$2,null)', [f.pago, String(numero)]); emitidas++; }
      else await db.query('select public.factura_resultado($1,null,$2)', [f.pago, (j.error || j.mensaje || ('HTTP ' + r.status)).toString().slice(0, 180)]);
    } catch (e) { await db.query('select public.factura_resultado($1,null,$2)', [f.pago, String(e.message).slice(0, 180)]); }
  }
  console.log(`Facturas: ${emitidas} emitidas de ${pend.length} pendientes.`);
} else console.log('Facturas: sin conexión a Factura-IA todavía (falta el secreto FACTURA_IA_LLAVE); quedan en el panel del Superadministrador.');

await db.end();
if ((pruebas.length || otros.length) && !enviados && process.env.PRUEBA !== '1') process.exit(1);
