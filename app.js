/* ═══════════════════════════════════════════════════════════════
   KESMA NEWS — App Logic
   Departemen Adkesma HMTK
   ═══════════════════════════════════════════════════════════════ */

// ─── Google Sheets Config ──────────────────────────────────────
const SHEET_ID = '1PnW8SKd8X0cdC8oK2DRMkU7gNA4nEX7aG--7fmYZ0uo';
const SHEET_BEASISWA_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`;
const SHEET_LOMBA_URL    = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=157846337`;

// ─── State ─────────────────────────────────────────────────────
let beasiswaData = [];
let lombaData = [];
let currentModalData = null;
let currentModalType = null; // 'beasiswa' atau 'lomba' — eksplisit, tidak ditebak dari ID
let countdownIntervals = [];

// Watchlist state (persisted in localStorage)
let watchlist = JSON.parse(localStorage.getItem('kesmanews-watchlist') || '[]');

// Sort state per section
let sortBeasiswa = 'default';
let sortLomba = 'default';

// ─── DOM Ready ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initLucide();
    initDarkMode();
    initNavbar();
    initScrollReveal();
    initBackToTop();
    initEmailCopy();
    initAboutSection();
    loadData();
});

// ─── Initialize Lucide Icons ───────────────────────────────────
function initLucide() {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// ═══════════════════════════════════════════════════════════════
// DARK MODE
// ═══════════════════════════════════════════════════════════════
function initDarkMode() {
    const toggle = document.getElementById('darkModeToggle');
    const savedTheme = localStorage.getItem('kesmanews-theme');
    
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    }

    toggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('kesmanews-theme', next);
        lucide.createIcons();
    });
}

// ═══════════════════════════════════════════════════════════════
// NAVBAR
// ═══════════════════════════════════════════════════════════════
function initNavbar() {
    const navbar = document.getElementById('navbar');
    const mobileToggle = document.getElementById('mobileMenuToggle');
    const navLinks = document.getElementById('navLinks');
    const links = document.querySelectorAll('.nav-link');

    // Scroll effect
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
        updateActiveNavLink();
    });

    // Mobile menu toggle
    mobileToggle.addEventListener('click', () => {
        mobileToggle.classList.toggle('active');
        navLinks.classList.toggle('active');
        document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
        lucide.createIcons();
    });

    // Close mobile menu on link click
    links.forEach(link => {
        link.addEventListener('click', () => {
            mobileToggle.classList.remove('active');
            navLinks.classList.remove('active');
            document.body.style.overflow = '';
        });
    });
}

function updateActiveNavLink() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');
    
    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop - 100;
        if (window.scrollY >= sectionTop) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-section') === current) {
            link.classList.add('active');
        }
    });
}

// ═══════════════════════════════════════════════════════════════
// SCROLL REVEAL
// ═══════════════════════════════════════════════════════════════
function initScrollReveal() {
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

function observeCards() {
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
                        entry.target.classList.add('card-visible');
                    }, index * 80);
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.05, rootMargin: '0px 0px -30px 0px' }
    );

    document.querySelectorAll('.card').forEach(el => observer.observe(el));
}

// ═══════════════════════════════════════════════════════════════
// BACK TO TOP
// ═══════════════════════════════════════════════════════════════
function initBackToTop() {
    const btn = document.getElementById('backToTop');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 600) {
            btn.classList.add('visible');
        } else {
            btn.classList.remove('visible');
        }
    });

    btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// ═══════════════════════════════════════════════════════════════
// CSV PARSER
// Robust parser yang handle: quoted fields, newlines dalam sel,
// koma dalam quotes, dan escape characters
// ═══════════════════════════════════════════════════════════════
function parseCSV(text) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;
    
    // Normalize line endings
    const str = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    for (let i = 0; i < str.length; i++) {
        const ch = str[i];
        const next = str[i + 1];
        
        if (inQuotes) {
            if (ch === '"' && next === '"') {
                // Escaped quote
                field += '"';
                i++;
            } else if (ch === '"') {
                // End of quoted field
                inQuotes = false;
            } else {
                field += ch;
            }
        } else {
            if (ch === '"') {
                inQuotes = true;
            } else if (ch === ',') {
                row.push(field.trim());
                field = '';
            } else if (ch === '\n') {
                row.push(field.trim());
                field = '';
                if (row.some(f => f !== '')) {
                    rows.push(row);
                }
                row = [];
            } else {
                field += ch;
            }
        }
    }
    
    // Last field & row
    if (field.trim() || row.length > 0) {
        row.push(field.trim());
        if (row.some(f => f !== '')) {
            rows.push(row);
        }
    }
    
    return rows;
}

