
import { supabase } from './supabase.js';

const contenido = document.getElementById('seccionContenido');

const btnCerrarSesion = document.getElementById('btnCerrarSesion');
const btnProfesores = document.getElementById('btnProfesores');
const btnMaterias = document.getElementById('btnMaterias');
const btnCuestionarios = document.getElementById('btnCuestionarios');
const btnSupervision = document.getElementById('btnSupervision');

function escaparHTML(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, caracter => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[caracter]);
}

function mostrarBienvenida(nombre) {
    contenido.innerHTML = `
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
                <span class="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 mb-3">
                    Sesión verificada
                </span>

                <h2 class="font-display text-xl md:text-2xl font-bold text-white mb-2">
                    ¡Hola, ${escaparHTML(nombre)}!
                </h2>

                <p class="text-sm text-slate-400">
                    Tu cuenta tiene permisos de administrador.
                    Ya puedes gestionar la plataforma.
                </p>
            </div>

            <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                <i class="fa-solid fa-shield-halved text-2xl text-white"></i>
            </div>
        </div>
    `;
}

async function verificarAdministrador() {
    try {
        const { data: sesion, error: errorSesion } =
            await supabase.auth.getSession();

        if (errorSesion) throw errorSesion;

        const usuario = sesion.session?.user;

        if (!usuario) {
            window.location.href = 'login.html';
            return;
        }

        const { data: perfil, error } = await supabase
            .from('perfiles')
            .select('nombre, rol, activo')
            .eq('id', usuario.id)
            .single();

        if (error) throw error;

        if (!perfil || perfil.rol !== 'administrador' || !perfil.activo) {
            await supabase.auth.signOut();
            window.location.href = 'login.html';
            return;
        }

        mostrarBienvenida(perfil.nombre || 'Administrador');

    } catch (error) {
        console.error('Error al verificar administrador:', error);

        contenido.innerHTML = `
            <div class="p-6 rounded-2xl border border-rose-500/30 bg-rose-500/10">
                <h2 class="text-xl font-bold text-white mb-2">
                    No se pudo verificar tu cuenta
                </h2>
                <p class="text-sm text-slate-300">
                    Comprueba tu conexión e intenta nuevamente.
                </p>
            </div>
        `;
    }
}



