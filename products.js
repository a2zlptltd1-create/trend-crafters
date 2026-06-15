/**
 * Trend Crafters - Product Management System (Supabase Backend)
 * Handles Product Catalog for Approved Users and Admin CRUD Operations
 */

const B2B_PRODUCTS = {
    // Local memory cache
    products: [],

    // The 7 Premium Wholesale Products (Default Seeding Dataset)
    defaultCatalog: [
        {
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
            name: 'Velocity Pro Sneakers',
            sku: 'TC-SNK-002',
            category: 'Footwear',
            description: 'High-performance sneakers with breathable mesh.',
            basePrice: 129.99,
            moq: 50,
            image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1000',
            status: 'active'
        },
        {
            name: 'Classic Denim Jeans',
            sku: 'TC-PAN-003',
            category: 'Apparel',
            description: 'Durable classic fit denim jeans with reinforced stitching.',
            basePrice: 59.99,
            moq: 100,
            image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=1000',
            status: 'active'
        },
        {
            name: 'Premium Leather Jacket',
            sku: 'TC-ACC-004',
            category: 'Accessories',
            description: 'Luxury top-grain leather jacket with custom metal hardware.',
            basePrice: 199.99,
            moq: 50,
            image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=1000',
            status: 'active'
        },
        {
            name: 'Signature Snapback',
            sku: 'TC-ACC-005',
            category: 'Accessories',
            description: 'Classic fit snapback cap with flat brim and 3D embroidery.',
            basePrice: 24.99,
            moq: 100,
            image: 'https://images.unsplash.com/photo-1534215754734-18e55d13e346?q=80&w=1000',
            status: 'active'
        },
        {
            name: 'Minimalist White Tee',
            sku: 'TC-TSH-006',
            category: 'Apparel',
            description: 'Ultra-soft combed cotton minimalist white t-shirt.',
            basePrice: 24.99,
            moq: 100,
            image: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=1000',
            status: 'active'
        },
        {
            name: 'Aero Running Shoes',
            sku: 'TC-SNK-007',
            category: 'Footwear',
            description: 'Ultra-light running shoes with responsive foam sole.',
            basePrice: 89.99,
            moq: 50,
            image: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?q=80&w=1000',
            status: 'active'
        }
    ],

    async init() {
        await this.loadProducts();
        this.renderAdminProducts();
        this.setupEventListeners();
        document.dispatchEvent(new CustomEvent('tc_products_loaded'));
    },

    saveLocalCache() {
        localStorage.setItem('tc_products', JSON.stringify(this.products));
    },

    async loadProducts() {
        // Fallback to LocalStorage if Supabase client is missing
        if (!window.supabaseClient) {
            this.products = JSON.parse(localStorage.getItem('tc_products')) || this.defaultCatalog.map((p, idx) => ({ id: `prod-00${idx+1}`, ...p }));
            this.saveLocalCache();
            return;
        }

        try {
            // Query products from Supabase
            let { data: dbProducts, error } = await window.supabaseClient
                .from('products')
                .select('*');

            if (error) {
                console.error("Failed to load products from database:", error);
                throw error;
            }

            // Check if user is admin before attempting to seed database
            const user = JSON.parse(localStorage.getItem('tc_current_user'));
            const isAdmin = user && user.role === 'admin';

            // Seed missing products dynamically if database has fewer than the default 7 AND user is admin
            if (isAdmin && (!dbProducts || dbProducts.length < this.defaultCatalog.length)) {
                const existingSkus = dbProducts ? dbProducts.map(p => p.sku) : [];
                const toSeed = this.defaultCatalog.filter(p => !existingSkus.includes(p.sku));
                
                if (toSeed.length > 0) {
                    console.log(`Seeding ${toSeed.length} missing products to database...`);
                    const seedData = toSeed.map(p => ({
                        name: p.name,
                        sku: p.sku,
                        category: p.category,
                        description: p.description,
                        image: p.image,
                        base_price: p.basePrice,
                        moq: p.moq,
                        status: p.status
                    }));

                    const { error: seedError } = await window.supabaseClient
                        .from('products')
                        .insert(seedData);

                    if (!seedError) {
                        // Re-query products
                        const { data: refreshedProducts } = await window.supabaseClient
                            .from('products')
                            .select('*');
                        dbProducts = refreshedProducts;
                    } else {
                        console.error("Error seeding default catalog:", seedError);
                    }
                }
            }

            // Map DB columns to frontend camelCase property names
            this.products = dbProducts.map(p => ({
                id: p.id,
                name: p.name,
                sku: p.sku,
                category: p.category,
                description: p.description,
                basePrice: parseFloat(p.base_price),
                moq: p.moq,
                image: p.image,
                status: p.status
            }));

            this.saveLocalCache();
        } catch (err) {
            console.warn("Could not sync with Supabase. Using localStorage cached items:", err);
            this.products = JSON.parse(localStorage.getItem('tc_products')) || this.defaultCatalog.map((p, idx) => ({ id: `prod-00${idx+1}`, ...p }));
            this.saveLocalCache();
        }
    },

    async addProduct(data) {
        if (!window.supabaseClient) {
            // Local fallback
            const newProd = {
                id: 'prod-' + Date.now(),
                ...data,
                basePrice: parseFloat(data.basePrice),
                moq: parseInt(data.moq),
                status: data.status || 'active'
            };
            this.products.push(newProd);
            this.saveLocalCache();
            this.renderAdminProducts();
            showToast('Product added successfully (offline cache)');
            return;
        }

        try {
            const dbData = {
                name: data.name,
                sku: data.sku,
                category: data.category,
                description: data.description,
                image: data.image,
                base_price: parseFloat(data.basePrice),
                moq: parseInt(data.moq),
                status: data.status || 'active'
            };

            const { error } = await window.supabaseClient
                .from('products')
                .insert([dbData]);

            if (error) {
                showToast(error.message, 'error');
                return;
            }

            await this.loadProducts();
            this.renderAdminProducts();
            showToast('Product added successfully!');
        } catch (err) {
            console.error("Add product error:", err);
            showToast("Failed to create product.", "error");
        }
    },

    async updateProduct(id, data) {
        if (!window.supabaseClient) {
            // Local fallback
            const index = this.products.findIndex(p => p.id === id);
            if (index !== -1) {
                this.products[index] = { 
                    ...this.products[index], 
                    ...data,
                    basePrice: parseFloat(data.basePrice),
                    moq: parseInt(data.moq)
                };
                this.saveLocalCache();
                this.renderAdminProducts();
                showToast('Product updated successfully (offline cache)');
            }
            return;
        }

        try {
            const dbData = {
                name: data.name,
                sku: data.sku,
                category: data.category,
                description: data.description,
                image: data.image,
                base_price: parseFloat(data.basePrice),
                moq: parseInt(data.moq),
                status: data.status
            };

            const { error } = await window.supabaseClient
                .from('products')
                .update(dbData)
                .eq('id', id);

            if (error) {
                showToast(error.message, 'error');
                return;
            }

            await this.loadProducts();
            this.renderAdminProducts();
            showToast('Product updated successfully!');
        } catch (err) {
            console.error("Update product error:", err);
            showToast("Failed to update product.", "error");
        }
    },

    async deleteProduct(id) {
        if (!confirm('Are you sure you want to delete this product?')) return;

        if (!window.supabaseClient) {
            // Local fallback
            this.products = this.products.filter(p => p.id !== id);
            this.saveLocalCache();
            this.renderAdminProducts();
            showToast('Product deleted (offline cache)');
            return;
        }

        try {
            const { error } = await window.supabaseClient
                .from('products')
                .delete()
                .eq('id', id);

            if (error) {
                showToast(error.message, 'error');
                return;
            }

            await this.loadProducts();
            this.renderAdminProducts();
            showToast('Product deleted successfully!');
        } catch (err) {
            console.error("Delete product error:", err);
            showToast("Failed to delete product.", "error");
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
                <td>
                    <div class="user-info-main">${p.name}</div>
                    <div class="user-info-sub">${p.description.substring(0, 45)}...</div>
                </td>
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
        if (form && !form.dataset.hasListener) {
            form.dataset.hasListener = 'true';
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

// Initialize
document.addEventListener('DOMContentLoaded', () => B2B_PRODUCTS.init());
