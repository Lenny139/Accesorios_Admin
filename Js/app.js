document.addEventListener("DOMContentLoaded", function () {
    const contenido = document.getElementById("contenido");
    const links = document.querySelectorAll(".nav-link");
    const botonesCategoria = document.querySelectorAll(".boton-categoria");

    // Función para cargar contenido dinámico
    function cargarPagina(url, agregarHistorial = true) {
        fetch(`./${url}`)
            .then(response => response.text())
            .then(data => {
                if (!contenido) {
                    console.error("El contenedor #contenido no se encontró en el DOM.");
                    return;
                }
                contenido.innerHTML = data;
                if (agregarHistorial) {
                    history.pushState({ page: url }, "", `#${url}`);
                }
                if (url === "PrincipalAdmin.html") {
                    agregarEventosInicio(); // agrega los eventos de la pagina de inicio
                }
                if (url === "Desicion.html") {
                    agregarEventosCategoriaParqueo();
                }
            })
            .catch(error => console.error("Error al cargar la página:", error));
    }

    // Manejar clics en los enlaces de navegación
    links.forEach(link => {
        link.addEventListener("click", function (event) {
            event.preventDefault();
            const page = this.getAttribute("data-page");
            cargarPagina(page);
        });
    });
    // Manejar clics en los botones de categorías
    function agregarEventosInicio() {
        const botonesCategoria = document.querySelectorAll(".boton-categoria");
        const tituloSeccion = document.querySelector(".seccion-nombre"); // << AQUÍ estaba el error, faltaba esta línea
    
        botonesCategoria.forEach(boton => {
            boton.addEventListener("click", function () {
                const tipo = this.getAttribute("data-tipo");
    
                if (tipo && tituloSeccion) {
                    // Formatear el tipo bonito
                    const formateado = tipo
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, l => l.toUpperCase());
    
                    // Cambiar el texto de la sección
                    tituloSeccion.textContent = `Accesorios de ${formateado}`;
                }
    
                // Luego de cambiar el texto, ir a la otra página
                const pagina = `Desicion.html`;
                cargarPagina(pagina);
            });
        });
    }
    
    // Función para agregar eventos y accesorios en categoria_parqueo.html se uso json de prueba
    function agregarEventosCategoriaParqueo() {
        const botonAgregar = document.querySelector('button[data-tipo="agregar"]');
        const botonEliminar = document.querySelector('button[data-tipo="eliminar"]');
        const botonModificar = document.querySelector('button[data-tipo="modificar"]');
        const botonVolver = document.querySelector('button[data-tipo="volver');
        
        if (botonAgregar) {
            botonAgregar.addEventListener("click", () => {
                cargarPagina("Agregar.html");
            });
        }
        if (botonEliminar) {
            botonEliminar.addEventListener("click", () => {
                cargarPagina("Eliminar.html");
            });
        }
        if (botonModificar) {
            botonModificar.addEventListener("click", () => {
                cargarPagina("Modificar.html");
            });
        }
        if (botonVolver) {
            botonVolver.addEventListener("click", () => {
                cargarPagina("PrincipalAdmin.html");
            });
        }
    }

    // Manejar el botón de atrás/adelante del navegador
    window.onpopstate = function (event) {
        if (event.state && event.state.page) {
            cargarPagina(event.state.page, false);
        }
    };

    // Cargar la página inicial si hay una URL en el hash
    const initialPage = location.hash ? location.hash.substring(1) : "PrincipalAdmin.html";
    cargarPagina(initialPage, false);
});
document.addEventListener('scroll', () => {
    const header = document.getElementById('header'); // Selects the header element by its ID

    // Adds or removes the 'scrolled' class based on the scroll position
    if (window.scrollY > 50) {
        header.classList.add('scrolled'); // Adds the 'scrolled' class if the scroll position is greater than 50 pixels
    } else {
        header.classList.remove('scrolled'); // Removes the 'scrolled' class if the scroll position is 50 pixels or less
    }
});


