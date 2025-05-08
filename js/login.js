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
            const response = await fetch('http://192.168.28.131:8080/autenticacion/validacion', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                    // REMOVER el header Authorization del login
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Credenciales incorrectas');
        }

        return data;
    } catch (error) {
        if (error.message === 'Failed to fetch') {
            throw new Error('No se pudo conectar con el servidor. Verifique su conexión e intente nuevamente.');
        }
        throw error;
    }
}

function handleSuccessfulLogin(data) {
    // Guardar token y datos de usuario
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('userData', JSON.stringify({
        email: data.email,
        userId: data.userId,
        userType: data.userType
    }));

    // Redirigir al panel de administración
    window.location.href = 'PanelAdmin.html';
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

    const errorElement = document.getElementById('login-error');
    if (errorElement) {
        errorElement.textContent = error.message;
        errorElement.style.display = 'block';
    }

    if (error.message.includes('credenciales')) {
        document.getElementById('email').style.borderColor = 'var(--danger)';
        document.getElementById('password').style.borderColor = 'var(--danger)';
    }

    setTimeout(() => {
        if (errorElement) {
            errorElement.style.display = 'none';
            document.getElementById('email').style.borderColor = '';
            document.getElementById('password').style.borderColor = '';
        }
    }, 5000);
}

// Verificar autenticación al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    if (localStorage.getItem('authToken')) {
        window.location.href = 'PanelAdmin.html';
    }
});