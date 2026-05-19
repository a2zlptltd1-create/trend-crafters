// --- CONFIG & STATE ---
let cart = JSON.parse(localStorage.getItem('trendCraftersCart')) || [];

// --- UTILS: TOAST SYSTEM ---
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';
    
    toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <div class="toast-message">${message}</div>
    `;

    container.appendChild(toast);

    // Animate in
    setTimeout(() => toast.classList.add('active'), 10);

    // Remove after 3s
    setTimeout(() => {
        toast.classList.remove('active');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

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
    const priceNum = typeof price === 'string' ? parseFloat(price.replace('$', '')) : price;
    const existingItem = cart.find(item => item.id === id);
    
    // Check MOQ if not already in cart
    if (!existingItem && moq > 1) {
        // Option A: Just set quantity to MOQ
        cart.push({ id, name, price: priceNum, image, quantity: parseInt(moq) });
        showToast(`${name} added to cart! (Minimum Order Quantity: ${moq})`);
    } else if (existingItem) {
        existingItem.quantity += 1;
        showToast(`${name} quantity updated!`);
    } else {
        cart.push({ id, name, price: priceNum, image, quantity: 1 });
        showToast(`${name} added to cart!`);
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
    const object = Object.fromEntries(formData);
    const json = JSON.stringify(object);

    const submitBtn = form.querySelector('button[type="submit"]');
    if (!submitBtn) return;

    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Processing...';
    submitBtn.disabled = true;

    try {
        const response = await fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: json
        });

        const result = await response.json();

        if (response.status === 200) {
            if (successCallback) successCallback(result, form);
        } else {
            showToast(result.message || "Something went wrong!", "error");
        }
    } catch (error) {
        console.error(error);
        showToast("Submission failed. Please check your connection.", "error");
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

            handleFormSubmit(form, () => {
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

    // Shop Page Specifics
    const isShopPage = window.location.pathname.includes('shop.html');
    const isCheckoutPage = window.location.pathname.includes('checkout.html');

    if (isShopPage) {
        const urlParams = new URLSearchParams(window.location.search);
        const q = urlParams.get('search');
        if (q) performSearch(q);

        const filterParam = urlParams.get('filter');
        if (filterParam) {
            // Wait for dynamic products to render first, then trigger click
            setTimeout(() => {
                const btn = document.querySelector(`.filter-btn[data-filter="${filterParam}"]`);
                if (btn) btn.click();
            }, 100);
        }

        // Filter Buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const filter = btn.getAttribute('data-filter');
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
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

    if (slides.length > 0) {
        function showSlide(n) {
            slides.forEach(s => s.classList.remove('active'));
            dots.forEach(d => d.classList.remove('active'));
            
            currentSlide = (n + slides.length) % slides.length;
            slides[currentSlide].classList.add('active');
            if (dots[currentSlide]) dots[currentSlide].classList.add('active');
        }

        if (nextBtn) nextBtn.addEventListener('click', () => showSlide(currentSlide + 1));
        if (prevBtn) prevBtn.addEventListener('click', () => showSlide(currentSlide - 1));
        
        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => showSlide(index));
        });

        // Auto-advance slider every 5 seconds
        setInterval(() => showSlide(currentSlide + 1), 5000);
    }

    // Scroll Reveal Animation (Intersection Observer)
    const observerOptions = {
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    document.querySelectorAll('section').forEach(section => {
        observer.observe(section);
    });
});


