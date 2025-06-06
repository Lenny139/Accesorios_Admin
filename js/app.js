document.addEventListener("DOMContentLoaded", function () {

    // Verificar autenticación al cargar
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
        window.location.href = 'login.html';
        return;
    }

    // Constantes y configuraciones
    const CONFIG = {
        apiBaseUrl: "http://localhost:8080",
        endpoints: {
            items: "/items/public/page",
            itemTypes: "/api/itemtypes",
            discounts: "/api/discounts",
            additionalExpenses: "/additionalExpenses/getall",
            itemDetails: "/items/public",
            updateStock: "/items",  // Nuevo endpoint para actualizar stock
            deleteItem: "/items/delete"     // Nuevo endpoint para eliminar items
        }
    };

    const userData = JSON.parse(localStorage.getItem('userData'));
    if (userData) {
        document.getElementById('current-user').textContent = userData.email;
    }

    // Elementos del DOM
    const DOM = {
        content: document.getElementById("contenido"),
        navLinks: document.querySelectorAll(".nav-link"),
        logoutBtn: document.querySelector(".logout-btn")
    };

    // Módulo de Navegación
    const NavigationManager = {
        init() {
            this.setupNavLinks();
            this.setupPopState();
            this.loadInitialPage();
            this.setupLogout();
        },

        setupNavLinks() {
            DOM.navLinks.forEach(link => {
                // Solo agregar el event listener si no es el enlace de correo
                if (!link.href.includes('192.168.1.8/mail')) {
                    link.addEventListener("click", (event) => {
                        event.preventDefault();
                        this.loadPage(link.getAttribute("data-page"));
                        this.setActiveLink(link);
                    });
                }
            });
        },

        setActiveLink(activeLink) {
            DOM.navLinks.forEach(link => {
                link.classList.remove("active");
            });
            activeLink.classList.add("active");
        },

        setupPopState() {
            window.onpopstate = (event) => {
                if (event.state?.page) {
                    this.loadPage(event.state.page, false);
                }
            };
        },

        loadInitialPage() {
            const initialPage = location.hash ? location.hash.substring(1) : "dashboard.html";
            this.loadPage(initialPage, false);
            this.setActiveLink(document.querySelector(`.nav-link[data-page="${initialPage}"]`) ||
                             document.querySelector('.nav-link[data-page="dashboard.html"]'));
        },

        async loadPage(url, addToHistory = true) {
            try {
                // Mostrar loader
                DOM.content.innerHTML = `
                    <div class="card">
                        <h2 class="card-title">
                            <i class="fas fa-sync-alt fa-spin"></i>
                            Cargando...
                        </h2>
                    </div>
                `;

                if (url === "correo-iframe") {
                    // Caso especial para el cliente de correo
                    DOM.content.innerHTML = `
                        <div class="card fade-in" style="height: calc(100vh - 5rem); padding: 0; overflow: hidden;">
                            <iframe src="https://10.152.190.52/mail" 
                                    style="width: 100%; height: 100%; border: none;"
                                    allow="fullscreen">
                            </iframe>
                        </div>
                    `;
                } else {
                    // Carga normal de páginas
                    const response = await fetch(url);
                    if (!response.ok) throw new Error("Failed to load page");
                    const html = await response.text();

                    // Insertar nuevo contenido con animación
                    DOM.content.innerHTML = html;
                    DOM.content.firstElementChild.classList.add("fade-in");

                    if (url === "items.html") {
                        ItemsManager.init();
                    }else if (url === "facturas.html") {
                        FacturasManager.init();
                    }
                }

                if (addToHistory) {
                    history.pushState({ page: url }, "", `#${url}`);
                }

            } catch (error) {
                console.error("Error loading page:", error);
                DOM.content.innerHTML = `
                    <div class="card fade-in">
                        <h2 class="card-title">
                            <i class="fas fa-exclamation-triangle"></i>
                            Error al cargar la página
                        </h2>
                        <p>${error.message}</p>
                    </div>
                `;
            }
        },

        setupLogout() {
            DOM.logoutBtn.addEventListener("click", () => {
                NotificationManager.showConfirmation(
                    "¿Está seguro que desea cerrar sesión?",
                    () => {
                        const authToken = localStorage.getItem('authToken');

                        // Opcional: Invalidar token en el backend
                        if (authToken) {
                            fetch('http://localhost:8080/api/logout', {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${authToken}`
                                }
                            }).catch(error => console.error('Error al cerrar sesión:', error));
                        }

                        // Limpiar localStorage
                        localStorage.removeItem('authToken');
                        localStorage.removeItem('userData');

                        // Mostrar notificación
                        NotificationManager.showNotification('Sesión cerrada correctamente');

                        // Redireccionar al login después de un breve retraso
                        setTimeout(() => {
                            window.location.href = 'index.html';
                        }, 1000);
                    }
                );
            });
        }
    };

    // Módulo de Notificaciones
    const NotificationManager = {
        // Mostrar notificación toast (éxito/error)
        showNotification(message, type = 'success') {
            const notification = document.getElementById('notification');
            const notificationMessage = document.getElementById('notification-message');
            const notificationTitle = notification.querySelector('.notification-content h4'); // Seleccionamos el título
            const notificationIcon = notification.querySelector('.notification-icon i');
            const progress = notification.querySelector('.notification-progress');

            // Configurar título según el tipo
            const titles = {
                success: 'Éxito',
                error: 'Error',
                warning: 'Advertencia',
                info: 'Información'
            };

            // Configurar según el tipo
            notification.className = 'cart-notification';
            notification.classList.add(type);
            notification.classList.add('visible');

            // Cambiar título e ícono según el tipo
            notificationTitle.textContent = titles[type] || 'Notificación';

            if (type === 'success') {
                notificationIcon.className = 'fas fa-check-circle';
            } else if (type === 'error') {
                notificationIcon.className = 'fas fa-exclamation-circle';
            } else if (type === 'warning') {
                notificationIcon.className = 'fas fa-exclamation-triangle';
            } else {
                notificationIcon.className = 'fas fa-info-circle';
            }

            notificationMessage.textContent = message;

            // Reiniciar animación de progreso
            progress.style.animation = 'none';
            void progress.offsetWidth; // Trigger reflow
            progress.style.animation = 'progress 3s linear';

            // Ocultar después de 3 segundos
            setTimeout(() => {
                notification.classList.remove('visible');
            }, 3000);
        },
        // Mostrar diálogo de confirmación personalizado
        showConfirmation(message, confirmCallback, cancelCallback = null) {
            // Crear elementos
            const overlay = document.createElement('div');
            overlay.className = 'notification-overlay';

            const confirmation = document.createElement('div');
            confirmation.className = 'custom-confirmation';
            confirmation.innerHTML = `
            <h3>Confirmación</h3>
            <p>${message}</p>
            <div class="confirmation-buttons">
                <button class="confirmation-btn cancel-btn">Cancelar</button>
                <button class="confirmation-btn confirm-btn">Confirmar</button>
            </div>
        `;

            // Agregar al DOM
            overlay.appendChild(confirmation);
            document.body.appendChild(overlay);

            // Configurar eventos
            const confirmBtn = confirmation.querySelector('.confirm-btn');
            const cancelBtn = confirmation.querySelector('.cancel-btn');

            confirmBtn.onclick = () => {
                document.body.removeChild(overlay);
                if (confirmCallback) confirmCallback();
            };

            cancelBtn.onclick = () => {
                document.body.removeChild(overlay);
                if (cancelCallback) cancelCallback();
            };

            overlay.onclick = (e) => {
                if (e.target === overlay) {
                    document.body.removeChild(overlay);
                    if (cancelCallback) cancelCallback();
                }
            };
        }
    };

    // Módulo de Gestión de Items
    const ItemsManager = {
        init() {
            this.cacheElements();
            this.setupEventListeners();
            this.loadInitialData();
        },

        cacheElements() {
            this.elements = {
                addItemBtn: document.getElementById('add-item-btn'),
                itemModal: document.getElementById('item-modal'),
                stockModal: document.getElementById('stock-modal'),
                closeModals: document.querySelectorAll('.close-modal, .cancel-btn'),
                itemsTable: document.getElementById('items-table')?.getElementsByTagName('tbody')[0],
                prevPageBtn: document.getElementById('prev-page'),
                nextPageBtn: document.getElementById('next-page'),
                pageInfo: document.querySelector('.page-info'),
                itemSearch: document.getElementById('item-search'),
                itemTypeFilter: document.getElementById('item-type-filter'),
                stockFilter: document.getElementById('stock-filter'),
                hasDiscountSelect: document.getElementById('item-has_discount'),
                discountSection: document.getElementById('discount-section'),
                freeShippingSelect: document.getElementById('item-free_shipping'),
                shippingPriceGroup: document.getElementById('shipping-price-group'),
                itemForm: document.getElementById('item-form')
            };
        },

        setupEventListeners() {
            if (!this.elements.addItemBtn) return;

            // Eventos de filtros y paginación
            this.elements.prevPageBtn?.addEventListener('click', () => this.handlePagination(-1));
            this.elements.nextPageBtn?.addEventListener('click', () => this.handlePagination(1));
            this.elements.itemSearch?.addEventListener('input', () => this.applyFilters());
            this.elements.itemTypeFilter?.addEventListener('change', () => this.applyFilters());
            this.elements.stockFilter?.addEventListener('change', () => this.applyFilters());

            // Eventos de modales
            this.elements.addItemBtn.addEventListener('click', () => this.showItemModal());
            this.elements.closeModals.forEach(btn => {
                btn.addEventListener('click', () => this.closeModals());
            });
            window.addEventListener('click', (event) => {
                if (event.target === this.elements.itemModal) this.elements.itemModal.style.display = 'none';
                if (event.target === this.elements.stockModal) this.elements.stockModal.style.display = 'none';
            });

            // Eventos de formulario
            this.elements.hasDiscountSelect?.addEventListener('change', () => this.toggleDiscountSection());
            this.elements.freeShippingSelect?.addEventListener('change', () => this.toggleShippingPrice());
            document.getElementById('item-image')?.addEventListener('change', (e) => this.handleImagePreview(e));
            this.elements.itemForm?.addEventListener('submit', (e) => this.handleFormSubmit(e));
            document.getElementById('stock-form')?.addEventListener('submit', (e) => this.handleStockUpdate(e));
        },

        loadInitialData() {
            this.currentPage = 1;
            this.totalPages = 1;
            this.allItems = [];

            this.loadItems();
            this.loadItemTypes();
            this.loadAdditionalExpenses();
        },

        // Funciones de carga de datos
        async loadItems(page = 1, search = '', type = '', stock = '') {
            let url = `${CONFIG.apiBaseUrl}${CONFIG.endpoints.items}?page=${page}`;

            // Agregar parámetros de filtro si existen
            if (search) url += `&search=${encodeURIComponent(search)}`;
            if (type) url += `&itemTypeId=${encodeURIComponent(type)}`;

            // Manejar filtro de stock
            if (stock === 'low') {
                url += '&minStock=0&maxStock=5';
            } else if (stock === 'out') {
                url += '&minStock=0&maxStock=0';
            }

            // Mostrar loader inmediatamente
            this.showLoader();

            // Crear una promesa de mínimo 500ms para el loader
            const minLoaderTime = new Promise(resolve => setTimeout(resolve, 500));

            try {

                const fetchPromise  = await fetch(url, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    }
                });

                const [_, response] = await Promise.all([minLoaderTime, fetchPromise]);

                // Verificar si la respuesta fue exitosa (status 200-299)
                if (!response.ok) {
                    const errorData = await response.json().catch(() => null);
                    const errorMessage = errorData?.message || 'Error al cargar los ítems';

                    if (response.status === 404) {
                        // Caso especial para "No se encontraron ítems"
                        this.handleNoItemsFound();
                        return;
                    }

                    throw new Error(errorMessage);
                }

                const data = await response.json();

                // Verificar si hay items
                if (!data.items || data.items.length === 0) {
                    this.handleNoItemsFound();
                    return;
                }

                this.totalPages = data.totalPages;
                this.currentPage = data.currentPage;
                this.allItems = data.items;

                this.updatePagination();
                this.renderItemsTable();

            } catch (error) {
                console.error('Error loading items:', error);

                // Manejar diferentes tipos de errores
                if (error.message === 'Failed to fetch') {
                    // Error de conexión con el servidor
                    NotificationManager.showNotification(
                        'No se pudo conectar con el servidor. Verifique su conexión al servidor.',
                        'error'
                    );
                    this.showConnectionError();
                } else {
                    // Otros errores
                    NotificationManager.showNotification(
                        error.message || 'Error al cargar los ítems',
                        'error'
                    );
                    this.showGenericError();
                }
            }
        },

        // Nuevos métodos auxiliares
        showLoader() {
            if (!this.elements.itemsTable) return;

            this.elements.itemsTable.innerHTML = `
                <tr>
                    <td colspan="10" class="loading-row">
                        <div class="loading-spinner">
                            <i class="fas fa-spinner fa-spin"></i>
                            <span>Cargando ítems...</span>
                        </div>
                    </td>
                </tr>
            `;
        },

        handleNoItemsFound() {
            if (!this.elements.itemsTable) return;

            this.elements.itemsTable.innerHTML = `
                <tr>
                    <td colspan="10" class="no-items-row">
                        <div class="no-items-message">
                            <i class="fas fa-box-open"></i>
                            <span>No se encontraron ítems con los filtros actuales</span>
                        </div>
                        <button class="secondary-btn reset-filters-btn">
                            <i class="fas fa-times"></i> Limpiar filtros
                        </button>
                    </td>
                </tr>
            `;

            // Agregar evento al botón de reset
            document.querySelector('.reset-filters-btn')?.addEventListener('click', () => {
                this.resetFilters();
            });
        },

        showConnectionError() {
            if (!this.elements.itemsTable) return;

            this.elements.itemsTable.innerHTML = `
                <tr>
                    <td colspan="10" class="error-row">
                        <div class="error-message">
                            <i class="fas fa-wifi-slash"></i>
                            <span>Error de conexión con el servidor</span>
                        </div>
                        <button class="secondary-btn retry-btn">
                            <i class="fas fa-sync-alt"></i> Reintentar
                        </button>
                    </td>
                </tr>
            `;

            // Agregar evento al botón de reintentar
            document.querySelector('.retry-btn')?.addEventListener('click', () => {
                this.loadItems(
                    this.currentPage,
                    this.elements.itemSearch?.value,
                    this.elements.itemTypeFilter?.value,
                    this.elements.stockFilter?.value
                );
            });
        },

        showGenericError() {
            if (!this.elements.itemsTable) return;

            this.elements.itemsTable.innerHTML = `
                <tr>
                    <td colspan="10" class="error-row">
                        <div class="error-message">
                            <i class="fas fa-exclamation-triangle"></i>
                            <span>Ocurrió un error al cargar los ítems</span>
                        </div>
                    </td>
                </tr>
            `;
        },

        resetFilters() {
            if (this.elements.itemSearch) this.elements.itemSearch.value = '';
            if (this.elements.itemTypeFilter) this.elements.itemTypeFilter.value = '';
            if (this.elements.stockFilter) this.elements.stockFilter.value = '';

            this.loadItems(1); // Volver a cargar desde la página 1 sin filtros
        },
        async handleStockUpdate(event) {
            event.preventDefault();

            const itemId = document.getElementById('stock-item-id').value;
            const action = document.getElementById('stock-action').value;
            const amount = parseInt(document.getElementById('stock-amount').value);
            const reason = document.getElementById('stock-reason').value;

            const stockUpdateRequest = {
                action: action,
                amount: amount,
                reason: reason
            };

            const saveBtn = document.querySelector('#stock-form .save-btn');
            const originalBtnText = saveBtn.textContent;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualizando...';
            saveBtn.disabled = true;

            try {
                const authToken = localStorage.getItem('authToken');
                if (!authToken) {
                    throw new Error('No se encontró el token de autenticación');
                }

                const response = await fetch(`${CONFIG.apiBaseUrl}${CONFIG.endpoints.updateStock}/${itemId}/stock`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify(stockUpdateRequest)
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Error al actualizar el stock');
                }

                const data = await response.json();
                NotificationManager.showNotification('Stock actualizado con éxito');
                this.elements.stockModal.style.display = 'none';
                this.loadItems(
                    this.currentPage,
                    this.elements.itemSearch?.value,
                    this.elements.itemTypeFilter?.value,
                    this.elements.stockFilter?.value
                );
            } catch (error) {
                console.error('Error al actualizar stock:', error);
                NotificationManager.showNotification(
                    error.message === 'Failed to fetch' ?
                        'Error de conexión con el servidor' :
                        error.message || 'Error al actualizar el stock',
                    'error'
                );
            } finally {
                saveBtn.textContent = originalBtnText;
                saveBtn.disabled = false;
            }
        },
        async loadItemTypes() {
            try {
                const response = await fetch(CONFIG.endpoints.itemTypes);
                const data = await response.json();
                const select = document.getElementById('item-type');

                select.innerHTML = '<option value="">Seleccionar...</option>';
                data.forEach(type => {
                    const option = document.createElement('option');
                    option.value = type.id;
                    option.textContent = type.name;
                    select.appendChild(option);
                });
            } catch (error) {
                console.error('Error loading item types:', error);
                // Cargar tipos por defecto si falla la API
                const defaultTypes = [
                    { id: 'PARQ', name: 'Parqueo' },
                    { id: 'EXT', name: 'Externos' },
                    { id: 'INTE', name: 'Internos' },
                    { id: 'LUCES', name: 'Luces-Led' },
                    { id: 'MOD_ELEVA', name: 'Modulo Elevavidrios' },
                    { id: 'AUDIO', name: 'Audio' }
                ];

                const select = document.getElementById('item-type');
                select.innerHTML = '<option value="">Seleccionar...</option>';
                defaultTypes.forEach(type => {
                    const option = document.createElement('option');
                    option.value = type.id;
                    option.textContent = type.name;
                    select.appendChild(option);
                });
            }
        },

        async loadDiscountOptions() {
            try {
                const response = await fetch(CONFIG.endpoints.discounts);
                const data = await response.json();
                const select = document.getElementById('item-discount');

                select.innerHTML = '<option value="">Seleccionar descuento...</option>';
                data.forEach(discount => {
                    const option = document.createElement('option');
                    option.value = discount.id;
                    option.textContent = `${discount.name} (${discount.value}${discount.ispercentage ? '%' : ' COP'})`;
                    select.appendChild(option);
                });
            } catch (error) {
                console.error('Error loading discounts:', error);
            }
        },

        async loadAdditionalExpenses() {
            try {
                const response = await fetch(`${CONFIG.apiBaseUrl}${CONFIG.endpoints.additionalExpenses}`);
                const data = await response.json();
                const container = document.getElementById('additional-expenses-container');

                container.innerHTML = '';
                data.forEach(exp => {
                    const div = document.createElement('div');
                    div.className = 'expense-option';

                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.id = `expense-${exp.id}`;
                    checkbox.value = exp.id;
                    checkbox.name = 'additional_expenses';

                    const label = document.createElement('label');
                    label.htmlFor = `expense-${exp.id}`;
                    label.textContent = `${exp.name} (+$${exp.expense} COP)`;

                    div.appendChild(checkbox);
                    div.appendChild(label);
                    container.appendChild(div);
                });
            } catch (error) {
                console.error('Error loading additional expenses:', error);
            }
        },

        // Funciones de renderizado
        renderItemsTable() {
            if (!this.elements.itemsTable) return;

            this.elements.itemsTable.innerHTML = '';

            if (this.allItems.length === 0) {
                const row = this.elements.itemsTable.insertRow();
                const cell = row.insertCell(0);
                cell.colSpan = 10;
                cell.textContent = 'No se encontraron ítems';
                cell.style.textAlign = 'center';
                return;
            }

            this.allItems.forEach(item => {
                const row = this.elements.itemsTable.insertRow();

                // ID
                row.insertCell(0).textContent = item.id;

                // Imagen
                const imgCell = row.insertCell(1);
                imgCell.className = 'item-image';
                if (item.imageurl) {
                    const img = document.createElement('img');
                    img.src = `${CONFIG.apiBaseUrl}/uploads/${item.imageurl}`;
                    img.alt = item.name;
                    imgCell.appendChild(img);
                } else {
                    imgCell.innerHTML = '<i class="fas fa-image"></i>';
                }

                // Nombre
                row.insertCell(2).textContent = item.name;

                // Tipo
                row.insertCell(3).textContent = item.itemtype?.name || '';

                // Stock
                const stockCell = row.insertCell(4);
                const stockContainer = document.createElement('div');
                stockContainer.className = 'stock-cell';

                const stockValue = document.createElement('span');
                stockValue.className = 'stock-value';
                stockValue.textContent = item.stock;
                stockContainer.appendChild(stockValue);

                const stockBtn = document.createElement('button');
                stockBtn.className = 'stock-btn adjust-stock';
                stockBtn.innerHTML = '<i class="fas fa-edit"></i>';
                stockBtn.addEventListener('click', () => {
                    document.getElementById('stock-item-id').value = item.id;
                    this.elements.stockModal.style.display = 'flex';
                });
                stockContainer.appendChild(stockBtn);

                stockCell.appendChild(stockContainer);

                // Precio de Venta
                const priceCell = row.insertCell(5);
                if (item.sellingprice) {
                    priceCell.textContent = `$${item.sellingprice.toLocaleString()}`;
                } else {
                    priceCell.textContent = '-';
                }

                // Descuento
                row.insertCell(6).textContent = '0%';

                // Envío
                const shippingCell = row.insertCell(7);
                shippingCell.textContent = item.free_shipping ? 'Gratis' : (item.price_shipping ? `$${item.price_shipping}` : '-');

                // Estado
                const statusCell = row.insertCell(8);
                const statusBadge = document.createElement('span');
                statusBadge.className = 'status-badge active';
                statusBadge.textContent = 'Activo';
                statusCell.appendChild(statusBadge);

                // Acciones
                const actionsCell = row.insertCell(9);
                actionsCell.className = 'actions-cell';

                const editBtn = document.createElement('button');
                editBtn.className = 'action-btn edit-btn';
                editBtn.innerHTML = '<i class="fas fa-edit"></i>';
                editBtn.addEventListener('click', () => {
                    this.loadItemData(item.id);
                    this.elements.itemModal.style.display = 'flex';
                });

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'action-btn delete-btn';
                deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
                deleteBtn.addEventListener('click', async () => {
                    NotificationManager.showConfirmation(
                        `¿Estás seguro de eliminar el ítem ${item.name}?`,
                        async () => {
                            try {
                                const authToken = localStorage.getItem('authToken');
                                if (!authToken) {
                                    throw new Error('No se encontró el token de autenticación');
                                }

                                const response = await fetch(`${CONFIG.apiBaseUrl}${CONFIG.endpoints.deleteItem}/${item.id}`, {
                                    method: 'DELETE',
                                    headers: {
                                        'Authorization': `Bearer ${authToken}`
                                    }
                                });

                                if (!response.ok) {
                                    const error = await response.json();
                                    throw new Error(error.message || 'Error al eliminar el ítem');
                                }

                                NotificationManager.showNotification('Ítem eliminado con éxito');
                                this.loadItems(
                                    this.currentPage,
                                    this.elements.itemSearch?.value,
                                    this.elements.itemTypeFilter?.value,
                                    this.elements.stockFilter?.value
                                );
                            } catch (error) {
                                console.error('Error al eliminar ítem:', error);
                                NotificationManager.showNotification(
                                    error.message === 'Failed to fetch' ?
                                        'Error de conexión con el servidor' :
                                        error.message || 'Error al eliminar el ítem',
                                    'error'
                                );
                            }
                        }
                    );
                });

                actionsCell.appendChild(editBtn);
                actionsCell.appendChild(deleteBtn);
            });
        },

        updatePagination() {
            if (!this.elements.pageInfo) return;

            this.elements.pageInfo.textContent = `Página ${this.currentPage} de ${this.totalPages}`;
            if (this.elements.prevPageBtn) this.elements.prevPageBtn.disabled = this.currentPage <= 1;
            if (this.elements.nextPageBtn) this.elements.nextPageBtn.disabled = this.currentPage >= this.totalPages;
        },

        // Funciones de UI
        showItemModal() {
            document.getElementById('modal-title').textContent = 'Nuevo Ítem';
            document.getElementById('item-form').reset();
            document.getElementById('image-preview').innerHTML = '';
            document.getElementById('item-id').value = '';
            document.querySelector('#item-form .save-btn').textContent = 'Guardar Ítem';
            this.elements.discountSection.style.display = 'none';
            this.elements.shippingPriceGroup.style.display = 'none';
            this.elements.itemModal.style.display = 'flex';
        },

        closeModals() {
            this.elements.itemModal.style.display = 'none';
            this.elements.stockModal.style.display = 'none';
        },

        toggleDiscountSection() {
            const show = this.elements.hasDiscountSelect.value === 'true';
            this.elements.discountSection.style.display = show ? 'flex' : 'none';
            if (show) this.loadDiscountOptions();
        },

        toggleShippingPrice() {
            this.elements.shippingPriceGroup.style.display =
                this.elements.freeShippingSelect.value === 'false' ? 'flex' : 'none';
        },

        handleImagePreview(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    document.getElementById('image-preview').innerHTML = `<img src="${e.target.result}" alt="Preview">`;
                };
                reader.readAsDataURL(file);
            }
        },

        // Funciones de manejo de eventos
        handlePagination(direction) {
            const newPage = this.currentPage + direction;
            if (newPage > 0 && newPage <= this.totalPages) {
                this.loadItems(
                    newPage,
                    this.elements.itemSearch?.value,
                    this.elements.itemTypeFilter?.value,
                    this.elements.stockFilter?.value
                );
            }
        },

        applyFilters() {
            this.loadItems(
                1,
                this.elements.itemSearch?.value,
                this.elements.itemTypeFilter?.value,
                this.elements.stockFilter?.value
            );
        },

        async loadItemData(itemId) {
            try {
                // Cargar datos básicos del ítem
                const [itemResponse, gastosResponse] = await Promise.all([
                    fetch(`${CONFIG.apiBaseUrl}${CONFIG.endpoints.itemDetails}/${itemId}`),
                    fetch(`${CONFIG.apiBaseUrl}${CONFIG.endpoints.itemDetails}/${itemId}/gastos-adicionales`)
                ]);

                const [item, gastosItem] = await Promise.all([
                    itemResponse.json(),
                    gastosResponse.json()
                ]);

                // Llenar formulario
                document.getElementById('modal-title').textContent = 'Editar Ítem';
                document.querySelector('#item-form .save-btn').textContent = 'Actualizar Ítem';
                document.getElementById('item-id').value = item.id;
                document.getElementById('item-name').value = item.name;
                document.getElementById('item-type').value = item.itemtype?.id || '';
                document.getElementById('item-stock').value = item.stock;
                document.getElementById('item-purchaseprice').value = item.purchaseprice || '';
                document.getElementById('item-sellingprice').value = item.sellingprice || '';
                document.getElementById('item-description').value = item.description;
                document.getElementById('item-state').value = item.itemstate || 'true';

                document.getElementById('item-free_shipping').value = item.free_shipping ? 'true' : 'false';
                document.getElementById('item-price_shipping').value = item.price_shipping || '0.0';
                this.toggleShippingPrice();

                document.getElementById('item-has_discount').value = item.has_discount ? 'true' : 'false';
                if (item.has_discount) {
                    this.elements.discountSection.style.display = 'flex';
                    await this.loadDiscountOptions();
                    document.getElementById('item-discount').value = item.discount || '';
                }

                if (item.imageurl) {
                    document.getElementById('image-preview').innerHTML =
                        `<img src="${CONFIG.apiBaseUrl}/uploads/${item.imageurl}" alt="Preview">`;

                    // Añadir esta línea para marcar que ya hay una imagen
                    document.getElementById('item-image').dataset.hasExistingImage = 'true';
                }

                // Cargar y marcar gastos adicionales
                await this.loadAdditionalExpenses();
                if (gastosItem && gastosItem.length > 0) {
                    gastosItem.forEach(gasto => {
                        const checkbox = document.getElementById(`expense-${gasto.id}`);
                        if (checkbox) checkbox.checked = true;
                    });
                }

                this.elements.itemModal.style.display = 'flex';
            } catch (error) {
                console.error('Error al cargar datos del ítem:', error);
                NotificationManager.showNotification('Error al cargar los datos del ítem', 'error');
            }
        },

        async handleFormSubmit(event) {
            event.preventDefault();

            // Validar campos obligatorios
            const name = document.getElementById('item-name').value;
            const type = document.getElementById('item-type').value;
            const stock = document.getElementById('item-stock').value;
            const purchaseprice = document.getElementById('item-purchaseprice').value;
            const sellingprice = document.getElementById('item-sellingprice').value;
            const imageFile = document.getElementById('item-image').files[0];
            const itemId = document.getElementById('item-id').value;

            // Validaciones comunes
            if (!name || !type || !stock || !purchaseprice || !sellingprice) {
                NotificationManager.showNotification('Por favor complete todos los campos obligatorios', 'error');
                return;
            }

            // Validación de imagen solo para nuevos ítems
            if (!itemId && !imageFile) {
                NotificationManager.showNotification('Por favor seleccione una imagen para el ítem', 'error');
                return;
            }

            // Construir objeto item
            const itemData = {
                name: name,
                description: document.getElementById('item-description').value,
                stock: parseInt(stock),
                sellingprice: parseFloat(sellingprice),
                purchaseprice: parseFloat(purchaseprice),
                itemstate: document.getElementById('item-state').value === 'true',
                itemtype: {
                    id: type,
                    name: document.getElementById('item-type').options[document.getElementById('item-type').selectedIndex].text
                },
                free_shipping: document.getElementById('item-free_shipping').value === 'true',
                price_shipping: parseFloat(document.getElementById('item-price_shipping').value) || 0.0,
                additionalExpenseIds: Array.from(document.querySelectorAll('input[name="additional_expenses"]:checked'))
                    .map(cb => parseInt(cb.value)),
                discountId: document.getElementById('item-discount').value ?
                    parseInt(document.getElementById('item-discount').value) : null
            };

            // Crear FormData para enviar imagen y JSON
            const formData = new FormData();
            formData.append('item', JSON.stringify(itemData));
            if (imageFile) formData.append('image', imageFile);

            // Mostrar carga
            const saveBtn = document.querySelector('#item-form .save-btn');
            const originalBtnText = saveBtn.textContent;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
            saveBtn.disabled = true;

            try {
                const itemId = document.getElementById('item-id').value;
                const url = itemId ?
                    `${CONFIG.apiBaseUrl}/items/update/${itemId}` :
                    `${CONFIG.apiBaseUrl}/items/add`;
                const method = itemId ? 'PUT' : 'POST';

                const authToken = localStorage.getItem('authToken');
                if (!authToken) {
                    throw new Error('No se encontró el token de autenticación');
                }
                console.log("Token JWT:", authToken);
                console.log("URL:", url);
                console.log("Método:", method);
                const response = await fetch(url, {
                    method,
                    body: formData,
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    }
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Error al guardar el ítem');
                }

                const data = await response.json();
                NotificationManager.showNotification('Ítem guardado con éxito');
                this.elements.itemModal.style.display = 'none';
                this.loadItems(
                    this.currentPage,
                    this.elements.itemSearch?.value,
                    this.elements.itemTypeFilter?.value,
                    this.elements.stockFilter?.value
                );
            } catch (error) {
                console.error('Error completo:', error);
                NotificationManager.showNotification(
                    error.message === 'Failed to fetch' ?
                        'Error de conexión con el servidor' :
                        error.message || 'Error al guardar el ítem',
                    'error'
                );
            } finally {
                saveBtn.textContent = originalBtnText;
                saveBtn.disabled = false;
            }
        }
    };

    const FacturasManager = {
        init() {
            this.cacheElements();
            this.setupEventListeners();
            this.loadFacturas(1); // Empezar en la página 1
        },

        cacheElements() {
            this.elements = {
                tablaFacturas: document.querySelector("table tbody"),
                estadoFiltro: document.getElementById("invoice-status"),
                clienteFiltro: document.getElementById("customer"),
                fechaDesde: document.getElementById("date-from"),
                fechaHasta: document.getElementById("date-to"),
                buscarInput: document.querySelector(".search-bar input"),
                filtrarBtn: document.querySelector(".btn-primary i.fa-filter")?.closest("button"),
                buscarBtn: document.querySelector(".search-bar button"),
                paginationContainer: document.querySelector(".pagination")
            };
        },

        setupEventListeners() {
            this.elements.filtrarBtn?.addEventListener("click", () => this.loadFacturas(1));
            this.elements.buscarBtn?.addEventListener("click", () => this.loadFacturas(1));

            // Delegación de eventos para los botones de paginación
            this.elements.paginationContainer?.addEventListener("click", (e) => {
                if (e.target.classList.contains("pagination-btn")) {
                    const pageText = e.target.textContent.trim();

                    // No hacer nada si son los puntos suspensivos
                    if (pageText === "...") return;

                    // Manejar flechas de navegación
                    if (e.target.querySelector("i")) {
                        const currentPage = parseInt(this.elements.paginationContainer.querySelector(".active")?.textContent || 1);

                        if (e.target.querySelector(".fa-chevron-left")) {
                            this.loadFacturas(Math.max(1, currentPage - 1));
                        } else if (e.target.querySelector(".fa-chevron-right")) {
                            // Necesitamos conocer el total de páginas, pero lo manejaremos en loadFacturas
                            // Por ahora solo incrementamos
                            this.loadFacturas(currentPage + 1);
                        }
                        return;
                    }

                    // Manejar números de página
                    const page = parseInt(pageText);
                    if (!isNaN(page)) {
                        this.loadFacturas(page);
                    }
                }
            });

            // Aquí puedes añadir listeners a los botones de acciones por fila
        },

        async loadFacturas(pagina = 1) {
            const estado = this.elements.estadoFiltro?.value || "";
            const clienteId = this.elements.clienteFiltro?.value || "";
            const fechaDesde = this.elements.fechaDesde?.value || "";
            const fechaHasta = this.elements.fechaHasta?.value || "";
            const buscar = this.elements.buscarInput?.value || "";

            const url = new URL(`${CONFIG.apiBaseUrl}/api/facturas/getInvoice/page`);
            url.searchParams.set("page", pagina);
            url.searchParams.set("estado", estado !== "all" ? estado : "");
            url.searchParams.set("clienteId", clienteId !== "all" ? clienteId : "");
            url.searchParams.set("fechaDesde", fechaDesde);
            url.searchParams.set("fechaHasta", fechaHasta);
            url.searchParams.set("buscar", buscar);

            try {
                const authToken = localStorage.getItem("authToken");
                const response = await fetch(url.toString(), {
                    headers: {
                        "Authorization": `Bearer ${authToken}`
                    }
                });

                const data = await response.json();
                this.renderFacturas(data.invoices);
                this.renderPagination(data, pagina);
            } catch (error) {
                console.error("Error cargando facturas:", error);
            }
        },

        renderFacturas(facturas) {
            if (!this.elements.tablaFacturas) return;
            this.elements.tablaFacturas.innerHTML = "";

            if (!facturas || facturas.length === 0) {
                const row = this.elements.tablaFacturas.insertRow();
                const cell = row.insertCell();
                cell.colSpan = 8;
                cell.textContent = "No hay facturas para mostrar.";
                return;
            }

            facturas.forEach(f => {
                const row = this.elements.tablaFacturas.insertRow();
                row.innerHTML = `
                <td>${f.numero || 'N/A'}</td>
                <td>${new Date(f.fecha).toLocaleDateString()}</td>
                <td>${f.clienteNombre}</td>
                <td>$${f.total.toFixed(2)}</td>
                <td>${f.metodoPago || 'N/A'}</td>
                <td><div class="status-indicator ${this.getEstadoClass(f.estado)}"><i class="fas fa-circle"></i><span>${this.getEstadoText(f.estado)}</span></div></td>
                <td>${f.vencimiento ? new Date(f.vencimiento).toLocaleDateString() : 'N/A'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-outline" data-id="${f.id}" data-action="ver"><i class="fas fa-eye"></i></button>
                        <button class="btn btn-primary" data-id="${f.id}" data-action="pdf"><i class="fas fa-file-pdf"></i></button>
                        <button class="btn btn-info" data-id="${f.id}" data-action="print"><i class="fas fa-print"></i></button>
                    </div>
                </td>
            `;
            });
        },

        getEstadoClass(estado) {
            // Mapea el estado del backend a clases CSS
            if (estado.includes("PENDIENTE")) return "pending";
            if (estado.includes("PAGADA")) return "paid";
            if (estado.includes("VENCIDA")) return "overdue";
            if (estado.includes("PARCIAL")) return "partial";
            if (estado.includes("CANCELADA")) return "canceled";
            return "";
        },

        getEstadoText(estado) {
            // Extrae el texto legible del estado
            const match = estado.match(/\.([A-Z_]+)/);
            if (match && match[1]) {
                return match[1].replace(/_/g, ' ');
            }
            return estado;
        },

        renderPagination(data, currentPage) {
            if (!this.elements.paginationContainer) return;

            this.elements.paginationContainer.innerHTML = '';

            // Botón anterior
            const prevBtn = document.createElement('button');
            prevBtn.className = 'pagination-btn';
            prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
            prevBtn.disabled = currentPage === 1;
            this.elements.paginationContainer.appendChild(prevBtn);

            // Botones de páginas
            if (data.pagesToShow) {
                data.pagesToShow.forEach(page => {
                    const btn = document.createElement('button');
                    btn.className = 'pagination-btn';

                    if (page === "...") {
                        btn.textContent = "...";
                        btn.disabled = true;
                        btn.style.cursor = 'default';
                        btn.style.backgroundColor = 'transparent';
                        btn.style.border = 'none';
                    } else {
                        btn.textContent = page;
                        if (parseInt(page) === currentPage) {
                            btn.classList.add('active');
                        }
                    }

                    this.elements.paginationContainer.appendChild(btn);
                });
            }

            // Botón siguiente
            const nextBtn = document.createElement('button');
            nextBtn.className = 'pagination-btn';
            nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
            nextBtn.disabled = currentPage === data.totalPages;
            this.elements.paginationContainer.appendChild(nextBtn);
        }
    };;
    // Inicialización
    NavigationManager.init();
});