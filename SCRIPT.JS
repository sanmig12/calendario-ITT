
"use strict";

// PEGA AQUÍ LOS DATOS DE TU PROYECTO SUPABASE

const SUPABASE_URL = "https://hqocsfezjhweuqksddry.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_70ZMBvDe0C05OVDq6S0oUg_TgCJlPuA";


const configured =
    SUPABASE_URL.startsWith("https://") &&
    !SUPABASE_URL.includes("PEGA_AQUI") &&
    !SUPABASE_PUBLISHABLE_KEY.includes("PEGA_AQUI");

const db = configured
    ? window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    )
    : null;

// Elementos del calendario
const dateTitle = document.querySelector(".date");
const daysContainer = document.querySelector(".days");
const prev = document.getElementById("prev");
const next = document.getElementById("next");

// Elementos de viajes y acceso
const adminAccess = document.getElementById("admin-access");
const loginModal = document.getElementById("login-modal");
const loginForm = document.getElementById("login-form");
const closeLogin = document.getElementById("close-login");
const loginMessage = document.getElementById("login-message");
const loginButton = document.getElementById("login-button");
const logoutButton = document.getElementById("logout-button");

const adminPanel = document.getElementById("admin-panel");
const tripForm = document.getElementById("trip-form");
const tripList = document.getElementById("trip-list");
const selectedDateLabel = document.getElementById("selected-date");
const transportStatus = document.getElementById("transport-status");
const tripCount = document.getElementById("trip-count");
const formTitle = document.getElementById("form-title");
const tripMessage = document.getElementById("trip-message");
const saveTripButton = document.getElementById("save-trip-button");
const cancelEditButton = document.getElementById("cancel-edit-button");

const destino = document.getElementById("destino");
const fecha = document.getElementById("fecha");
const fechaEntrada = document.getElementById("fecha-entrada");
const hora = document.getElementById("hora");
const alumnos = document.getElementById("alumnos");
const unidad = document.getElementById("unidad");
const responsable = document.getElementById("responsable");

const months = [
    "enero", "febrero", "marzo", "abril",
    "mayo", "junio", "julio", "agosto",
    "septiembre", "octubre", "noviembre", "diciembre"
];

const today = new Date();

let month = today.getMonth();
let year = today.getFullYear();
let selectedDate = new Date(year, month, today.getDate());

let currentUser = null;
let trips = [];
let editingId = null;
let loading = false;
let loadFailed = false;

function keyDate(date) {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0")
    ].join("-");
}

function parseDate(value) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
}

function message(element, text, type = "") {
    element.textContent = text;
    element.className = "message";
    if (type) element.classList.add(type);
}

// CALENDARIO

// CALENDARIO
function renderCalendar() {
    dateTitle.textContent = `${months[month]} ${year}`;
    daysContainer.innerHTML = "";

    const firstDay = new Date(year, month, 1).getDay();
    const offset = (firstDay + 6) % 7;

    for (let i = 0; i < 42; i++) {
        const cellDate = new Date(year, month, i - offset + 1);
        const cell = document.createElement("div");

        cell.className = "day";
        cell.textContent = cellDate.getDate();

        const sameMonth =
            cellDate.getMonth() === month &&
            cellDate.getFullYear() === year;

        const dateKey = keyDate(cellDate);
        const isToday = dateKey === keyDate(today);
        const isWeekend =
            cellDate.getDay() === 0 || cellDate.getDay() === 6;

        if (!sameMonth) {
            cell.classList.add(
                cellDate < new Date(year, month, 1)
                    ? "prev-date"
                    : "next-date"
            );
        }

        if (dateKey === keyDate(selectedDate)) {
            cell.classList.add("selected");
        }

        if (sameMonth) {
            if (isWeekend) {
                cell.classList.add("weekend-day");
                cell.title = "Fin de semana";
            } else {
                const isBusy = trips.some(t =>
                    t.fecha <= dateKey &&
                    t.fecha_entrada >= dateKey
                );

                if (isBusy) {
                    cell.classList.add("busy-day");
                    cell.title = "Día con viajes";
                } else {
                    cell.classList.add("free-day");
                    cell.title = "Día disponible";
                }
            }
        }

        if (isToday) {
            cell.classList.add("today");
            cell.title = "Hoy";
        }

        cell.addEventListener("click", () => selectDay(cellDate));
        daysContainer.appendChild(cell);
    }
}


