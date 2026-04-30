// Sticky Navigation Effect
const nav = document.querySelector('.sticky-nav');
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        nav.style.padding = '0.5rem 0';
        nav.style.background = 'rgba(248, 249, 250, 0.95)';
        nav.style.boxShadow = '0 5px 20px rgba(0,0,0,0.05)';
    } else {
        nav.style.padding = '1rem 0';
        nav.style.background = 'rgba(255, 255, 255, 0.05)';
        nav.style.boxShadow = 'none';
    }
});

// Cart Counter Logic
let cartCount = 0;
const cartCountDisplay = document.querySelector('.cart-count');
const addToCartBtns = document.querySelectorAll('.add-to-cart');

addToCartBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        cartCount++;
        cartCountDisplay.textContent = cartCount;
        
        // Simple feedback animation
        btn.innerHTML = '<i class="fa-solid fa-check"></i>';
        btn.style.background = '#10b981'; // Success Green
        
        setTimeout(() => {
            btn.innerHTML = '<i class="fa-solid fa-cart-plus"></i>';
            btn.style.background = 'white';
        }, 2000);
    });
});

// Mobile Menu Placeholder (can be expanded)
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
mobileMenuBtn.addEventListener('click', (e) => {
    e.preventDefault();
    alert('Mobile Menu would open here in a full implementation!');
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
const heroPrevBtn = document.querySelector('.hero-slider-btn.prev');
const heroNextBtn = document.querySelector('.hero-slider-btn.next');
const heroDotsContainer = document.querySelector('.hero-slider-dots');

if (heroSlides.length > 0) {
    let currentHeroSlide = 0;
    let heroAutoPlay;

    // Create dots
    heroSlides.forEach((_, index) => {
        const dot = document.createElement('div');
        dot.classList.add('hero-dot');
        if (index === 0) dot.classList.add('active');
        dot.addEventListener('click', () => {
            goToHeroSlide(index);
            resetHeroAutoPlay();
        });
        if(heroDotsContainer) {
            heroDotsContainer.appendChild(dot);
        }
    });

    const heroDots = document.querySelectorAll('.hero-dot');

    function updateHeroSlider() {
        heroSlides.forEach(slide => slide.classList.remove('active'));
        heroDots.forEach(dot => dot.classList.remove('active'));

        heroSlides[currentHeroSlide].classList.add('active');
        if(heroDots[currentHeroSlide]) heroDots[currentHeroSlide].classList.add('active');
    }

    function goToHeroSlide(index) {
        currentHeroSlide = index;
        updateHeroSlider();
    }

    function nextHeroSlide() {
        currentHeroSlide = (currentHeroSlide + 1) % heroSlides.length;
        updateHeroSlider();
    }

    function prevHeroSlide() {
        currentHeroSlide = (currentHeroSlide - 1 + heroSlides.length) % heroSlides.length;
        updateHeroSlider();
    }

    if(heroNextBtn) {
        heroNextBtn.addEventListener('click', () => {
            nextHeroSlide();
            resetHeroAutoPlay();
        });
    }

    if(heroPrevBtn) {
        heroPrevBtn.addEventListener('click', () => {
            prevHeroSlide();
            resetHeroAutoPlay();
        });
    }

    function startHeroAutoPlay() {
        heroAutoPlay = setInterval(nextHeroSlide, 5000);
    }

    function resetHeroAutoPlay() {
        clearInterval(heroAutoPlay);
        startHeroAutoPlay();
    }

    startHeroAutoPlay();
}

// Features Slider removed – static features are displayed without slider functionality.


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

