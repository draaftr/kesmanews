/* ═══════════════════════════════════════════════════════════════
   MyAdkesmaPortal — Extras
   Hot News, Subpage Pendampingan, Galeri Poster, TKpedia
   Data: data/hotnews.json, data/pendampingan.json, data/posters.json
   ═══════════════════════════════════════════════════════════════ */

const EXTRA_DEFAULTS = {
    hotnews: [
        { tag: 'Proker Adkesma', judul: 'ADVOICE: Suarakan keluhan akademik & non-akademik', deskripsi: 'Wadah resmi Adkesma HMTK untuk menampung, mengawal, dan menindaklanjuti keluhanmu.', link: 'https://its.id/m/ADVOICE', linkLabel: 'Isi Form Advoice', icon: 'megaphone', hot: true },
        { tag: 'Terbaru', judul: 'TKpedia 2nd Edition sudah terbit', deskripsi: 'Buku panduan Teknologi Kedokteran dari Adkesma HMTK.', link: '#tkpedia', linkLabel: 'Baca TKpedia', icon: 'book-open-check', hot: true }
    ],
    pendampingan: {
        judul: 'Pendampingan Beasiswa Adkesma HMTK',
        deskripsi: 'Layanan pendampingan beasiswa dari Departemen Adkesma HMTK.',
        layanan: [], alur: [],
        cp: [{ nama: 'Tim Adkesma HMTK', peran: 'Contact Person Pendampingan Beasiswa', instagram: 'adkezzmoy', whatsapp: '', email: 'adkesmahmtk@gmail.com' }]
    },
    posters: []
};

const escHTML = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function loadExtra(path, fallback) {
    try {
        const res = await fetch(path, { cache: 'no-cache' });
        if (!res.ok) throw new Error(res.status);
        return await res.json();
    } catch (e) {
        return fallback;
    }
}