async function selectDay(date) {
    selectedDate = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
    );

    const changedMonth =
        month !== selectedDate.getMonth() ||
        year !== selectedDate.getFullYear();

    month = selectedDate.getMonth();
    year = selectedDate.getFullYear();

    fecha.value = keyDate(selectedDate);

    if (changedMonth) {
        await loadTrips();
    } else {
        renderCalendar();
        renderTripsForSelectedDate();
    }
}

async function changeMonth(amount) {
    const newDate = new Date(year, month + amount, 1);

    month = newDate.getMonth();
    year = newDate.getFullYear();
    selectedDate = new Date(year, month, 1);

    fecha.value = keyDate(selectedDate);
    resetForm();
    await loadTrips();
}

prev.addEventListener("click", () => changeMonth(-1));
next.addEventListener("click", () => changeMonth(1));

prev.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        changeMonth(-1);
    }
});

next.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        changeMonth(1);
    }
});

// CONSULTAR VIAJES DEL MES
async function loadTrips() {
    if (!db) {
        trips = [];
        loadFailed = true;
        renderCalendar();
        renderTripsForSelectedDate();
        tripList.textContent =
            "Configura las credenciales de Supabase para cargar los viajes.";
        return;
    }

    loading = true;
    loadFailed = false;
    renderTripsForSelectedDate();

    try {
        const first = keyDate(new Date(year, month, 1));
        const last = keyDate(new Date(year, month + 1, 0));

        let query = db
            .from("viajes")
            .select(
                "id, fecha,fecha_entrada, destino, hora_salida, alumnos, unidad, responsable"
            )
            .lte("fecha", last)
            .gte("fecha_entrada", first)
            .order("hora_salida", { ascending: true });

        // Si no hay sesión, la política RLS impedirá la consulta.
        // La vista pública necesita acceso de solo lectura si se desea
        // que todos los visitantes puedan consultar los viajes.
        const { data, error } = await query;

        if (error) throw error;

        trips = data || [];
    } catch (error) {
        console.error("Error cargando viajes:", error);
        trips = [];
        loadFailed = true;
    } finally {
        loading = false;
        renderCalendar();
        renderTripsForSelectedDate();
    }
}

// MOSTRAR VIAJES DEL DÍA
function renderTripsForSelectedDate() {
    selectedDateLabel.textContent = selectedDate.toLocaleDateString(
        "es-MX",
        {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        }
    );

    tripList.innerHTML = "";

    if (loading) {
        transportStatus.className = "status";
        transportStatus.textContent = "CONSULTANDO...";
        tripCount.textContent = "Cargando viajes...";
        tripList.textContent = "Consultando la base de datos...";
        return;
    }

    if (loadFailed) {
        transportStatus.className = "status";
        transportStatus.textContent = "NO DISPONIBLE";
        tripCount.textContent = "No se pudo verificar la disponibilidad.";
        tripList.textContent =
            "No fue posible consultar los viajes. Intenta de nuevo más tarde.";
        return;
    }

    const selectedKey = keyDate(selectedDate);
    
    const dayTrips = trips.filter(t =>
    t.fecha <= selectedKey &&
    t.fecha_entrada >= selectedKey
);

    transportStatus.className =
        "status " + (dayTrips.length ? "ocupado" : "desocupado");

    transportStatus.textContent =
        dayTrips.length ? "OCUPADO" : "DESOCUPADO";

    tripCount.textContent = dayTrips.length
        ? `${dayTrips.length} viaje(s) programado(s).`
        : "No hay viajes registrados para este día.";
if (!dayTrips.length) {
    const emptyMessage = document.createElement("div");
    emptyMessage.className = "no-trips";

    emptyMessage.innerHTML = `
        <i class="fa-solid fa-calendar-xmark"></i>
        <h3>No hay viajes al momento</h3>
        <p>No hay viajes programados para esta fecha.</p>
    `;

    tripList.appendChild(emptyMessage);
    return;
}

    dayTrips.forEach(trip => {
        const card = document.createElement("article");
        card.className = "trip-card";

        const title = document.createElement("h3");
        title.textContent = trip.destino;
        card.appendChild(title);

        
[
    `Salida: ${trip.fecha}`,
    `Regreso: ${trip.fecha_entrada}`,
    `Hora de salida: ${String(trip.hora_salida).slice(0, 5)}`,
    `Alumnos: ${trip.alumnos}`,
    `Unidad: ${trip.unidad}`,
    `Responsable: ${trip.responsable}`
].forEach(value => {
    const p = document.createElement("p");
    p.textContent = value;
    card.appendChild(p);
});


        if (currentUser) {
            const actions = document.createElement("div");
            actions.className = "trip-actions";

            const edit = document.createElement("button");
            edit.type = "button";
            edit.textContent = "Editar";
            edit.addEventListener("click", () => editTrip(trip));

            const del = document.createElement("button");
            del.type = "button";
            del.textContent = "Eliminar";
            del.className = "delete-button";
            del.addEventListener("click", () => deleteTrip(trip));

            actions.append(edit, del);
            card.appendChild(actions);
        }

        tripList.appendChild(card);
    });
}

