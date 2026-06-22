/**
 * Trend Crafters - Order Management & Generator (Supabase Backend)
 * Handles Manual Order Creation, Status Transitions, and Custom Checkout Invoices
 */

const B2B_ORDERS = {
    orders: [],

    async init() {
        await this.loadOrders();
        await this.setupGenerator();
        this.renderAdminOrders();
    },

    saveLocalCache() {
        localStorage.setItem('tc_generated_orders', JSON.stringify(this.orders));
    },

    async loadOrders() {
        if (!window.supabaseClient) {
            this.orders = JSON.parse(localStorage.getItem('tc_generated_orders')) || [];
            return;
        }

        try {
            const { data, error } = await window.supabaseClient
                .from('orders')
                .select('*, order_items(*)');

            if (error) throw error;

            this.orders = (data || []).map(o => {
                const firstItem = (o.order_items && o.order_items.length > 0) ? o.order_items[0] : null;
                return {
                    id: o.id,
                    customerId: o.customer_id,
                    subtotal: parseFloat(o.subtotal),
                    tax: parseFloat(o.tax),
                    taxAmount: parseFloat(o.tax_amount),
                    shipping: parseFloat(o.shipping),
                    discount: parseFloat(o.discount),
                    total: parseFloat(o.total),
                    paymentLink: o.payment_link,
                    buttonText: o.button_text,
                    openInNewTab: o.open_in_new_tab,
                    notes: o.notes,
                    status: o.status,
                    createdAt: o.created_at,
                    checkoutUrl: `checkout.html?orderId=${o.id}`,
                    // Fallback top level fields for compatibility
                    productId: firstItem ? firstItem.product_id : undefined,
                    quantity: firstItem ? firstItem.quantity : undefined,
                    unitPrice: firstItem ? parseFloat(firstItem.unit_price) : undefined,
                    items: (o.order_items || []).map(item => ({
                        id: item.id,
                        productId: item.product_id,
                        quantity: item.quantity,
                        unitPrice: parseFloat(item.unit_price),
                        subtotal: parseFloat(item.subtotal)
                    }))
                };
            });

            this.saveLocalCache();
        } catch (err) {
            console.warn("Failed to load orders from Supabase. Falling back to local storage:", err);
            this.orders = JSON.parse(localStorage.getItem('tc_generated_orders')) || [];
        }
    },

    async generateOrder(orderData) {
        const orderId = 'ORD-' + Math.random().toString(36).substr(2, 9).toUpperCase();
        
        // Calculations
        const subtotal = orderData.quantity * orderData.unitPrice;
        const taxAmount = subtotal * (orderData.tax / 100);
        const total = subtotal + taxAmount + parseFloat(orderData.shipping) - parseFloat(orderData.discount);

        const newOrder = {
            id: orderId,
            customerId: orderData.customerId,
            subtotal,
            tax: orderData.tax,
            taxAmount,
            shipping: orderData.shipping,
            discount: orderData.discount,
            total,
            paymentLink: orderData.paymentLink,
            buttonText: orderData.buttonText,
            openInNewTab: orderData.openInNewTab,
            notes: orderData.notes,
            status: 'Generated',
            createdAt: new Date().toISOString(),
            checkoutUrl: `checkout.html?orderId=${orderId}`,
            // Fallback top level fields for compatibility
            productId: orderData.productId,
            quantity: orderData.quantity,
            unitPrice: orderData.unitPrice,
            items: [{
                productId: orderData.productId,
                quantity: orderData.quantity,
                unitPrice: orderData.unitPrice,
                subtotal
            }]
        };

        if (!window.supabaseClient) {
            this.orders.push(newOrder);
            this.saveLocalCache();
            this.renderAdminOrders();
            if (typeof window.updateDashboardStats === 'function') {
                window.updateDashboardStats();
            }
            return newOrder;
        }

        try {
            const dbOrder = {
                id: orderId,
                customer_id: orderData.customerId,
                subtotal,
                tax: orderData.tax,
                tax_amount: taxAmount,
                shipping: parseFloat(orderData.shipping),
                discount: parseFloat(orderData.discount),
                total,
                payment_link: orderData.paymentLink,
                button_text: orderData.buttonText,
                open_in_new_tab: orderData.openInNewTab,
                notes: orderData.notes,
                status: 'Generated'
            };

            const { error } = await window.supabaseClient
                .from('orders')
                .insert([dbOrder]);

            if (error) {
                showToast(error.message, 'error');
                return null;
            }

            // Insert single product item into order_items
            const dbOrderItem = {
                order_id: orderId,
                product_id: orderData.productId,
                quantity: orderData.quantity,
                unit_price: orderData.unitPrice,
                subtotal
            };

            const { error: itemErr } = await window.supabaseClient
                .from('order_items')
                .insert([dbOrderItem]);

            if (itemErr) {
                console.error("Error inserting custom order item:", itemErr);
            }

            await this.loadOrders();
            this.renderAdminOrders();
            
            if (typeof window.updateDashboardStats === 'function') {
                window.updateDashboardStats();
            }

            // Send notification
            try {
                const { data: cust } = await window.supabaseClient.from('profiles').select('*').eq('id', orderData.customerId).single();
                const { data: prod } = await window.supabaseClient.from('products').select('*').eq('id', orderData.productId).single();
                
                if (cust && typeof B2B_NOTIFY !== 'undefined') {
                    B2B_NOTIFY.onOrderGenerated(newOrder, cust, prod);
                }
            } catch (notifyErr) {
                console.error("Email notification simulation error:", notifyErr);
            }

            return newOrder;
        } catch (err) {
            console.error("Generate order exception:", err);
            showToast("Failed to generate order database entry.", "error");
            return null;
        }
    },

    async resendOrderEmail(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;

        let customer, product;
        const mainProductId = (order.items && order.items.length > 0) ? order.items[0].productId : order.productId;

        if (window.supabaseClient) {
            try {
                const { data: cust } = await window.supabaseClient.from('profiles').select('*').eq('id', order.customerId).single();
                const { data: prod } = await window.supabaseClient.from('products').select('*').eq('id', mainProductId).single();
                customer = cust;
                product = prod;
            } catch (err) {
                console.error(err);
            }
        } else {
            customer = (JSON.parse(localStorage.getItem('tc_users')) || []).find(u => u.id === order.customerId);
            product = (JSON.parse(localStorage.getItem('tc_products')) || []).find(p => p.id === mainProductId);
        }

        if (customer && typeof B2B_NOTIFY !== 'undefined') {
            B2B_NOTIFY.onOrderGenerated(order, customer, product);
            alert('Checkout link resent successfully!');
        } else {
            alert('Could not retrieve customer details to resend link.');
        }
    },

    async updateOrderStatus(orderId, newStatus) {
        if (!window.supabaseClient) {
            const order = this.orders.find(o => o.id === orderId);
            if (order) {
                order.status = newStatus;
                this.saveLocalCache();
                this.renderAdminOrders();
                if (typeof window.updateDashboardStats === 'function') {
                    window.updateDashboardStats();
                }
            }
            return;
        }

        try {
            const { error } = await window.supabaseClient
                .from('orders')
                .update({ status: newStatus })
                .eq('id', orderId);

            if (error) {
                showToast(error.message, 'error');
                return;
            }

            await this.loadOrders();
            this.renderAdminOrders();
            if (typeof window.updateDashboardStats === 'function') {
                window.updateDashboardStats();
            }

            const portalList = document.getElementById('portal-full-order-list');
            if (portalList) location.reload(); // Refresh client portal view automatically
        } catch (err) {
            console.error("Order status update exception:", err);
            showToast("Failed to update status in database.", "error");
        }
    },

    async deleteOrder(orderId) {
        if (!confirm('Are you sure you want to delete this order permanently?')) return;

        if (!window.supabaseClient) {
            this.orders = this.orders.filter(o => o.id !== orderId);
            this.saveLocalCache();
            this.renderAdminOrders();
            if (typeof window.updateDashboardStats === 'function') {
                window.updateDashboardStats();
            }
            return;
        }

        try {
            const { error } = await window.supabaseClient
                .from('orders')
                .delete()
                .eq('id', orderId);

            if (error) {
                showToast(error.message, 'error');
                return;
            }

            await this.loadOrders();
            this.renderAdminOrders();
            if (typeof window.updateDashboardStats === 'function') {
                window.updateDashboardStats();
            }
            showToast('Order permanently deleted.');
        } catch (err) {
            console.error("Delete order exception:", err);
            showToast("Failed to delete order entry.", "error");
        }
    },

    async setupGenerator() {
        const form = document.getElementById('generate-order-form');
        if (!form) return;

        // Populate Products Dropdown Helper
        const populateProductsDropdown = () => {
            const prodSelect = document.getElementById('order-product');
            if (!prodSelect) return;
            const currentSelected = prodSelect.value;
            prodSelect.innerHTML = '<option value="">Select a product...</option>';
            const products = JSON.parse(localStorage.getItem('tc_products')) || [];
            products.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.dataset.price = p.basePrice;
                opt.textContent = `${p.name} (SKU: ${p.sku})`;
                if (p.id === currentSelected) opt.selected = true;
                prodSelect.appendChild(opt);
            });
        };

        // Populate Products Dropdown
        const prodSelect = document.getElementById('order-product');
        if (prodSelect) {
            populateProductsDropdown();

            // Listen to dynamic products loaded event
            document.addEventListener('tc_products_loaded', populateProductsDropdown);

            // Price Auto-fill trigger
            prodSelect.addEventListener('change', (e) => {
                const selected = e.target.options[e.target.selectedIndex];
                if (selected.dataset.price) {
                    document.getElementById('order-price').value = selected.dataset.price;
                }
            });
        }

        // Populate Customer Dropdown dynamically
        const orderCustomerSelect = document.getElementById('order-customer');
        if (orderCustomerSelect) {
            orderCustomerSelect.innerHTML = '<option value="">Select a partner...</option>';
            if (window.supabaseClient) {
                try {
                    const { data: users } = await window.supabaseClient
                        .from('profiles')
                        .select('*')
                        .eq('status', 'approved')
                        .neq('role', 'admin');
                    
                    if (users) {
                        users.forEach(u => {
                            const opt = document.createElement('option');
                            opt.value = u.id;
                            opt.textContent = `${u.business_name} (${u.fullname})`;
                            orderCustomerSelect.appendChild(opt);
                        });
                    }
                } catch (err) {
                    console.error("Error loading generator customers:", err);
                }
            } else {
                const users = JSON.parse(localStorage.getItem('tc_users')) || [];
                users.filter(u => u.status === 'approved' && u.role !== 'admin').forEach(u => {
                    const opt = document.createElement('option');
                    opt.value = u.id;
                    opt.textContent = `${u.businessName} (${u.fullname})`;
                    orderCustomerSelect.appendChild(opt);
                });
            }
        }

        // Setup Generator Form Handler
        if (!form.dataset.hasListener) {
            form.dataset.hasListener = 'true';
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const paymentLink = document.getElementById('order-payment-link').value;
                try {
                    new URL(paymentLink);
                } catch (err) {
                    alert('Please enter a valid payment URL (including http:// or https://)');
                    return;
                }

                const data = {
                    customerId: document.getElementById('order-customer').value,
                    productId: document.getElementById('order-product').value,
                    quantity: parseInt(document.getElementById('order-qty').value),
                    unitPrice: parseFloat(document.getElementById('order-price').value),
                    tax: parseFloat(document.getElementById('order-tax').value || 0),
                    shipping: parseFloat(document.getElementById('order-shipping').value || 0),
                    discount: parseFloat(document.getElementById('order-discount').value || 0),
                    paymentLink: document.getElementById('order-payment-link').value,
                    buttonText: document.getElementById('order-btn-text').value || 'Buy Now',
                    openInNewTab: document.getElementById('order-new-tab').checked,
                    notes: document.getElementById('order-notes').value
                };

                const order = await this.generateOrder(data);
                if (order) {
                    const successDiv = document.getElementById('order-gen-success');
                    const linkInput = document.getElementById('generated-link');
                    if (successDiv && linkInput) {
                        successDiv.style.display = 'block';
                        // Use relative folder location to generate the link and avoid window.location.origin breakages
                        const baseUrl = window.location.href.split('/').slice(0, -1).join('/');
                        linkInput.value = `${baseUrl}/${order.checkoutUrl}`;
                        form.reset();
                        alert('Order Generated Successfully!');
                    }
                }
            });
        }
    },

    renderAdminOrders() {
        const list = document.getElementById('admin-order-list');
        if (!list) return;

        if (this.orders.length === 0) {
            list.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem;">No generated orders yet.</td></tr>';
            return;
        }

        const totalStat = document.getElementById('stat-total-orders');
        if (totalStat) totalStat.textContent = this.orders.length;

        // Populate order rows asynchronously because we might want to fetch profiles/products on client if not cached
        const renderRows = async () => {
            let users = [];
            let products = [];

            if (window.supabaseClient) {
                try {
                    const { data: u } = await window.supabaseClient.from('profiles').select('*');
                    const { data: p } = await window.supabaseClient.from('products').select('*');
                    users = u || [];
                    products = p || [];
                } catch (err) {
                    console.error("Dashboard list dependency load error:", err);
                }
            } else {
                users = JSON.parse(localStorage.getItem('tc_users')) || [];
                products = JSON.parse(localStorage.getItem('tc_products')) || [];
            }

            const statusOptions = ['Draft', 'Generated', 'Sent', 'Pending', 'Paid', 'Processing', 'Completed', 'Cancelled'];

            list.innerHTML = this.orders.map(o => {
                const customer = users.find(u => u.id === o.customerId || u.id === o.customer_id);
                const businessName = customer ? (customer.business_name || customer.businessName) : 'Unknown';
                const fullname = customer ? customer.fullname : '';

                // Get all items in the order
                let itemsHtml = '';
                if (o.items && o.items.length > 0) {
                    itemsHtml = o.items.map((item, idx) => {
                        const product = products.find(p => p.id === item.productId || p.id === item.product_id);
                        const productName = product ? product.name : 'Custom Item';
                        const isLast = idx === o.items.length - 1;
                        return `
                            <div style="margin-bottom: 0.3rem; ${isLast ? '' : 'border-bottom: 1px dashed #e2e8f0; padding-bottom: 0.3rem;'}">
                                <div class="user-info-main" style="font-size: 0.85rem;">${productName}</div>
                                <div class="user-info-sub" style="font-size: 0.75rem;">Qty: ${item.quantity} @ $${parseFloat(item.unitPrice).toFixed(2)}</div>
                            </div>
                        `;
                    }).join('');
                } else {
                    // Fallback to legacy single product fields if items list is empty
                    const product = products.find(p => p.id === o.productId || p.id === o.product_id);
                    const productName = product ? product.name : 'Custom Item';
                    itemsHtml = `
                        <div>
                            <div class="user-info-main" style="font-size: 0.85rem;">${productName}</div>
                            <div class="user-info-sub" style="font-size: 0.75rem;">Qty: ${o.quantity || 0} @ $${parseFloat(o.unitPrice || 0).toFixed(2)}</div>
                        </div>
                    `;
                }

                const baseUrl = window.location.href.split('/').slice(0, -1).join('/');
                const copyCheckoutLink = `${baseUrl}/${o.checkoutUrl}`;

                return `
                    <tr>
                        <td>
                            <div class="user-info-main">#${o.id}</div>
                            <div class="user-info-sub">${new Date(o.createdAt).toLocaleDateString()}</div>
                        </td>
                        <td>
                            <div class="user-info-main">${businessName}</div>
                            <div class="user-info-sub">${fullname}</div>
                        </td>
                        <td>
                            ${itemsHtml}
                        </td>
                        <td>
                            <div class="user-info-main">$${parseFloat(o.total).toFixed(2)}</div>
                            <div class="user-info-sub">Tax: ${o.tax}%</div>
                        </td>
                        <td>
                            <select onchange="B2B_ORDERS.updateOrderStatus('${o.id}', this.value)" class="form-control" style="font-size: 0.75rem; padding: 0.3rem;">
                                ${statusOptions.map(s => `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                            </select>
                        </td>
                        <td class="action-btns">
                            <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
                                <a href="${o.checkoutUrl}" target="_blank" class="btn btn-outline btn-sm" title="View Checkout Page"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>
                                <button onclick="B2B_ORDERS.copyLink('${copyCheckoutLink}')" class="btn btn-outline btn-sm" title="Copy Link"><i class="fa-solid fa-link"></i></button>
                                <button onclick="B2B_ORDERS.resendOrderEmail('${o.id}')" class="btn btn-outline btn-sm" title="Resend Link"><i class="fa-solid fa-paper-plane"></i></button>
                                <button onclick="B2B_ORDERS.updateOrderStatus('${o.id}', 'Paid')" class="btn btn-primary btn-sm" title="Mark as Paid"><i class="fa-solid fa-check"></i></button>
                                <button onclick="B2B_ORDERS.updateOrderStatus('${o.id}', 'Cancelled')" class="btn btn-outline btn-sm" style="color: #6b7280;" title="Cancel Order"><i class="fa-solid fa-ban"></i></button>
                                <button onclick="B2B_ORDERS.deleteOrder('${o.id}')" class="btn btn-outline btn-sm" style="color: #ef4444;" title="Delete Order"><i class="fa-solid fa-trash-can"></i></button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        };

        renderRows();
    },

    copyLink(link) {
        navigator.clipboard.writeText(link);
        alert('Checkout link copied to clipboard!');
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => B2B_ORDERS.init());