async function cargarProfesores() {
    contenido.innerHTML = `
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
                <h2 class="font-display text-2xl font-bold text-white">
                    Gestión de profesores
                </h2>
                <p class="text-sm text-slate-400 mt-1">
                    Administra las cuentas de los profesores.
                </p>
            </div>

            <button id="btnNuevoProfesor"
                class="px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold">
                <i class="fa-solid fa-user-plus mr-2"></i>
                Registrar profesor
            </button>
        </div>

        <div id="formularioNuevoProfesor"
            class="hidden mb-8 p-6 rounded-2xl border border-slate-700 bg-slate-800/60">

            <h3 class="font-display text-lg font-bold text-white mb-5">
                Nuevo profesor
            </h3>

            <form id="formRegistroProfesor" class="space-y-4">
                <div>
                    <label class="block text-sm text-slate-300 mb-2">Nombre completo</label>
                    <input id="nuevoNombreProfesor" type="text" required
                        class="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white"
                        placeholder="Nombre del profesor">
                </div>

                <div>
                    <label class="block text-sm text-slate-300 mb-2">Correo electrónico</label>
                    <input id="nuevoCorreoProfesor" type="email" required
                        class="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white"
                        placeholder="profesor@correo.com">
                </div>

                <div>
                    <label class="block text-sm text-slate-300 mb-2">Contraseña inicial</label>
                    <input id="nuevaPasswordProfesor" type="password"
                        minlength="12" required
                        class="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white"
                        placeholder="Mínimo 12 caracteres">
                    <p class="text-xs text-slate-500 mt-2">
                        El profesor podrá cambiarla posteriormente.
                    </p>
                </div>

                <div class="flex flex-wrap gap-3">
                    <button type="submit" id="btnGuardarProfesor"
                        class="px-5 py-3 rounded-xl bg-indigo-600 text-white text-sm font-bold">
                        Registrar profesor
                    </button>

                    <button type="button" id="btnCancelarProfesor"
                        class="px-5 py-3 rounded-xl bg-slate-700 text-white text-sm font-bold">
                        Cancelar
                    </button>
                </div>

                <p id="mensajeRegistroProfesor" class="text-sm hidden"></p>
            </form>
        </div>

        <div id="listaProfesores"></div>
    `;

    const formulario = document.getElementById('formularioNuevoProfesor');
    const formRegistro = document.getElementById('formRegistroProfesor');

    document.getElementById('btnNuevoProfesor').addEventListener('click', () => {
        formulario.classList.toggle('hidden');
    });

    document.getElementById('btnCancelarProfesor').addEventListener('click', () => {
        formulario.classList.add('hidden');
        formRegistro.reset();
    });

    formRegistro.addEventListener('submit', async (event) => {
        event.preventDefault();

        const nombre = document.getElementById('nuevoNombreProfesor').value.trim();
        const correo = document.getElementById('nuevoCorreoProfesor').value.trim();
        const password = document.getElementById('nuevaPasswordProfesor').value;

        const boton = document.getElementById('btnGuardarProfesor');
        const mensaje = document.getElementById('mensajeRegistroProfesor');

        boton.disabled = true;
        boton.textContent = 'Registrando...';

        mensaje.className = 'text-sm text-indigo-300';
        mensaje.textContent = 'Creando cuenta del profesor...';

        try {
            const { data, error } = await supabase.functions.invoke(
                'smooth-processor',
                {
                    body: { nombre, correo, password }
                }
            );

            if (error) {
                let detalle = error.message;

                try {
                    const respuesta = await error.context.json();
                    detalle = respuesta.error || respuesta.message || detalle;
                } catch {}

                throw new Error(detalle);
            }

            if (!data || !data.success) {
                throw new Error(data?.error || 'No se pudo registrar al profesor.');
            }

            alert('¡Profesor registrado correctamente!');
            await cargarProfesores();

        } catch (error) {
            console.error('Error al registrar profesor:', error);
            mensaje.className = 'text-sm text-rose-300';
            mensaje.textContent = error.message;
        } finally {
            boton.disabled = false;
            boton.textContent = 'Registrar profesor';
        }
    });

    const { data: profesores, error } = await supabase
        .from('perfiles')
        .select('id, nombre, correo, activo, creado_en')
        .eq('rol', 'profesor')
        .order('creado_en', { ascending: false });

    const lista = document.getElementById('listaProfesores');

    if (error) {
        lista.innerHTML = `
            <p class="text-rose-300">No se pudieron cargar los profesores.</p>
        `;
        console.error(error);
        return;
    }

    if (profesores.length === 0) {
        lista.innerHTML = `
            <div class="rounded-2xl border border-slate-700 bg-slate-800/50 p-8 text-center">
                <i class="fa-solid fa-user-group text-4xl text-slate-500 mb-4"></i>
                <h3 class="text-lg font-bold text-white mb-2">
                    No hay profesores registrados
                </h3>
                <p class="text-sm text-slate-400">
                    Cuando registres profesores, aparecerán aquí.
                </p>
            </div>
        `;
        return;
    }

    lista.innerHTML = `
        <div class="overflow-x-auto rounded-2xl border border-slate-700">
            <table class="w-full text-sm text-left">
                <thead class="bg-slate-800 text-slate-300">
                    <tr>
                        <th class="px-5 py-4">Profesor</th>
                        <th class="px-5 py-4">Correo</th>
                        <th class="px-5 py-4">Estado</th>
                        <th class="px-5 py-4">Registro</th>
                        <th class="px-5 py-4">Acciones</th>
                    </tr>
                </thead>

                <tbody class="divide-y divide-slate-700 bg-slate-900/50">
                    ${profesores.map(profesor => `
                        <tr>
                            <td class="px-5 py-4 text-white font-semibold">
                                ${escaparHTML(profesor.nombre)}
                            </td>

                            <td class="px-5 py-4 text-slate-400">
                                ${escaparHTML(profesor.correo || 'Sin correo')}
                            </td>

                            <td class="px-5 py-4">
                                ${profesor.activo
                                    ? '<span class="text-emerald-300">Activo</span>'
                                    : '<span class="text-rose-300">Inactivo</span>'}
                            </td>

                            <td class="px-5 py-4 text-slate-400">
                                ${profesor.creado_en
                                    ? new Date(profesor.creado_en).toLocaleDateString('es-MX')
                                    : 'Sin fecha'}
                            </td>

                            <td class="px-5 py-4">
                                <button
                                    class="btnCambiarEstado px-3 py-2 rounded-lg text-xs font-bold ${
                                        profesor.activo
                                            ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                                            : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                                    }"
                                    data-id="${profesor.id}"
                                    data-activo="${profesor.activo}">
                                    ${profesor.activo ? 'Desactivar' : 'Activar'}
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    lista.querySelectorAll('.btnCambiarEstado').forEach(boton => {
        boton.addEventListener('click', async () => {
            const id = boton.dataset.id;
            const actualmenteActivo = boton.dataset.activo === 'true';
            const nuevoEstado = !actualmenteActivo;

            const accion = nuevoEstado ? 'activar' : 'desactivar';

            if (!confirm(`¿Seguro que deseas ${accion} esta cuenta de profesor?`)) {
                return;
            }

            boton.disabled = true;
            boton.textContent = 'Actualizando...';

            try {
                const { data: actualizado, error } = await supabase
                    .from('perfiles')
                    .update({ activo: nuevoEstado })
                    .eq('id', id)
                    .eq('rol', 'profesor')
                    .select('id');

                if (error) throw error;

                if (!actualizado || actualizado.length === 0) {
                    throw new Error('No se pudo actualizar el perfil. Verifica los permisos.');
                }

                alert(nuevoEstado
                    ? 'La cuenta fue activada.'
                    : 'La cuenta fue desactivada.');

                await cargarProfesores();

            } catch (error) {
                console.error('Error al cambiar estado:', error);
                alert('No se pudo actualizar: ' + error.message);

                boton.disabled = false;
                boton.textContent = actualmenteActivo
                    ? 'Desactivar'
                    : 'Activar';
            }
        });
    });
}

