/**
 * Trend Crafters - Order Management & Generator
 * Handles Manual Order Creation and Custom Checkout Links
 */

const B2B_ORDERS = {
    orders: JSON.parse(localStorage.getItem('tc_generated_orders')) || [],

    init() {
        this.save();
        this.setupGenerator();
        this.renderAdminOrders();
    },

    save() {
        localStorage.setItem('tc_generated_orders', JSON.stringify(this.orders));
    },

    generateOrder(orderData) {
        const orderId = 'ORD-' + Math.random().toString(36).substr(2, 9).toUpperCase();
        
        // Calculations
        const subtotal = orderData.quantity * orderData.unitPrice;
        const taxAmount = (subtotal * (orderData.tax / 100));
        const total = subtotal + taxAmount + parseFloat(orderData.shipping) - parseFloat(orderData.discount);

        const newOrder = {
            id: orderId,
            ...orderData,
            subtotal,
            taxAmount,
            total,
            status: 'Generated', // New default status
            createdAt: new Date().toISOString(),
            checkoutUrl: `checkout.html?orderId=${orderId}`
        };

        this.orders.push(newOrder);
        this.save();
        this.renderAdminOrders();
        if (typeof window.updateDashboardStats === 'function') {
            window.updateDashboardStats();
        }

        // Notify Customer
        if (typeof B2B_NOTIFY !== 'undefined') {
            const customer = (JSON.parse(localStorage.getItem('tc_users')) || []).find(u => u.id === orderData.customerId);
            const product = (JSON.parse(localStorage.getItem('tc_products')) || []).find(p => p.id === orderData.productId);
            B2B_NOTIFY.onOrderGenerated(newOrder, customer, product);
        }

        return newOrder;
    },

    resendOrderEmail(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (order) {
            const customer = (JSON.parse(localStorage.getItem('tc_users')) || []).find(u => u.id === order.customerId);
            const product = (JSON.parse(localStorage.getItem('tc_products')) || []).find(p => p.id === order.productId);
            if (typeof B2B_NOTIFY !== 'undefined') {
                B2B_NOTIFY.onOrderGenerated(order, customer, product);
                alert('Checkout link resent successfully!');
            }
        }
    },

    updateOrderStatus(orderId, newStatus) {
        const order = this.orders.find(o => o.id === orderId);
        if (order) {
            order.status = newStatus;
            this.save();
            this.renderAdminOrders();
            if (typeof window.updateDashboardStats === 'function') {
                window.updateDashboardStats();
            }
            
            // If on portal, re-render might be needed, but usually admin does this
            const portalList = document.getElementById('portal-full-order-list');
            if (portalList) location.reload(); // Simple refresh for portal demo
        }
    },

    deleteOrder(orderId) {
        if (confirm('Are you sure you want to delete this order permanently?')) {
            this.orders = this.orders.filter(o => o.id !== orderId);
            this.save();
            this.renderAdminOrders();
            if (typeof window.updateDashboardStats === 'function') {
                window.updateDashboardStats();
            }
        }
    },

    setupGenerator() {
        const form = document.getElementById('generate-order-form');
        if (!form) return;

        // Populate Products Dropdown
        const prodSelect = document.getElementById('order-product');
        const products = JSON.parse(localStorage.getItem('tc_products')) || [];
        products.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.dataset.price = p.basePrice;
            opt.textContent = `${p.name} (SKU: ${p.sku})`;
            prodSelect.appendChild(opt);
        });

        // Price Auto-fill
        prodSelect.addEventListener('change', (e) => {
            const selected = e.target.options[e.target.selectedIndex];
            if (selected.dataset.price) {
                document.getElementById('order-price').value = selected.dataset.price;
            }
        });

        form.addEventListener('submit', (e) => {
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

            const order = this.generateOrder(data);
            
            // Show Success UI
            const successDiv = document.getElementById('order-gen-success');
            const linkInput = document.getElementById('generated-link');
            if (successDiv && linkInput) {
                successDiv.style.display = 'block';
                linkInput.value = window.location.origin + '/' + order.checkoutUrl;
                form.reset();
                alert('Order Generated Successfully!');
            }
        });
    },

    renderAdminOrders() {
        const list = document.getElementById('admin-order-list');
        if (!list) return;

        if (this.orders.length === 0) {
            list.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem;">No generated orders yet.</td></tr>';
            return;
        }

        // Also update the "Total Generated Orders" stat if we are on dashboard
        const totalStat = document.getElementById('stat-total-orders');
        if (totalStat) totalStat.textContent = this.orders.length;

        list.innerHTML = this.orders.map(o => {
            const users = JSON.parse(localStorage.getItem('tc_users')) || [];
            const customer = users.find(u => u.id === o.customerId);
            const products = JSON.parse(localStorage.getItem('tc_products')) || [];
            const product = products.find(p => p.id === o.productId);
            
            const statusOptions = ['Draft', 'Generated', 'Sent to Customer', 'Pending Payment', 'Paid', 'Processing', 'Completed', 'Cancelled'];

            return `
                <tr>
                    <td>
                        <div class="user-info-main">#${o.id}</div>
                        <div class="user-info-sub">${new Date(o.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td>
                        <div class="user-info-main">${customer ? customer.businessName : 'Unknown'}</div>
                        <div class="user-info-sub">${customer ? customer.fullname : ''}</div>
                    </td>
                    <td>
                        <div class="user-info-main">${product ? product.name : 'Custom Item'}</div>
                        <div class="user-info-sub">Qty: ${o.quantity} @ $${parseFloat(o.unitPrice).toFixed(2)}</div>
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
                            <button onclick="B2B_ORDERS.copyLink('${window.location.origin}/${o.checkoutUrl}')" class="btn btn-outline btn-sm" title="Copy Link"><i class="fa-solid fa-link"></i></button>
                            <button onclick="B2B_ORDERS.resendOrderEmail('${o.id}')" class="btn btn-outline btn-sm" title="Resend Link"><i class="fa-solid fa-paper-plane"></i></button>
                            <button onclick="B2B_ORDERS.updateOrderStatus('${o.id}', 'Paid')" class="btn btn-primary btn-sm" title="Mark as Paid"><i class="fa-solid fa-check"></i></button>
                            <button onclick="B2B_ORDERS.updateOrderStatus('${o.id}', 'Cancelled')" class="btn btn-outline btn-sm" style="color: #6b7280;" title="Cancel Order"><i class="fa-solid fa-ban"></i></button>
                            <button onclick="B2B_ORDERS.deleteOrder('${o.id}')" class="btn btn-outline btn-sm" style="color: #ef4444;" title="Delete Order"><i class="fa-solid fa-trash-can"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    copyLink(link) {
        navigator.clipboard.writeText(link);
        alert('Checkout link copied to clipboard!');
    }
};

// Init
document.addEventListener('DOMContentLoaded', () => B2B_ORDERS.init());