// ═══════════════════════════════════════════════════════════════
// EXTRACT LINKS dari kolom "Informasi Selengkapnya"
// ═══════════════════════════════════════════════════════════════
function extractLinks(infoText) {
    if (!infoText) return { linkDaftar: '', linkGuidebook: '' };
    
    // Regex untuk menangkap URL (dengan atau tanpa http/https)
    const urlRegex = /(?:https?:\/\/)?(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)/gi;
    
    const urls = infoText.match(urlRegex) || [];
    
    // Normalisasi: tambahkan https:// jika belum ada
    const normalizeUrl = (url) => {
        url = url.trim().replace(/[()]/g, ''); // buang kurung di beberapa format
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        if (url.includes('@')) return ''; // email, skip
        return 'https://' + url;
    };
    
    // Cek apakah teks mengandung kata kunci guidebook
    const lowerInfo = infoText.toLowerCase();
    const hasGuidebookKeyword = /guidebook|panduan|guide book|bukpan|buku panduan/i.test(infoText);
    const hasDaftarKeyword = /registr|pendaftaran|daftar|form|registration/i.test(infoText);
    
    let linkDaftar = '';
    let linkGuidebook = '';
    
    if (urls.length === 0) {
        // Tidak ada URL
        return { linkDaftar: '', linkGuidebook: '' };
    }
    
    if (urls.length === 1) {
        // Hanya 1 URL
        const singleUrl = normalizeUrl(urls[0]);
        if (hasGuidebookKeyword) {
            linkGuidebook = singleUrl;
        } else {
            linkDaftar = singleUrl;
        }
        return { linkDaftar, linkGuidebook };
    }
    
    // Lebih dari 1 URL — coba parse berdasarkan konteks
    // Split teks menjadi baris-baris untuk analisis
    const lines = infoText.split('\n');
    
    for (const line of lines) {
        const lineUrls = line.match(urlRegex) || [];
        if (lineUrls.length === 0) continue;
        
        const lineUrl = normalizeUrl(lineUrls[0]);
        if (!lineUrl) continue;
        
        const lineLower = line.toLowerCase();
        
        if (/guidebook|panduan|guide book|bukpan|buku panduan/i.test(line)) {
            if (!linkGuidebook) linkGuidebook = lineUrl;
        } else if (/registr|pendaftar|daftar|form/i.test(line)) {
            if (!linkDaftar) linkDaftar = lineUrl;
        } else if (/info|selengkapnya|lengkap|detail/i.test(line)) {
            if (!linkDaftar) linkDaftar = lineUrl;
        } else {
            // Default: URL pertama jadi daftar, kedua jadi guidebook
            if (!linkDaftar) linkDaftar = lineUrl;
            else if (!linkGuidebook) linkGuidebook = lineUrl;
        }
    }
    
    // Fallback jika parsing per baris gagal
    if (!linkDaftar && !linkGuidebook) {
        linkDaftar = normalizeUrl(urls[0]);
        if (urls[1]) linkGuidebook = normalizeUrl(urls[1]);
    }
    
    return { linkDaftar, linkGuidebook };
}

// ═══════════════════════════════════════════════════════════════
// PARSE DEADLINE
// Format bervariasi: "24 Juli 2026", "2026-07-24", "24/07/2026",
// "hingga: 24 Juli 2026", timeline panjang, dll.
// Kembalikan string YYYY-MM-DD
// ═══════════════════════════════════════════════════════════════
const BULAN_MAP = {
    'januari': '01', 'februari': '02', 'maret': '03', 'april': '04',
    'mei': '05', 'juni': '06', 'juli': '07', 'agustus': '08',
    'september': '09', 'oktober': '10', 'november': '11', 'desember': '12',
    'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
    'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
    'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12',
};

function parseDeadline(teks) {
    if (!teks) return '';
    
    const dates = [];
    
    // Format 1: DD/MM/YYYY atau DD-MM-YYYY (format lomba)
    const dmy1 = [...teks.matchAll(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/g)];
    for (const m of dmy1) {
        const d = m[1].padStart(2, '0');
        const mo = m[2].padStart(2, '0');
        const y = m[3];
        dates.push(`${y}-${mo}-${d}`);
    }
    
    // Format 2: YYYY-MM-DD
    const ymd = [...teks.matchAll(/(\d{4})-(\d{2})-(\d{2})/g)];
    for (const m of ymd) {
        dates.push(`${m[1]}-${m[2]}-${m[3]}`);
    }
    
    // Format 3: "DD Bulan YYYY" atau "D Bulan YYYY"
    const dmy2 = [...teks.matchAll(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/g)];
    for (const m of dmy2) {
        const bulan = BULAN_MAP[m[2].toLowerCase()];
        if (bulan) {
            const d = m[1].padStart(2, '0');
            dates.push(`${m[3]}-${bulan}-${d}`);
        }
    }
    
    // Format 4: "Bulan YYYY" (tanpa hari — ambil akhir bulan)
    const my = [...teks.matchAll(/([A-Za-z]+)\s+(\d{4})/g)];
    for (const m of my) {
        const bulan = BULAN_MAP[m[1].toLowerCase()];
        if (bulan) {
            const lastDay = new Date(parseInt(m[2]), parseInt(bulan), 0).getDate();
            dates.push(`${m[2]}-${bulan}-${lastDay.toString().padStart(2, '0')}`);
        }
    }
    
    if (dates.length === 0) return '';
    
    // Ambil deadline paling akhir
    dates.sort();
    return dates[dates.length - 1];
}

// ═══════════════════════════════════════════════════════════════
// PARSE TEXT menjadi array bullet points
// ═══════════════════════════════════════════════════════════════
function parseToArray(teks) {
    if (!teks) return [];
    
    // Split berdasarkan newline, lalu bersihkan bullet/numbering
    const lines = teks.split('\n')
        .map(line => line
            .replace(/^[\s\*\-•·▪◦‣→⁃]+/, '') // hapus bullet di awal
            .replace(/^\d+[\.\)]\s*/, '')        // hapus nomor di awal
            .replace(/^[A-Z][\.\)]\s*/, '')      // hapus huruf di awal (A. B. C.)
            .trim()
        )
        .filter(line => line.length > 2); // filter baris kosong/terlalu pendek
    
    return lines;
}