async function cargarMaterias() {
    contenido.innerHTML = `
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
                <h2 class="font-display text-2xl font-bold text-white">
                    Gestión de materias
                </h2>
                <p class="text-sm text-slate-400 mt-1">
                    Registra y administra las materias de la plataforma.
                </p>
            </div>

            <button id="btnNuevaMateria"
                class="px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold">
                <i class="fa-solid fa-book-medical mr-2"></i>
                Nueva materia
            </button>
        </div>

        <div id="formularioMateria"
            class="hidden mb-6 p-6 rounded-2xl border border-slate-700 bg-slate-800/60">

            <h3 id="tituloFormularioMateria"
                class="font-display text-lg font-bold text-white mb-4">
                Registrar materia
            </h3>

            <form id="formMateria" class="space-y-4">
                <div>
                    <label class="block text-sm text-slate-300 mb-2">
                        Nombre de la materia
                    </label>

                    <input id="nombreMateria" type="text" required maxlength="120"
                        class="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white"
                        placeholder="Ej. Programación">
                </div>

                <div class="flex flex-wrap gap-3">
                    <button type="submit" id="btnGuardarMateria"
                        class="px-5 py-3 rounded-xl bg-indigo-600 text-white text-sm font-bold">
                        Guardar materia
                    </button>

                    <button type="button" id="btnCancelarMateria"
                        class="px-5 py-3 rounded-xl bg-slate-700 text-white text-sm font-bold">
                        Cancelar
                    </button>
                </div>

                <p id="mensajeMateria" class="text-sm hidden"></p>
            </form>
        </div>

        <div id="listaMaterias"></div>
    `;

    const formulario = document.getElementById('formularioMateria');
    const form = document.getElementById('formMateria');
    const campoNombre = document.getElementById('nombreMateria');
    const mensaje = document.getElementById('mensajeMateria');
    const botonGuardar = document.getElementById('btnGuardarMateria');

    let materiaEditando = null;

    document.getElementById('btnNuevaMateria').addEventListener('click', () => {
        materiaEditando = null;
        form.reset();

        document.getElementById('tituloFormularioMateria').textContent =
            'Registrar materia';

        botonGuardar.textContent = 'Guardar materia';
        formulario.classList.remove('hidden');
        campoNombre.focus();
    });

    document.getElementById('btnCancelarMateria').addEventListener('click', () => {
        formulario.classList.add('hidden');
        form.reset();
        materiaEditando = null;
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const nombre = campoNombre.value.trim();

        if (!nombre) {
            alert('Escribe el nombre de la materia.');
            return;
        }

        botonGuardar.disabled = true;
        botonGuardar.textContent = 'Guardando...';

        try {
            if (materiaEditando) {
                const { error } = await supabase
                    .from('materias')
                    .update({ nombre })
                    .eq('id', materiaEditando);

                if (error) throw error;

                alert('Materia actualizada correctamente.');
            } else {
                const { data: sesion } = await supabase.auth.getSession();
                const usuario = sesion.session?.user;

                if (!usuario) {
                    throw new Error('Tu sesión ha expirado. Inicia sesión nuevamente.');
                }

                const { error } = await supabase
                    .from('materias')
                    .insert({
                        nombre,
                        creada_por: usuario.id
                    });

                if (error) throw error;

                alert('Materia registrada correctamente.');
            }

            form.reset();
            formulario.classList.add('hidden');
            materiaEditando = null;

            await cargarMaterias();

        } catch (error) {
            console.error('Error al guardar materia:', error);

            mensaje.className = 'text-sm text-rose-300';
            mensaje.textContent = error.message;
        } finally {
            botonGuardar.disabled = false;
            botonGuardar.textContent = materiaEditando
                ? 'Actualizar materia'
                : 'Guardar materia';
        }
    });

    const lista = document.getElementById('listaMaterias');

    lista.innerHTML = `
        <p class="text-slate-400 text-sm">Cargando materias...</p>
    `;

    const { data: materias, error } = await supabase
        .from('materias')
        .select('id, nombre, creada_en')
        .order('nombre', { ascending: true });

    if (error) {
        lista.innerHTML = `
            <p class="text-rose-300">
                No se pudieron cargar las materias.
            </p>
        `;
        console.error(error);
        return;
    }

    if (!materias || materias.length === 0) {
        lista.innerHTML = `
            <div class="rounded-2xl border border-slate-700 bg-slate-800/50 p-8 text-center">
                <i class="fa-solid fa-book-open text-4xl text-slate-500 mb-4"></i>

                <h3 class="text-lg font-bold text-white mb-2">
                    No hay materias registradas
                </h3>

                <p class="text-sm text-slate-400">
                    Utiliza el botón Nueva materia para comenzar.
                </p>
            </div>
        `;
        return;
    }

    lista.innerHTML = `
        <div class="overflow-x-auto rounded-2xl border border-slate-700">
            <table class="w-full text-sm text-left">
                <thead class="bg-slate-800 text-slate-300">
                    <tr>
                        <th class="px-5 py-4">Materia</th>
                        <th class="px-5 py-4">Fecha de registro</th>
                        <th class="px-5 py-4">Acciones</th>
                    </tr>
                </thead>

                <tbody class="divide-y divide-slate-700 bg-slate-900/50">
                    ${materias.map(materia => `
                        <tr>
                            <td class="px-5 py-4 text-white font-semibold">
                                ${escaparHTML(materia.nombre)}
                            </td>

                            <td class="px-5 py-4 text-slate-400">
                                ${materia.creada_en
                                    ? new Date(materia.creada_en).toLocaleDateString('es-MX')
                                    : 'Sin fecha'}
                            </td>

                            <td class="px-5 py-4">
                                <div class="flex flex-wrap gap-2">
                                    <button
                                        class="btnEditarMateria px-3 py-2 rounded-lg text-xs font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30"
                                        data-id="${materia.id}"
                                        data-nombre="${escaparHTML(materia.nombre)}">
                                        <i class="fa-solid fa-pen mr-1"></i>
                                        Editar
                                    </button>

                                    <button
                                        class="btnEliminarMateria px-3 py-2 rounded-lg text-xs font-bold bg-rose-500/10 text-rose-300 border border-rose-500/30"
                                        data-id="${materia.id}"
                                        data-nombre="${escaparHTML(materia.nombre)}">
                                        <i class="fa-solid fa-trash mr-1"></i>
                                        Eliminar
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    lista.querySelectorAll('.btnEditarMateria').forEach(boton => {
        boton.addEventListener('click', () => {
            materiaEditando = boton.dataset.id;

            campoNombre.value = boton.dataset.nombre;

            document.getElementById('tituloFormularioMateria').textContent =
                'Editar materia';

            botonGuardar.textContent = 'Actualizar materia';

            formulario.classList.remove('hidden');
            campoNombre.focus();
        });
    });

    lista.querySelectorAll('.btnEliminarMateria').forEach(boton => {
        boton.addEventListener('click', async () => {
            const id = boton.dataset.id;
            const nombre = boton.dataset.nombre;

            if (!confirm(`¿Seguro que deseas eliminar la materia "${nombre}"?`)) {
                return;
            }

            boton.disabled = true;
            boton.textContent = 'Eliminando...';

            try {
                const { error } = await supabase
                    .from('materias')
                    .delete()
                    .eq('id', id);

                if (error) throw error;

                alert('Materia eliminada correctamente.');
                await cargarMaterias();

            } catch (error) {
                console.error('Error al eliminar materia:', error);

                alert(
                    'No se pudo eliminar la materia. Es posible que esté relacionada con cuestionarios existentes.\n\n' +
                    error.message
                );

                boton.disabled = false;
                boton.textContent = 'Eliminar';
            }
        });
    });
}

