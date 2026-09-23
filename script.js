document.addEventListener('DOMContentLoaded', function() {
    // Start counters only after the section has remained visible for one second.
    const statsSection = document.querySelector('.stats-section');
    if (statsSection) {
        const counterMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        const items = [...statsSection.querySelectorAll('.stat-number')].map(element => {
            const original = element.textContent.trim();
            const match = original.match(/[\d,.]+/);
            const number = match ? match[0] : '0';
            const target = Number(element.dataset.target || number.replaceAll(',', ''));
            return { element, original, target, prefix: original.slice(0, original.indexOf(number)),
                suffix: original.slice(original.indexOf(number) + number.length),
                decimals: (number.split('.')[1] || '').length };
        });
        function render(item, value) {
            item.element.textContent = item.prefix + value.toLocaleString('en-US', {
                minimumFractionDigits: item.decimals, maximumFractionDigits: item.decimals
            }) + item.suffix;
        }
        if (counterMotion.matches || !('IntersectionObserver' in window)) {
            statsSection.classList.add('show-stats');
        } else {
            items.forEach(item => render(item, 0));
            let delay;
            let started = false;
            const observer = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    clearTimeout(delay);
                    if (started || !entry.isIntersecting) return;
                    delay = setTimeout(() => {
                        started = true;
                        observer.disconnect();
                        statsSection.classList.add('show-stats');
                        const begin = performance.now();
                        function tick(now) {
                            const progress = counterMotion.matches ? 1 : Math.min((now - begin) / 2000, 1);
                            const eased = 1 - Math.pow(1 - progress, 3);
                            items.forEach(item => {
                                if (progress === 1) item.element.textContent = item.original;
                                else render(item, item.decimals ? item.target * eased : Math.floor(item.target * eased));
                            });
                            if (progress < 1) requestAnimationFrame(tick);
                        }
                        requestAnimationFrame(tick);
                    }, 1000);
                });
            }, { threshold: 0, rootMargin: '-80px 0px -40px 0px' });
            observer.observe(statsSection);
        }
    }
    // Capabilities: expand one card at a time; backgrounds load near the viewport.
    const tabs = [...document.querySelectorAll('.capability-tab')];
    const tabsList = document.querySelector('.capability-tabs-list');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mouseDevice = window.matchMedia('(hover: hover) and (pointer: fine)');
    let currentIndex = 0;
    let autoPlayInterval;

    function updateCard(index) {
        currentIndex = index;
        tabs.forEach((tab, i) => {
            const active = i === index;
            tab.classList.toggle('active', active);
            tab.querySelector('.capability-tab-content').setAttribute('aria-hidden', String(!active));
            tab.querySelector('.learn-more-btn').tabIndex = active ? 0 : -1;
        });
    }
    function stopAutoPlay() { clearInterval(autoPlayInterval); }
    function startAutoPlay() {
        stopAutoPlay();
        if (!tabs.length || reducedMotion.matches || !mouseDevice.matches || document.hidden ||
            tabsList.matches(':hover') || tabsList.contains(document.activeElement)) return;
        autoPlayInterval = setInterval(() => updateCard((currentIndex + 1) % tabs.length), 3000);
    }
    tabs.forEach((tab, index) => {
        tab.tabIndex = 0;
        tab.setAttribute('role', 'group');
        tab.setAttribute('aria-label', tab.dataset.title);
        tab.addEventListener('mouseenter', () => {
            if (mouseDevice.matches) { stopAutoPlay(); updateCard(index); }
        });
        tab.addEventListener('click', () => { stopAutoPlay(); updateCard(index); });
        tab.addEventListener('focusin', () => { stopAutoPlay(); updateCard(index); });
        tab.addEventListener('keydown', event => {
            if (event.target !== tab) return;
            const direction = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
            if (direction) {
                event.preventDefault();
                tabs[(index + direction + tabs.length) % tabs.length].focus();
            } else if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault(); updateCard(index);
            }
        });
    });
    tabsList?.addEventListener('mouseenter', stopAutoPlay);
    tabsList?.addEventListener('mouseleave', startAutoPlay);
    tabsList?.addEventListener('focusout', () => setTimeout(startAutoPlay, 0));
    document.addEventListener('visibilitychange', startAutoPlay);
    reducedMotion.addEventListener('change', startAutoPlay);
    mouseDevice.addEventListener('change', startAutoPlay);
    if (tabs.length) { updateCard(0); startAutoPlay(); }
});
// Preview locations only while a mouse pointer is hovering over a control.
(() => {
    const card = document.querySelector('.network-map-card');
    if (!card) return;
    const controls = [...card.querySelectorAll('[data-location]')];
    const pins = [...card.querySelectorAll('.network-map-pin')];
    const tooltip = card.querySelector('.network-map-tooltip');
    const status = card.querySelector('.network-map-status');
    const countryCode = tooltip.querySelector('.network-detail-code');
    const countryName = tooltip.querySelector('.network-detail-country');
    const cityName = tooltip.querySelector('.network-detail-city');
    const services = tooltip.querySelector('.network-detail-services');
    function selectLocation(id) {
        const pin = pins.find(item => item.dataset.location === id);
        const button = controls.find(item => item.classList.contains('network-location') && item.dataset.location === id);
        if (!pin || !button) return;
        controls.forEach(control => control.setAttribute('aria-pressed', String(control.dataset.location === id)));
        card.classList.add('is-interacted');
        const label = pin.getAttribute('aria-label');
        const separator = label.lastIndexOf(', ');
        countryCode.textContent = button.querySelector('.network-country').textContent;
        countryName.textContent = label.slice(separator + 2);
        cityName.textContent = label.slice(0, separator);
        const details = id === 'manchester'
            ? ['HQ & Primary Hub', 'Same-day Dispatch', 'Returns Processing']
            : ['Fulfilment Hub', 'Picking & Packing', 'Shipping & Returns'];
        services.replaceChildren(...details.map(detail => {
            const item = document.createElement('li');
            item.textContent = detail;
            return item;
        }));
        tooltip.hidden = false;
        status.textContent = 'Selected location: ' + label;
    }
    function hideLocation() {
        tooltip.hidden = true;
        card.classList.remove('is-interacted');
        controls.forEach(control => control.setAttribute('aria-pressed', 'false'));
        status.textContent = '';
    }
    controls.forEach(control => {
        control.addEventListener('pointerenter', event => {
            if (event.pointerType === 'mouse') selectLocation(control.dataset.location);
        });
        control.addEventListener('pointerleave', hideLocation);
        control.addEventListener('pointercancel', hideLocation);
    });
    card.addEventListener('keydown', event => {
        if (event.key === 'Escape') hideLocation();
    });
    hideLocation();
})();
// Ignore automatic scroll restoration; enable glass only after user scrolling.
(() => {
    const header = document.querySelector('.navbar');
    if (!header) return;
    let userScrollEnabled = false;
    function resetHeader() {
        userScrollEnabled = false;
        header.classList.remove('is-scrolled');
    }
    function enableUserScroll(event) {
        if (event.isTrusted) userScrollEnabled = true;
    }
    window.addEventListener('wheel', enableUserScroll, { passive: true });
    window.addEventListener('touchmove', enableUserScroll, { passive: true });
    // Pointer input also covers dragging the scrollbar and clicking anchor links.
    window.addEventListener('pointerdown', enableUserScroll, { passive: true });
    window.addEventListener('keydown', event => {
        if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable]')) return;
        if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' ', 'Enter', 'Tab'].includes(event.key)) enableUserScroll(event);
    });
    window.addEventListener('scroll', () => {
        header.classList.toggle('is-scrolled', userScrollEnabled && window.scrollY > 0);
    }, { passive: true });
    window.addEventListener('pageshow', resetHeader);
    resetHeader();
})();
// Show an honest status until a newsletter service is connected.
(() => {
    const form = document.querySelector('.footer-newsletter');
    if (!form) return;
    form.addEventListener('submit', event => {
        event.preventDefault();
        const status = document.querySelector('.footer-form-status');
        status.hidden = false;
        status.textContent = 'Newsletter signup is currently unavailable. Please contact info@fulfilx.co.uk.';
    });
})();

