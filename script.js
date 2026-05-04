// Sticky Navigation Effect
const nav = document.querySelector('.sticky-nav');
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        nav.style.padding = '0.5rem 0';
        nav.style.background = 'var(--accent-navy)';
        nav.style.boxShadow = '0 5px 20px rgba(0,0,0,0.2)';
    } else {
        nav.style.padding = '1rem 0';
        nav.style.background = 'var(--accent-navy)';
        nav.style.boxShadow = 'none';
    }
});

// Shopping Cart Logic
let cart = JSON.parse(localStorage.getItem('trendCraftersCart')) || [];
const cartIcon = document.querySelector('.cart-icon');
const cartSidebar = document.querySelector('.cart-sidebar');
const cartOverlay = document.querySelector('.cart-overlay');
const closeCartBtn = document.querySelector('.close-cart');
const cartCountDisplay = document.querySelector('.cart-count');
const cartBody = document.querySelector('.cart-body');
const totalAmountDisplay = document.querySelector('.total-amount');
const addToCartBtns = document.querySelectorAll('.add-to-cart');

function updateCartUI() {
    // Update count
    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
    if (cartCountDisplay) cartCountDisplay.textContent = totalItems;

    // Update body
    if (cartBody) {
        if (cart.length === 0) {
            cartBody.innerHTML = '<div class="cart-empty-msg">Your cart is empty.</div>';
        } else {
            cartBody.innerHTML = cart.map((item, index) => `
                <div class="cart-item">
                    <img src="${item.image}" alt="${item.name}" class="cart-item-img">
                    <div class="cart-item-info">
                        <h4>${item.name}</h4>
                        <p class="price">${item.price} x ${item.quantity}</p>
                        <span class="cart-item-remove" onclick="removeFromCart(${index})">Remove</span>
                    </div>
                </div>
            `).join('');
        }
    }

    // Update total
    const total = cart.reduce((acc, item) => {
        const price = parseFloat(item.price.replace('$', ''));
        return acc + (price * item.quantity);
    }, 0);
    if (totalAmountDisplay) totalAmountDisplay.textContent = `$${total.toFixed(2)}`;

    // Save to local storage
    localStorage.setItem('trendCraftersCart', JSON.stringify(cart));
}

function openCart() {
    if (cartSidebar) cartSidebar.classList.add('active');
    if (cartOverlay) cartOverlay.classList.add('active');
}

function closeCart() {
    if (cartSidebar) cartSidebar.classList.remove('active');
    if (cartOverlay) cartOverlay.classList.remove('active');
}

function addToCart(name, price, image) {
    const existingItem = cart.find(item => item.name === name);
    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({ name, price, image, quantity: 1 });
    }
    updateCartUI();
    openCart();
}

window.removeFromCart = function(index) {
    cart.splice(index, 1);
    updateCartUI();
};

if (cartIcon) {
    cartIcon.addEventListener('click', (e) => {
        e.preventDefault();
        openCart();
    });
}

if (closeCartBtn) {
    closeCartBtn.addEventListener('click', closeCart);
}

if (cartOverlay) {
    cartOverlay.addEventListener('click', closeCart);
}

addToCartBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const card = btn.closest('.product-card');
        if (card) {
            const name = card.querySelector('h3').textContent;
            const price = card.querySelector('.price').textContent;
            const image = card.querySelector('img').src;
            
            addToCart(name, price, image);

            // Simple feedback animation
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-check"></i>';
            btn.style.background = '#10b981'; // Success Green
            
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.style.background = '';
            }, 2000);
        }
    });
});

// Initialize UI
updateCartUI();

// Mobile Menu Logic
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const mobileMenu = document.querySelector('.mobile-menu');
const mobileMenuOverlay = document.querySelector('.mobile-menu-overlay');
const closeMobileMenuBtn = document.querySelector('.close-mobile-menu');

function openMobileMenu() {
    if (mobileMenu) mobileMenu.classList.add('active');
    if (mobileMenuOverlay) mobileMenuOverlay.classList.add('active');
}

function closeMobileMenu() {
    if (mobileMenu) mobileMenu.classList.remove('active');
    if (mobileMenuOverlay) mobileMenuOverlay.classList.remove('active');
}

if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openMobileMenu();
    });
}

if (closeMobileMenuBtn) {
    closeMobileMenuBtn.addEventListener('click', closeMobileMenu);
}

if (mobileMenuOverlay) {
    mobileMenuOverlay.addEventListener('click', closeMobileMenu);
}

// Smooth Scroll for Navigation Links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});

// Checkout Order Submission
const checkoutForm = document.getElementById('checkout-form');
const successModal = document.getElementById('success-modal');

if (checkoutForm) {
    checkoutForm.addEventListener('submit', (e) => {
        // Populate hidden field with cart details
        const orderDetailsInput = document.getElementById('order-details-hidden');
        if (orderDetailsInput) {
            let details = "Order Items:\n";
            cart.forEach(item => {
                details += `- ${item.name} (Qty: ${item.quantity}) - $${(item.price * item.quantity).toFixed(2)}\n`;
            });
            details += `\nTotal: ${document.getElementById('summary-total').textContent}`;
            orderDetailsInput.value = details;
        }

        // The form will now submit to Formspree naturally
        // We will show the success modal after a slight delay to allow submission
        setTimeout(() => {
            localStorage.removeItem('trendCraftersCart');
            if (successModal) successModal.classList.add('active');
        }, 1000);
    });
}