async function cargarCuestionarios() {
    contenido.innerHTML = `
        <div class="mb-6">
            <h2 class="font-display text-2xl font-bold text-white">
                Gestión de cuestionarios
            </h2>
            <p class="text-sm text-slate-400 mt-1">
                Consulta los cuestionarios creados por los profesores.
            </p>
        </div>

        <div id="listaCuestionarios">
            <p class="text-slate-400 text-sm">Cargando cuestionarios...</p>
        </div>
    `;

    const lista = document.getElementById('listaCuestionarios');

    const { data: cuestionarios, error } = await supabase
        .from('cuestionarios')
        .select(`
            id,
            titulo,
            materia_nombre,
            tema,
            cantidad_preguntas,
            dificultad,
            estado,
            creado_en
        `)
        .order('creado_en', { ascending: false });

    if (error) {
        console.error('Error al cargar cuestionarios:', error);

        lista.innerHTML = `
            <div class="p-5 rounded-xl border border-rose-500/30 bg-rose-500/10">
                <p class="text-rose-300">
                    No se pudieron cargar los cuestionarios.
                </p>
                <p class="text-sm text-slate-400 mt-2">
                    ${escaparHTML(error.message)}
                </p>
            </div>
        `;
        return;
    }

    if (!cuestionarios || cuestionarios.length === 0) {
        lista.innerHTML = `
            <div class="rounded-2xl border border-slate-700 bg-slate-800/50 p-8 text-center">
                <i class="fa-solid fa-clipboard-list text-4xl text-slate-500 mb-4"></i>
                <h3 class="text-lg font-bold text-white mb-2">
                    No hay cuestionarios registrados
                </h3>
                <p class="text-sm text-slate-400">
                    Cuando los profesores creen cuestionarios, aparecerán aquí.
                </p>
            </div>
        `;
        return;
    }

    lista.innerHTML = `
        <div class="overflow-x-auto rounded-2xl border border-slate-700">
            <table class="w-full text-sm text-left">
                <thead class="bg-slate-800 text-slate-300">
                    <tr>
                        <th class="px-5 py-4">Cuestionario</th>
                        <th class="px-5 py-4">Materia</th>
                        <th class="px-5 py-4">Tema</th>
                        <th class="px-5 py-4">Preguntas</th>
                        <th class="px-5 py-4">Dificultad</th>
                        <th class="px-5 py-4">Estado</th>
                        <th class="px-5 py-4">Fecha</th>
                    </tr>
                </thead>

                <tbody class="divide-y divide-slate-700 bg-slate-900/50">
                    ${cuestionarios.map(c => `
                        <tr>
                            <td class="px-5 py-4 text-white font-semibold">
                                ${escaparHTML(c.titulo)}
                            </td>

                            <td class="px-5 py-4 text-slate-300">
                                ${escaparHTML(c.materia_nombre || 'Sin materia')}
                            </td>

                            <td class="px-5 py-4 text-slate-400">
                                ${escaparHTML(c.tema || 'Sin tema')}
                            </td>

                            <td class="px-5 py-4 text-slate-300">
                                ${c.cantidad_preguntas ?? 0}
                            </td>

                            <td class="px-5 py-4 text-slate-300">
                                ${escaparHTML(c.dificultad || 'No definida')}
                            </td>

                            <td class="px-5 py-4 text-slate-300">
                                ${escaparHTML(c.estado || 'Sin estado')}
                            </td>

                            <td class="px-5 py-4 text-slate-400">
                                ${c.creado_en
                                    ? new Date(c.creado_en).toLocaleDateString('es-MX')
                                    : 'Sin fecha'}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <p class="text-xs text-slate-500 mt-4">
            Total de cuestionarios: ${cuestionarios.length}
        </p>
    `;
}

async function cargarSupervision() {
    contenido.innerHTML = `
        <div class="mb-6">
            <h2 class="font-display text-2xl font-bold text-white">
                Supervisión de actividad
            </h2>
            <p class="text-sm text-slate-400 mt-1">
                Consulta los intentos, eventos y usos de IA registrados durante los exámenes.
            </p>
        </div>

        <div id="resumenSupervision"
            class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div class="glass-card rounded-2xl p-5">
                <p class="text-sm text-slate-400">Intentos registrados</p>
                <p id="totalIntentos" class="text-2xl font-bold text-white mt-2">—</p>
            </div>

            <div class="glass-card rounded-2xl p-5">
                <p class="text-sm text-slate-400">Eventos registrados</p>
                <p id="totalEventos" class="text-2xl font-bold text-white mt-2">—</p>
            </div>

            <div class="glass-card rounded-2xl p-5">
                <p class="text-sm text-slate-400">Usos de IA</p>
                <p id="totalUsosIA" class="text-2xl font-bold text-white mt-2">—</p>
            </div>
        </div>

        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h3 class="text-lg font-bold text-white">Actividad reciente</h3>

            <button id="btnActualizarSupervision"
                class="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-sm font-semibold">
                <i class="fa-solid fa-rotate mr-2"></i>
                Actualizar
            </button>
        </div>

        <div id="listaSupervision">
            <p class="text-slate-400 text-sm">Cargando actividad...</p>
        </div>
    `;

    const lista = document.getElementById('listaSupervision');

    document.getElementById('btnActualizarSupervision')
        .addEventListener('click', cargarSupervision);

    try {
        const [resultadoIntentos, resultadoEventos, resultadoUsos] =
            await Promise.all([
                supabase
                    .from('intentos')
                    .select(`
                        id,
                        cuestionario_id,
                        nombre_alumno,
                        matricula,
                        grupo,
                        iniciado_en,
                        finalizado_en,
                        estado,
                        total_preguntas,
                        respuestas_correctas,
                        calificacion
                    `)
                    .order('iniciado_en', { ascending: false })
                    .limit(100),

                supabase
                    .from('eventos_supervision')
                    .select(`
                        id,
                        intento_id,
                        tipo_evento,
                        registrado_en,
                        detalles
                    `)
                    .order('registrado_en', { ascending: false })
                    .limit(100),

                supabase
                    .from('usos_ia')
                    .select(`
                        id,
                        intento_id,
                        pregunta_id,
                        tipo_uso,
                        registrado_en,
                        proveedor
                    `)
                    .order('registrado_en', { ascending: false })
                    .limit(100)
            ]);

        if (resultadoIntentos.error) throw resultadoIntentos.error;
        if (resultadoEventos.error) throw resultadoEventos.error;
        if (resultadoUsos.error) throw resultadoUsos.error;

        const intentos = resultadoIntentos.data || [];
        const eventos = resultadoEventos.data || [];
        const usosIA = resultadoUsos.data || [];

        document.getElementById('totalIntentos').textContent =
            intentos.length;

        document.getElementById('totalEventos').textContent =
            eventos.length;

        document.getElementById('totalUsosIA').textContent =
            usosIA.length;

        const mapaIntentos = new Map(
            intentos.map(intento => [intento.id, intento])
        );

        const actividad = [];

        intentos.forEach(intento => {
            actividad.push({
                fecha: intento.iniciado_en,
                tipo: 'Intento de examen',
                alumno: intento.nombre_alumno,
                matricula: intento.matricula,
                grupo: intento.grupo,
                descripcion: `Estado: ${intento.estado || 'Sin estado'}`,
                detalle: [
                    `Preguntas: ${intento.total_preguntas ?? '—'}`,
                    `Respuestas correctas: ${intento.respuestas_correctas ?? '—'}`,
                    `Calificación: ${intento.calificacion ?? 'Pendiente'}`
                ].join(' · ')
            });
        });

        eventos.forEach(evento => {
            const intento = mapaIntentos.get(evento.intento_id);

            actividad.push({
                fecha: evento.registrado_en,
                tipo: `Evento: ${evento.tipo_evento}`,
                alumno: intento?.nombre_alumno || 'No disponible',
                matricula: intento?.matricula || 'No disponible',
                grupo: intento?.grupo || 'No disponible',
                descripcion: 'Evento de supervisión',
                detalle: evento.detalles
                    ? JSON.stringify(evento.detalles)
                    : 'Sin detalles adicionales'
            });
        });

        usosIA.forEach(uso => {
            const intento = mapaIntentos.get(uso.intento_id);

            actividad.push({
                fecha: uso.registrado_en,
                tipo: 'Uso de inteligencia artificial',
                alumno: intento?.nombre_alumno || 'No disponible',
                matricula: intento?.matricula || 'No disponible',
                grupo: intento?.grupo || 'No disponible',
                descripcion: `Proveedor: ${uso.proveedor || 'No especificado'}`,
                detalle: [
                    `Tipo de uso: ${uso.tipo_uso || 'No especificado'}`,
                    `Pregunta: ${uso.pregunta_id || 'No disponible'}`
                ].join(' · ')
            });
        });

        actividad.sort((a, b) =>
            new Date(b.fecha || 0) - new Date(a.fecha || 0)
        );

        if (actividad.length === 0) {
            lista.innerHTML = `
                <div class="rounded-2xl border border-slate-700 bg-slate-800/50 p-8 text-center">
                    <i class="fa-solid fa-eye text-4xl text-slate-500 mb-4"></i>

                    <h3 class="text-lg font-bold text-white mb-2">
                        Sin actividad registrada
                    </h3>

                    <p class="text-sm text-slate-400">
                        Cuando se realicen exámenes, la actividad aparecerá aquí.
                    </p>
                </div>
            `;
            return;
        }

        lista.innerHTML = `
            <div class="overflow-x-auto rounded-2xl border border-slate-700">
                <table class="w-full text-sm text-left">
                    <thead class="bg-slate-800 text-slate-300">
                        <tr>
                            <th class="px-4 py-4">Fecha</th>
                            <th class="px-4 py-4">Actividad</th>
                            <th class="px-4 py-4">Alumno</th>
                            <th class="px-4 py-4">Matrícula</th>
                            <th class="px-4 py-4">Grupo</th>
                            <th class="px-4 py-4">Detalles</th>
                        </tr>
                    </thead>

                    <tbody class="divide-y divide-slate-700 bg-slate-900/50">
                        ${actividad.map(item => `
                            <tr>
                                <td class="px-4 py-4 text-slate-400 whitespace-nowrap">
                                    ${item.fecha
                                        ? new Date(item.fecha).toLocaleString('es-MX')
                                        : 'Sin fecha'}
                                </td>

                                <td class="px-4 py-4 text-indigo-300 font-semibold">
                                    ${escaparHTML(item.tipo)}
                                </td>

                                <td class="px-4 py-4 text-white">
                                    ${escaparHTML(item.alumno || 'No disponible')}
                                </td>

                                <td class="px-4 py-4 text-slate-300">
                                    ${escaparHTML(item.matricula || 'No disponible')}
                                </td>

                                <td class="px-4 py-4 text-slate-300">
                                    ${escaparHTML(item.grupo || 'No disponible')}
                                </td>

                                <td class="px-4 py-4 text-slate-400 min-w-64 max-w-md break-words">
                                    <p>${escaparHTML(item.descripcion)}</p>
                                    <p class="text-xs text-slate-500 mt-1">
                                        ${escaparHTML(item.detalle)}
                                    </p>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <p class="text-xs text-slate-500 mt-4">
                Se muestran hasta 100 registros por cada tipo de actividad.
            </p>
        `;

    } catch (error) {
        console.error('Error al cargar supervisión:', error);

        lista.innerHTML = `
            <div class="p-5 rounded-xl border border-rose-500/30 bg-rose-500/10">
                <h3 class="font-bold text-rose-300 mb-2">
                    No se pudo cargar la actividad
                </h3>

                <p class="text-sm text-slate-300">
                    ${escaparHTML(error.message)}
                </p>
            </div>
        `;
    }
}
btnProfesores?.addEventListener('click', cargarProfesores);
btnMaterias?.addEventListener('click', cargarMaterias);
btnCuestionarios?.addEventListener('click', cargarCuestionarios);
btnSupervision?.addEventListener('click', cargarSupervision);

btnCerrarSesion.addEventListener('click', async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
        alert('No se pudo cerrar la sesión.');
        console.error(error);
        return;
    }

    window.location.href = 'login.html';
});

verificarAdministrador();