function refreshIcons() {
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ─── HOT NEWS ──────────────────────────────────────────────────
function renderHotNews(items) {
    const grid = document.getElementById('hotnewsGrid');
    if (!grid) return;
    grid.innerHTML = items.map((n, i) => {
        const external = /^https?:/i.test(n.link || '');
        return `
        <article class="hotnews-card ${i === 0 ? 'hotnews-featured' : ''} reveal visible">
            <div class="hotnews-card-top">
                <span class="hotnews-tag">${n.hot ? '<i data-lucide="flame"></i>' : ''}${escHTML(n.tag)}</span>
                ${n.tanggal ? `<span class="hotnews-date">${escHTML(n.tanggal)}</span>` : ''}
            </div>
            <div class="hotnews-card-icon"><i data-lucide="${escHTML(n.icon || 'newspaper')}"></i></div>
            <h3 class="hotnews-card-title">${escHTML(n.judul)}</h3>
            <p class="hotnews-card-desc">${escHTML(n.deskripsi)}</p>
            ${n.link ? `<a class="hotnews-link" href="${escHTML(n.link)}" ${external ? 'target="_blank" rel="noopener noreferrer"' : ''} data-internal="${external ? '' : '1'}">${escHTML(n.linkLabel || 'Selengkapnya')} <i data-lucide="arrow-right"></i></a>` : ''}
        </article>`;
    }).join('');

    // Link #beasiswa-pendampingan membuka subpage pendampingan
    grid.querySelectorAll('a[href="#beasiswa-pendampingan"]').forEach(a => {
        a.addEventListener('click', (e) => {
            e.preventDefault();
            openBeasiswaSubpage('pendampingan', true);
        });
    });
    refreshIcons();
}

// ─── SUBPAGE BEASISWA ──────────────────────────────────────────
function openBeasiswaSubpage(name, scroll) {
    document.querySelectorAll('.subpage-tab').forEach(t => {
        const active = t.dataset.subpage === name;
        t.classList.toggle('active', active);
        t.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.getElementById('beasiswaPanelList')?.classList.toggle('active', name === 'list');
    document.getElementById('beasiswaPanelPendampingan')?.classList.toggle('active', name === 'pendampingan');
    if (scroll) document.getElementById('beasiswa')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    refreshIcons();
}

function initSubpageTabs() {
    document.querySelectorAll('.subpage-tab').forEach(tab => {
        tab.addEventListener('click', () => openBeasiswaSubpage(tab.dataset.subpage, false));
    });
    if (location.hash === '#beasiswa-pendampingan') {
        openBeasiswaSubpage('pendampingan', true);
    }
    window.addEventListener('hashchange', () => {
        if (location.hash === '#beasiswa-pendampingan') openBeasiswaSubpage('pendampingan', true);
    });
}

// ─── PENDAMPINGAN ──────────────────────────────────────────────
function cleanWA(num) {
    let n = String(num || '').replace(/[^\d]/g, '');
    if (n.startsWith('0')) n = '62' + n.slice(1);
    return n;
}

function renderPendampingan(d) {
    document.getElementById('pendampinganTitle').textContent = d.judul || 'Pendampingan Beasiswa';
    document.getElementById('pendampinganDesc').textContent = d.deskripsi || '';

    document.getElementById('pendampinganLayanan').innerHTML = (d.layanan || []).map(l => `
        <div class="pendampingan-service">
            <div class="pendampingan-service-icon"><i data-lucide="${escHTML(l.icon || 'check')}"></i></div>
            <h5>${escHTML(l.judul)}</h5>
            <p>${escHTML(l.deskripsi)}</p>
        </div>`).join('');

    document.getElementById('pendampinganAlur').innerHTML = (d.alur || []).map((s, i) => `
        <div class="pendampingan-step">
            <span class="pendampingan-step-num">${String(i + 1).padStart(2, '0')}</span>
            <div><h5>${escHTML(s.judul)}</h5><p>${escHTML(s.deskripsi)}</p></div>
        </div>`).join('');

    document.getElementById('pendampinganCP').innerHTML = (d.cp || []).map(c => {
        const initials = (c.nama || '?').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
        const wa = cleanWA(c.whatsapp);
        return `
        <div class="pendampingan-cp">
            <div class="pendampingan-cp-avatar">${escHTML(initials)}</div>
            <div class="pendampingan-cp-body">
                <h5>${escHTML(c.nama)}</h5>
                <span>${escHTML(c.peran || '')}</span>
                <div class="pendampingan-cp-actions">
                    ${wa ? `<a class="cp-btn cp-btn-wa" href="https://wa.me/${wa}" target="_blank" rel="noopener noreferrer"><i data-lucide="message-circle"></i> WhatsApp</a>` : ''}
                    ${c.instagram ? `<a class="cp-btn cp-btn-ig" href="https://www.instagram.com/${escHTML(c.instagram)}" target="_blank" rel="noopener noreferrer"><i data-lucide="at-sign"></i> ${escHTML(c.instagram)}</a>` : ''}
                    ${c.email ? `<a class="cp-btn cp-btn-mail" href="https://mail.google.com/mail/?view=cm&fs=1&to=${escHTML(c.email)}" target="_blank" rel="noopener noreferrer"><i data-lucide="mail"></i> Email</a>` : ''}
                </div>
            </div>
        </div>`;
    }).join('');
    refreshIcons();
}

// ─── POSTER GALLERY ────────────────────────────────────────────
let posterManual = [];
let posterFilter = 'all';

function collectPosters() {
    const fromData = [];
    const add = (arr, tipe) => (arr || []).forEach(it => {
        if (it && it.poster) fromData.push({ judul: it.nama, tipe, gambar: it.poster, link: it.linkDaftar || '' });
    });
    try { add(beasiswaData, 'beasiswa'); } catch (e) {}
    try { add(lombaData, 'lomba'); } catch (e) {}
    const all = [...posterManual.map(p => ({ ...p, gambar: typeof resolvePosterUrl === 'function' ? resolvePosterUrl(p.gambar) : p.gambar })), ...fromData];
    const seen = new Set();
    return all.filter(p => p.gambar && !seen.has(p.gambar) && seen.add(p.gambar));
}

function renderPosters() {
    const grid = document.getElementById('posterGrid');
    if (!grid) return;
    const list = collectPosters().filter(p => posterFilter === 'all' || p.tipe === posterFilter);

    if (list.length === 0) {
        grid.innerHTML = `
            <div class="poster-empty">
                <i data-lucide="image-plus"></i>
                <h3>Poster segera hadir</h3>
                <p>Poster beasiswa dan lomba terbaru akan ditampilkan di sini.</p>
            </div>`;
        refreshIcons();
        return;
    }

    grid.innerHTML = list.map((p, i) => `
        <figure class="poster-item" data-index="${i}" tabindex="0">
            <div class="poster-frame"><img src="${escHTML(p.gambar)}" alt="Poster ${escHTML(p.judul)}" loading="lazy"></div>
            <figcaption>
                <span class="poster-type poster-type-${escHTML(p.tipe)}">${p.tipe === 'lomba' ? 'Lomba' : 'Beasiswa'}</span>
                <strong>${escHTML(p.judul)}</strong>
            </figcaption>
        </figure>`).join('');

    grid.querySelectorAll('.poster-item').forEach(el => {
        const open = () => openLightbox(list[parseInt(el.dataset.index)]);
        el.addEventListener('click', open);
        el.addEventListener('keydown', (e) => { if (e.key === 'Enter') open(); });
        el.querySelector('img').addEventListener('error', () => el.remove());
    });
    refreshIcons();
}

function initPosterGallery() {
    document.querySelectorAll('.poster-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.poster-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            posterFilter = btn.dataset.filter;
            renderPosters();
        });
    });

    // Poster dari data beasiswa/lomba tersedia setelah loadData() selesai
    let tries = 0;
    const timer = setInterval(() => {
        tries++;
        let ready = false;
        try { ready = beasiswaData.length > 0 || lombaData.length > 0; } catch (e) {}
        if (ready || tries > 40) {
            clearInterval(timer);
            renderPosters();
        }
    }, 500);
}