// ═══════════════════════════════════════════════════════════════
// PARSE SHEET BEASISWA → Array of objects
// Kolom: Nama Beasiswa, Status Pendaftaran, Kategori, Deadline,
//        Persyaratan, Cakupan Benefit, Informasi Selengkapnya
// ═══════════════════════════════════════════════════════════════
function parseBeasiswaSheet(rows) {
    // rows[0] adalah header, mulai dari rows[1]
    return rows.slice(1)
        .filter(row => row[0] && row[0].trim()) // skip baris kosong
        .map((row, idx) => {
            const nama        = (row[0] || '').trim();
            const status      = (row[1] || '').trim();
            const kategori    = (row[2] || '').trim().split(',')[0].trim(); // ambil kategori pertama
            const deadlineRaw = (row[3] || '').trim();
            const persyaratan = parseToArray(row[4] || '');
            const benefit     = parseToArray(row[5] || '');
            const infoText    = (row[6] || '').trim();
            
            const deadline = parseDeadline(deadlineRaw) || parseDeadline(nama);
            const { linkDaftar, linkGuidebook } = extractLinks(infoText);
            
            // Timeline: pakai kolom deadline yang asli kalau ada kata "Timeline"
            let timelinePenting = '';
            if (/timeline|timeline penting|seleksi|pengumuman|wawancara/i.test(deadlineRaw)) {
                timelinePenting = deadlineRaw.replace(/\n/g, ' | ').trim();
            } else if (deadline) {
                timelinePenting = `Deadline: ${deadlineRaw}`;
            }
            
            return {
                id: idx + 1,
                nama,
                status: status || 'Tutup',
                kategori: kategori || 'Umum',
                deadline: deadline || '2099-12-31', // fallback jika tidak bisa diparse
                persyaratan,
                benefit,
                linkDaftar,
                linkGuidebook,
                timelinePenting,
            };
        });
}

// ═══════════════════════════════════════════════════════════════
// PARSE SHEET LOMBA → Array of objects
// Kolom: Nama Lomba, Penyelenggara, Status Lomba, Skala, Deadline,
//        Cabang Lomba, Partisipasi, Biaya, Informasi Selengkapnya
// ═══════════════════════════════════════════════════════════════
function parseLombaSheet(rows) {
    return rows.slice(1)
        .filter(row => row[0] && row[0].trim())
        .map((row, idx) => {
            const nama          = (row[0] || '').trim();
            const penyelenggara = (row[1] || '').trim();
            const status        = (row[2] || '').trim();
            const skala         = (row[3] || '').trim();
            const deadlineRaw   = (row[4] || '').trim();
            const cabangLomba   = (row[5] || '').trim();
            const partisipasi   = (row[6] || '').trim();
            const biaya         = (row[7] || '').trim();
            const infoText      = (row[8] || '').trim();
            
            const deadline = parseDeadline(deadlineRaw) || '';
            const { linkDaftar, linkGuidebook } = extractLinks(infoText);
            
            // Kategori untuk lomba: pakai skala (Nasional/Internasional)
            // atau cabang lomba sebagai kategori
            const kategori = skala || 'Nasional';
            
            // Buat benefit dari info yang ada (karena sheet lomba tidak punya kolom benefit)
            const benefit = [];
            if (biaya === 'Gratis') benefit.push('Pendaftaran Gratis');
            if (partisipasi) benefit.push(`Kategori: ${partisipasi}`);
            if (penyelenggara) benefit.push(`Penyelenggara: ${penyelenggara}`);
            
            // Persyaratan: tidak ada di sheet lomba, biarkan kosong
            const persyaratan = [];
            
            // Timeline
            let timelinePenting = deadlineRaw ? `Deadline: ${deadlineRaw}` : '';
            if (cabangLomba) timelinePenting += timelinePenting ? ` | Cabang: ${cabangLomba}` : `Cabang: ${cabangLomba}`;
            
            return {
                id: idx + 1,
                nama,
                penyelenggara,
                status: status || 'Tutup',
                kategori,
                skala,
                cabangLomba,
                partisipasi,
                biaya,
                deadline: deadline || '2099-12-31',
                persyaratan,
                benefit,
                linkDaftar,
                linkGuidebook,
                timelinePenting,
            };
        });
}

// ═══════════════════════════════════════════════════════════════
// DATA LOADING — Sheets dulu, fallback ke JSON lokal
// ═══════════════════════════════════════════════════════════════
async function loadData() {
    try {
        // Coba fetch dari Google Sheets
        const [beasiswaRes, lombaRes] = await Promise.all([
            fetch(SHEET_BEASISWA_URL),
            fetch(SHEET_LOMBA_URL)
        ]);

        if (!beasiswaRes.ok || !lombaRes.ok) throw new Error('Sheets fetch failed');

        const [beasiswaCsv, lombaCsv] = await Promise.all([
            beasiswaRes.text(),
            lombaRes.text()
        ]);

        const beasiswaRows = parseCSV(beasiswaCsv);
        const lombaRows    = parseCSV(lombaCsv);

        beasiswaData = parseBeasiswaSheet(beasiswaRows);
        lombaData    = parseLombaSheet(lombaRows);

        console.log(`✅ Data dari Google Sheets: ${beasiswaData.length} beasiswa, ${lombaData.length} lomba`);

    } catch (err) {
        console.warn('⚠️ Gagal fetch Google Sheets, fallback ke JSON lokal:', err.message);
        try {
            const [beasiswaRes, lombaRes] = await Promise.all([
                fetch('data/beasiswa.json'),
                fetch('data/lomba.json')
            ]);
            beasiswaData = await beasiswaRes.json();
            lombaData    = await lombaRes.json();
            console.log('✅ Data dari JSON lokal (fallback)');
        } catch (fallbackErr) {
            console.error('❌ Gagal memuat data:', fallbackErr);
            showDataError();
            return;
        }
    }

    // Hide skeletons
    document.getElementById('skeletonBeasiswa').classList.add('hidden');
    document.getElementById('skeletonLomba').classList.add('hidden');

    // Render cards
    renderCards('beasiswa', beasiswaData);
    renderCards('lomba', lombaData);

    // Update hero stats
    updateHeroStats();

    // Init filters
    initFilters();

    // Observe card animations
    observeCards();

    // Reinit icons
    lucide.createIcons();

    // Render watchlist section
    renderWatchlist();
}

