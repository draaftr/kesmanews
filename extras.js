/* ═══════════════════════════════════════════════════════════════
   MyAdkesmaPortal — Extras
   Hot News, Subpage Pendampingan, Poster dalam Kotak, TKpedia
   Data: data/hotnews.json, data/pendampingan.json, data/posters.json
   ═══════════════════════════════════════════════════════════════ */

const EXTRA_DEFAULTS = {
    hotnews: [
        { tag: 'Proker Adkesma', judul: 'ADVOICE: Suarakan keluhan akademik & non-akademik', deskripsi: 'Wadah resmi Adkesma HMTK untuk menampung, mengawal, dan menindaklanjuti keluhanmu.', link: 'https://its.id/m/ADVOICE', linkLabel: 'Isi Form Advoice', icon: 'megaphone', hot: true },
        { tag: 'Terbaru', judul: 'TKpedia 2nd Edition sudah terbit', deskripsi: 'Buku panduan Teknologi Kedokteran dari Adkesma HMTK.', link: '#tkpedia', linkLabel: 'Baca TKpedia', icon: 'book-open-check', hot: true }
    ],
    pendampingan: {
        judul: 'Pendampingan Beasiswa Adkesma HMTK',
        deskripsi: 'Pendampingan beasiswa adalah layanan dari Departemen Adkesma HMTK untuk membantu mahasiswa Teknologi Kedokteran yang ingin mendaftar beasiswa, mulai dari memahami persyaratan, menyiapkan berkas, hingga latihan wawancara. Layanan ini gratis dan terbuka untuk seluruh mahasiswa HMTK.',
        layanan: [], alur: [],
        cp: [{ nama: 'Tim Adkesma HMTK', peran: 'Contact Person Pendampingan Beasiswa', instagram: 'adkezzmoy', whatsapp: '6288996063733', email: 'adkesmahmtk@gmail.com' }]
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

    const layananEl = document.getElementById('pendampinganLayanan');
    if (layananEl) {
        layananEl.innerHTML = (d.layanan || []).map(l => `
            <div class="pendampingan-service">
                <div class="pendampingan-service-icon"><i data-lucide="${escHTML(l.icon || 'check')}"></i></div>
                <h5>${escHTML(l.judul)}</h5>
                <p>${escHTML(l.deskripsi)}</p>
            </div>`).join('');
    }

    const alurEl = document.getElementById('pendampinganAlur');
    if (alurEl) {
        alurEl.innerHTML = (d.alur || []).map((s, i) => `
            <div class="pendampingan-step">
                <span class="pendampingan-step-num">${String(i + 1).padStart(2, '0')}</span>
                <div><h5>${escHTML(s.judul)}</h5><p>${escHTML(s.deskripsi)}</p></div>
            </div>`).join('');
    }

    const cpEl = document.getElementById('pendampinganCP');
    if (cpEl) {
        cpEl.innerHTML = (d.cp || []).map(c => {
            const initials = (c.nama || '?').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
            const wa = cleanWA(c.whatsapp);
            return `
            <div class="pendampingan-cp">
                <div class="pendampingan-cp-avatar">${escHTML(initials)}</div>
                <div class="pendampingan-cp-body">
                    <h5>${escHTML(c.nama)}</h5>
                    <span>${escHTML(c.peran || '')}</span>
                    <div class="pendampingan-cp-actions">
                        ${wa ? `<a class="cp-btn cp-btn-wa" href="https://wa.me/${wa}" target="_blank" rel="noopener noreferrer"><i data-lucide="message-circle"></i> Chat WhatsApp (0889-9606-3733)</a>` : ''}
                        ${c.instagram ? `<a class="cp-btn cp-btn-ig" href="https://www.instagram.com/${escHTML(c.instagram)}" target="_blank" rel="noopener noreferrer"><i data-lucide="at-sign"></i> @${escHTML(c.instagram)}</a>` : ''}
                        ${c.email ? `<a class="cp-btn cp-btn-mail" href="https://mail.google.com/mail/?view=cm&fs=1&to=${escHTML(c.email)}" target="_blank" rel="noopener noreferrer"><i data-lucide="mail"></i> Email</a>` : ''}
                    </div>
                </div>
            </div>`;
        }).join('');
    }
    refreshIcons();
}

// ─── POSTER (di dalam kotak Beasiswa & Lomba) ──────────────────
let posterManual = [];

function applyPostersToCards() {
    if (!Array.isArray(posterManual) || posterManual.length === 0) return;
    let updatedBeasiswa = false;
    let updatedLomba = false;

    posterManual.forEach(p => {
        const path = typeof resolvePosterUrl === 'function' ? resolvePosterUrl(p.gambar) : p.gambar;
        const kw = (p.namaKeyword || p.judul || '').toLowerCase();
        if (!kw) return;

        if (p.tipe === 'beasiswa' && typeof beasiswaData !== 'undefined' && Array.isArray(beasiswaData)) {
            beasiswaData.forEach(item => {
                if (!item.poster && item.nama.toLowerCase().includes(kw)) {
                    item.poster = path;
                    updatedBeasiswa = true;
                }
            });
        } else if (p.tipe === 'lomba' && typeof lombaData !== 'undefined' && Array.isArray(lombaData)) {
            lombaData.forEach(item => {
                if (!item.poster && item.nama.toLowerCase().includes(kw)) {
                    item.poster = path;
                    updatedLomba = true;
                }
            });
        }
    });

    if (updatedBeasiswa && typeof filterData === 'function') filterData('beasiswa');
    if (updatedLomba && typeof filterData === 'function') filterData('lomba');
}

function collectPosters(tipe) {
    const fromData = [];
    try {
        const src = tipe === 'lomba' ? lombaData : beasiswaData;
        if (Array.isArray(src)) {
            src.forEach(it => {
                if (it && it.poster) fromData.push({ judul: it.nama, tipe, gambar: it.poster });
            });
        }
    } catch (e) { /* data belum siap */ }

    const manual = (posterManual || [])
        .filter(p => p.tipe === tipe)
        .map(p => ({ ...p, gambar: typeof resolvePosterUrl === 'function' ? resolvePosterUrl(p.gambar) : p.gambar }));
    const seen = new Set();
    return [...manual, ...fromData].filter(p => p.gambar && !seen.has(p.gambar) && seen.add(p.gambar));
}

function renderPostersFor(tipe) {
    const key = tipe === 'lomba' ? 'Lomba' : 'Beasiswa';
    const strip = document.getElementById('posterStrip' + key);
    const grid = document.getElementById('posterGrid' + key);
    if (!strip || !grid) return;
    const list = collectPosters(tipe);

    strip.classList.toggle('hidden', list.length === 0);
    if (list.length === 0) return;

    grid.innerHTML = list.map((p, i) => `
        <figure class="poster-item" data-index="${i}" tabindex="0">
            <div class="poster-frame"><img src="${escHTML(p.gambar)}" alt="Poster ${escHTML(p.judul)}" loading="lazy"></div>
            <figcaption><strong>${escHTML(p.judul)}</strong></figcaption>
        </figure>`).join('');

    grid.querySelectorAll('.poster-item').forEach(el => {
        const open = () => openLightbox(list[parseInt(el.dataset.index)]);
        el.addEventListener('click', open);
        el.addEventListener('keydown', (e) => { if (e.key === 'Enter') open(); });
        el.querySelector('img').addEventListener('error', () => {
            el.remove();
            if (!grid.children.length) strip.classList.add('hidden');
        });
    });
    refreshIcons();
}

function renderPosters() {
    applyPostersToCards();
    renderPostersFor('beasiswa');
    renderPostersFor('lomba');
}

function initPosterGallery() {
    let tries = 0;
    const timer = setInterval(() => {
        tries++;
        let ready = false;
        try { ready = (typeof beasiswaData !== 'undefined' && beasiswaData.length > 0) || (typeof lombaData !== 'undefined' && lombaData.length > 0); } catch (e) {}
        if (ready || tries > 40) {
            clearInterval(timer);
            renderPosters();
        }
    }, 400);
}

// ─── LIGHTBOX ──────────────────────────────────────────────────
function openLightbox(p) {
    const lb = document.getElementById('posterLightbox');
    if (!lb || !p || !p.gambar) return;
    const img = document.getElementById('lightboxImg');
    const cap = document.getElementById('lightboxCaption');
    if (img) img.src = p.gambar;
    if (cap) cap.textContent = p.judul || '';
    lb.classList.add('open');
    lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}
window.openLightbox = openLightbox;

function closeLightbox() {
    const lb = document.getElementById('posterLightbox');
    if (!lb) return;
    lb.classList.remove('open');
    lb.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}
window.closeLightbox = closeLightbox;

function initLightbox() {
    const lb = document.getElementById('posterLightbox');
    if (!lb) return;
    document.getElementById('lightboxClose')?.addEventListener('click', closeLightbox);
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
        try {
            await navigator.clipboard.writeText(link);
        } catch (e) {
            const t = document.createElement('textarea');
            t.value = link;
            document.body.appendChild(t);
            t.select();
            document.execCommand('copy');
            t.remove();
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
