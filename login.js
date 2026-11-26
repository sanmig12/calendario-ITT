
import { supabase } from './supabase.js';

// Elementos de la pantalla
const selectorAcceso = document.getElementById('selectorAcceso');

const formProfesor = document.getElementById('formProfesor');
const formAlumno = document.getElementById('formAlumno');

const btnProfesor = document.getElementById('btnProfesor');
const btnAlumno = document.getElementById('btnAlumno');

const volverProfesor = document.getElementById('volverProfesor');
const volverAlumno = document.getElementById('volverAlumno');

const mensajeLogin = document.getElementById('mensajeLogin');

// Mostrar mensajes
function mostrarMensaje(texto, tipo = 'error') {
    mensajeLogin.textContent = texto;
    mensajeLogin.className = `mensaje-login ${tipo}`;
}

// Limpiar mensajes
function limpiarMensaje() {
    mensajeLogin.textContent = '';
    mensajeLogin.className = 'mensaje-login';
}

// Cambiar entre los tipos de acceso
function mostrarFormulario(tipo) {
    limpiarMensaje();

    selectorAcceso.classList.add('oculto');
    formProfesor.classList.add('oculto');
    formAlumno.classList.add('oculto');

    if (tipo === 'profesor') {
        formProfesor.classList.remove('oculto');
    } else {
        formAlumno.classList.remove('oculto');
    }
}

// Volver al selector
function volverAlSelector() {
    formProfesor.classList.add('oculto');
    formAlumno.classList.add('oculto');
    selectorAcceso.classList.remove('oculto');
    limpiarMensaje();
}

// Eventos de selección
btnProfesor.addEventListener('click', () => {
    mostrarFormulario('profesor');
});

btnAlumno.addEventListener('click', () => {
    mostrarFormulario('alumno');
});

volverProfesor.addEventListener('click', volverAlSelector);
volverAlumno.addEventListener('click', volverAlSelector);


// =====================================
// INICIO DE SESIÓN DEL PROFESOR
// =====================================

formProfesor.addEventListener('submit', async (event) => {
    event.preventDefault();
    limpiarMensaje();

    const correo = document.getElementById('correoProfesor').value.trim();
    const password = document.getElementById('passwordProfesor').value;

    const boton = formProfesor.querySelector('.btn-ingresar');

    boton.disabled = true;
    boton.textContent = 'Verificando acceso...';

    try {
        // Autenticar con Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
            email: correo,
            password: password
        });

        if (error) {
            throw error;
        }

// Comprobar el perfil y los permisos del usuario
const { data: perfil, error: errorPerfil } = await supabase
    .from('perfiles')
    .select('rol, activo')
    .eq('id', data.user.id)
    .single();

if (
    errorPerfil ||
    !perfil ||
    !perfil.activo ||
    !['profesor', 'administrador'].includes(perfil.rol)
) {
    await supabase.auth.signOut();

    throw new Error(
        'Tu cuenta no tiene permisos para ingresar.'
    );
}

mostrarMensaje('Acceso correcto. Entrando...', 'exito');

// Redirigir según el rol
if (perfil.rol === 'administrador') {
    window.location.href = 'admin.html';
} else {
    window.location.href = 'profesor.html';
}

    } catch (error) {
        console.error('Error de inicio de sesión:', error);

        mostrarMensaje(
            error.message || 'No fue posible iniciar sesión.'
        );

    } finally {
        boton.disabled = false;
        boton.textContent = 'Iniciar sesión';
    }
});


// =====================================
// INICIO DE SESIÓN DEL ALUMNO
// =====================================

formAlumno.addEventListener('submit', async (event) => {
    event.preventDefault();
    limpiarMensaje();

    const matricula = document
        .getElementById('matriculaAlumno')
        .value.trim();

    const contrasena = document
        .getElementById('passwordAlumno')
        .value;

    const codigo = document
        .getElementById('codigoClase')
        .value.trim()
        .toUpperCase();

    const boton = formAlumno.querySelector('.btn-ingresar');

    boton.disabled = true;
    boton.textContent = 'Verificando acceso...';

    try {
        if (!matricula || !contrasena || !codigo) {
            throw new Error('Completa todos los campos.');
        }

        const { data, error } = await supabase.functions.invoke(
            'alumno-login',
            {
                body: {
                    codigo_acceso: codigo,
                    matricula: matricula,
                    contrasena: contrasena
                }
            }
        );

        if (error) {
            console.error('Error de conexión:', error);

            throw new Error(
                'No se pudo conectar con el servidor. Intenta nuevamente.'
            );
        }

        if (!data || !data.exito) {
            throw new Error(
                data?.mensaje || 'No fue posible validar el acceso.'
            );
        }

        // Guardar la sesión temporal del alumno
        sessionStorage.setItem('alumno_token', data.token);
        sessionStorage.setItem('alumno_nombre', data.alumno.nombre);
        sessionStorage.setItem('alumno_matricula', data.alumno.matricula);
        sessionStorage.setItem('alumno_clase_id', data.clase_id);
        sessionStorage.setItem('alumno_expira_en', data.expira_en);

        mostrarMensaje(
            `¡Bienvenido, ${data.alumno.nombre}!`,
            'exito'
        );

    } catch (error) {
        console.error('Error del alumno:', error);
        mostrarMensaje(error.message);

    } finally {
        boton.disabled = false;
        boton.textContent = 'Iniciar sesión';
    }
});