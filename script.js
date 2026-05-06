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
        existingItem.quantity += 1;
    } else {
        cart.push({ name, price, image, quantity: 1 });
    }
    updateCartUI();
    openCart();
}

window.removeFromCart = function(index) {
    cart.splice(index, 1);
    updateCartUI();
    // Re-render checkout summary if on checkout page
    if (typeof renderSummary === 'function') renderSummary();
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

// Universal AJAX Form Handler
async function handleFormSubmit(form, successCallback) {
    const formData = new FormData(form);
    const object = Object.fromEntries(formData);
    const json = JSON.stringify(object);

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Processing...';
    submitBtn.disabled = true;

    try {
        const response = await fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: json
        });

        const result = await response.json();

        if (response.status === 200) {
            if (successCallback) successCallback(result);
        } else {
            alert(result.message || "Something went wrong!");
        }
    } catch (error) {
        console.error(error);
        alert("Submission failed. Please try again.");
    } finally {
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    }
}

// Checkout Form Logic
const checkoutForm = document.getElementById('checkout-form');
if (checkoutForm) {
    checkoutForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Populate hidden field with cart details
        const orderDetailsInput = document.getElementById('order-details-hidden');
        const summaryTotal = document.getElementById('summary-total');
        
        if (orderDetailsInput && summaryTotal) {
            let details = "ORDER SUMMARY:\n";
            cart.forEach(item => {
                details += `- ${item.name} | Qty: ${item.quantity} | ${item.price} each\n`;
            });
            details += `\nTOTAL AMOUNT: ${summaryTotal.textContent}`;
            orderDetailsInput.value = details;
        }

        handleFormSubmit(checkoutForm, (data) => {
            // Show Success Modal
            const successModal = document.getElementById('success-modal');
            if (successModal) {
                successModal.classList.add('active');
                localStorage.removeItem('trendCraftersCart');
                cart = [];
                updateCartUI();
            }
        });
    });
}


// Contact Form AJAX
const contactForm = document.getElementById('quote-request-form');
if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleFormSubmit(contactForm, (data) => {
            alert("Thank you! Your quote request has been sent successfully.");
            contactForm.reset();
        });
    });
}

// Newsletter Form AJAX
document.querySelectorAll('.newsletter-form').forEach(form => {
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        handleFormSubmit(form, (data) => {
            alert("Success! You have joined our newsletter.");
            form.reset();
        });
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

// Search Functionality Placeholder
document.querySelectorAll('.fa-magnifying-glass').forEach(icon => {
    icon.parentElement.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Search functionality will be available soon!');
    });
});

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

// FAQ Accordion Logic
const faqQuestions = document.querySelectorAll('.faq-question');
faqQuestions.forEach(question => {
    question.addEventListener('click', () => {
        const item = question.parentElement;
        document.querySelectorAll('.faq-item').forEach(otherItem => {
            if (otherItem !== item) {
                otherItem.classList.remove('active');
            }
        });
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
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            shopProductCards.forEach(card => {
                const category = card.getAttribute('data-category');
                if (filterValue === 'all' || category === filterValue) {
                    card.classList.remove('hidden');
                    setTimeout(() => {
                        card.style.opacity = '1';
                        card.style.transform = 'scale(1)';
                    }, 10);
                } else {
                    card.style.opacity = '0';
                    card.style.transform = 'scale(0.8)';
                    setTimeout(() => {
                        card.classList.add('hidden');
                    }, 400);
                }
            });
        });
    });

    const urlParams = new URLSearchParams(window.location.search);
    const filterParam = urlParams.get('filter');
    if (filterParam) {
        const targetBtn = document.querySelector(`.filter-btn[data-filter="${filterParam}"]`);
        if (targetBtn) {
            setTimeout(() => targetBtn.click(), 500);
        }
    }
}