// ─── LIGHTBOX ──────────────────────────────────────────────────
function openLightbox(p) {
    const lb = document.getElementById('posterLightbox');
    document.getElementById('lightboxImg').src = p.gambar;
    document.getElementById('lightboxCaption').textContent = p.judul || '';
    lb.classList.add('open');
    lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    const lb = document.getElementById('posterLightbox');
    lb.classList.remove('open');
    lb.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}

function initLightbox() {
    const lb = document.getElementById('posterLightbox');
    document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
    lb.addEventListener('click', (e) => { if (e.target === lb) closeLightbox(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });

    // Klik poster di modal detail → perbesar
    const modalImg = document.getElementById('modalPosterImg');
    if (modalImg) {
        modalImg.style.cursor = 'zoom-in';
        modalImg.addEventListener('click', () => openLightbox({ gambar: modalImg.src, judul: document.getElementById('modalTitle')?.textContent }));
    }
}

// ─── TKPEDIA ───────────────────────────────────────────────────
function initTkpedia() {
    const btn = document.getElementById('btnTkpediaCopy');
    if (!btn) return;
    btn.addEventListener('click', async () => {
        const link = btn.dataset.link;
        try { await navigator.clipboard.writeText(link); } catch (e) {
            const t = document.createElement('textarea'); t.value = link; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove();
        }
        if (typeof showToast === 'function') showToast('Link TKpedia berhasil disalin!');
    });
}

// ─── INIT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    initSubpageTabs();
    initLightbox();
    initTkpedia();
    initPosterGallery();

    const [news, pend, posters] = await Promise.all([
        loadExtra('data/hotnews.json', EXTRA_DEFAULTS.hotnews),
        loadExtra('data/pendampingan.json', EXTRA_DEFAULTS.pendampingan),
        loadExtra('data/posters.json', EXTRA_DEFAULTS.posters)
    ]);
    posterManual = posters;
    renderHotNews(news);
    renderPendampingan(pend);
    renderPosters();
});
