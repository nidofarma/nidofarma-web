// Se ejecuta automáticamente cada vez que Netlify recibe un envío de formulario
// (los envíos marcados como spam no la activan). Envía un email a quien ha
// rellenado el formulario, según cuál sea:
//   inscripcion -> confirmación con los datos de la transferencia (copia oculta a reservas@)
//   contacto    -> acuse de recibo de la consulta
//   avisos      -> confirmación de que le avisaremos de los próximos cursos
// Los avisos internos con todos los datos los manda Netlify (Forms > notificaciones).
//
// Variables de entorno (Netlify > Project configuration > Environment variables):
//   RESEND_API_KEY  clave de https://resend.com (dominio nidofarma.es verificado)
//   NIDO_TITULAR    titular de la cuenta
//   NIDO_IBAN       IBAN de la cuenta
//   NIDO_SWIFT      SWIFT/BIC (opcional)

const PRECIO_CURSO = 395;
const PRECIO_MENU = 40;
const CURSO = "Lactancia materna, leches de fórmula y primeros cuidados del bebé";
const CUANDO = "el viernes 20 y el sábado 21 de noviembre";
const DONDE = "Passeig de Sant Gervasi 8, entresòl 4, 08022 Barcelona";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const euros = (n) => `${n.toLocaleString("es-ES")} €`;
const pila = (nombre) => (String(nombre || "").trim().split(/\s+/)[0] || "");

// Plantilla común de email con los colores de la marca
const plantilla = (titulo, cuerpoHtml) => `<!doctype html><html lang="es"><body style="margin:0;background:#F6F3EE;font-family:Helvetica,Arial,sans-serif;color:#46544B">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F3EE;padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:20px;padding:36px 32px">
<tr><td>
<p style="margin:0 0 24px;font-family:Georgia,serif;font-size:26px;color:#2E4538"><strong style="font-weight:600">nido</strong><span style="color:#6A7E70">farma</span></p>
<h1 style="margin:0 0 16px;font-family:Georgia,serif;font-weight:400;font-size:26px;line-height:1.2;color:#2E4538">${titulo}</h1>
${cuerpoHtml}
<p style="margin:24px 0 0;font-size:16px;line-height:1.6">Un saludo,<br>El equipo de NidoFarma</p>
</td></tr></table>
<p style="margin:18px 0 0;font-size:12px;color:#8A968D">NidoFarma · Formación para farmacéuticos · nidofarma.es</p>
</td></tr></table></body></html>`;
const p = (html) => `<p style="margin:0 0 14px;font-size:16px;line-height:1.6">${html}</p>`;
const enlace = (mail) => `<a href="mailto:${mail}" style="color:#2E4538;font-weight:600">${mail}</a>`;

