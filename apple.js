/* ═══════════════════════════════════════════════════════════════
   MyAdkesmaPortal — Apple-style scroll behaviours & Transitions
   Parallax hero, stagger grid, visual zoom, count-up statistik,
   panel selang-seling terang/gelap, dan transisi klik interaktif.
   ═══════════════════════════════════════════════════════════════ */
(function () {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 1) Panel selang-seling terang / gelap
    const panels = { hotnews: 'ap-white', proker: 'ap-light', tkpedia: 'ap-dark', bookmark: 'ap-light', tentang: 'ap-light' };
    Object.entries(panels).forEach(([id, cls]) => {
        const el = document.getElementById(id);
        if (el) el.classList.add(cls);
    });

    // 2) Varian reveal + delay
    const pairs = document.querySelectorAll('.tkpedia-info, .about-visual');
    pairs.forEach(el => el.classList.add('ap-left'));
    document.querySelectorAll('.tkpedia-viewer, .about-content').forEach(el => el.classList.add('ap-right'));
    document.querySelectorAll('.advoice-hero, .advoice-steps').forEach(el => el.classList.add('ap-scale'));

    // 3) Stagger untuk grid; anak diberi index (--i)
    const staggerSel = '.hotnews-grid, .proker-grid, .advoice-categories, .advoice-steps-grid, .about-pillars, .category-hub, .pendampingan-services';
    function markStagger(root) {
        (root || document).querySelectorAll(staggerSel).forEach(grid => {
            if (grid.dataset.apStagger) return;
            grid.dataset.apStagger = '1';
            grid.classList.add('ap-stagger');
            [...grid.children].forEach((c, i) => c.style.setProperty('--i', i));
            io.observe(grid);
        });
    }

    // Observer terpisah untuk stagger / visual
    const io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (!e.isIntersecting) return;
            e.target.classList.add('visible');
            if (e.target.classList.contains('ap-visual')) e.target.classList.add('in-view');
            io.unobserve(e.target);
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

    // Grid dirender via JS (hotnews, category hub) -> amati perubahan DOM
    markStagger();
    new MutationObserver(() => markStagger()).observe(document.body, { childList: true, subtree: true });

    // 4) Visual besar Advoice
    const adv = document.querySelector('.advoice-hero');
    if (adv && !adv.querySelector('.ap-visual')) {
        const img = document.createElement('img');
        img.src = 'assets/advoice-visual.jpg';
        img.alt = 'Ilustrasi megafon Advoice';
        img.className = 'ap-visual';
        img.loading = 'lazy';
        adv.appendChild(img);
        io.observe(img);
    }

    // 5) Parallax hero + zoom visual saat scroll (ringan, rAF)
    const heroPhoto = document.querySelector('.hero-photo');
    let ticking = false;
    function onScroll() {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            const y = window.scrollY;
            if (heroPhoto && y < window.innerHeight * 1.2) {
                heroPhoto.style.transform = `translateY(${y * 0.22}px) scale(${1.08 + y * 0.00015})`;
            }
            const vis = document.querySelector('.ap-visual.in-view');
            if (vis) {
                const r = vis.getBoundingClientRect();
                const p = 1 - Math.min(Math.max(r.top / window.innerHeight, 0), 1); // 0..1
                vis.style.setProperty('--ap-s', (0.94 + p * 0.1).toFixed(3));
            }
            ticking = false;
        });
    }
    if (!reduce) {
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }

    // 5b) Product Subnav Scrollspy (pada halaman khusus seperti kesmanews.html)
    const subnavLinks = document.querySelectorAll('.product-subnav-link');
    if (subnavLinks.length > 0) {
        window.addEventListener('scroll', () => {
            let currentSec = '';
            document.querySelectorAll('section[id]').forEach(sec => {
                const top = sec.offsetTop - 140;
                if (window.scrollY >= top) {
                    currentSec = sec.getAttribute('id');
                }
            });
            subnavLinks.forEach(link => {
                const href = link.getAttribute('href');
                link.classList.toggle('active', href === `#${currentSec}`);
            });
        }, { passive: true });
    }

    // 6) Count-up statistik hero (nilai diisi app.js secara async)
    ['statBeasiswa', 'statLomba', 'statBuka'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        let busy = false;
        new MutationObserver(() => {
            if (busy || reduce) return;
            const target = parseInt(el.textContent, 10);
            if (!target || target < 1) return;
            busy = true;
            const start = performance.now(), dur = 1200;
            (function step(now) {
                const t = Math.min((now - start) / dur, 1);
                const eased = 1 - Math.pow(1 - t, 3);
                el.textContent = Math.round(target * eased);
                if (t < 1) requestAnimationFrame(step);
                else setTimeout(() => { busy = false; }, 50);
            })(start);
        }).observe(el, { childList: true, characterData: true, subtree: true });
    });

    // 7) Animasi Klik "Selengkapnya" (Apple Keynote Dynamic Transition)
    // Sesuai permintaan: ketika klik "Selengkapnya", ada animasi kinetic dulu sebelum halaman berpindah
    function initProkerClickTransitions() {
        let overlay = document.getElementById('apPageTransitionOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'apPageTransitionOverlay';
            overlay.innerHTML = `
                <div class="ap-transition-text" id="apTransitionTitle">ADVOICE</div>
                <div class="ap-transition-sub" id="apTransitionSub">Departemen Adkesma HMTK</div>
            `;
            document.body.appendChild(overlay);
        }

        const transitionTitle = document.getElementById('apTransitionTitle');
        const transitionSub = document.getElementById('apTransitionSub');

        // Sambungkan klik pada semua tombol & chip proker
        document.querySelectorAll('.proker-tile a[href$=".html"], .proker-tile a[href*=".html#"], .proker-cta').forEach(link => {
            link.addEventListener('click', function (e) {
                // Biarkan jika user ingin buka tab baru sendiri (Ctrl/Cmd)
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || (e.button && e.button !== 0)) {
                    return;
                }

                const targetUrl = this.getAttribute('href');
                if (!targetUrl || targetUrl.startsWith('http') || targetUrl.startsWith('#')) return;

                e.preventDefault();

                const tile = this.closest('.proker-tile');
                const prokerName = this.dataset.prokerTarget ||
                                   (tile ? tile.dataset.proker : null) ||
                                   tile?.querySelector('.proker-name')?.textContent?.trim() ||
                                   'Proker';

                // 1. Animasi pada kartu
                if (tile) tile.classList.add('is-activating');

                // 2. Tampilkan overlay animasi Apple Keynote
                if (transitionTitle) transitionTitle.textContent = prokerName;
                if (transitionSub) transitionSub.textContent = `Menuju halaman resmi ${prokerName}...`;
                overlay.classList.add('active');

                // 3. Pindah halaman secara mulus
                setTimeout(() => {
                    window.location.href = targetUrl;
                }, 340);
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initProkerClickTransitions);
    } else {
        initProkerClickTransitions();
    }
})();