// Scroll Reveal Animation (Intersection Observer)
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, observerOptions);

document.querySelectorAll('section').forEach(section => {
    sectionObserver.observe(section);
});


// Hero Slider Logic
const heroSlides = document.querySelectorAll('.hero-slide');
const heroDots = document.querySelectorAll('.hero-dot');
const heroPrev = document.querySelector('.hero-prev');
const heroNext = document.querySelector('.hero-next');

if (heroSlides.length > 0) {
    let currentHeroSlide = 0;
    let heroInterval;

    function showHeroSlide(index) {
        heroSlides.forEach(slide => slide.classList.remove('active'));
        heroDots.forEach(dot => dot.classList.remove('active'));
        
        heroSlides[index].classList.add('active');
        heroDots[index].classList.add('active');
        currentHeroSlide = index;
    }

    function nextHeroSlide() {
        let nextIndex = (currentHeroSlide + 1) % heroSlides.length;
        showHeroSlide(nextIndex);
    }

    function prevHeroSlide() {
        let prevIndex = (currentHeroSlide - 1 + heroSlides.length) % heroSlides.length;
        showHeroSlide(prevIndex);
    }

    function startHeroAutoPlay() {
        heroInterval = setInterval(nextHeroSlide, 5000);
    }

    function resetHeroAutoPlay() {
        clearInterval(heroInterval);
        startHeroAutoPlay();
    }

    if (heroPrev && heroNext) {
        heroNext.addEventListener('click', () => {
            nextHeroSlide();
            resetHeroAutoPlay();
        });

        heroPrev.addEventListener('click', () => {
            prevHeroSlide();
            resetHeroAutoPlay();
        });
    }

    heroDots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            showHeroSlide(index);
            resetHeroAutoPlay();
        });
    });

    startHeroAutoPlay();
}

// Product Slider Logic (Optional, safe if elements don't exist)
const pSlider = document.querySelector('.product-slider');
const pSlides = document.querySelectorAll('.product-slider .product-card');
const pPrevBtn = document.querySelector('.p-prev');
const pNextBtn = document.querySelector('.p-next');

if (pSlider && pNextBtn && pPrevBtn) {
    let pCurrentSlide = 0;
    const pTotalSlides = pSlides.length;

    function getPVisibleSlides() {
        if (window.innerWidth <= 768) return 1;
        if (window.innerWidth <= 992) return 2;
        return 4;
    }

    function updateProductSlider() {
        const visibleSlides = getPVisibleSlides();
        const maxSlide = pTotalSlides - visibleSlides;
        
        if (pCurrentSlide > maxSlide) pCurrentSlide = maxSlide;
        if (pCurrentSlide < 0) pCurrentSlide = 0;

        const offset = -(pCurrentSlide * (100 / visibleSlides));
        pSlider.style.transform = `translateX(${offset}%)`;
    }

    pNextBtn.addEventListener('click', () => {
        const visibleSlides = getPVisibleSlides();
        if (pCurrentSlide < pTotalSlides - visibleSlides) {
            pCurrentSlide++;
        } else {
            pCurrentSlide = 0;
        }
        updateProductSlider();
    });

    pPrevBtn.addEventListener('click', () => {
        if (pCurrentSlide > 0) {
            pCurrentSlide--;
        } else {
            pCurrentSlide = pTotalSlides - getPVisibleSlides();
        }
        updateProductSlider();
    });

    // Auto Play for products
    setInterval(() => {
        pNextBtn.click();
    }, 6000);

    window.addEventListener('resize', updateProductSlider);
}

// FAQ Accordion Logic
const faqQuestions = document.querySelectorAll('.faq-question');

faqQuestions.forEach(question => {
    question.addEventListener('click', () => {
        const item = question.parentElement;
        
        // Close all other items
        document.querySelectorAll('.faq-item').forEach(otherItem => {
            if (otherItem !== item) {
                otherItem.classList.remove('active');
            }
        });
        
        // Toggle current item
        item.classList.toggle('active');
    });
});

// Product Filtering Logic (Shop Page)
const filterButtons = document.querySelectorAll('.filter-btn');
const shopProductCards = document.querySelectorAll('.product-card');

if (filterButtons.length > 0) {
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const filterValue = button.getAttribute('data-filter');

            // Update active button
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Filter products
            shopProductCards.forEach(card => {
                const category = card.getAttribute('data-category');
                
                if (filterValue === 'all' || category === filterValue) {
                    card.classList.remove('hidden');
                    // Add a small delay for fade-in effect
                    setTimeout(() => {
                        card.style.opacity = '1';
                        card.style.transform = 'scale(1)';
                    }, 10);
                } else {
                    card.style.opacity = '0';
                    card.style.transform = 'scale(0.8)';
                    setTimeout(() => {
                        card.classList.add('hidden');
                    }, 400); // Match transition time in CSS
                }
            });
        });
    });

    // Handle URL Filter (for footer links)
    const urlParams = new URLSearchParams(window.location.search);
    const filterParam = urlParams.get('filter');
    if (filterParam) {
        const targetBtn = document.querySelector(`.filter-btn[data-filter="${filterParam}"]`);
        if (targetBtn) {
            setTimeout(() => targetBtn.click(), 500); // Small delay to ensure everything is loaded
        }
    }
}

