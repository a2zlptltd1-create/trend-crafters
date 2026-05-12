/**
 * Trend Crafters - Product Management System
 * Handles Product CRUD for Admin and Catalog for Approved Users
 */

const B2B_PRODUCTS = {
    // Mock Database
    products: JSON.parse(localStorage.getItem('tc_products')) || [
        {
            id: 'prod-001',
            name: 'Urban Essential T-Shirt',
            sku: 'TC-TSH-001',
            category: 'Apparel',
            description: 'Premium heavy-weight cotton t-shirt for urban brands.',
            basePrice: 29.99,
            moq: 100,
            image: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?q=80&w=1000',
            status: 'active'
        },
        {
            id: 'prod-002',
            name: 'Velocity Pro Sneakers',
            sku: 'TC-SNK-002',
            category: 'Footwear',
            description: 'High-performance sneakers with breathable mesh.',
            basePrice: 129.99,
            moq: 50,
            image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1000',
            status: 'active'
        }
    ],

    init() {
        this.save();
        this.renderAdminProducts();
        this.setupEventListeners();
    },

    save() {
        localStorage.setItem('tc_products', JSON.stringify(this.products));
    },

    addProduct(data) {
        const newProd = {
            id: 'prod-' + Date.now(),
            ...data,
            status: data.status || 'active'
        };
        this.products.push(newProd);
        this.save();
        this.renderAdminProducts();
    },

    updateProduct(id, data) {
        const index = this.products.findIndex(p => p.id === id);
        if (index !== -1) {
            this.products[index] = { ...this.products[index], ...data };
            this.save();
            this.renderAdminProducts();
        }
    },

    deleteProduct(id) {
        if (confirm('Are you sure you want to delete this product?')) {
            this.products = this.products.filter(p => p.id !== id);
            this.save();
            this.renderAdminProducts();
        }
    },

    renderAdminProducts() {
        const list = document.getElementById('admin-product-list');
        if (!list) return;

        if (this.products.length === 0) {
            list.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:2rem;">No products found.</td></tr>';
            return;
        }

        list.innerHTML = this.products.map(p => `
            <tr>
                <td><img src="${p.image}" style="width: 40px; height: 40px; border-radius: 4px; object-fit: cover;"></td>
                <td><div class="user-info-main">${p.name}</div><div class="user-info-sub">${p.description.substring(0, 30)}...</div></td>
                <td>${p.sku}</td>
                <td>${p.category}</td>
                <td>$${parseFloat(p.basePrice).toFixed(2)}</td>
                <td>${p.moq} units</td>
                <td><span class="badge ${p.status === 'active' ? 'badge-approved' : 'badge-rejected'}">${p.status}</span></td>
                <td class="action-btns">
                    <button onclick="B2B_PRODUCTS.editProductForm('${p.id}')" class="btn btn-outline btn-sm">Edit</button>
                    <button onclick="B2B_PRODUCTS.deleteProduct('${p.id}')" class="btn btn-outline btn-sm" style="color: #ef4444; border-color: #ef4444;">Delete</button>
                </td>
            </tr>
        `).join('');
    },

    editProductForm(id) {
        const p = this.products.find(prod => prod.id === id);
        if (!p) return;

        // Populate modal/form for editing
        document.getElementById('p-id').value = p.id;
        document.getElementById('p-name').value = p.name;
        document.getElementById('p-sku').value = p.sku;
        document.getElementById('p-category').value = p.category;
        document.getElementById('p-price').value = p.basePrice;
        document.getElementById('p-moq').value = p.moq;
        document.getElementById('p-image').value = p.image;
        document.getElementById('p-desc').value = p.description;
        document.getElementById('p-status').value = p.status;

        document.getElementById('product-modal-title').textContent = 'Edit Product';
        this.toggleModal(true);
    },

    setupEventListeners() {
        const form = document.getElementById('product-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const id = document.getElementById('p-id').value;
                const data = {
                    name: document.getElementById('p-name').value,
                    sku: document.getElementById('p-sku').value,
                    category: document.getElementById('p-category').value,
                    basePrice: document.getElementById('p-price').value,
                    moq: document.getElementById('p-moq').value,
                    image: document.getElementById('p-image').value,
                    description: document.getElementById('p-desc').value,
                    status: document.getElementById('p-status').value
                };

                if (id) {
                    this.updateProduct(id, data);
                } else {
                    this.addProduct(data);
                }

                this.toggleModal(false);
                form.reset();
            });
        }
    },

    toggleModal(show) {
        const modal = document.getElementById('product-modal');
        if (modal) modal.style.display = show ? 'flex' : 'none';
    }
};

// Init
document.addEventListener('DOMContentLoaded', () => B2B_PRODUCTS.init());