// Award thumbnails open an accessible, keyboard-controlled gallery.
(() => {
    const dialog = document.querySelector('.award-gallery');
    const buttons = [...document.querySelectorAll('.footer-award-button')];
    if (!dialog || !buttons.length) return;
    const preview = dialog.querySelector('.award-gallery-image');
    const caption = dialog.querySelector('.award-gallery-caption');
    const count = dialog.querySelector('.award-gallery-count');
    let activeIndex = 0;
    let opener;
    function showAward(index) {
        activeIndex = (index + buttons.length) % buttons.length;
        const image = buttons[activeIndex].querySelector('img');
        preview.src = image.src;
        preview.alt = image.alt;
        caption.textContent = image.alt;
        count.textContent = `${activeIndex + 1} / ${buttons.length}`;
    }
    buttons.forEach((button, index) => {
        button.setAttribute('aria-label', 'View ' + button.querySelector('img').alt);
        button.addEventListener('click', () => {
            opener = button;
            showAward(index);
            dialog.showModal();
            document.documentElement.classList.add('award-gallery-open');
        });
    });
    dialog.querySelector('.award-gallery-close').addEventListener('click', () => dialog.close());
    dialog.querySelector('.award-gallery-prev').addEventListener('click', () => showAward(activeIndex - 1));
    dialog.querySelector('.award-gallery-next').addEventListener('click', () => showAward(activeIndex + 1));
    dialog.addEventListener('keydown', event => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            showAward(activeIndex + (event.key === 'ArrowRight' ? 1 : -1));
        }
    });
    dialog.addEventListener('click', event => {
        if (event.target !== dialog) return;
        const bounds = dialog.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right ||
            event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
    });
    dialog.addEventListener('close', () => {
        document.documentElement.classList.remove('award-gallery-open');
        opener?.focus({ preventScroll: true });
    });
})();

