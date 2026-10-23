/* ═══════════════════════════════════════════════════════════════
   MyAdkesmaPortal — Apple-style scroll behaviours
   Parallax hero, stagger grid, visual zoom, count-up statistik,
   panel selang-seling terang/gelap.
   ═══════════════════════════════════════════════════════════════ */
(function () {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 1) Panel selang-seling terang / gelap
    // Beasiswa & Lomba sengaja tidak diberi kelas panel agar background fotonya tetap tampil
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
                heroPhoto.style.transform = `translateY(${y * 0.25}px) scale(${1.1 + y * 0.0002})`;
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

    // 5b) KesmaNews: panel Beasiswa/Lomba tersembunyi sampai kotaknya diklik
    const kn = document.getElementById('kesmanews');
    function setKnTab(tab) {
        ['beasiswa', 'lomba'].forEach(id => {
            const sec = document.getElementById(id);
            if (sec) sec.classList.toggle('kn-off', id !== tab);
        });
        document.querySelectorAll('.kn-tab').forEach(b => b.classList.toggle('active', b.dataset.kn === tab));
    }
    function openKN(tab, sub) {
        if (!kn) return;
        const wasHidden = kn.hidden;
        kn.hidden = false;
        setKnTab(tab);
        if (sub === 'pendampingan') document.getElementById('tabBeasiswaPendampingan')?.click();
        else if (tab === 'beasiswa') document.getElementById('tabBeasiswaList')?.click();
        if (typeof lucide !== 'undefined') lucide.createIcons();
        requestAnimationFrame(() => kn.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }));
        return wasHidden;
    }
    function closeKN() {
        if (!kn) return;
        kn.hidden = true;
        document.getElementById('proker')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    }
    if (kn) {
        setKnTab('beasiswa');
        document.querySelectorAll('[data-kn-open]').forEach(el =>
            el.addEventListener('click', () => openKN(el.dataset.knOpen, el.dataset.knSub)));
        document.querySelectorAll('.kn-tab').forEach(b =>
            b.addEventListener('click', () => { setKnTab(b.dataset.kn); kn.scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
        document.getElementById('knClose')?.addEventListener('click', closeKN);
        // Link navbar/footer/bookmark ke #beasiswa atau #lomba -> buka panel dulu
        document.addEventListener('click', (e) => {
            const a = e.target.closest('a[href="#beasiswa"], a[href="#lomba"]');
            if (!a) return;
            e.preventDefault();
            openKN(a.getAttribute('href').slice(1));
        });
        // Buka langsung jika URL berisi hash terkait
        const openFromHash = () => {
            const h = location.hash;
            if (h === '#beasiswa' || h === '#lomba') openKN(h.slice(1));
            else if (h === '#beasiswa-pendampingan') openKN('beasiswa', 'pendampingan');
        };
        openFromHash();
        window.addEventListener('hashchange', openFromHash);
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
})();