// ABRIR Y CERRAR ACCESO
adminAccess.addEventListener("click", () => {
    if (currentUser) {
        adminPanel.hidden = !adminPanel.hidden;
        return;
    }

    loginModal.hidden = false;
    message(loginMessage, "");
});

closeLogin.addEventListener("click", () => {
    loginModal.hidden = true;
});

loginModal.addEventListener("click", event => {
    if (event.target === loginModal) {
        loginModal.hidden = true;
    }
});

// INICIO DE SESIÓN DEL JEFE
loginForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (!db) {
        message(loginMessage, "Primero configura Supabase en script.js.", "error");
        return;
    }

    loginButton.disabled = true;
    loginButton.textContent = "Verificando...";

    try {
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        const { data, error } = await db.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        const { data: admin, error: adminError } = await db
            .from("admin_users")
            .select("user_id")
            .eq("user_id", data.user.id)
            .maybeSingle();

        if (adminError) throw adminError;

        if (!admin) {
            await db.auth.signOut();
            throw new Error("Esta cuenta no está autorizada como jefe.");
        }

        currentUser = data.user;
        loginModal.hidden = true;
        adminPanel.hidden = false;
        logoutButton.hidden = false;

        adminAccess.innerHTML = '<i class="fa-solid fa-user-shield"></i>';
        adminAccess.title = "Administración del jefe";

        await loadTrips();
    } catch (error) {
        message(loginMessage, error.message || "No se pudo iniciar sesión.", "error");
    } finally {
        loginButton.disabled = false;
        loginButton.textContent = "Iniciar sesión";
    }
});

// COMPROBAR SESIÓN AL CARGAR
async function checkSession() {
    if (!db) return;

    try {
        const { data } = await db.auth.getSession();
        const user = data.session?.user;

        if (!user) return;

        const { data: admin, error } = await db
            .from("admin_users")
            .select("user_id")
            .eq("user_id", user.id)
            .maybeSingle();

        if (error || !admin) {
            await db.auth.signOut();
            return;
        }

        currentUser = user;
        adminPanel.hidden = false;
        logoutButton.hidden = false;
        adminAccess.innerHTML = '<i class="fa-solid fa-user-shield"></i>';
        adminAccess.title = "Administración del jefe";
    } catch (error) {
        console.error(error);
    }
}

// CERRAR SESIÓN
logoutButton.addEventListener("click", async () => {
    if (!db) return;

    const { error } = await db.auth.signOut();

    if (error) {
        alert("No se pudo cerrar sesión.");
        return;
    }

    currentUser = null;
    adminPanel.hidden = true;
    logoutButton.hidden = true;
    adminAccess.innerHTML = '<i class="fa-solid fa-lock"></i>';
    adminAccess.title = "Acceso del jefe";
    resetForm();

    await loadTrips();
});

// GUARDAR O ACTUALIZAR VIAJE
tripForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (!db || !currentUser) return;

    
const payload = {
    destino: destino.value.trim(),
    fecha: fecha.value,
    fecha_entrada: fechaEntrada.value,
    hora_salida: hora.value,
    alumnos: Number(alumnos.value),
    unidad: unidad.value.trim(),
    responsable: responsable.value.trim()
};


    if (
    !payload.destino ||
    !payload.fecha ||
    !payload.fecha_entrada ||
    payload.fecha_entrada < payload.fecha ||
    !payload.hora_salida ||
    !payload.unidad ||
    !payload.responsable ||
    !Number.isInteger(payload.alumnos) ||
    payload.alumnos < 0 ||
    payload.alumnos > 10000
) {
    message(
        tripMessage,
        "Revisa los datos. La fecha de regreso no puede ser anterior a la salida.",
        "error"
    );
    return;
}

    saveTripButton.disabled = true;

    try {
        let result;

        if (editingId !== null) {
            result = await db
                .from("viajes")
                .update(payload)
                .eq("id", editingId);
        } else {
            result = await db
                .from("viajes")
                .insert({
                    ...payload,
                    created_by: currentUser.id
                });
        }

        if (result.error) throw result.error;

        selectedDate = parseDate(payload.fecha);
        month = selectedDate.getMonth();
        year = selectedDate.getFullYear();

        resetForm();
        await loadTrips();
        message(tripMessage, "Viaje guardado correctamente.", "success");
    } catch (error) {
        console.error(error);
        message(tripMessage, "No se pudo guardar el viaje. Revisa la conexión y los permisos.", "error");
    } finally {
        saveTripButton.disabled = false;
    }
});