function showDataError() {
    document.getElementById('skeletonBeasiswa').classList.add('hidden');
    document.getElementById('skeletonLomba').classList.add('hidden');
    document.getElementById('emptyBeasiswa').classList.remove('hidden');
    document.getElementById('emptyLomba').classList.remove('hidden');
}

// ═══════════════════════════════════════════════════════════════
// HERO STATS (animated count-up)
// ═══════════════════════════════════════════════════════════════
function updateHeroStats() {
    const totalBeasiswa = beasiswaData.length;
    const totalLomba = lombaData.length;
    const totalBuka = [...beasiswaData, ...lombaData].filter(item => item.status === 'Buka').length;

    animateCounter('statBeasiswa', totalBeasiswa);
    animateCounter('statLomba', totalLomba);
    animateCounter('statBuka', totalBuka);
}

function animateCounter(elementId, target) {
    const el = document.getElementById(elementId);
    let current = 0;
    const increment = Math.max(1, Math.ceil(target / 30));
    const interval = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(interval);
        }
        el.textContent = current;
    }, 40);
}

// ═══════════════════════════════════════════════════════════════
// CARD RENDERING
// ═══════════════════════════════════════════════════════════════
function renderCards(type, data) {
    const grid = document.getElementById(`${type}Grid`);
    const emptyState = document.getElementById(`empty${capitalize(type)}`);

    // Clear previous countdown intervals
    countdownIntervals.forEach(id => clearInterval(id));
    countdownIntervals = [];

    if (data.length === 0) {
        grid.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }

    grid.classList.remove('hidden');
    emptyState.classList.add('hidden');

    // Sort based on current sort state
    const currentSort = type === 'beasiswa' ? sortBeasiswa : sortLomba;
    const sorted = [...data].sort((a, b) => {
        if (currentSort === 'deadline') {
            return new Date(a.deadline) - new Date(b.deadline);
        } else if (currentSort === 'nama') {
            return a.nama.localeCompare(b.nama, 'id');
        } else if (currentSort === 'status') {
            if (a.status === 'Buka' && b.status !== 'Buka') return -1;
            if (a.status !== 'Buka' && b.status === 'Buka') return 1;
            return 0;
        } else {
            // Default: open first, then nearest deadline
            if (a.status === 'Buka' && b.status !== 'Buka') return -1;
            if (a.status !== 'Buka' && b.status === 'Buka') return 1;
            return new Date(a.deadline) - new Date(b.deadline);
        }
    });

    grid.innerHTML = sorted.map(item => createCardHTML(item, type)).join('');

    // Attach click handlers
    grid.querySelectorAll('.card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.card-actions')) return;
            const id = parseInt(card.dataset.id);
            const itemData = type === 'beasiswa' ? beasiswaData : lombaData;
            const item = itemData.find(d => d.id === id);
            if (item) openModal(item, type);
        });
    });

    // Attach watchlist toggle handlers
    grid.querySelectorAll('.btn-bookmark').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            const itemType = btn.dataset.type;
            toggleWatchlist(id, itemType);
            const sourceData = itemType === 'beasiswa' ? beasiswaData : lombaData;
            const searchValue = document.getElementById(`search${capitalize(itemType)}`).value.toLowerCase().trim();
            const kategoriValue = document.getElementById(`filterKategori${capitalize(itemType)}`).value;
            const statusValue = document.getElementById(`filterStatus${capitalize(itemType)}`).value;
            const filtered = sourceData.filter(item => {
                const matchSearch = !searchValue || item.nama.toLowerCase().includes(searchValue);
                const matchKategori = kategoriValue === 'semua' || item.kategori === kategoriValue;
                const matchStatus = statusValue === 'semua' || item.status === statusValue;
                return matchSearch && matchKategori && matchStatus;
            });
            renderCards(itemType, filtered);
            lucide.createIcons();
            renderWatchlist();
        });
    });

    // Attach share WA handlers
    grid.querySelectorAll('.btn-share-wa').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            const itemType = btn.dataset.type;
            const sourceData = itemType === 'beasiswa' ? beasiswaData : lombaData;
            const item = sourceData.find(d => d.id === id);
            if (item) shareToWhatsApp(item);
        });
    });

    // Start countdown timers on cards
    grid.querySelectorAll('.card-countdown-text').forEach(el => {
        const deadline = el.dataset.deadline;
        if (deadline) {
            updateCardCountdown(el, deadline);
            const intervalId = setInterval(() => updateCardCountdown(el, deadline), 60000);
            countdownIntervals.push(intervalId);
        }
    });

    // Re-observe cards for animation
    setTimeout(observeCards, 50);
}

