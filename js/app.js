document.addEventListener("DOMContentLoaded", function () {
    // Constantes
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
                    initItemsScript();
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
                    // Aquí iría la lógica real de cierre de sesión
                    console.log("Sesión cerrada");
                    // Redirección temporal para demostración
                    window.location.href = "login.html";
                }
            });
        }
    };
    function initItemsScript() {
        const addItemBtn = document.getElementById('add-item-btn');
        const itemModal = document.getElementById('item-modal');
        const stockModal = document.getElementById('stock-modal');
        const closeModals = document.querySelectorAll('.close-modal, .cancel-btn');
        const itemsTable = document.getElementById('items-table').getElementsByTagName('tbody')[0];
        const prevPageBtn = document.getElementById('prev-page');
        const nextPageBtn = document.getElementById('next-page');
        const pageInfo = document.querySelector('.page-info');
        const itemSearch = document.getElementById('item-search');
        const itemTypeFilter = document.getElementById('item-type-filter');
        const stockFilter = document.getElementById('stock-filter');

        if (!addItemBtn) return;

        let currentPage = 1;
        let totalPages = 1;
        let allItems = [];

        const hasDiscountSelect = document.getElementById('item-has_discount');
        const discountSection = document.getElementById('discount-section');
        const freeShippingSelect = document.getElementById('item-free_shipping');
        const shippingPriceGroup = document.getElementById('shipping-price-group');

        hasDiscountSelect.addEventListener('change', function () {
            discountSection.style.display = this.value === 'true' ? 'flex' : 'none';
            if (this.value === 'true') {
                loadDiscountOptions();
            }
        });

        freeShippingSelect.addEventListener('change', function () {
            shippingPriceGroup.style.display = this.value === 'false' ? 'flex' : 'none';
        });

        // Función para cargar los items desde la API
        function loadItems(page = 1, search = '', type = '', stock = '') {
            let url = `http://localhost:8080/items/public/page?page=${page}`;

            if (search) url += `&search=${encodeURIComponent(search)}`;
            if (type) url += `&type=${encodeURIComponent(type)}`;
            if (stock) {
                if (stock === 'low') url += '&minStock=0&maxStock=5';
                if (stock === 'out') url += '&minStock=0&maxStock=0';
            }

            fetch(url)
                .then(res => res.json())
                .then(data => {
                    totalPages = data.totalPages;
                    currentPage = data.currentPage;
                    allItems = data.items;

                    updatePagination();
                    renderItemsTable();
                })
                .catch(error => {
                    console.error('Error loading items:', error);
                    // Mostrar mensaje de error al usuario
                });
        }

        // Función para renderizar la tabla con los items
        function renderItemsTable() {
            itemsTable.innerHTML = '';

            if (allItems.length === 0) {
                const row = itemsTable.insertRow();
                const cell = row.insertCell(0);
                cell.colSpan = 10;
                cell.textContent = 'No se encontraron ítems';
                cell.style.textAlign = 'center';
                return;
            }

            allItems.forEach(item => {
                const row = itemsTable.insertRow();

                // ID
                row.insertCell(0).textContent = item.id;

                // Imagen
                const imgCell = row.insertCell(1);
                imgCell.className = 'item-image';
                if (item.imageurl) {
                    const img = document.createElement('img');
                    img.src = `http://localhost:8080/uploads/${item.imageurl}`;
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
                stockContainer.className = 'stock-cell';  // La clase va en el div contenedor

                const stockValue = document.createElement('span');
                stockValue.className = 'stock-value';
                stockValue.textContent = item.stock;
                stockContainer.appendChild(stockValue);

                const stockBtn = document.createElement('button');
                stockBtn.className = 'stock-btn adjust-stock';
                stockBtn.innerHTML = '<i class="fas fa-edit"></i>';
                stockBtn.addEventListener('click', function() {
                    document.getElementById('stock-item-id').value = item.id;
                    stockModal.style.display = 'flex';
                });
                stockContainer.appendChild(stockBtn);

                stockCell.appendChild(stockContainer);  // Añadir el contenedor al td

                // Precio de Venta
                const priceCell = row.insertCell(5);
                if (item.sellingprice) {
                    priceCell.textContent = `$${item.sellingprice.toLocaleString()}`;
                } else {
                    priceCell.textContent = '-';
                }

                // Descuento (asumiendo que no viene en la API)
                row.insertCell(6).textContent = '0%';

                // Envío
                const shippingCell = row.insertCell(7);
                shippingCell.textContent = item.free_shipping ? 'Gratis' : (item.price_shipping ? `$${item.price_shipping}` : '-');

                // Estado (asumiendo activo por defecto)
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
                editBtn.addEventListener('click', function() {
                    loadItemData(item.id);
                    itemModal.style.display = 'flex';
                });

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'action-btn delete-btn';
                deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
                deleteBtn.addEventListener('click', function() {
                    if (confirm(`¿Estás seguro de eliminar el ítem ${item.name}?`)) {
                        // Lógica para eliminar el ítem
                    }
                });

                actionsCell.appendChild(editBtn);
                actionsCell.appendChild(deleteBtn);
            });
        }

        // Función para actualizar la paginación
        function updatePagination() {
            pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
            prevPageBtn.disabled = currentPage <= 1;
            nextPageBtn.disabled = currentPage >= totalPages;
        }

        // Event listeners para paginación
        prevPageBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                loadItems(currentPage - 1, itemSearch.value, itemTypeFilter.value, stockFilter.value);
            }
        });

        nextPageBtn.addEventListener('click', () => {
            if (currentPage < totalPages) {
                loadItems(currentPage + 1, itemSearch.value, itemTypeFilter.value, stockFilter.value);
            }
        });

        // Event listeners para filtros
        itemSearch.addEventListener('input', () => {
            loadItems(1, itemSearch.value, itemTypeFilter.value, stockFilter.value);
        });

        itemTypeFilter.addEventListener('change', () => {
            loadItems(1, itemSearch.value, itemTypeFilter.value, stockFilter.value);
        });

        stockFilter.addEventListener('change', () => {
            loadItems(1, itemSearch.value, itemTypeFilter.value, stockFilter.value);
        });

        // Abrir modal para nuevo ítem
        addItemBtn.addEventListener('click', () => {
            document.getElementById('modal-title').textContent = 'Nuevo Ítem';
            document.getElementById('item-form').reset();
            document.getElementById('image-preview').innerHTML = '';
            document.getElementById('item-id').value = '';
            discountSection.style.display = 'none';
            shippingPriceGroup.style.display = 'none';
            itemModal.style.display = 'flex';
        });

        // Cerrar modales
        closeModals.forEach(btn => {
            btn.addEventListener('click', function () {
                itemModal.style.display = 'none';
                stockModal.style.display = 'none';
            });
        });

        window.addEventListener('click', function (event) {
            if (event.target === itemModal) itemModal.style.display = 'none';
            if (event.target === stockModal) stockModal.style.display = 'none';
        });

        // Imagen preview
        document.getElementById('item-image').addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (event) {
                    document.getElementById('image-preview').innerHTML = `<img src="${event.target.result}" alt="Preview">`;
                };
                reader.readAsDataURL(file);
            }
        });

        // Cargar tipos de ítems
        function loadItemTypes() {
            fetch('/api/itemtypes')
                .then(res => res.json())
                .then(data => {
                    const select = document.getElementById('item-type');
                    select.innerHTML = '<option value="">Seleccionar...</option>';
                    data.forEach(type => {
                        const option = document.createElement('option');
                        option.value = type.id;
                        option.textContent = type.name;
                        select.appendChild(option);
                    });
                })
                .catch(() => {
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
                });
        }

        function loadDiscountOptions() {
            return fetch('/api/discounts')
                .then(res => res.json())
                .then(data => {
                    const select = document.getElementById('item-discount');
                    select.innerHTML = '<option value="">Seleccionar descuento...</option>';
                    data.forEach(discount => {
                        const option = document.createElement('option');
                        option.value = discount.id;
                        option.textContent = `${discount.name} (${discount.value}${discount.ispercentage ? '%' : ' COP'})`;
                        select.appendChild(option);
                    });
                });
        }

        function loadAdditionalExpenses() {
            return fetch('http://localhost:8080/additionalExpenses/getall')
                .then(res => res.json())
                .then(data => {
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
                    return data; // Devuelve los datos para poder usarlos luego si es necesario
                });
        }

        function loadItemData(itemId) {
            // Cargar datos básicos del ítem
            fetch(`http://localhost:8080/items/public/${itemId}`)
                .then(res => res.json())
                .then(item => {
                    document.getElementById('modal-title').textContent = 'Editar Ítem';
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
                    shippingPriceGroup.style.display = item.free_shipping ? 'none' : 'flex';

                    document.getElementById('item-has_discount').value = item.has_discount ? 'true' : 'false';
                    if (item.has_discount) {
                        discountSection.style.display = 'flex';
                        loadDiscountOptions().then(() => {
                            document.getElementById('item-discount').value = item.discount || '';
                        });
                    }

                    if (item.imageurl) {
                        document.getElementById('image-preview').innerHTML =
                            `<img src="http://localhost:8080/uploads/${item.imageurl}" alt="Preview">`;
                    }

                    // Cargar gastos adicionales del ítem
                    return fetch(`http://localhost:8080/items/public/${itemId}/gastos-adicionales`)
                        .then(res => res.json())
                        .then(gastosItem => {
                            // Cargar todos los gastos disponibles
                            return loadAdditionalExpenses().then(() => {
                                // Marcar los checkboxes de los gastos que ya tiene el ítem
                                if (gastosItem && gastosItem.length > 0) {
                                    gastosItem.forEach(gasto => {
                                        const checkbox = document.getElementById(`expense-${gasto.id}`);
                                        if (checkbox) {
                                            checkbox.checked = true;
                                        }
                                    });
                                }
                                return item; // Para mantener el item disponible en la cadena de promesas
                            });
                        });
                })
                .then(item => {
                    itemModal.style.display = 'flex';
                })
                .catch(error => {
                    console.error('Error al cargar datos del ítem:', error);
                    alert('Error al cargar los datos del ítem');
                });
        }

        document.getElementById('item-form').addEventListener('submit', function (e) {
            e.preventDefault();

            const formData = {
                id: document.getElementById('item-id').value,
                name: document.getElementById('item-name').value,
                type: document.getElementById('item-type').value,
                stock: document.getElementById('item-stock').value,
                purchaseprice: document.getElementById('item-purchaseprice').value,
                sellingprice: document.getElementById('item-sellingprice').value,
                description: document.getElementById('item-description').value,
                itemstate: document.getElementById('item-state').value,
                free_shipping: document.getElementById('item-free_shipping').value === 'true',
                price_shipping: document.getElementById('item-price_shipping').value,
                has_discount: document.getElementById('item-has_discount').value === 'true',
                discount: document.getElementById('item-discount').value,
                additional_expenses: Array.from(document.querySelectorAll('input[name="additional_expenses"]:checked')).map(cb => cb.value)
            };

            const isNew = !formData.id;
            const url = isNew ? 'http://localhost:8080/items/create' : `http://localhost:8080/items/update/${formData.id}`;
            const method = isNew ? 'POST' : 'PUT';

            fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            })
                .then(response => response.json())
                .then(data => {
                    alert(isNew ? 'Ítem creado exitosamente' : 'Ítem actualizado exitosamente');
                    itemModal.style.display = 'none';
                    loadItems(currentPage, itemSearch.value, itemTypeFilter.value, stockFilter.value);
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('Error al guardar el ítem');
                });
        });

        document.getElementById('stock-form').addEventListener('submit', function (e) {
            e.preventDefault();

            const adjustment = {
                itemId: document.getElementById('stock-item-id').value,
                action: document.getElementById('stock-action').value,
                amount: document.getElementById('stock-amount').value,
                reason: document.getElementById('stock-reason').value
            };

            fetch('http://localhost:8080/items/adjust-stock', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(adjustment)
            })
                .then(response => response.json())
                .then(data => {
                    alert('Stock actualizado exitosamente');
                    stockModal.style.display = 'none';
                    loadItems(currentPage, itemSearch.value, itemTypeFilter.value, stockFilter.value);
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('Error al actualizar el stock');
                });
        });

        // Carga inicial
        loadItems();
        loadItemTypes();
        loadAdditionalExpenses();
    }
    // Inicializar
    NavigationManager.init();
});