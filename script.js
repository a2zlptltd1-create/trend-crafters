// --- CONFIG & STATE ---
let cart = JSON.parse(localStorage.getItem('trendCraftersCart')) || [];

// --- UTILS: TOAST SYSTEM ---
// Remotely managed in auth.js to be globally accessible on all pages.

// --- CART LOGIC ---
function updateCartUI() {
    const cartCountDisplays = document.querySelectorAll('.cart-count');
    const cartBodies = document.querySelectorAll('.cart-body');
    const totalAmountDisplays = document.querySelectorAll('.total-amount');

    // Update count
    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
    cartCountDisplays.forEach(el => el.textContent = totalItems);

    // Update bodies
    cartBodies.forEach(body => {
        if (cart.length === 0) {
            body.innerHTML = '<div class="cart-empty-msg">Your cart is empty.</div>';
        } else {
            body.innerHTML = cart.map(item => `
                <div class="cart-item">
                    <img src="${item.image}" alt="${item.name}" class="cart-item-img">
                    <div class="cart-item-info">
                        <h4>${item.name}</h4>
                        <p class="price">$${item.price.toFixed(2)} x ${item.quantity}</p>
                        <span class="cart-item-remove" onclick="removeFromCart('${item.id}')">Remove</span>
                    </div>
                </div>
            `).join('');
        }
    });

    // Update total
    const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    totalAmountDisplays.forEach(el => el.textContent = `$${total.toFixed(2)}`);

    // Handle Checkout Buttons
    const checkoutBtns = document.querySelectorAll('.checkout-btn');
    checkoutBtns.forEach(btn => {
        if (cart.length === 0) {
            btn.style.opacity = '0.5';
            btn.style.pointerEvents = 'none';
            btn.style.filter = 'grayscale(1)';
        } else {
            btn.style.opacity = '1';
            btn.style.pointerEvents = 'auto';
            btn.style.filter = 'none';
        }
    });

    // Save to local storage
    localStorage.setItem('trendCraftersCart', JSON.stringify(cart));
}

function openCart() {
    document.querySelectorAll('.cart-sidebar, .cart-overlay').forEach(el => el.classList.add('active'));
}

function closeCart() {
    document.querySelectorAll('.cart-sidebar, .cart-overlay').forEach(el => el.classList.remove('active'));
}

window.addToCart = function(id, name, price, image, moq = 1) {
    const priceNum = typeof price === 'string'
        ? parseFloat(price.replace(/[^0-9.-]+/g, ''))
        : Number(price);
    const toastFn = typeof showToast === 'function' ? showToast : (msg, type = 'success') => console[type === 'error' ? 'error' : 'log'](msg);

    if (Number.isNaN(priceNum) || priceNum <= 0) {
        toastFn('Price unavailable. Please login to view wholesale pricing.', 'error');
        return;
    }

    const existingItem = cart.find(item => item.id === id);

    // Check MOQ if not already in cart
    if (!existingItem && moq > 1) {
        cart.push({ id, name, price: priceNum, image, quantity: parseInt(moq) });
        toastFn(`${name} added to cart! (Minimum Order Quantity: ${moq})`);
    } else if (existingItem) {
        existingItem.quantity += 1;
        toastFn(`${name} quantity updated!`);
    } else {
        cart.push({ id, name, price: priceNum, image, quantity: 1 });
        toastFn(`${name} added to cart!`);
    }
    
    updateCartUI();
    openCart();
};

window.removeFromCart = function(id) {
    cart = cart.filter(item => item.id !== id);
    updateCartUI();
    
    // Re-render checkout summary if on checkout page
    if (window.location.pathname.includes('checkout.html')) {
        renderCheckoutSummary();
    }
};