// EDITAR VIAJE

function editTrip(trip) {
    editingId = trip.id;

    destino.value = trip.destino;
    fecha.value = trip.fecha;

    // Actualizar la fecha mínima de regreso
    fechaEntrada.min = trip.fecha;
    fechaEntrada.value = trip.fecha_entrada;

    hora.value = String(trip.hora_salida).slice(0, 5);
    alumnos.value = trip.alumnos;
    unidad.value = trip.unidad;
    responsable.value = trip.responsable;

    formTitle.textContent = "Editar viaje";
    saveTripButton.textContent = "Guardar s";
    cancelEditButton.hidden = false;

    adminPanel.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


// ELIMINAR VIAJE
async function deleteTrip(trip) {
    if (!confirm(`¿Eliminar el viaje "${trip.destino}"?`)) return;

    try {
        const { error } = await db
            .from("viajes")
            .delete()
            .eq("id", trip.id);

        if (error) throw error;

        if (editingId === trip.id) resetForm();

        await loadTrips();
    } catch (error) {
        console.error(error);
        alert("No se pudo eliminar el viaje. Revisa los permisos.");
    }
}

// REINICIAR FORMULARIO
function resetForm() {
    editingId = null;
    tripForm.reset();
    fecha.value = keyDate(selectedDate);
    fechaEntrada.value = fecha.value;
    fechaEntrada.min = fecha.value;
    formTitle.textContent = "Registrar viaje";
    saveTripButton.textContent = "Guardar viaje";
    cancelEditButton.hidden = true;
    message(tripMessage, "");
}

cancelEditButton.addEventListener("click", resetForm);

fecha.addEventListener("change", async () => {
    if (!fecha.value) return;
    await selectDay(parseDate(fecha.value));
});

fecha.addEventListener("change", () => {
    if (!fecha.value) return;

    fechaEntrada.min = fecha.value;

    if (fechaEntrada.value && fechaEntrada.value < fecha.value) {
        fechaEntrada.value = fecha.value;
    }
});

fechaEntrada.addEventListener("change", () => {
    if (!fechaEntrada.value || !fecha.value) return;

    if (fechaEntrada.value < fecha.value) {
        fechaEntrada.value = fecha.value;
    }
});

/* ==========================================
   CAMBIO ENTRE MODO CLARO Y OSCURO
========================================== */

const themeToggle = document.getElementById("theme-toggle");

// Aplicar el tema seleccionado
function applyTheme(theme) {

    document.body.dataset.theme = theme;

    if (theme === "dark") {

        themeToggle.innerHTML =
            '<i class="fa-solid fa-sun"></i> Modo claro';

    } else {

        themeToggle.innerHTML =
            '<i class="fa-solid fa-moon"></i> Modo oscuro';

    }

    // Guardar preferencia
    localStorage.setItem("calendar-theme", theme);
}

// Recuperar el tema guardado
const savedTheme = localStorage.getItem("calendar-theme");

// Si no existe una preferencia, utilizar el tema del dispositivo
const initialTheme = savedTheme === "dark" || savedTheme === "light"
    ? savedTheme
    : (
        window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light"
    );

// Aplicar tema inicial
applyTheme(initialTheme);

// Cambiar tema al presionar el botón
themeToggle.addEventListener("click", () => {

    const currentTheme = document.body.dataset.theme;

    const newTheme = currentTheme === "dark"
        ? "light"
        : "dark";

    applyTheme(newTheme);

});

themeToggle.addEventListener("click", () => {

    const currentTheme = document.body.dataset.theme;

    const newTheme = currentTheme === "dark"
        ? "light"
        : "dark";

    applyTheme(newTheme);

});


/* ==========================================
   INICIALIZAR CALENDARIO AL CARGAR LA PÁGINA
========================================== */

// Mostrar inmediatamente el mes actual
fecha.value = keyDate(selectedDate);

renderCalendar();

// Comprobar sesión y cargar los viajes
async function iniciarCalendario() {

    await checkSession();

    await loadTrips();

}

// Ejecutar inicialización
iniciarCalendario();