function createCardHTML(item, type) {
    const isOpen = item.status === 'Buka';
    const daysLeft = getDaysLeft(item.deadline);
    const isUrgent = isOpen && daysLeft >= 0 && daysLeft <= 7;
    const isExpired = daysLeft < 0;
    const isBookmarked = isInWatchlist(item.id, type);

    // Untuk lomba: tampilkan penyelenggara sebagai subtitle, untuk beasiswa: benefit pertama
    const subtitleText = type === 'lomba' && item.penyelenggara
        ? item.penyelenggara
        : (item.benefit && item.benefit[0] ? item.benefit[0] : '');

    // Badge tambahan untuk lomba
    const extraBadge = type === 'lomba'
        ? `<span class="badge badge-kategori">${item.skala || item.kategori}</span>`
        : `<span class="badge badge-kategori">${item.kategori}</span>`;

    return `
        <div class="card" data-id="${item.id}">
            <div class="card-top">
                <div class="card-badges">
                    <span class="badge ${isOpen ? 'badge-open' : 'badge-closed'}">
                        ${item.status}
                    </span>
                    ${extraBadge}
                </div>
                <div class="card-top-actions">
                    <button class="btn-bookmark ${isBookmarked ? 'bookmarked' : ''}" 
                            data-id="${item.id}" data-type="${type}"
                            title="${isBookmarked ? 'Hapus dari pantauan' : 'Simpan ke pantauan'}">
                        <i data-lucide="${isBookmarked ? 'bookmark-check' : 'bookmark'}"></i>
                    </button>
                    <button class="btn-share-wa" data-id="${item.id}" data-type="${type}" title="Bagikan ke WhatsApp">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                    </button>
                </div>
            </div>
            <h3 class="card-title">${item.nama}</h3>
            <div class="card-info">
                <div class="card-info-item ${isUrgent ? 'deadline-urgent' : ''}">
                    <i data-lucide="calendar"></i>
                    <span>Deadline: ${item.deadline !== '2099-12-31' ? formatDate(item.deadline) : 'Lihat info'}</span>
                </div>
                ${type === 'lomba' && item.cabangLomba ? `
                <div class="card-info-item">
                    <i data-lucide="layers"></i>
                    <span>${item.cabangLomba}</span>
                </div>` : ''}
            </div>
            <div class="card-countdown ${isExpired ? 'expired' : ''}">
                <i data-lucide="timer"></i>
                <span class="card-countdown-text" data-deadline="${item.deadline}">
                    ${item.deadline !== '2099-12-31' ? getCountdownText(item.deadline) : '–'}
                </span>
            </div>
            ${subtitleText ? `
                <div class="card-benefit-preview">
                    <strong>${type === 'beasiswa' ? '💰' : '🏆'}</strong> ${subtitleText}
                </div>
            ` : ''}
            <div class="card-actions">
                <a href="${item.linkDaftar || '#'}" 
                   class="btn btn-primary btn-card ${!item.linkDaftar ? 'btn-disabled' : ''}" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   onclick="event.stopPropagation()">
                    <i data-lucide="external-link"></i>
                    Daftar
                </a>
                <button class="btn btn-outline btn-card btn-detail-card"
                        data-id="${item.id}" data-type="${type}"
                        onclick="event.stopPropagation(); (function(){ const d = '${type}' === 'beasiswa' ? beasiswaData : lombaData; const it = d.find(x => x.id === ${item.id}); if(it) openModal(it, '${type}'); })();">
                    <i data-lucide="info"></i>
                    Lihat Detail
                </button>
            </div>
        </div>
    `;
}

// ═══════════════════════════════════════════════════════════════
// FILTERS & SEARCH
// ═══════════════════════════════════════════════════════════════
function initFilters() {
    // Beasiswa filters
    document.getElementById('searchBeasiswa').addEventListener('input', () => filterData('beasiswa'));
    document.getElementById('filterKategoriBeasiswa').addEventListener('change', () => filterData('beasiswa'));
    document.getElementById('filterStatusBeasiswa').addEventListener('change', () => filterData('beasiswa'));
    document.getElementById('sortBeasiswa').addEventListener('change', (e) => {
        sortBeasiswa = e.target.value;
        filterData('beasiswa');
    });

    // Lomba filters
    document.getElementById('searchLomba').addEventListener('input', () => filterData('lomba'));
    document.getElementById('filterKategoriLomba').addEventListener('change', () => filterData('lomba'));
    document.getElementById('filterStatusLomba').addEventListener('change', () => filterData('lomba'));
    document.getElementById('sortLomba').addEventListener('change', (e) => {
        sortLomba = e.target.value;
        filterData('lomba');
    });
}

function filterData(type) {
    const searchValue = document.getElementById(`search${capitalize(type)}`).value.toLowerCase().trim();
    const kategoriValue = document.getElementById(`filterKategori${capitalize(type)}`).value;
    const statusValue = document.getElementById(`filterStatus${capitalize(type)}`).value;
    
    const sourceData = type === 'beasiswa' ? beasiswaData : lombaData;

    const filtered = sourceData.filter(item => {
        const matchSearch = !searchValue || item.nama.toLowerCase().includes(searchValue)
            || (item.penyelenggara && item.penyelenggara.toLowerCase().includes(searchValue));
        const matchKategori = kategoriValue === 'semua' || item.kategori === kategoriValue
            || (item.skala && item.skala === kategoriValue);
        const matchStatus = statusValue === 'semua' || item.status === statusValue;
        return matchSearch && matchKategori && matchStatus;
    });

    renderCards(type, filtered);
    lucide.createIcons();
}