// --- FORM HANDLING ---
async function handleFormSubmit(form, successCallback) {
    const formData = new FormData(form);
    const endpoint = form.getAttribute('action') || 'https://api.web3forms.com/submit';
    const method = (form.getAttribute('method') || 'POST').toUpperCase();
    const isJsonSubmit = form.dataset.json === 'true';
    const toastFn = typeof showToast === 'function' ? showToast : (msg, type = 'success') => console[type === 'error' ? 'error' : 'log'](msg);

    const submitBtn = form.querySelector('button[type="submit"]');
    if (!submitBtn) return;

    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Processing...';
    submitBtn.disabled = true;

    try {
        let requestOptions = { method, headers: {}, body: null };
        let requestUrl = endpoint;

        if (method === 'GET') {
            const params = new URLSearchParams(formData);
            requestUrl = `${endpoint}?${params.toString()}`;
        } else if (isJsonSubmit) {
            const object = Object.fromEntries(formData);
            requestOptions.headers['Content-Type'] = 'application/json';
            requestOptions.headers['Accept'] = 'application/json';
            requestOptions.body = JSON.stringify(object);
        } else {
            requestOptions.body = formData;
        }

        const response = await fetch(requestUrl, requestOptions);
        let result;

        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            result = await response.json();
        } else {
            result = await response.text();
        }

        if (response.ok) {
            if (successCallback) successCallback(result, form);
        } else {
            toastFn((result && result.message) || "Something went wrong!", "error");
        }
    } catch (error) {
        console.error(error);
        toastFn("Submission failed. Please check your connection.", "error");
    } finally {
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    }
}

// --- SEARCH LOGIC ---
function performSearch(query) {
    query = query.toLowerCase().trim();
    if (!query) return;

    if (window.location.pathname.includes('shop.html')) {
        if (window.shopState) {
            window.shopState.activeSearch = query;
            window.shopState.render();
            closeSearchModal();
        } else {
            const products = document.querySelectorAll('.product-card');
            let foundCount = 0;
            
            products.forEach(card => {
                const name = card.querySelector('h3').textContent.toLowerCase();
                const category = card.getAttribute('data-category')?.toLowerCase() || "";
                
                if (name.includes(query) || category.includes(query)) {
                    card.style.display = 'block';
                    setTimeout(() => {
                        card.style.opacity = '1';
                        card.style.transform = 'scale(1)';
                    }, 10);
                    foundCount++;
                } else {
                    card.style.opacity = '0';
                    card.style.transform = 'scale(0.8)';
                    setTimeout(() => {
                        card.style.display = 'none';
                    }, 400);
                }
            });

            // No Results Handling
            let noResults = document.getElementById('no-results-msg');
            if (foundCount === 0) {
                if (!noResults) {
                    noResults = document.createElement('div');
                    noResults.id = 'no-results-msg';
                    noResults.style.textAlign = 'center';
                    noResults.style.padding = '5rem 2rem';
                    noResults.style.width = '100%';
                    noResults.innerHTML = `
                        <i class="fa-solid fa-magnifying-glass" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                        <h3>No products found for "${query}"</h3>
                        <p style="color: #666;">Try searching for T-shirts, Sneakers, or Pants.</p>
                        <button class="btn btn-primary" style="margin-top: 1.5rem;" onclick="location.reload()">Clear Search</button>
                    `;
                    const grid = document.getElementById('main-product-grid');
                    if (grid) grid.appendChild(noResults);
                }
            } else if (noResults) {
                noResults.remove();
            }
            
            closeSearchModal();
        }
    } else {
        window.location.href = `shop.html?search=${encodeURIComponent(query)}`;
    }
}

function openSearchModal() {
    const overlay = document.querySelector('.search-overlay');
    const input = document.getElementById('global-search-input');
    if (overlay) overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    if (input) input.focus();
}

