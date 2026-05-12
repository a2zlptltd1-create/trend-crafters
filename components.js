/**
 * Trend Crafters - Shared Components
 * Handles dynamic injection of Header, Footer, and Search Modal
 */

const SHARED_COMPONENTS = {
    header: `
        <!-- Top Bar -->
        <div class="top-bar">
            <div class="container top-bar-wrapper">
                <div class="top-info">
                    <span><i class="fa-solid fa-phone"></i> <a href="tel:+13074008168" class="text-white-no-decoration">+1 (307) 400-8168</a></span>
                    <span><i class="fa-solid fa-envelope"></i> <a href="mailto:info@trendcrafters.us" class="text-white-no-decoration">info@trendcrafters.us</a></span>
                </div>
                <div class="top-promo">
                    <span>Free Shipping on Orders $500+</span>
                    <a href="contact.html#quote-request-form" class="btn get-quote-btn top-quote-btn">Get Quote</a>
                </div>
            </div>
        </div>

        <!-- Navigation -->
        <nav class="glass sticky-nav">
            <div class="container nav-wrapper">
                <div class="logo">
                    <a href="index.html" class="no-decoration"><span class="trend">TREND</span><span class="crafters">CRAFTERS</span></a>
                </div>
                <ul class="nav-links">
                    <li><a href="index.html" id="nav-home">Home</a></li>
                    <li><a href="shop.html" id="nav-shop">Shop</a></li>
                    <li><a href="about.html" id="nav-about">About</a></li>
                    <li><a href="contact.html" id="nav-contact">Contact</a></li>
                </ul>
                <div class="nav-icons">
                    <a href="#" id="global-search-trigger"><i class="fa-solid fa-magnifying-glass"></i></a>
                    <a href="#" class="cart-icon"><i class="fa-solid fa-cart-shopping"></i><span class="cart-count">0</span></a>
                    <a href="#" class="mobile-menu-btn" id="mobile-menu-trigger"><i class="fa-solid fa-bars"></i></a>
                </div>
            </div>
        </nav>
    `,
    footer: `
        <footer class="footer">
            <div class="container footer-grid">
                <div class="footer-brand">
                    <div class="logo">
                        <a href="index.html" class="no-decoration"><span class="trend">TREND</span><span class="crafters">CRAFTERS</span></a>
                    </div>
                    <p>Leading the way in modern apparel and lifestyle fashion.</p>
                    <div class="footer-contact-info" style="margin-bottom: 1.5rem;">
                        <p style="margin-bottom: 0.5rem;"><i class="fa-solid fa-location-dot" style="color: var(--accent-yellow); margin-right: 0.8rem;"></i> 202 Shaw Rd South San Francisco, CA 94080</p>
                        <p style="margin-bottom: 0.5rem;"><i class="fa-solid fa-phone" style="color: var(--accent-yellow); margin-right: 0.8rem;"></i> +1 (307) 400-8168</p>
                        <p style="margin-bottom: 0.5rem;"><i class="fa-solid fa-envelope" style="color: var(--accent-yellow); margin-right: 0.8rem;"></i> info@trendcrafters.us</p>
                    </div>
                    <div class="socials">
                        <a href="https://facebook.com/trendcrafters" target="_blank"><i class="fa-brands fa-facebook"></i></a>
                        <a href="https://instagram.com/trendcrafters" target="_blank"><i class="fa-brands fa-instagram"></i></a>
                        <a href="https://www.tiktok.com/@trendcrafters" target="_blank" class="social-tiktok"><i class="fa-brands fa-tiktok"></i></a>
                    </div>
                </div>
                <div class="footer-links">
                    <h4>Shop</h4>
                    <ul>
                        <li><a href="shop.html?filter=t-shirt">Shirts</a></li>
                        <li><a href="shop.html?filter=pants">Pants</a></li>
                        <li><a href="shop.html?filter=sneakers">Shoes</a></li>
                        <li><a href="shop.html?filter=accessories">Caps</a></li>
                    </ul>
                </div>
                <div class="footer-links">
                    <h4>Support</h4>
                    <ul>
                        <li><a href="contact.html">Contact Us</a></li>
                        <li><a href="privacy-policy.html">Privacy Policy</a></li>
                        <li><a href="refund-policy.html">Refund & Returns</a></li>
                        <li><a href="index.html#faq">FAQ</a></li>
                    </ul>
                </div>
                <div class="footer-newsletter">
                    <h4>Stay Updated</h4>
                    <p>Join our newsletter for exclusive offers.</p>
                    <form action="https://api.web3forms.com/submit" method="POST" class="newsletter-form">
                        <input type="hidden" name="access_key" value="51ffeffb-889e-4934-a4a5-17a90dbfa209">
                        <input type="hidden" name="subject" value="New Newsletter Subscriber">
                        <input type="email" name="email" placeholder="Email Address" required pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$" title="Please enter a valid email address">
                        <button type="submit" class="btn btn-primary">Join</button>
                        <div class="newsletter-msg"></div>
                    </form>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; 2026 Trend Crafters. All rights reserved.</p>
            </div>
        </footer>

        <!-- Cart Sidebar -->
        <div class="cart-overlay"></div>
        <div class="cart-sidebar">
            <div class="cart-header">
                <h2>Your Cart</h2>
                <div class="close-cart"><i class="fa-solid fa-xmark"></i></div>
            </div>
            <div class="cart-body">
                <div class="cart-empty-msg">Your cart is empty.</div>
            </div>
            <div class="cart-footer">
                <div class="cart-total">
                    <span>Total:</span>
                    <span class="total-amount">$0.00</span>
                </div>
                <a href="checkout.html" class="btn btn-primary checkout-btn">Checkout Now</a>
            </div>
        </div>

        <!-- Mobile Menu -->
        <div class="mobile-menu-overlay"></div>
        <div class="mobile-menu">
            <div class="mobile-menu-header">
                <div class="logo">
                    <a href="index.html" class="no-decoration"><span class="trend">TREND</span><span class="crafters">CRAFTERS</span></a>
                </div>
                <div class="close-mobile-menu"><i class="fa-solid fa-xmark"></i></div>
            </div>
            <ul class="mobile-nav-links">
                <li><a href="index.html" id="mob-nav-home">Home</a></li>
                <li><a href="shop.html" id="mob-nav-shop">Shop</a></li>
                <li><a href="about.html" id="mob-nav-about">About</a></li>
                <li><a href="contact.html" id="mob-nav-contact">Contact</a></li>
            </ul>
            <div class="mobile-menu-footer">
                <div class="mobile-menu-contact">
                    <p><i class="fa-solid fa-phone" style="color: var(--accent-yellow);"></i> <a href="tel:+13074008168" style="color: white; text-decoration: none;">+1 (307) 400-8168</a></p>
                    <p><i class="fa-solid fa-envelope" style="color: var(--accent-yellow);"></i> <a href="mailto:info@trendcrafters.us" style="color: white; text-decoration: none;">info@trendcrafters.us</a></p>
                </div>
            </div>
        </div>

        <!-- Search Modal -->
        <div class="search-overlay">
            <div class="search-modal glass animate-fade">
                <div class="close-search"><i class="fa-solid fa-xmark"></i></div>
                <h2>Search <span class="highlight">Collection</span></h2>
                <div class="search-form-wrapper">
                    <input type="text" id="global-search-input" placeholder="What are you looking for?">
                    <button id="global-search-btn"><i class="fa-solid fa-magnifying-glass"></i></button>
                </div>
                <div class="search-suggestions">
                    <span>Try:</span>
                    <a href="shop.html?filter=t-shirt">T-Shirts</a>
                    <a href="shop.html?filter=pants">Pants</a>
                    <a href="shop.html?filter=sneakers">Sneakers</a>
                </div>
            </div>
        </div>

        <!-- Toast Notifications -->
        <div id="toast-container"></div>
    `
};

function injectComponents() {
    const headerPlaceholder = document.getElementById('header-placeholder');
    const footerPlaceholder = document.getElementById('footer-placeholder');

    if (headerPlaceholder) headerPlaceholder.innerHTML = SHARED_COMPONENTS.header;
    if (footerPlaceholder) footerPlaceholder.innerHTML = SHARED_COMPONENTS.footer;

    // Set active state for navigation
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const navMap = {
        'index.html': ['nav-home', 'mob-nav-home'],
        'shop.html': ['nav-shop', 'mob-nav-shop'],
        'about.html': ['nav-about', 'mob-nav-about'],
        'contact.html': ['nav-contact', 'mob-nav-contact']
    };

    if (navMap[currentPath]) {
        navMap[currentPath].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('active');
        });
    }
}

// Run injection
injectComponents();
