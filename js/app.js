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
        const adjustStockBtns = document.querySelectorAll('.adjust-stock');

        if (!addItemBtn) return;

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

        // Abrir modal para nuevo ítem
        addItemBtn.addEventListener('click', () => {
            document.getElementById('modal-title').textContent = 'Nuevo Ítem';
            document.getElementById('item-form').reset();
            document.getElementById('image-preview').innerHTML = '';
            discountSection.style.display = 'none';
            shippingPriceGroup.style.display = 'none';
            itemModal.style.display = 'flex';
        });

        // Editar ítem
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                const itemId = this.closest('tr').querySelector('td:first-child').textContent;
                loadItemData(itemId);
                itemModal.style.display = 'flex';
            });
        });

        // Ajuste de stock
        adjustStockBtns.forEach(btn => {
            btn.addEventListener('click', function () {
                const itemId = this.closest('tr').querySelector('td:first-child').textContent;
                document.getElementById('stock-item-id').value = itemId;
                stockModal.style.display = 'flex';
            });
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
                });
        }

        function loadItemData(itemId) {
            fetch(`/api/items/${itemId}`)
                .then(res => res.json())
                .then(item => {
                    document.getElementById('modal-title').textContent = 'Editar Ítem';
                    document.getElementById('item-id').value = item.id;
                    document.getElementById('item-name').value = item.name;
                    document.getElementById('item-type').value = item.itemtype;
                    document.getElementById('item-stock').value = item.stock;
                    document.getElementById('item-purchaseprice').value = item.purchaseprice || '';
                    document.getElementById('item-sellingprice').value = item.sellingprice || '';
                    document.getElementById('item-description').value = item.description;
                    document.getElementById('item-state').value = item.itemstate;

                    document.getElementById('item-free_shipping').value = item.free_shipping;
                    document.getElementById('item-price_shipping').value = item.price_shipping || '0.0';
                    shippingPriceGroup.style.display = item.free_shipping ? 'none' : 'flex';

                    document.getElementById('item-has_discount').value = item.has_discount;
                    if (item.has_discount) {
                        discountSection.style.display = 'flex';
                        loadDiscountOptions().then(() => {
                            document.getElementById('item-discount').value = item.discount || '';
                        });
                    }

                    if (item.imageurl) {
                        document.getElementById('image-preview').innerHTML =
                            `<img src="/uploads/${item.imageurl}" alt="Preview">`;
                    }

                    loadAdditionalExpenses().then(() => {
                        if (item.additionalExpenses) {
                            item.additionalExpenses.forEach(id => {
                                const checkbox = document.getElementById(`expense-${id}`);
                                if (checkbox) checkbox.checked = true;
                            });
                        }
                    });
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
                free_shipping: document.getElementById('item-free_shipping').value,
                price_shipping: document.getElementById('item-price_shipping').value,
                has_discount: document.getElementById('item-has_discount').value,
                discount: document.getElementById('item-discount').value,
                additional_expenses: Array.from(document.querySelectorAll('input[name="additional_expenses"]:checked')).map(cb => cb.value)
            };

            console.log('Guardando ítem:', formData);

            setTimeout(() => {
                alert('Ítem guardado exitosamente');
                itemModal.style.display = 'none';
                // Aquí deberías recargar la tabla o actualizar la fila correspondiente
            }, 1000);
        });

        document.getElementById('stock-form').addEventListener('submit', function (e) {
            e.preventDefault();

            const adjustment = {
                itemId: document.getElementById('stock-item-id').value,
                action: document.getElementById('stock-action').value,
                amount: document.getElementById('stock-amount').value,
                reason: document.getElementById('stock-reason').value
            };

            console.log('Ajustando stock:', adjustment);

            setTimeout(() => {
                alert('Stock actualizado exitosamente');
                stockModal.style.display = 'none';
                // Aquí deberías actualizar el valor de stock en la tabla
            }, 1000);
        });

        // Carga inicial
        loadItemTypes();
        loadAdditionalExpenses();
    }
    // Inicializar
    NavigationManager.init();
});