// ═══════════════════════════════════════════════════════════════
// MODAL
// ═══════════════════════════════════════════════════════════════
function openModal(item, type) {
    currentModalData = item;
    currentModalType = type || (beasiswaData.some(d => d.id === item.id && d.nama === item.nama) ? 'beasiswa' : 'lomba');
    const overlay = document.getElementById('modalOverlay');
    
    // Fill modal content
    document.getElementById('modalTitle').textContent = item.nama;
    
    const statusEl = document.getElementById('modalStatus');
    statusEl.innerHTML = `<span class="badge ${item.status === 'Buka' ? 'badge-open' : 'badge-closed'}">${item.status}</span>`;
    
    // Kategori & deadline
    const kategoriLabel = type === 'lomba' ? `🌐 ${item.skala || item.kategori}` : `📂 ${item.kategori}`;
    document.getElementById('modalKategori').textContent = kategoriLabel;
    document.getElementById('modalDeadline').textContent = item.deadline !== '2099-12-31'
        ? `📅 ${formatDate(item.deadline)}`
        : '📅 Lihat info selengkapnya';

    // Countdown
    renderModalCountdown(item.deadline);

    // ── Persyaratan ──
    const persyaratanSection = document.getElementById('modalPersyaratan').closest('.modal-section');
    const persyaratanList = document.getElementById('modalPersyaratan');
    if (item.persyaratan && item.persyaratan.length > 0) {
        persyaratanSection.style.display = '';
        persyaratanList.innerHTML = item.persyaratan.map(p => `<li>${p}</li>`).join('');
    } else {
        persyaratanSection.style.display = 'none';
    }

    // ── Benefit ──
    const benefitSection = document.getElementById('modalBenefit').closest('.modal-section');
    const benefitList = document.getElementById('modalBenefit');
    if (item.benefit && item.benefit.length > 0) {
        benefitSection.style.display = '';
        benefitList.innerHTML = item.benefit.map(b => `<li>${b}</li>`).join('');
    } else {
        benefitSection.style.display = 'none';
    }

    // ── Info tambahan untuk Lomba ──
    // Tambahkan atau tampilkan detail lomba (penyelenggara, cabang, partisipasi, biaya)
    let lombaDetailSection = document.getElementById('modalLombaDetail');
    if (type === 'lomba') {
        const details = [];
        if (item.penyelenggara) details.push(`🏫 <strong>Penyelenggara:</strong> ${item.penyelenggara}`);
        if (item.cabangLomba)   details.push(`🎯 <strong>Cabang Lomba:</strong> ${item.cabangLomba}`);
        if (item.partisipasi)   details.push(`👥 <strong>Partisipasi:</strong> ${item.partisipasi}`);
        if (item.biaya)         details.push(`💳 <strong>Biaya:</strong> ${item.biaya}`);
        
        if (details.length > 0) {
            if (!lombaDetailSection) {
                // Buat section baru kalau belum ada
                lombaDetailSection = document.createElement('div');
                lombaDetailSection.className = 'modal-section';
                lombaDetailSection.id = 'modalLombaDetail';
                lombaDetailSection.innerHTML = `<h3><i data-lucide="info"></i> Detail Lomba</h3><div id="modalLombaDetailContent"></div>`;
                document.getElementById('modalPersyaratan').closest('.modal-section').before(lombaDetailSection);
            }
            lombaDetailSection.style.display = '';
            document.getElementById('modalLombaDetailContent').innerHTML = details.map(d => `<p style="margin:6px 0;font-size:0.9rem;">${d}</p>`).join('');
        } else if (lombaDetailSection) {
            lombaDetailSection.style.display = 'none';
        }
    } else {
        if (lombaDetailSection) lombaDetailSection.style.display = 'none';
    }

    // Timeline
    document.getElementById('modalTimeline').textContent = item.timelinePenting || 'Belum tersedia';

    // Action buttons
    const daftarBtn = document.getElementById('modalDaftar');

    if (item.linkDaftar) {
        daftarBtn.href = item.linkDaftar;
        daftarBtn.classList.remove('btn-disabled');
    } else {
        daftarBtn.href = '#';
        daftarBtn.classList.add('btn-disabled');
    }

    // Update modal bookmark button
    updateModalBookmarkBtn(item);

    // Show modal
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    lucide.createIcons();
}

function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    currentModalData = null;
}

// Modal event listeners
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modalOverlay')) {
        closeModal();
    }
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});

// Modal Bookmark button
document.getElementById('modalBookmarkBtn').addEventListener('click', () => {
    if (!currentModalData) return;
    toggleWatchlist(currentModalData.id, currentModalType);
    renderWatchlist();
    renderCards('beasiswa', beasiswaData);
    renderCards('lomba', lombaData);
    lucide.createIcons();
});

// Modal Share WA button
document.getElementById('modalShareWA').addEventListener('click', () => {
    if (currentModalData) shareToWhatsApp(currentModalData);
});