function emailInscripcion(d) {
  const titular = process.env.NIDO_TITULAR;
  const iban = process.env.NIDO_IBAN;
  const swift = process.env.NIDO_SWIFT || "";
  if (!titular || !iban) throw new Error("Faltan NIDO_TITULAR o NIDO_IBAN");

  // El importe se calcula aquí, no se toma del navegador.
  const conMenu = String(d["comida-viernes"] || "").toLowerCase().startsWith("sí");
  const total = PRECIO_CURSO + (conMenu ? PRECIO_MENU : 0);
  const nombre = String(d.nombre || "").trim();
  const concepto = `${nombre || "Asistente"} - Curso 01 NidoFarma`;
  const desglose = conMenu ? `Curso ${euros(PRECIO_CURSO)} + menú del viernes ${euros(PRECIO_MENU)}` : `Curso ${euros(PRECIO_CURSO)}`;
  const n = pila(nombre);

  const fila = (k, v) =>
    `<tr><td style="padding:10px 0;border-top:1px solid #DED7CC;color:#6F7C73;font-size:14px">${k}</td><td style="padding:10px 0;border-top:1px solid #DED7CC;color:#2E4538;font-size:15px;font-weight:600;text-align:right">${v}</td></tr>`;

  const html = plantilla(`Gracias por inscribirte${n ? `, ${esc(n)}` : ""}`,
    p(`Hemos recibido tu inscripción al curso <strong>${CURSO}</strong>, con Marta Mor Puig, ${CUANDO} en ${DONDE}.`) +
    (conMenu ? p("Te hemos apuntado a la comida del viernes: un menú cerrado en un restaurante de la zona al que iremos todo el grupo junto. Os daremos los detalles en el curso.") : "") +
    p("Tu plaza quedará reservada en cuanto recibamos la transferencia. Estos son los datos:") +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #DED7CC">
${fila("Titular", esc(titular))}${fila("IBAN", esc(iban))}${swift ? fila("SWIFT / BIC", esc(swift)) : ""}${fila("Concepto", esc(concepto))}${fila("Importe", euros(total))}
</table>
<p style="margin:10px 0 24px;font-size:13px;color:#6F7C73">${desglose}</p>` +
    p(`Cuando la hayas hecho, responde a este email con el comprobante o envíalo a ${enlace("reservas@nidofarma.es")}. Te confirmaremos la plaza y te mandaremos la factura.`));

  const text = [
    `Gracias por inscribirte${n ? `, ${n}` : ""}.`, "",
    `Hemos recibido tu inscripción al curso ${CURSO}, con Marta Mor Puig, ${CUANDO} en ${DONDE}.`,
    conMenu ? "Te hemos apuntado a la comida del viernes (menú cerrado en un restaurante de la zona, todo el grupo junto)." : null,
    "", "Tu plaza quedará reservada en cuanto recibamos la transferencia:", "",
    `Titular: ${titular}`, `IBAN: ${iban}`, swift ? `SWIFT/BIC: ${swift}` : null,
    `Concepto: ${concepto}`, `Importe: ${euros(total)} (${desglose})`, "",
    "Envía el comprobante respondiendo a este email o a reservas@nidofarma.es.", "", "El equipo de NidoFarma",
  ].filter((l) => l !== null).join("\n");

  return { from: "NidoFarma <reservas@nidofarma.es>", reply_to: "reservas@nidofarma.es", bcc: ["reservas@nidofarma.es"],
    subject: "Tu inscripción en NidoFarma: datos para la transferencia", html, text };
}

function emailContacto(d) {
  const n = pila(d.nombre);
  const programa = String(d["quiere-programa"] || "").toLowerCase().startsWith("s");
  const URL_PROGRAMA = "https://nidofarma.es/programa-nidofarma.pdf";
  const frase = programa
    ? "Aquí tienes el programa detallado del curso. Si nos has dejado alguna pregunta, te la respondemos personalmente en uno o dos días laborables."
    : "Te respondemos personalmente en uno o dos días laborables.";
  const botonPrograma = programa
    ? `<p style="margin:6px 0 20px"><a href="${URL_PROGRAMA}" style="display:inline-block;background:#2E4538;color:#F6F3EE;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:999px">Descargar el programa (PDF)</a></p>`
    : "";
  const html = plantilla(`Gracias por escribirnos${n ? `, ${esc(n)}` : ""}`,
    p("Hemos recibido tu consulta sobre NidoFarma. " + frase) +
    botonPrograma +
    p(`Si quieres añadir algo, solo tienes que responder a este email. Y si ya lo tienes claro, puedes reservar tu plaza en <a href="https://nidofarma.es/#inscripcion" style="color:#2E4538;font-weight:600">nidofarma.es</a>.`));
  const text = `Gracias por escribirnos${n ? `, ${n}` : ""}.\n\nHemos recibido tu consulta sobre NidoFarma. ${frase}\n${programa ? `\nPrograma del curso: ${URL_PROGRAMA}\n` : ""}\nSi quieres añadir algo, responde a este email. Puedes reservar tu plaza en https://nidofarma.es/#inscripcion\n\nEl equipo de NidoFarma`;
  return { from: "NidoFarma <info@nidofarma.es>", reply_to: "info@nidofarma.es",
    subject: programa ? "Programa del curso de lactancia de NidoFarma" : "Hemos recibido tu consulta", html, text };
}

function emailAvisos() {
  const html = plantilla("Te avisaremos de los próximos cursos",
    p("Gracias por apuntarte. Te escribiremos cuando abramos inscripciones de un nuevo curso de NidoFarma o publiquemos material útil para la farmacia. Nada más.") +
    p("Si en algún momento prefieres no recibir más emails, responde a este con la palabra «baja» y te borramos de la lista.") +
    p(`Mientras tanto, el curso de lactancia de noviembre tiene la inscripción abierta en <a href="https://nidofarma.es/#curso" style="color:#2E4538;font-weight:600">nidofarma.es</a>.`));
  const text = "Gracias por apuntarte. Te escribiremos cuando abramos inscripciones de un nuevo curso de NidoFarma o publiquemos material útil para la farmacia.\n\nSi prefieres no recibir más emails, responde a este con la palabra «baja».\n\nEl curso de noviembre tiene la inscripción abierta en https://nidofarma.es/#curso\n\nEl equipo de NidoFarma";
  return { from: "NidoFarma <info@nidofarma.es>", reply_to: "info@nidofarma.es",
    subject: "Te avisaremos de los próximos cursos de NidoFarma", html, text };
}

const CONSTRUCTORES = { inscripcion: emailInscripcion, contacto: emailContacto, avisos: emailAvisos };

exports.handler = async (event) => {
  let payload;
  try { payload = JSON.parse(event.body).payload; } catch { return { statusCode: 400, body: "Payload no válido" }; }

  const construir = CONSTRUCTORES[payload?.form_name];
  if (!construir) return { statusCode: 200, body: "Formulario sin email automático" };

  const d = payload.data || {};
  const email = String(d.email || payload.email || "").trim();
  if (!email) return { statusCode: 200, body: "Sin email" };

  if (!process.env.RESEND_API_KEY) {
    // El envío queda guardado en Netlify igualmente; solo falta el email.
    console.error("Falta la variable RESEND_API_KEY");
    return { statusCode: 500, body: "Configuración incompleta" };
  }

  let mensaje;
  try { mensaje = construir(d); } catch (err) {
    console.error(`[${payload.form_name}]`, err.message);
    return { statusCode: 500, body: "Configuración incompleta" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ...mensaje, to: [email] }),
  });
  if (!res.ok) {
    console.error(`[${payload.form_name}] Error de Resend:`, res.status, await res.text());
    return { statusCode: 500, body: "Error enviando el email" };
  }
  console.log(`[${payload.form_name}] Email enviado a ${email}`);
  return { statusCode: 200, body: "Email enviado" };
};
