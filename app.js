/**
 * app.js — Incidencias TIC (Supabase + GitHub Pages)
 * ---------------------------------------------------
 * Esta app es 100% frontend (HTML/CSS/JS) y usa Supabase como backend en la nube:
 * - Auth (registro/login/logout)
 * - Base de datos (tabla incidencias)
 * - Seguridad (RLS + policies en Supabase)
 *
 * Importante (RA5):
 * - La ANON KEY se usa en frontend y es "pública" por diseño, PERO:
 * - NUNCA uses ni publiques la SERVICE ROLE KEY (esa sí es secreta).
 * - La seguridad real la aporta RLS (Row Level Security) en la base de datos.
 */

// ======================
// TODO 1: Pega aquí tus credenciales (Supabase → Project Settings → API)
const SUPABASE_URL = "TU_URL_DE_SUPABASE";
const SUPABASE_ANON_KEY = "TU_ANON_KEY_DE_SUPABASE";
// ======================

// Creamos el cliente de Supabase (supabase-js viene cargado por CDN en index.html)
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ---------------------------------------------------
 * 1) Referencias a elementos del DOM (la interfaz HTML)
 * --------------------------------------------------- */

const msg = document.getElementById("msg");
const authPanel = document.getElementById("authPanel");
const appPanel = document.getElementById("appPanel");
const userEmail = document.getElementById("userEmail");
const email = document.getElementById("email");
const password = document.getElementById("password");
const btnSignUp = document.getElementById("btnSignUp");
const btnSignIn = document.getElementById("btnSignIn");
const btnSignOut = document.getElementById("btnSignOut");
const formIncidencia = document.getElementById("formIncidencia");
const aula = document.getElementById("aula");
const equipo = document.getElementById("equipo");
const tipo = document.getElementById("tipo");
const descripcion = document.getElementById("descripcion");
const tbody = document.getElementById("tbodyIncidencias");

/* ---------------------------------------------------
 * 2) Utilidades de UI
 * --------------------------------------------------- */

function showMsg(text, kind = "ok") {
  msg.className = `msg ${kind}`;
  msg.textContent = text;
}

function setLoggedUI(session) {
  const logged = !!session; 
  authPanel.classList.toggle("hidden", logged);
  appPanel.classList.toggle("hidden", !logged);
  userEmail.textContent = session?.user?.email ?? "—";
}

async function loadSessionAndInit() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) showMsg(error.message, "err");

  setLoggedUI(data?.session);

  if (data?.session) {
    await loadIncidencias();
  }
}

/* ---------------------------------------------------
 * 3) Autenticación (registro/login/logout)
 * --------------------------------------------------- */

btnSignUp.addEventListener("click", async () => {
  try {
    const { error } = await supabaseClient.auth.signUp({
      email: email.value.trim(),
      password: password.value,
    });

    if (error) throw error;
    showMsg("Registro correcto. Revisa tu correo si pide verificación.", "ok");
  } catch (e) {
    showMsg(e.message, "err");
  }
});

btnSignIn.addEventListener("click", async () => {
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email.value.trim(),
      password: password.value,
    });

    if (error) throw error;

    setLoggedUI(data.session);
    showMsg("Sesión iniciada.", "ok");
    await loadIncidencias();
  } catch (e) {
    showMsg(e.message, "err");
  }
});

btnSignOut.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  setLoggedUI(null);
  tbody.innerHTML = "";
  showMsg("Sesión cerrada.", "ok");
});

/* ---------------------------------------------------
 * 4) CRUD de incidencias (Create / Read / Update)
 * --------------------------------------------------- */

formIncidencia.addEventListener("submit", async (ev) => {
  ev.preventDefault();

  try {
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const uid = sessionData?.session?.user?.id;

    if (!uid) throw new Error("No hay sesión activa.");

    const payload = {
      user_id: uid, 
      aula: aula.value.trim(),
      equipo: equipo.value.trim(),
      tipo: tipo.value,
      descripcion: descripcion.value.trim(),
      estado: "abierta",
    };

    // TODO 2: INSERT en Supabase resuelto
    const { error } = await supabaseClient.from("incidencias").insert([payload]);
    if (error) throw error;

    formIncidencia.reset();
    showMsg("Incidencia creada con éxito.", "ok");

    await loadIncidencias();
  } catch (e) {
    showMsg(e.message, "err");
  }
});

async function loadIncidencias() {
  try {
    // TODO 3: SELECT en Supabase resuelto
    const { data, error } = await supabaseClient
      .from("incidencias")
      .select("id, created_at, aula, equipo, tipo, estado")
      .order("created_at", { ascending: false });

    if (error) throw error;
    renderIncidencias(data ?? []);

  } catch (e) {
    showMsg(e.message, "err");
  }
}

function renderIncidencias(rows) {
  tbody.innerHTML = "";

  for (const r of rows) {
    const tr = document.createElement("tr");
    const dt = new Date(r.created_at).toLocaleString();

    tr.innerHTML = `
      <td>${dt}</td>
      <td>${escapeHtml(r.aula)}</td>
      <td>${escapeHtml(r.equipo)}</td>
      <td>${escapeHtml(r.tipo)}</td>
      <td>${escapeHtml(r.estado)}</td>
      <td>
        ${
          r.estado === "abierta"
            ? `<button data-id="${r.id}" class="btnCerrar">Cerrar</button>`
            : ""
        }
      </td>
    `;
    tbody.appendChild(tr);
  }

  document.querySelectorAll(".btnCerrar").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      await cerrarIncidencia(id);
    });
  });
}

async function cerrarIncidencia(id) {
  try {
    // TODO 4: UPDATE en Supabase resuelto
    const { error } = await supabaseClient
      .from("incidencias")
      .update({ estado: "cerrada" })
      .eq("id", id);

    if (error) throw error;

    showMsg("Incidencia cerrada correctamente.", "ok");
    await loadIncidencias();
  } catch (e) {
    showMsg(e.message, "err");
  }
}

/* ---------------------------------------------------
 * 5) Seguridad mínima en el frontend
 * --------------------------------------------------- */

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

supabaseClient.auth.onAuthStateChange((_event, session) => {
  setLoggedUI(session);
  if (session) loadIncidencias();
  else tbody.innerHTML = "";
});

loadSessionAndInit();