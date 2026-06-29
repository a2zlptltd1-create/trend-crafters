// app.js — Mobile navigation + Live search handlers + WhatsApp Integration

// === WhatsApp Configuration ===
window.WHATSAPP_CONFIG = {
    merchantPhone: '+923001234567', // Default: Pakistani number, customize as needed
    setPhone(phone) { this.merchantPhone = phone; }
};

(function(){
    // Toggle mobile navigation drawer
    function toggleMobileNav(open) {
        const isOpen = typeof open === 'boolean' ? open : !document.documentElement.classList.contains('mobile-nav-open');
        document.documentElement.classList.toggle('mobile-nav-open', isOpen);
        const btn = document.querySelector('.mobile-menu-toggle');
        if (btn) btn.classList.toggle('open', isOpen);
    }

    // Toggle search overlay
    function toggleSearchOverlay(open) {
        const overlay = document.getElementById('search-overlay');
        if (!overlay) return;
        const isOpen = typeof open === 'boolean' ? open : !overlay.classList.contains('active');
        overlay.classList.toggle('active', isOpen);
        if (isOpen) {
            const input = document.getElementById('global-search-input');
            if (input) { input.focus(); input.select(); }
        }
    }

    function closeAllOverlays() {
        toggleMobileNav(false);
        toggleSearchOverlay(false);
    }

    // Simple debounce
    function debounce(fn, wait = 200) {
        let t;
        return function(...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), wait); };
    }

    // Live search implementation
    function performLiveSearch(query) {
        const q = (query || '').toLowerCase().trim();
        const resultsList = document.getElementById('search-results-list');
        if (!resultsList) return;
        resultsList.innerHTML = '';
        if (!q) return;

        // If shop state exists, delegate filtering to it
        if (window.shopState) {
            window.shopState.activeSearch = q;
            if (typeof window.shopState.render === 'function') window.shopState.render();
        }

        // Prefer products data from B2B_PRODUCTS
        const products = (typeof B2B_PRODUCTS !== 'undefined' && Array.isArray(B2B_PRODUCTS.products)) ? B2B_PRODUCTS.products : [];
        const matches = products.filter(p => {
            const name = (p.name || '').toLowerCase();
            const desc = (p.description || '').toLowerCase();
            const sku = (p.sku || '').toLowerCase();
            return name.includes(q) || desc.includes(q) || sku.includes(q);
        }).slice(0, 12);

        if (matches.length > 0) {
            matches.forEach(p => {
                const li = document.createElement('li');
                li.innerHTML = `\n                    <img src="${p.image || ''}" alt="${p.name}">\n                    <div class=\"meta\">\n                        <div class=\"title\">${p.name}</div>\n                        <div class=\"subtitle\">SKU: ${p.sku} • MOQ: ${p.moq || '-'} </div>\n                    </div>`;
                li.addEventListener('click', () => {
                    if (p.id) window.location.href = `shop.html?product=${encodeURIComponent(p.id)}`;
                    else window.location.href = 'shop.html';
                });
                resultsList.appendChild(li);
            });
            return;
        }

        // Fallback to DOM search on rendered product-cards
        const cards = Array.from(document.querySelectorAll('.product-card'));
        cards.forEach(card => {
            const title = (card.querySelector('h3')?.textContent || '').toLowerCase();
            const desc = (card.querySelector('p')?.textContent || '').toLowerCase();
            const sku = (card.getAttribute('data-id') || '').toLowerCase();
            if (title.includes(q) || desc.includes(q) || sku.includes(q) || (card.getAttribute('data-category') || '').includes(q)) {
                const img = card.querySelector('img')?.src || '';
                const name = card.querySelector('h3')?.textContent || 'Product';
                const href = card.querySelector('.btn')?.getAttribute('href') || 'shop.html';
                const li = document.createElement('li');
                li.innerHTML = `<img src="${img}" alt="${name}"><div class=\"meta\"><div class=\"title\">${name}</div><div class=\"subtitle\">${card.getAttribute('data-category') || ''}</div></div>`;
                li.addEventListener('click', () => window.location.href = href);
                resultsList.appendChild(li);
            }
        });
    }

    const debouncedLive = debounce((e) => performLiveSearch(e.target.value), 180);

    document.addEventListener('DOMContentLoaded', () => {
        // Mobile nav bindings
        const toggle = document.querySelector('.mobile-menu-toggle');
        const navOverlay = document.querySelector('.nav-overlay');
        if (toggle) toggle.addEventListener('click', (ev) => { ev.preventDefault(); toggleMobileNav(); });
        if (navOverlay) navOverlay.addEventListener('click', () => toggleMobileNav(false));

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.nav-drawer')) return;
            if (e.target.matches('.nav-drawer a')) toggleMobileNav(false);
        });

        // Search overlay bindings
        const searchTrigger = document.getElementById('global-search-trigger');
        const searchOverlay = document.getElementById('search-overlay');
        const searchInput = document.getElementById('global-search-input');
        const searchClose = document.querySelector('.close-search');

        if (searchTrigger) searchTrigger.addEventListener('click', (e) => { e.preventDefault(); toggleSearchOverlay(true); });
        if (searchClose) searchClose.addEventListener('click', () => toggleSearchOverlay(false));
        if (searchOverlay) searchOverlay.addEventListener('click', (e) => { if (e.target === searchOverlay) toggleSearchOverlay(false); });

        if (searchInput) {
            searchInput.addEventListener('input', debouncedLive);
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') toggleSearchOverlay(false);
                if (e.key === 'Enter') performLiveSearch(e.target.value);
            });
        }

        // Global ESC closes overlays
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAllOverlays(); });
    });

})();