// ==================== LANGUAGE SWITCHER DROPDOWN ====================
(() => {
    const wrappers = document.querySelectorAll('.lang-switcher-wrapper');
    if (!wrappers.length) return;

    function setLanguage(langCode) {
        wrappers.forEach(wrapper => {
            const currentLabel = wrapper.querySelector('.lang-current');
            if (currentLabel) {
                currentLabel.textContent = langCode;
            }

            const options = wrapper.querySelectorAll('.lang-option');
            options.forEach(opt => {
                const isSelected = opt.dataset.lang === langCode;
                opt.classList.toggle('is-selected', isSelected);
                opt.setAttribute('aria-selected', String(isSelected));
            });
        });
    }

    function closeAllDropdowns() {
        wrappers.forEach(wrapper => {
            wrapper.classList.remove('is-active');
            const button = wrapper.querySelector('.lang-switcher');
            if (button) {
                button.setAttribute('aria-expanded', 'false');
            }
        });
    }

    wrappers.forEach(wrapper => {
        const button = wrapper.querySelector('.lang-switcher');
        const options = wrapper.querySelectorAll('.lang-option');

        if (!button) return;

        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = wrapper.classList.contains('is-active');
            closeAllDropdowns();
            if (!isOpen) {
                wrapper.classList.add('is-active');
                button.setAttribute('aria-expanded', 'true');
            }
        });

        options.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const selectedLang = option.dataset.lang;
                if (selectedLang) {
                    setLanguage(selectedLang);
                }
                closeAllDropdowns();
                button.focus();
            });
        });
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.lang-switcher-wrapper')) {
            closeAllDropdowns();
        }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllDropdowns();
        }
    });
})();
// Defer below-the-fold image backgrounds until they approach the viewport.
(() => {
    const targets = [...document.querySelectorAll('.capability-tab[data-img], .dark-card .card-bg-image')];
    function loadBackground(element) {
        if (element.matches('.capability-tab')) {
            element.style.backgroundImage = `url("${element.dataset.img}")`;
        } else {
            element.style.setProperty('--testimonial-image', 'url("image/testimonial-bg.jpg")');
        }
    }
    if (!('IntersectionObserver' in window)) {
        targets.forEach(loadBackground);
        return;
    }
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            loadBackground(entry.target);
            observer.unobserve(entry.target);
        });
    }, { rootMargin: '400px 0px' });
    targets.forEach(element => observer.observe(element));
})();
// Reveal each lower section once per page load as it enters the viewport.
(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotion.matches || !('IntersectionObserver' in window)) return;
    const sections = [...document.querySelectorAll('body > section:not(.hero-section), body > footer')];
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) reveal(entry.target);
        });
    }, { threshold: 0, rootMargin: '0px 0px -24px 0px' });
    function reveal(section) {
        section.classList.remove('scroll-reveal-pending');
        observer.unobserve(section);
    }
    sections.forEach(section => {
        // Keep the current viewport visible, including restored scroll positions.
        if (section.getBoundingClientRect().top < window.innerHeight) return;
        section.classList.add('scroll-reveal', 'scroll-reveal-pending');
        observer.observe(section);
        section.addEventListener('focusin', () => reveal(section));
    });
    function revealAnchor() {
        let id;
        try { id = decodeURIComponent(window.location.hash.slice(1)); } catch { return; }
        const target = id && document.getElementById(id);
        const section = target && target.closest('.scroll-reveal');
        if (section) reveal(section);
    }
    window.addEventListener('hashchange', revealAnchor);
    window.addEventListener('pageshow', () => {
        sections.forEach(section => {
            if (section.getBoundingClientRect().top < window.innerHeight) reveal(section);
        });
        revealAnchor();
    });
    reducedMotion.addEventListener('change', event => {
        if (event.matches) {
            sections.forEach(reveal);
            observer.disconnect();
        }
    });
    revealAnchor();
})();