function renderModalCountdown(deadline) {
    const container = document.getElementById('modalCountdown');
    
    if (!deadline || deadline === '2099-12-31') {
        container.innerHTML = `
            <div class="countdown-unit" style="min-width: auto; padding: 12px 20px;">
                <span class="countdown-number" style="font-size: 0.9rem; color: var(--color-text-secondary);">
                    Cek link untuk deadline
                </span>
            </div>
        `;
        return;
    }
    
    const now = new Date();
    const target = new Date(deadline + 'T23:59:59');
    const diff = target - now;

    if (diff <= 0) {
        container.innerHTML = `
            <div class="countdown-unit" style="min-width: auto; padding: 12px 20px;">
                <span class="countdown-number" style="color: var(--color-closed); font-size: 1rem;">
                    Pendaftaran telah ditutup
                </span>
            </div>
        `;
        return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    container.innerHTML = `
        <div class="countdown-unit">
            <span class="countdown-number">${days}</span>
            <span class="countdown-label">Hari</span>
        </div>
        <div class="countdown-unit">
            <span class="countdown-number">${hours}</span>
            <span class="countdown-label">Jam</span>
        </div>
        <div class="countdown-unit">
            <span class="countdown-number">${minutes}</span>
            <span class="countdown-label">Menit</span>
        </div>
        <div class="countdown-unit">
            <span class="countdown-number">${seconds}</span>
            <span class="countdown-label">Detik</span>
        </div>
    `;
}

// Update modal countdown every second
setInterval(() => {
    if (currentModalData) {
        renderModalCountdown(currentModalData.deadline);
    }
}, 1000);

// ═══════════════════════════════════════════════════════════════
// WATCHLIST
// ═══════════════════════════════════════════════════════════════
function isInWatchlist(id, type) {
    return watchlist.some(w => w.id === id && w.type === type);
}

function toggleWatchlist(id, type) {
    const existing = watchlist.findIndex(w => w.id === id && w.type === type);
    if (existing >= 0) {
        watchlist.splice(existing, 1);
        showToast('Dihapus dari daftar pantauan');
    } else {
        const sourceData = type === 'beasiswa' ? beasiswaData : lombaData;
        const item = sourceData.find(d => d.id === id);
        if (item) {
            watchlist.push({ id, type, nama: item.nama, deadline: item.deadline, status: item.status });
            showToast('✅ Disimpan ke daftar pantauan!');
        }
    }
    localStorage.setItem('kesmanews-watchlist', JSON.stringify(watchlist));
    if (currentModalData) updateModalBookmarkBtn(currentModalData);
}

function updateModalBookmarkBtn(item) {
    const btn = document.getElementById('modalBookmarkBtn');
    if (!btn) return;
    const type = currentModalType;
    const isBookmarked = type ? isInWatchlist(item.id, type) : false;
    btn.classList.toggle('bookmarked', isBookmarked);
    btn.title = isBookmarked ? 'Hapus dari pantauan' : 'Simpan ke pantauan';
    btn.innerHTML = `<i data-lucide="${isBookmarked ? 'bookmark-check' : 'bookmark'}"></i> ${isBookmarked ? 'Tersimpan' : 'Simpan'}`;
    lucide.createIcons();
}

function renderWatchlist() {
    const grid = document.getElementById('watchlistGrid');
    const empty = document.getElementById('watchlistEmpty');
    if (!grid || !empty) return;

    if (watchlist.length === 0) {
        grid.classList.add('hidden');
        empty.classList.remove('hidden');
    } else {
        grid.classList.remove('hidden');
        empty.classList.add('hidden');
        grid.innerHTML = watchlist.map(w => {
            const daysLeft = getDaysLeft(w.deadline);
            const isExpired = daysLeft < 0;
            return `
                <div class="watchlist-item ${isExpired ? 'expired' : ''}" data-id="${w.id}" data-type="${w.type}" style="cursor:pointer;">
                    <div class="watchlist-info">
                        <span class="watchlist-type-badge">${w.type === 'beasiswa' ? '🎓 Beasiswa' : '🏆 Lomba'}</span>
                        <p class="watchlist-nama">${w.nama}</p>
                        <span class="watchlist-deadline ${isExpired ? 'expired-text' : ''}">
                            📅 ${w.deadline !== '2099-12-31' ? formatDate(w.deadline) : 'Lihat info'} — ${w.deadline !== '2099-12-31' ? getCountdownText(w.deadline) : '–'}
                        </span>
                    </div>
                    <div class="watchlist-actions">
                        <i data-lucide="chevron-right" style="width:18px;height:18px;color:var(--color-text-secondary);flex-shrink:0;margin-right:4px;"></i>
                        <button class="btn-watchlist-remove" data-id="${w.id}" data-type="${w.type}" title="Hapus dari pantauan">
                            <i data-lucide="x"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Click on item → open modal
        grid.querySelectorAll('.watchlist-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.btn-watchlist-remove')) return;
                const id = parseInt(item.dataset.id);
                const type = item.dataset.type;
                const sourceData = type === 'beasiswa' ? beasiswaData : lombaData;
                const found = sourceData.find(d => d.id === id);
                if (found) openModal(found, type);
            });
        });

        // Remove handlers
        grid.querySelectorAll('.btn-watchlist-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleWatchlist(parseInt(btn.dataset.id), btn.dataset.type);
                renderWatchlist();
                renderCards('beasiswa', beasiswaData);
                renderCards('lomba', lombaData);
                lucide.createIcons();
            });
        });
    }
    lucide.createIcons();
}

// ═══════════════════════════════════════════════════════════════
// SHARE TO WHATSAPP
// ═══════════════════════════════════════════════════════════════
function shareToWhatsApp(item) {
    const countdownStr = item.deadline !== '2099-12-31' ? getCountdownText(item.deadline) : 'Cek link';
    const deadlineStr  = item.deadline !== '2099-12-31' ? formatDate(item.deadline) : 'Lihat info selengkapnya';
    const linkPart = item.linkDaftar ? `\n🔗 *Link Daftar:* ${item.linkDaftar}` : '';

    const text =
        `📢 *INFO ${item.kategori?.toUpperCase() || 'BEASISWA/LOMBA'}*\n` +
        `\n📌 *${item.nama}*` +
        `\n\n📅 *Deadline:* ${deadlineStr}` +
        `\n⏳ *Sisa waktu:* ${countdownStr}` +
        `\n🟢 *Status:* ${item.status}` +
        `${linkPart}` +
        `\n\n_Info dari KESMA NEWS — Departemen Adkesma HMTK_`;

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank', 'noopener,noreferrer');
}

// ═══════════════════════════════════════════════════════════════
// TOAST NOTIFICATION
// ═══════════════════════════════════════════════════════════════
function showToast(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('toast-show'));
    setTimeout(() => {
        toast.classList.remove('toast-show');
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// ═══════════════════════════════════════════════════════════════
// COPY EMAIL TO CLIPBOARD
// ═══════════════════════════════════════════════════════════════
function initEmailCopy() {
    const copyBtns = document.querySelectorAll('.footer-copy-email-btn');
    const email = 'adkesmahmtk@gmail.com';

    copyBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();

            const onSuccess = () => {
                showToast('📋 Email adkesmahmtk@gmail.com berhasil disalin!');

                const badge = btn.querySelector('.email-copy-badge');
                if (badge) {
                    const textEl = badge.querySelector('.badge-text');
                    const originalText = textEl ? textEl.textContent : 'Salin';
                    badge.classList.add('copied');
                    if (textEl) textEl.textContent = 'Tersalin! ✓';

                    setTimeout(() => {
                        badge.classList.remove('copied');
                        if (textEl) textEl.textContent = originalText;
                    }, 2200);
                }
            };

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(email).then(onSuccess).catch(() => {
                    fallbackCopy(email);
                    onSuccess();
                });
            } else {
                fallbackCopy(email);
                onSuccess();
            }
        });
    });
}

// ═══════════════════════════════════════════════════════════════
// ABOUT SECTION (INTERACTIVE TABS, ACCORDION, 3D TILT & ACTIONS)
// ═══════════════════════════════════════════════════════════════
function initAboutSection() {
    // 1. Tab Switching Logic
    const tabButtons = document.querySelectorAll('.about-tab-btn');
    const tabPanels = document.querySelectorAll('.about-tab-panel');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-tab');
            if (!targetId) return;

            tabButtons.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            tabPanels.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');

            const targetPanel = document.getElementById(targetId);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }

            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        });
    });

    // 2. FAQ Accordion Logic
    const faqItems = document.querySelectorAll('.about-faq-item');
    faqItems.forEach(item => {
        const questionBtn = item.querySelector('.faq-question');
        if (!questionBtn) return;

        questionBtn.addEventListener('click', () => {
            const isCurrentlyActive = item.classList.contains('active');

            // Close other accordion items for clean presentation
            faqItems.forEach(other => {
                if (other !== item) {
                    other.classList.remove('active');
                    const otherBtn = other.querySelector('.faq-question');
                    if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
                }
            });

            // Toggle current item
            if (isCurrentlyActive) {
                item.classList.remove('active');
                questionBtn.setAttribute('aria-expanded', 'false');
            } else {
                item.classList.add('active');
                questionBtn.setAttribute('aria-expanded', 'true');
            }

            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        });
    });

    // 3. Interactive 3D Tilt Effect on Visual Logo Card
    const tiltCard = document.getElementById('aboutCardTilt');
    if (tiltCard && window.matchMedia('(hover: hover)').matches) {
        let isHovered = false;

        tiltCard.addEventListener('mouseenter', () => {
            isHovered = true;
        });

        tiltCard.addEventListener('mousemove', (e) => {
            if (!isHovered) return;
            const rect = tiltCard.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = ((y - centerY) / centerY) * -8;
            const rotateY = ((x - centerX) / centerX) * 8;

            tiltCard.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-4px)`;
        });

        tiltCard.addEventListener('mouseleave', () => {
            isHovered = false;
            tiltCard.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
        });
    }

    // 4. Quick Share Button (Copy Portal URL)
    const shareBtn = document.getElementById('btnAboutShare');
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            const shareUrl = window.location.href.split('#')[0];
            const copySuccess = () => {
                showToast('🔗 Tautan KESMA NEWS berhasil disalin!');
                const icon = shareBtn.querySelector('i');
                if (icon) {
                    shareBtn.innerHTML = '<i data-lucide="check"></i><span>Tautan Tersalin!</span>';
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                    setTimeout(() => {
                        shareBtn.innerHTML = '<i data-lucide="share-2"></i><span>Bagikan Portal</span>';
                        if (typeof lucide !== 'undefined') lucide.createIcons();
                    }, 2000);
                }
            };

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(shareUrl).then(copySuccess).catch(() => {
                    fallbackCopy(shareUrl);
                    copySuccess();
                });
            } else {
                fallbackCopy(shareUrl);
                copySuccess();
            }
        });
    }

    // 5. About Email Copy Button
    const emailBtn = document.getElementById('btnAboutCopyEmail');
    if (emailBtn) {
        emailBtn.addEventListener('click', () => {
            const email = 'adkesmahmtk@gmail.com';
            const copySuccess = () => {
                showToast('📋 Email adkesmahmtk@gmail.com berhasil disalin!');
                emailBtn.innerHTML = '<i data-lucide="check"></i><span>Tersalin!</span>';
                if (typeof lucide !== 'undefined') lucide.createIcons();
                setTimeout(() => {
                    emailBtn.innerHTML = '<i data-lucide="mail"></i><span>Salin Email</span>';
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                }, 2000);
            };

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(email).then(copySuccess).catch(() => {
                    fallbackCopy(email);
                    copySuccess();
                });
            } else {
                fallbackCopy(email);
                copySuccess();
            }
        });
    }
}

