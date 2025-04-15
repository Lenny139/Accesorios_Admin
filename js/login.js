document.getElementById('adminLoginForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    resetErrors();

    if (!validateInputs(email, password)) return;

    const submitBtn = e.target.querySelector('button[type="submit"]');
    startLoading(submitBtn);

    try {
        const response = await authenticateUser(email, password);
        handleSuccessfulLogin(response);
    } catch (error) {
        handleLoginError(error);
    } finally {
        stopLoading(submitBtn);
    }
});

async function authenticateUser(email, password) {
    try {
        const response = await fetch('http://localhost:8080/autenticacion/validacion', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Credenciales incorrectas');
        }

        console.log('Respuesta backend:', data); // DEBUG
        return data;
    } catch (error) {
        if (error.message === 'Failed to fetch') {
            throw new Error('No se pudo conectar con el servidor. Verifique su conexión e intente nuevamente.');
        }
        throw error;
    }
}

function handleSuccessfulLogin(data) {
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('userData', JSON.stringify({
        email: data.email,
        userId: data.userId,
        userType: data.userType
    }));

    loadAdminPanel();
}

async function loadAdminPanel() {
    try {
        const response = await fetch('PanelAdmin.html'); // Carga desde el mismo frontend
        if (!response.ok) throw new Error('No se pudo cargar el panel');

        const html = await response.text();
        document.open();
        document.write(html);
        document.close();

        // Reinyecta los scripts necesarios, si es que no se cargan con document.write
        setTimeout(() => {
            const scripts = [
                '../js/app.js', // <- Reemplaza con tus rutas reales
            ];

            scripts.forEach(src => {
                const script = document.createElement('script');
                script.src = src;
                script.defer = true;
                document.body.appendChild(script);
            });
        }, 0);
    } catch (error) {
        console.error('Error cargando el panel:', error);
        window.location.href = 'PanelAdmin.html'; // Fallback
    }
}
function resetErrors() {
    const errorElements = document.querySelectorAll('.error-message');
    errorElements.forEach(element => {
        element.style.display = 'none';
        element.textContent = '';
    });

    const loginError = document.getElementById('login-error');
    if (loginError) {
        loginError.style.display = 'none';
        loginError.textContent = '';
    }
}

function validateInputs(email, password) {
    let isValid = true;

    if (!email) {
        showError('email-error', 'El correo electrónico es requerido');
        isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showError('email-error', 'Por favor ingrese un correo válido');
        isValid = false;
    }

    if (!password) {
        showError('password-error', 'La contraseña es requerida');
        isValid = false;
    } else if (password.length < 6) {
        showError('password-error', 'La contraseña debe tener al menos 6 caracteres');
        isValid = false;
    }

    return isValid;
}

function showError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
    }
}

function startLoading(button) {
    if (!button) return;

    button.innerHTML = `
            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            Autenticando...
        `;
    button.disabled = true;
}

function stopLoading(button) {
    if (!button) return;

    button.innerHTML = 'Ingresar';
    button.disabled = false;
}

function handleLoginError(error) {
    console.error('Error en autenticación:', error);

    // Mostrar error en el contenedor general
    const errorElement = document.getElementById('login-error');
    if (errorElement) {
        errorElement.textContent = error.message;
        errorElement.style.display = 'block';
    }

    // También puedes resaltar los campos si lo deseas
    if (error.message.includes('credenciales')) {
        document.getElementById('email').style.borderColor = 'var(--danger)';
        document.getElementById('password').style.borderColor = 'var(--danger)';
    }

    // Ocultar después de 5 segundos
    setTimeout(() => {
        if (errorElement) {
            errorElement.style.display = 'none';
            // Restablecer bordes
            document.getElementById('email').style.borderColor = '';
            document.getElementById('password').style.borderColor = '';
        }
    }, 5000);
}

function checkAuthOnLoad() {
    const authToken = localStorage.getItem('authToken');
    const protectedPages = ['dashboard.html', 'panel.html'];
    const currentPage = window.location.pathname.split('/').pop();

    if (protectedPages.includes(currentPage)) {
        if (!authToken) {
            window.location.href = 'login.html';
        } else {
            validateTokenWithBackend(authToken);
        }
    }
}

async function validateTokenWithBackend(token) {
    try {
        const response = await fetch('http://localhost:8080/api/validate-token', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            window.location.href = 'login.html';
        }
    } catch (error) {
        console.error('Error validando token:', error);
    }
}

document.addEventListener('DOMContentLoaded', function () {
    checkAuthOnLoad();

    if (window.location.pathname.endsWith('login.html') && localStorage.getItem('authToken')) {
        window.location.href = '/PanelAdmin.html';
    }
});