function closeSearchModal() {
    const overlay = document.querySelector('.search-overlay');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// --- CHECKOUT SUMMARY ---
function renderCheckoutSummary() {
    // If orderId is present in URL, this is a custom B2B checkout invoice, so skip rendering cart summary
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('orderId')) return;

    const mainGrid = document.getElementById('checkout-main-grid');
    const emptyView = document.getElementById('empty-checkout-view');
    const itemsContainer = document.getElementById('checkout-items');
    const subtotalEl = document.getElementById('summary-subtotal');
    const totalEl = document.getElementById('summary-total');
    
    if (!mainGrid || !emptyView) return;

    if (cart.length === 0) {
        mainGrid.style.display = 'none';
        emptyView.style.display = 'block';
        return;
    }

    mainGrid.style.display = 'grid';
    emptyView.style.display = 'none';

    if (itemsContainer) {
        itemsContainer.innerHTML = cart.map(item => `
            <div class="summary-item">
                <img src="${item.image}" alt="${item.name}">
                <div class="summary-item-info">
                    <h4>${item.name}</h4>
                    <span>Qty: ${item.quantity}</span>
                </div>
                <span class="summary-item-price">$${(item.price * item.quantity).toFixed(2)}</span>
            </div>
        `).join('');
    }

    const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    if (subtotalEl) subtotalEl.textContent = `$${total.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
}

// --- B2B SHOP & GATE FUNCTIONS ---
window.applyShopUrlParams = function() {
    const urlParams = new URLSearchParams(window.location.search);
    const q = urlParams.get('search');
    const filterParam = urlParams.get('filter');

    if (window.shopState) {
        if (q) window.shopState.activeSearch = q;
        if (filterParam) {
            window.shopState.activeCategory = filterParam;
            // update filter buttons UI state
            document.querySelectorAll('.filter-btn').forEach(b => {
                if (b.getAttribute('data-filter') === filterParam) {
                    b.classList.add('active');
                } else {
                    b.classList.remove('active');
                }
            });
        }
        window.shopState.render();
    } else {
        if (q) performSearch(q);
        if (filterParam) {
            const btn = document.querySelector(`.filter-btn[data-filter="${filterParam}"]`);
            if (btn) btn.click();
        }
    }
};

function updateHomepagePrices() {
    const user = JSON.parse(localStorage.getItem('tc_current_user'));
    const isApproved = user && (user.role === 'admin' || user.status === 'approved');
    
    const skuMap = {
        'p1': 'TC-TSH-001',
        'p2': 'TC-SNK-002',
        'p3': 'TC-PAN-003',
        'p4': 'TC-ACC-004'
    };

    const productPrices = {
        'p1': { price: '$29.99', name: 'Urban Essential T-Shirt' },
        'p2': { price: '$129.99', name: 'Velocity Pro Sneakers' },
        'p3': { price: '$59.99', name: 'Classic Denim Jeans' },
        'p4': { price: '$199.99', name: 'Premium Leather Jacket' }
    };

    const loadedProducts = (typeof B2B_PRODUCTS !== 'undefined' && B2B_PRODUCTS.products) ? B2B_PRODUCTS.products : [];

    Object.keys(productPrices).forEach(id => {
        const targetSku = skuMap[id];
        const realProduct = loadedProducts.find(p => p.sku === targetSku);
        
        let card = document.querySelector(`.product-card[data-id="${id}"]`);
        if (!card && realProduct) {
            // If the ID was already updated to UUID, find it by the UUID
            card = document.querySelector(`.product-card[data-id="${realProduct.id}"]`);
        }
        if (!card) return;

        if (realProduct) {
            // Update the card's data-id to the real database UUID
            card.setAttribute('data-id', realProduct.id);
            
            // Update the price dynamically from the DB value
            productPrices[id].price = `$${parseFloat(realProduct.basePrice).toFixed(2)}`;
            productPrices[id].name = realProduct.name;
        }

        if (isApproved) {
            // Unlock: Show price and add to cart button, remove Login CTA
            const priceEl = card.querySelector('.price');
            if (priceEl) {
                priceEl.textContent = productPrices[id].price;
                priceEl.style.fontSize = '';
                priceEl.style.color = '';
            }
            const imgContainer = card.querySelector('.product-img');
            if (imgContainer && !imgContainer.querySelector('.add-to-cart')) {
                imgContainer.style.position = 'relative';
                const btn = document.createElement('button');
                btn.className = 'add-to-cart';
                btn.setAttribute('aria-label', `Add ${productPrices[id].name} to cart`);
                btn.innerHTML = '<i class="fa-solid fa-cart-plus"></i>';
                imgContainer.appendChild(btn);
            }
            const viewDetailsBtn = card.querySelector('.btn');
            if (viewDetailsBtn) viewDetailsBtn.remove();
        } else {
            // Lock: Hide cart button, show Login placeholder, add Login CTA
            const cartBtn = card.querySelector('.add-to-cart');
            if (cartBtn) cartBtn.remove();
            
            const priceEl = card.querySelector('.price');
            if (priceEl) {
                priceEl.textContent = 'Login for Wholesale Price';
                priceEl.style.fontSize = '0.9rem';
                priceEl.style.color = 'var(--text-muted)';
            }
            const infoContainer = card.querySelector('.product-info');
            if (infoContainer && !infoContainer.querySelector('.btn')) {
                const btn = document.createElement('a');
                btn.href = 'login.html';
                btn.className = 'btn btn-outline btn-sm';
                btn.style.cssText = 'width: 100%; margin-top: 1rem;';
                btn.textContent = 'View Details';
                infoContainer.appendChild(btn);
            }
        }
    });
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    updateCartUI();

    // Event Delegation for Dynamic Elements
    document.addEventListener('click', (e) => {
        // Cart Open/Close
        if (e.target.closest('.cart-icon')) {
            e.preventDefault();
            openCart();
        }
        if (e.target.closest('.close-cart') || e.target.closest('.cart-overlay')) {
            closeCart();
        }

        // Mobile Menu
        if (e.target.closest('.mobile-menu-btn')) {
            e.preventDefault();
            document.querySelectorAll('.mobile-menu, .mobile-menu-overlay').forEach(el => el.classList.add('active'));
        }
        if (e.target.closest('.close-mobile-menu') || e.target.closest('.mobile-menu-overlay')) {
            document.querySelectorAll('.mobile-menu, .mobile-menu-overlay').forEach(el => el.classList.remove('active'));
        }

        // Search Modal
        if (e.target.closest('#global-search-trigger')) {
            e.preventDefault();
            openSearchModal();
        }
        if (e.target.closest('.close-search') || (e.target.classList.contains('search-overlay'))) {
            closeSearchModal();
        }

        // Add to Cart
        if (e.target.closest('.add-to-cart')) {
            const btn = e.target.closest('.add-to-cart');
            const card = btn.closest('.product-card');
            if (card) {
                const id = card.getAttribute('data-id');
                const name = card.querySelector('h3').textContent;
                const price = card.querySelector('.price').textContent;
                const image = card.querySelector('img').src;
                const moq = card.getAttribute('data-moq') || 1;
                window.addToCart(id, name, price, image, moq);
            }
        }
    });

    // Form Submissions
    document.addEventListener('submit', (e) => {
        const form = e.target;
        
        // Checkout Form
        if (form.id === 'checkout-form') {
            e.preventDefault();
            const orderDetailsInput = document.getElementById('order-details-hidden');
            const summaryTotal = document.getElementById('summary-total');
            
            if (orderDetailsInput && summaryTotal) {
                let details = "ORDER SUMMARY:\\n";
                cart.forEach(item => {
                    details += `- ${item.name} | Qty: ${item.quantity} | $${item.price.toFixed(2)} each\\n`;
                });
                details += `\\nTOTAL AMOUNT: ${summaryTotal.textContent}`;
                orderDetailsInput.value = details;
            }

            const syncCartToSupabase = async () => {
                const user = JSON.parse(localStorage.getItem('tc_current_user'));
                const orderId = 'ORD-' + Math.random().toString(36).substr(2, 9).toUpperCase();
                const subtotal = cart.reduce((sum, item) => sum + (item.quantity * item.price), 0);
                const products = (typeof B2B_PRODUCTS !== 'undefined' ? B2B_PRODUCTS.products : []) || [];

                // 1. Save local offline backup first
                const localOrder = {
                    id: orderId,
                    customerId: user ? user.id : 'guest',
                    subtotal: subtotal,
                    total: subtotal,
                    status: 'Pending',
                    createdAt: new Date().toISOString(),
                    checkoutUrl: `checkout.html?orderId=${orderId}`,
                    items: cart.map(item => {
                        const matchedProd = products.find(p => p.id === item.id || p.name === item.name || p.sku === item.id);
                        return {
                            productId: matchedProd ? matchedProd.id : item.id,
                            quantity: item.quantity,
                            unitPrice: item.price,
                            subtotal: item.quantity * item.price
                        };
                    })
                };
                const localOrders = JSON.parse(localStorage.getItem('tc_generated_orders')) || [];
                localOrders.push(localOrder);
                localStorage.setItem('tc_generated_orders', JSON.stringify(localOrders));

                // 2. Sync to Supabase if available
                if (window.supabaseClient && user && user.id !== 'admin-001') {
                    try {
                        const dbOrder = {
                            id: orderId,
                            customer_id: user.id,
                            subtotal: subtotal,
                            total: subtotal,
                            status: 'Pending',
                            button_text: 'Pay Now',
                            open_in_new_tab: true
                        };

                        const { error: orderErr } = await window.supabaseClient.from('orders').insert([dbOrder]);
                        if (orderErr) throw orderErr;

                        const dbOrderItems = cart.map(item => {
                            const matchedProd = products.find(p => p.id === item.id || p.name === item.name || p.sku === item.id);
                            const prodId = matchedProd ? matchedProd.id : null;
                            return {
                                order_id: orderId,
                                product_id: prodId,
                                quantity: item.quantity,
                                unit_price: item.price,
                                subtotal: item.quantity * item.price
                            };
                        });

                        const { error: itemsErr } = await window.supabaseClient.from('order_items').insert(dbOrderItems);
                        if (itemsErr) throw itemsErr;
                    } catch (dbErr) {
                        console.error("Failed to sync checkout cart items to Supabase:", dbErr);
                    }
                }
            };

            handleFormSubmit(form, async () => {
                await syncCartToSupabase();
                const modal = document.getElementById('success-modal');
                if (modal) modal.classList.add('active');
                cart = [];
                updateCartUI();
                localStorage.removeItem('trendCraftersCart');
            });
        }

        // Contact Form
        if (form.id === 'quote-request-form') {
            e.preventDefault();
            handleFormSubmit(form, () => {
                showToast("Quote request sent successfully!");
                form.reset();
            });
        }

        // Newsletter
        if (form.classList.contains('newsletter-form')) {
            e.preventDefault();
            handleFormSubmit(form, () => {
                showToast("Successfully joined newsletter!");
                form.reset();
            });
        }
    });

    // Global Search Interactions
    const searchBtn = document.getElementById('global-search-btn');
    const searchInput = document.getElementById('global-search-input');
    if (searchBtn) searchBtn.addEventListener('click', () => performSearch(searchInput.value));
    if (searchInput) searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') performSearch(searchInput.value); });

    // Homepage B2B Gate check
    const isHomePage = window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/') || window.location.pathname === '';
    if (isHomePage) {
        updateHomepagePrices();
        document.addEventListener('tc_products_loaded', updateHomepagePrices);
    }

    // Shop Page Specifics
    const isShopPage = window.location.pathname.includes('shop.html');
    const isCheckoutPage = window.location.pathname.includes('checkout.html');

    if (isShopPage) {
        // Filter Buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const filter = btn.getAttribute('data-filter');
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                if (window.shopState) {
                    window.shopState.activeCategory = filter;
                    window.shopState.render();
                } else {
                    document.querySelectorAll('.product-card').forEach(card => {
                        const cat = card.getAttribute('data-category');
                        if (filter === 'all' || cat === filter) {
                            card.style.display = 'block';
                            setTimeout(() => { card.style.opacity = '1'; card.style.transform = 'scale(1)'; }, 10);
                        } else {
                            card.style.opacity = '0';
                            card.style.transform = 'scale(0.8)';
                            setTimeout(() => { card.style.display = 'none'; }, 400);
                        }
                    });
                }
            });
        });
    }

    if (isCheckoutPage) {
        renderCheckoutSummary();
    }

    // FAQ Accordion
    document.querySelectorAll('.faq-question').forEach(q => {
        q.addEventListener('click', () => {
            const item = q.parentElement;
            document.querySelectorAll('.faq-item').forEach(i => { if (i !== item) i.classList.remove('active'); });
            item.classList.toggle('active');
        });
    });

    // Sticky Nav Scroll
    window.addEventListener('scroll', () => {
        const nav = document.querySelector('.sticky-nav');
        if (nav) {
            if (window.scrollY > 50) nav.classList.add('nav-scrolled');
            else nav.classList.remove('nav-scrolled');
        }
    });

    // Hero Slider Logic
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.hero-dot');
    const prevBtn = document.querySelector('.hero-prev');
    const nextBtn = document.querySelector('.hero-next');
    let currentSlide = 0;
    let sliderInterval;

    if (slides.length > 0) {
        function showSlide(n) {
            slides.forEach(s => s.classList.remove('active'));
            dots.forEach(d => d.classList.remove('active'));
            
            currentSlide = (n + slides.length) % slides.length;
            slides[currentSlide].classList.add('active');
            if (dots[currentSlide]) dots[currentSlide].classList.add('active');
        }

        function startSliderTimer() {
            if (sliderInterval) clearInterval(sliderInterval);
            sliderInterval = setInterval(() => showSlide(currentSlide + 1), 5000);
        }

        function handleManualTransition(nextSlideIndex) {
            showSlide(nextSlideIndex);
            startSliderTimer();
        }

        if (nextBtn) nextBtn.addEventListener('click', () => handleManualTransition(currentSlide + 1));
        if (prevBtn) prevBtn.addEventListener('click', () => handleManualTransition(currentSlide - 1));
        
        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => handleManualTransition(index));
        });

        // Start initial auto-advance slider timer
        startSliderTimer();
    }

    // Scroll Reveal Animation (Intersection Observer)
    const observerOptions = {
        threshold: 0.05,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target); // Stop observing once visible
            }
        });
    }, observerOptions);

    // Observe both section tags and custom .reveal-up class elements
    const elementsToReveal = document.querySelectorAll('section, .reveal-up');
    elementsToReveal.forEach(el => {
        observer.observe(el);
    });
});