function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
    } catch (err) {
        console.error('Fallback copy failed', err);
    }
    document.body.removeChild(textarea);
}

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDate(dateStr) {
    if (!dateStr || dateStr === '2099-12-31') return '–';
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return new Date(dateStr).toLocaleDateString('id-ID', options);
}

function getDaysLeft(deadline) {
    if (!deadline || deadline === '2099-12-31') return 9999;
    const now = new Date();
    const target = new Date(deadline + 'T23:59:59');
    const diff = target - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getCountdownText(deadline) {
    if (!deadline || deadline === '2099-12-31') return '–';
    const days = getDaysLeft(deadline);
    if (days < 0) return 'Sudah lewat';
    if (days === 0) return 'Hari terakhir!';
    if (days === 1) return 'Besok ditutup!';
    if (days <= 7) return `${days} hari lagi ⚡`;
    if (days <= 30) return `${days} hari lagi`;
    const months = Math.floor(days / 30);
    const remainDays = days % 30;
    return `${months} bulan ${remainDays} hari lagi`;
}

function updateCardCountdown(el, deadline) {
    if (!deadline || deadline === '2099-12-31') {
        el.textContent = '–';
        return;
    }
    el.textContent = getCountdownText(deadline);
    const parent = el.closest('.card-countdown');
    if (getDaysLeft(deadline) < 0) {
        parent.classList.add('expired');
    } else {
        parent.classList.remove('expired');
    }
}
