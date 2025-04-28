document.addEventListener("DOMContentLoaded", function () {
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
                link.addEventListener("click", (event) => {
                    event.preventDefault();
                    this.loadPage(link.getAttribute("data-page"));
                    this.setActiveLink(link);
                });
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

                const response = await fetch(url);
                if (!response.ok) throw new Error("Failed to load page");
                const html = await response.text();

                // Insertar nuevo contenido con animación
                DOM.content.innerHTML = html;
                DOM.content.firstElementChild.classList.add("fade-in");

                if (url === "items.html") {
                    ItemsManager.init();
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
            DOM.logoutBtn.addEventListener("click", function() {
                if(confirm("¿Está seguro que desea cerrar sesión?")) {
                    // Limpiar localStorage
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('userData');
                    // Redireccionar al login
                    window.location.href = "login.html";
                }
            });
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

            if (search) url += `&search=${encodeURIComponent(search)}`;
            if (type) url += `&type=${encodeURIComponent(type)}`;
            if (stock) {
                if (stock === 'low') url += '&minStock=0&maxStock=5';
                if (stock === 'out') url += '&minStock=0&maxStock=0';
            }

            try {
                const response = await fetch(url);
                const data = await response.json();

                this.totalPages = data.totalPages;
                this.currentPage = data.currentPage;
                this.allItems = data.items;

                this.updatePagination();
                this.renderItemsTable();
            } catch (error) {
                console.error('Error loading items:', error);
                this.showNotification('Error al cargar los ítems', 'error');
            }
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
                this.showNotification('Stock actualizado con éxito');
                this.elements.stockModal.style.display = 'none';
                this.loadItems(
                    this.currentPage,
                    this.elements.itemSearch?.value,
                    this.elements.itemTypeFilter?.value,
                    this.elements.stockFilter?.value
                );
            } catch (error) {
                console.error('Error al actualizar stock:', error);
                this.showNotification(
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
                    if (confirm(`¿Estás seguro de eliminar el ítem ${item.name}?`)) {
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

                            this.showNotification('Ítem eliminado con éxito');
                            this.loadItems(
                                this.currentPage,
                                this.elements.itemSearch?.value,
                                this.elements.itemTypeFilter?.value,
                                this.elements.stockFilter?.value
                            );
                        } catch (error) {
                            console.error('Error al eliminar ítem:', error);
                            this.showNotification(
                                error.message === 'Failed to fetch' ?
                                    'Error de conexión con el servidor' :
                                    error.message || 'Error al eliminar el ítem',
                                'error'
                            );
                        }
                    }
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
                this.showNotification('Error al cargar los datos del ítem', 'error');
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
                this.showNotification('Por favor complete todos los campos obligatorios', 'error');
                return;
            }

            // Validación de imagen solo para nuevos ítems
            if (!itemId && !imageFile) {
                this.showNotification('Por favor seleccione una imagen para el ítem', 'error');
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
                this.showNotification('Ítem guardado con éxito');
                this.elements.itemModal.style.display = 'none';
                this.loadItems(
                    this.currentPage,
                    this.elements.itemSearch?.value,
                    this.elements.itemTypeFilter?.value,
                    this.elements.stockFilter?.value
                );
            } catch (error) {
                console.error('Error completo:', error);
                this.showNotification(
                    error.message === 'Failed to fetch' ?
                        'Error de conexión con el servidor' :
                        error.message || 'Error al guardar el ítem',
                    'error'
                );
            } finally {
                saveBtn.textContent = originalBtnText;
                saveBtn.disabled = false;
            }
        },

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
        }
    };
    // Inicialización
    NavigationManager.init();
});