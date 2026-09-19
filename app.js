/* ═══════════════════════════════════════════════════════════════
   KESMA NEWS — App Logic
   Departemen Adkesma HMTK
   ═══════════════════════════════════════════════════════════════ */

// ─── Google Sheets Config ──────────────────────────────────────
const SHEET_ID = '1wcSSGnKdnI5-hqB4WjZjabwCUbP2_BCtHZl33h1m99Q';
const SHEET_BEASISWA_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`;
const SHEET_LOMBA_URL    = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=157846337`;

// ─── State ─────────────────────────────────────────────────────
let beasiswaData = [];
let lombaData = [];
let currentModalData = null;
let currentModalType = null; // 'beasiswa' atau 'lomba' — eksplisit, tidak ditebak dari ID
let countdownIntervals = [];

// Category Hub & Active filter state
let activeBeasiswaCategory = 'all';
let activeLombaCategory = 'all';
let onlyActiveBeasiswa = true;
let onlyActiveLomba = true;

// Custom Bookmark Folders / Collections state (TikTok-style)
const DEFAULT_COLLECTIONS = ['Semua Tersimpan', 'Target Beasiswa', 'Lomba Tim'];
let collections = JSON.parse(localStorage.getItem('kesmanews-collections') || JSON.stringify(DEFAULT_COLLECTIONS));
let activeCollection = 'Semua Tersimpan';
let pendingFolderTarget = null; // { id, type, item, tempFolders: [] }

// Watchlist state (persisted in localStorage, backward compatible with folder groups)
let watchlist = (JSON.parse(localStorage.getItem('kesmanews-watchlist') || '[]')).map(item => {
    if (!item.folders || !Array.isArray(item.folders) || item.folders.length === 0) {
        item.folders = ['Semua Tersimpan'];
    }
    return item;
});

// Sort state per section
let sortBeasiswa = 'default';
let sortLomba = 'default';

// Bookmark Filter state ('all', 'beasiswa', 'lomba')
let currentBookmarkFilter = 'all';

// ─── DOM Ready ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initLucide();
    initDarkMode();
    initNavbar();
    initScrollReveal();
    initBackToTop();
    initEmailCopy();
    initAboutSection();
    initBookmarkToolbar();
    initFolderModal();
    initActiveFilterToggles();
    updateBookmarkBadge();
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
// UNICODE NORMALIZER
// Menormalkan karakter mathematical Unicode bold / italic / sans
// (seperti 𝐁𝐔𝐋𝐈𝐒 𝐊𝐄𝐒𝐌𝐀𝐒 atau 𝑀𝐸𝐷𝐷𝐼𝑃𝑆) menjadi alfabet latin standar
// agar font Plus Jakarta Sans tetap konsisten & tidak fallback ke serif
// ═══════════════════════════════════════════════════════════════
function cleanUnicodeText(str) {
    if (!str) return '';
    return String(str)
        .normalize('NFKC')
        .replace(/[\r\n\t]+/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

// ═══════════════════════════════════════════════════════════════
// EXTRACT LINKS dari kolom "Informasi Selengkapnya"
// ═══════════════════════════════════════════════════════════════
function extractLinks(infoText, nama = '') {
    if (!infoText) return { linkDaftar: '', linkGuidebook: '', linkDaftarLabel: 'Daftar' };

    // Deteksi portal kampus ITS (myITS Student Connect)
    if (/myits|student\s*connect/i.test(infoText)) {
        return {
            linkDaftar: 'https://connect.its.ac.id/',
            linkGuidebook: '',
            linkDaftarLabel: 'Buka myITS'
        };
    }

    // Deteksi akun Instagram seperti @gneuronics2026 atau @dscric
    const igMatch = infoText.match(/@([a-zA-Z0-9._]+)/);
    const urlRegex = /(?:https?:\/\/)[^\s)\]>"'<>]+|(?:www\.)[^\s)\]>"'<>]+|(?:[a-zA-Z0-9-]+\.)+(?:com|org|net|id|ac\.id|co\.id|io|app|ly|as|gl|me|ee|bio|site|tech|ai|dev)(?:\/[^\s)\]>"'<>]*)?/gi;

    const rawUrls = infoText.match(urlRegex) || [];

    // Normalisasi URL: bersihkan tanda baca di akhir dan pastikan protokol https://
    const normalizeUrl = (url) => {
        if (!url) return '';
        url = url.trim().replace(/[.,;:()\]>]+$/, '');
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        if (url.includes('@')) return ''; // lewati email
        return 'https://' + url;
    };

    const urls = rawUrls.map(normalizeUrl).filter(Boolean);

    if (urls.length === 0) {
        if (igMatch && !infoText.match(/https?:\/\//i)) {
            return {
                linkDaftar: `https://instagram.com/${igMatch[1]}`,
                linkGuidebook: '',
                linkDaftarLabel: 'Cek Instagram'
            };
        }
        return { linkDaftar: '', linkGuidebook: '', linkDaftarLabel: 'Daftar' };
    }

    let linkDaftar = '';
    let linkGuidebook = '';
    let linkDaftarLabel = 'Daftar';

    // Jika hanya ada 1 URL, WAJIB diisi ke linkDaftar agar tombol selalu aktif dan bisa diklik
    if (urls.length === 1) {
        const singleUrl = urls[0];
        const isGuidebook = /guidebook|panduan|guide book|bukpan|buku panduan/i.test(infoText) || /panduan|guidebook/i.test(singleUrl);
        linkDaftar = singleUrl;
        if (isGuidebook) {
            linkGuidebook = singleUrl;
            linkDaftarLabel = 'Guidebook';
        } else {
            linkDaftarLabel = 'Daftar';
        }
        return { linkDaftar, linkGuidebook, linkDaftarLabel };
    }

    // Jika ada lebih dari 1 URL: parse kontekstual baris per baris
    const lines = infoText.split(/\r?\n/);
    for (const line of lines) {
        const lineMatches = line.match(urlRegex) || [];
        for (const m of lineMatches) {
            const clean = normalizeUrl(m);
            if (!clean) continue;
            const isGuide = /guidebook|panduan|guide book|bukpan|buku panduan/i.test(line) || /panduan|guidebook/i.test(clean);
            const isReg = /registr|pendaftar|daftar|form|apply/i.test(line) || /daftar|regist/i.test(clean);

            if (isGuide && !linkGuidebook) {
                linkGuidebook = clean;
            } else if (isReg && !linkDaftar) {
                linkDaftar = clean;
            }
        }
    }

    // Fallback jika tidak terpetakan lewat baris
    if (!linkDaftar && urls[0]) linkDaftar = urls[0];
    if (!linkGuidebook && urls[1]) linkGuidebook = urls[1];

    if (linkDaftar === linkGuidebook || /panduan|guidebook/i.test(linkDaftar)) {
        linkDaftarLabel = 'Guidebook';
    }

    return { linkDaftar, linkGuidebook, linkDaftarLabel };
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
            const nama        = cleanUnicodeText(row[0] || '');
            const status      = cleanUnicodeText(row[1] || '');
            const kategori    = cleanUnicodeText(row[2] || '').split(',')[0].trim(); // ambil kategori pertama
            const deadlineRaw = cleanUnicodeText(row[3] || '');
            const persyaratan = parseToArray(row[4] || '').map(cleanUnicodeText);
            const benefit     = parseToArray(row[5] || '').map(cleanUnicodeText);
            const infoText    = cleanUnicodeText(row[6] || '');
            
            const deadline = parseDeadline(deadlineRaw) || parseDeadline(nama);
            const { linkDaftar, linkGuidebook, linkDaftarLabel } = extractLinks(infoText, nama);
            
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
                linkDaftarLabel,
                timelinePenting,
            };
        });
}

// ═══════════════════════════════════════════════════════════════
// PARSE SHEET LOMBA → Array of objects (dengan Smart Deduplikasi)
// Kolom: Nama Lomba, Penyelenggara, Status Lomba, Skala, Deadline,
//        Cabang Lomba, Partisipasi, Biaya, Informasi Selengkapnya
// ═══════════════════════════════════════════════════════════════
function parseLombaSheet(rows) {
    const lombaMap = new Map();

    rows.slice(1)
        .filter(row => row[0] && row[0].trim())
        .forEach((row, idx) => {
            const nama          = cleanUnicodeText(row[0] || '');
            const penyelenggara = cleanUnicodeText(row[1] || '');
            const status        = cleanUnicodeText(row[2] || '') || 'Tutup';
            const skala         = cleanUnicodeText(row[3] || '');
            const deadlineRaw   = cleanUnicodeText(row[4] || '');
            const cabangLomba   = cleanUnicodeText(row[5] || '');
            const partisipasi   = cleanUnicodeText(row[6] || '');
            const biaya         = cleanUnicodeText(row[7] || '');
            const infoText      = cleanUnicodeText(row[8] || '');
            
            const deadline = parseDeadline(deadlineRaw) || '';
            let { linkDaftar, linkGuidebook, linkDaftarLabel } = extractLinks(infoText, nama);
            const kategori = skala || 'Nasional';
            
            // Kunci normalisasi untuk mendeteksi duplikat seperti 3 baris "18th KATULISTIWA"
            const normKey = nama.toLowerCase().replace(/[^a-z0-9]/g, '');

            // Fallback khusus jika di spreadsheet hanya tertulis teks nama
            if (normKey.includes('katulistiwa')) {
                if (!linkDaftar) linkDaftar = 'https://bit.ly/PendaftaranKatulistiwa18th';
                if (!linkGuidebook) linkGuidebook = 'https://bit.ly/GuidebookKatulistiwa18th';
            }

            if (lombaMap.has(normKey)) {
                // Duplikat terdeteksi (seperti 18th Katulistiwa beda cabang) -> Gabungkan data!
                const existing = lombaMap.get(normKey);

                // Gabungkan cabang lomba
                if (cabangLomba) {
                    const currentBranches = existing.cabangLomba ? existing.cabangLomba.split(',').map(s => s.trim()) : [];
                    const newBranches = cabangLomba.split(',').map(s => s.trim());
                    const combined = Array.from(new Set([...currentBranches, ...newBranches])).filter(Boolean);
                    existing.cabangLomba = combined.join(', ');
                }

                // Prioritaskan status 'Buka' jika ada salah satu cabang yang buka
                if (status === 'Buka') {
                    existing.status = 'Buka';
                }

                // Simpan deadline paling akhir
                if (deadline && (!existing.deadline || existing.deadline === '2099-12-31' || deadline > existing.deadline)) {
                    existing.deadline = deadline;
                    existing.deadlineRaw = deadlineRaw;
                }

                // Simpan link jika belum terisi
                if (!existing.linkDaftar && linkDaftar) {
                    existing.linkDaftar = linkDaftar;
                    existing.linkDaftarLabel = linkDaftarLabel;
                }
                if (!existing.linkGuidebook && linkGuidebook) {
                    existing.linkGuidebook = linkGuidebook;
                }

                // Perbarui timeline gabungan
                if (existing.cabangLomba) {
                    existing.timelinePenting = `Deadline: ${existing.deadlineRaw || deadlineRaw} | Cabang: ${existing.cabangLomba}`;
                }
            } else {
                // Entri baru
                const benefit = [];
                if (biaya === 'Gratis') benefit.push('Pendaftaran Gratis');
                if (partisipasi) benefit.push(`Kategori: ${partisipasi}`);
                if (penyelenggara) benefit.push(`Penyelenggara: ${penyelenggara}`);
                
                let timelinePenting = deadlineRaw ? `Deadline: ${deadlineRaw}` : '';
                if (cabangLomba) timelinePenting += timelinePenting ? ` | Cabang: ${cabangLomba}` : `Cabang: ${cabangLomba}`;
                
                lombaMap.set(normKey, {
                    id: idx + 1,
                    nama,
                    penyelenggara,
                    status,
                    kategori,
                    skala,
                    cabangLomba,
                    partisipasi,
                    biaya,
                    deadline: deadline || '2099-12-31',
                    deadlineRaw,
                    persyaratan: [],
                    benefit,
                    linkDaftar,
                    linkGuidebook,
                    linkDaftarLabel,
                    timelinePenting,
                });
            }
        });

    // Re-index ID secara berurutan dan teratur
    return Array.from(lombaMap.values()).map((item, i) => ({
        ...item,
        id: i + 1
    }));
}

// ═══════════════════════════════════════════════════════════════
// CATEGORY HUBS DEFINITION & LOGIC
// ═══════════════════════════════════════════════════════════════
const BEASISWA_CATEGORIES = [
    { id: 'all', name: 'Semua Beasiswa', desc: 'Koleksi lengkap', icon: 'graduation-cap' },
    { id: 'Berprestasi', name: 'Prestasi', desc: 'Akademik & Bakat', icon: 'award' },
    { id: 'Kurang mampu', name: 'Bantuan Finansial', desc: 'Ekonomi & KIP', icon: 'wallet' },
    { id: 'urgent', name: 'Segera Tutup', desc: 'Deadline ≤ 7 hari', icon: 'zap' },
    { id: 'Umum', name: 'Umum & Riset', desc: 'Terbuka luas', icon: 'compass' }
];

const LOMBA_CATEGORIES = [
    { id: 'all', name: 'Semua Lomba', desc: 'Koleksi lengkap', icon: 'trophy' },
    { id: 'lkti', name: 'KTI & Essay', desc: 'Karya tulis ilmiah', icon: 'file-text' },
    { id: 'poster', name: 'Poster & Desain', desc: 'Infografis & Video', icon: 'palette' },
    { id: 'olympiad', name: 'Olimpiade & Medis', desc: 'Sains & Kesehatan', icon: 'activity' },
    { id: 'gratis', name: 'Gratis Regis', desc: 'Bebas biaya daftar', icon: 'gift' },
    { id: 'urgent', name: 'Segera Tutup', desc: 'Deadline ≤ 7 hari', icon: 'zap' }
];

function renderCategoryHub(type) {
    const hubContainer = document.getElementById(`${type}CategoryHub`);
    if (!hubContainer) return;

    const categories = type === 'beasiswa' ? BEASISWA_CATEGORIES : LOMBA_CATEGORIES;
    const sourceData = type === 'beasiswa' ? beasiswaData : lombaData;
    const activeCat = type === 'beasiswa' ? activeBeasiswaCategory : activeLombaCategory;
    const onlyActive = type === 'beasiswa' ? onlyActiveBeasiswa : onlyActiveLomba;

    const baseData = onlyActive
        ? sourceData.filter(item => item.status === 'Buka' && getDaysLeft(item.deadline) >= 0)
        : sourceData;

    hubContainer.innerHTML = categories.map(cat => {
        let count = 0;
        if (cat.id === 'all') {
            count = baseData.length;
        } else if (cat.id === 'urgent') {
            count = sourceData.filter(item => item.status === 'Buka' && getDaysLeft(item.deadline) >= 0 && getDaysLeft(item.deadline) <= 7).length;
        } else if (type === 'beasiswa') {
            if (cat.id === 'Berprestasi') {
                count = baseData.filter(item => item.kategori.toLowerCase().includes('prestasi')).length;
            } else if (cat.id === 'Kurang mampu') {
                count = baseData.filter(item => item.kategori.toLowerCase().includes('kurang mampu') || item.kategori.toLowerCase().includes('finansial')).length;
            } else if (cat.id === 'Umum') {
                count = baseData.filter(item => item.kategori.toLowerCase().includes('umum') || item.kategori.toLowerCase().includes('riset')).length;
            }
        } else if (type === 'lomba') {
            if (cat.id === 'lkti') {
                count = baseData.filter(item => (item.cabangLomba && /kti|essay|paper|karya tulis/i.test(item.cabangLomba)) || /kti|essay|paper|karya tulis/i.test(item.nama)).length;
            } else if (cat.id === 'poster') {
                count = baseData.filter(item => (item.cabangLomba && /poster|infografis|desain|video/i.test(item.cabangLomba)) || /poster|infografis|desain|video/i.test(item.nama)).length;
            } else if (cat.id === 'olympiad') {
                count = baseData.filter(item => (item.cabangLomba && /olimpiade|olympiad|biomed|meddips|medsco|kedokteran|cedec/i.test(item.cabangLomba)) || /olimpiade|olympiad|biomed|meddips|medsco|kedokteran|cedec/i.test(item.nama)).length;
            } else if (cat.id === 'gratis') {
                count = baseData.filter(item => item.biaya === 'Gratis' || (item.benefit && item.benefit.some(b => /gratis/i.test(b)))).length;
            }
        }

        const isActive = activeCat === cat.id;

        return `
            <div class="category-card ${isActive ? 'active' : ''}" data-type="${type}" data-category="${cat.id}">
                <div class="category-card-icon">
                    <i data-lucide="${cat.icon}"></i>
                </div>
                <div class="category-card-body">
                    <div class="category-card-title">${cat.name}</div>
                    <div class="category-card-desc">
                        <span>${cat.desc}</span>
                        <span class="category-card-count">${count}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    hubContainer.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', () => {
            const catId = card.dataset.category;
            const currentCat = type === 'beasiswa' ? activeBeasiswaCategory : activeLombaCategory;
            const nextCat = (currentCat === catId && catId !== 'all') ? 'all' : catId;

            if (type === 'beasiswa') activeBeasiswaCategory = nextCat;
            else activeLombaCategory = nextCat;

            renderCategoryHub(type);
            filterData(type);
            lucide.createIcons();
        });
    });
}

function initActiveFilterToggles() {
    const toggleBeasiswaBtn = document.getElementById('toggleActiveBeasiswaBtn');
    if (toggleBeasiswaBtn) {
        toggleBeasiswaBtn.classList.toggle('active', onlyActiveBeasiswa);
        toggleBeasiswaBtn.addEventListener('click', () => {
            onlyActiveBeasiswa = !onlyActiveBeasiswa;
            toggleBeasiswaBtn.classList.toggle('active', onlyActiveBeasiswa);
            renderCategoryHub('beasiswa');
            filterData('beasiswa');
            lucide.createIcons();
        });
    }

    const toggleLombaBtn = document.getElementById('toggleActiveLombaBtn');
    if (toggleLombaBtn) {
        toggleLombaBtn.classList.toggle('active', onlyActiveLomba);
        toggleLombaBtn.addEventListener('click', () => {
            onlyActiveLomba = !onlyActiveLomba;
            toggleLombaBtn.classList.toggle('active', onlyActiveLomba);
            renderCategoryHub('lomba');
            filterData('lomba');
            lucide.createIcons();
        });
    }
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

    // Render Category Hubs
    renderCategoryHub('beasiswa');
    renderCategoryHub('lomba');

    // Render cards with initial filter
    filterData('beasiswa');
    filterData('lomba');

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
    const totalBuka = [...beasiswaData, ...lombaData].filter(item => item.status === 'Buka' && getDaysLeft(item.deadline) >= 0).length;

    animateCounter('statBeasiswa', totalBeasiswa);
    animateCounter('statLomba', totalLomba);
    animateCounter('statBuka', totalBuka);
}

function animateCounter(elementId, target) {
    const el = document.getElementById(elementId);
    if (!el) return;
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
        const daysA = getDaysLeft(a.deadline);
        const daysB = getDaysLeft(b.deadline);
        const isExpiredA = daysA < 0 || a.status !== 'Buka';
        const isExpiredB = daysB < 0 || b.status !== 'Buka';

        if (currentSort === 'deadline') {
            // Expired items should ALWAYS go to the very bottom when sorting by deadline
            if (isExpiredA && !isExpiredB) return 1;
            if (!isExpiredA && isExpiredB) return -1;
            return new Date(a.deadline) - new Date(b.deadline);
        } else if (currentSort === 'nama') {
            return a.nama.localeCompare(b.nama, 'id');
        } else if (currentSort === 'status') {
            if (a.status === 'Buka' && b.status !== 'Buka') return -1;
            if (a.status !== 'Buka' && b.status === 'Buka') return 1;
            return 0;
        } else {
            // Default: open first (nearest deadline), expired last
            if (!isExpiredA && isExpiredB) return -1;
            if (isExpiredA && !isExpiredB) return 1;
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

    // Attach watchlist folder modal trigger handlers
    grid.querySelectorAll('.btn-bookmark').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            const itemType = btn.dataset.type;
            const sourceData = itemType === 'beasiswa' ? beasiswaData : lombaData;
            const item = sourceData.find(d => d.id === id);
            if (item) {
                openFolderModal(item, itemType);
            }
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
    const isUrgent = isOpen && daysLeft >= 0 && daysLeft <= 3;
    const isExpired = daysLeft < 0;
    const isBookmarked = isInWatchlist(item.id, type);

    // Untuk lomba: tampilkan penyelenggara sebagai subtitle, untuk beasiswa: benefit pertama
    const rawSubtitle = type === 'lomba' && item.penyelenggara
        ? item.penyelenggara
        : (item.benefit && item.benefit[0] ? item.benefit[0] : '');

    const subtitleContent = rawSubtitle
        ? `<strong>${type === 'beasiswa' ? '💰' : '🏆'}</strong> <span>${rawSubtitle}</span>`
        : (type === 'beasiswa'
            ? `<strong>💰</strong> <span>Informasi benefit tersedia di detail beasiswa</span>`
            : `<strong>🏆</strong> <span>Penyelenggara resmi dapat dicek di detail</span>`);

    // Badge tambahan untuk lomba
    const extraBadge = type === 'lomba'
        ? `<span class="badge badge-kategori">${item.skala || item.kategori}</span>`
        : `<span class="badge badge-kategori">${item.kategori}</span>`;

    // Badge segera tutup jika sisa waktu <= 3 hari
    const urgentBadge = isUrgent
        ? `<span class="badge badge-urgent"><i data-lucide="zap"></i> Segera Tutup (${daysLeft === 0 ? 'Hari ini' : daysLeft + ' hr lagi'})</span>`
        : '';

    // Action button: Selalu aktif dan fungsional! Tidak ada tombol mati / unclickable!
    let actionBtnHTML = '';
    if (item.linkDaftar) {
        const btnIcon = item.linkDaftarLabel === 'Buka myITS' ? 'external-link'
            : item.linkDaftarLabel === 'Cek Instagram' ? 'instagram'
            : item.linkDaftarLabel === 'Guidebook' ? 'book-open'
            : 'external-link';
        const btnText = item.linkDaftarLabel || 'Daftar';
        actionBtnHTML = `
            <a href="${item.linkDaftar}" 
               class="btn btn-primary btn-card" 
               target="_blank" 
               rel="noopener noreferrer"
               onclick="event.stopPropagation()">
                <i data-lucide="${btnIcon}"></i>
                <span>${btnText}</span>
            </a>
        `;
    } else {
        // Jika belum ada link pendaftaran di lembar data, buka detail modal interaktif
        actionBtnHTML = `
            <button type="button" class="btn btn-primary btn-card"
                    onclick="event.stopPropagation(); (function(){ const d = '${type}' === 'beasiswa' ? beasiswaData : lombaData; const it = d.find(x => x.id === ${item.id}); if(it) openModal(it, '${type}'); })();">
                <i data-lucide="info"></i>
                <span>Detail & Info</span>
            </button>
        `;
    }

    return `
        <div class="card ${isUrgent ? 'card-urgent' : ''}" data-id="${item.id}">
            <div class="card-top">
                <div class="card-badges">
                    <span class="badge ${isOpen ? 'badge-open' : 'badge-closed'}">
                        ${item.status}
                    </span>
                    ${extraBadge}
                    ${urgentBadge}
                </div>
                <div class="card-top-actions">
                    <button class="btn-bookmark ${isBookmarked ? 'bookmarked' : ''}" 
                            data-id="${item.id}" data-type="${type}"
                            title="${isBookmarked ? 'Kelola bookmark / folder' : 'Simpan ke bookmark'}">
                        <i data-lucide="${isBookmarked ? 'bookmark-check' : 'bookmark'}"></i>
                    </button>
                    <button class="btn-share-wa" data-id="${item.id}" data-type="${type}" title="Bagikan ke WhatsApp">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                    </button>
                </div>
            </div>
            <h3 class="card-title" title="${cleanUnicodeText(item.nama)}">${cleanUnicodeText(item.nama)}</h3>
            <div class="card-info">
                <div class="card-info-item ${isUrgent ? 'deadline-urgent' : ''}">
                    <i data-lucide="calendar"></i>
                    <span>Deadline: ${item.deadline !== '2099-12-31' ? formatDate(item.deadline) : 'Lihat info'}</span>
                </div>
                ${type === 'lomba' && item.cabangLomba ? `
                <div class="card-info-item" title="${cleanUnicodeText(item.cabangLomba)}">
                    <i data-lucide="layers"></i>
                    <span>${cleanUnicodeText(item.cabangLomba)}</span>
                </div>` : ''}
            </div>
            <div class="card-countdown ${isExpired ? 'expired' : ''}">
                <i data-lucide="timer"></i>
                <span class="card-countdown-text" data-deadline="${item.deadline}">
                    ${item.deadline !== '2099-12-31' ? getCountdownText(item.deadline) : '–'}
                </span>
            </div>
            <div class="card-benefit-preview">
                ${subtitleContent}
            </div>
            <div class="card-actions">
                ${actionBtnHTML}
                <button class="btn btn-outline btn-card btn-detail-card"
                        data-id="${item.id}" data-type="${type}"
                        onclick="event.stopPropagation(); (function(){ const d = '${type}' === 'beasiswa' ? beasiswaData : lombaData; const it = d.find(x => x.id === ${item.id}); if(it) openModal(it, '${type}'); })();">
                    <i data-lucide="info"></i>
                    <span>Lihat Detail</span>
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

    const resetBeasiswaBtn = document.getElementById('btnResetBeasiswa');
    if (resetBeasiswaBtn) {
        resetBeasiswaBtn.addEventListener('click', () => resetFilters('beasiswa'));
    }

    // Lomba filters
    document.getElementById('searchLomba').addEventListener('input', () => filterData('lomba'));
    document.getElementById('filterKategoriLomba').addEventListener('change', () => filterData('lomba'));
    document.getElementById('filterStatusLomba').addEventListener('change', () => filterData('lomba'));
    document.getElementById('sortLomba').addEventListener('change', (e) => {
        sortLomba = e.target.value;
        filterData('lomba');
    });

    const resetLombaBtn = document.getElementById('btnResetLomba');
    if (resetLombaBtn) {
        resetLombaBtn.addEventListener('click', () => resetFilters('lomba'));
    }
}

function resetFilters(type) {
    const searchInput = document.getElementById(`search${capitalize(type)}`);
    const filterKat = document.getElementById(`filterKategori${capitalize(type)}`);
    const filterStatus = document.getElementById(`filterStatus${capitalize(type)}`);
    const sortSelect = document.getElementById(`sort${capitalize(type)}`);

    if (searchInput) searchInput.value = '';
    if (filterKat) filterKat.value = 'semua';
    if (filterStatus) filterStatus.value = 'semua';
    if (sortSelect) sortSelect.value = 'default';

    if (type === 'beasiswa') {
        sortBeasiswa = 'default';
        activeBeasiswaCategory = 'all';
    } else {
        sortLomba = 'default';
        activeLombaCategory = 'all';
    }

    renderCategoryHub(type);
    filterData(type);
    showToast(`Filter ${type === 'beasiswa' ? 'beasiswa' : 'lomba'} berhasil direset`);
}

function updateResultsInfo(type, count, total) {
    const infoEl = document.getElementById(`resultsInfo${capitalize(type)}`);
    if (!infoEl) return;

    const searchVal = (document.getElementById(`search${capitalize(type)}`)?.value || '').trim();
    const katVal = document.getElementById(`filterKategori${capitalize(type)}`)?.value || 'semua';
    const statusVal = document.getElementById(`filterStatus${capitalize(type)}`)?.value || 'semua';
    const sortVal = document.getElementById(`sort${capitalize(type)}`)?.value || 'default';
    const activeCat = type === 'beasiswa' ? activeBeasiswaCategory : activeLombaCategory;
    const onlyActive = type === 'beasiswa' ? onlyActiveBeasiswa : onlyActiveLomba;

    const isFiltered = Boolean(searchVal || katVal !== 'semua' || statusVal !== 'semua' || sortVal !== 'default' || activeCat !== 'all' || !onlyActive);
    const typeNoun = type === 'beasiswa' ? 'beasiswa' : 'lomba';

    if (!isFiltered) {
        infoEl.innerHTML = `
            <div class="results-count">
                <span>Menampilkan <strong>${count}</strong> ${typeNoun} aktif</span>
            </div>
        `;
        return;
    }

    let tagsHtml = '';
    if (activeCat !== 'all') tagsHtml += `<span class="filter-tag">🏷️ Kategori: ${activeCat}</span>`;
    if (searchVal) tagsHtml += `<span class="filter-tag">🔍 "${searchVal}"</span>`;
    if (katVal !== 'semua') tagsHtml += `<span class="filter-tag">📂 ${katVal}</span>`;
    if (statusVal !== 'semua') tagsHtml += `<span class="filter-tag">🔘 ${statusVal}</span>`;
    if (!onlyActive) tagsHtml += `<span class="filter-tag">🕒 Termasuk Ditutup</span>`;

    infoEl.innerHTML = `
        <div class="results-count">
            <span>Menampilkan <strong>${count}</strong> dari ${total} ${typeNoun}</span>
        </div>
        <div class="filter-active-tags">
            ${tagsHtml}
            <button type="button" class="btn-quick-reset" onclick="resetFilters('${type}')">Reset Filter</button>
        </div>
    `;
}

function filterData(type) {
    const searchValue = document.getElementById(`search${capitalize(type)}`)?.value.toLowerCase().trim() || '';
    const kategoriValue = document.getElementById(`filterKategori${capitalize(type)}`)?.value || 'semua';
    const statusValue = document.getElementById(`filterStatus${capitalize(type)}`)?.value || 'semua';
    
    const sourceData = type === 'beasiswa' ? beasiswaData : lombaData;
    const activeCat = type === 'beasiswa' ? activeBeasiswaCategory : activeLombaCategory;
    const onlyActive = type === 'beasiswa' ? onlyActiveBeasiswa : onlyActiveLomba;

    const filtered = sourceData.filter(item => {
        const daysLeft = getDaysLeft(item.deadline);
        const isOpen = item.status === 'Buka';

        // 1. Only active filter ("Hanya yang Buka")
        if (onlyActive) {
            if (!isOpen || daysLeft < 0) return false;
        }

        // 2. Category Hub selection filter
        if (activeCat !== 'all') {
            if (activeCat === 'urgent') {
                if (!isOpen || daysLeft < 0 || daysLeft > 7) return false;
            } else if (type === 'beasiswa') {
                if (activeCat === 'Berprestasi' && !item.kategori.toLowerCase().includes('prestasi')) return false;
                if (activeCat === 'Kurang mampu' && (!item.kategori.toLowerCase().includes('kurang mampu') && !item.kategori.toLowerCase().includes('finansial'))) return false;
                if (activeCat === 'Umum' && (!item.kategori.toLowerCase().includes('umum') && !item.kategori.toLowerCase().includes('riset'))) return false;
            } else if (type === 'lomba') {
                if (activeCat === 'lkti') {
                    const matchLKTI = (item.cabangLomba && /kti|essay|paper|karya tulis/i.test(item.cabangLomba)) || /kti|essay|paper|karya tulis/i.test(item.nama);
                    if (!matchLKTI) return false;
                } else if (activeCat === 'poster') {
                    const matchPoster = (item.cabangLomba && /poster|infografis|desain|video/i.test(item.cabangLomba)) || /poster|infografis|desain|video/i.test(item.nama);
                    if (!matchPoster) return false;
                } else if (activeCat === 'olympiad') {
                    const matchOly = (item.cabangLomba && /olimpiade|olympiad|biomed|meddips|medsco|kedokteran|cedec/i.test(item.cabangLomba)) || /olimpiade|olympiad|biomed|meddips|medsco|kedokteran|cedec/i.test(item.nama);
                    if (!matchOly) return false;
                } else if (activeCat === 'gratis') {
                    const matchFree = item.biaya === 'Gratis' || (item.benefit && item.benefit.some(b => /gratis/i.test(b)));
                    if (!matchFree) return false;
                }
            }
        }

        // 3. Search query
        const matchSearch = !searchValue || item.nama.toLowerCase().includes(searchValue)
            || (item.penyelenggara && item.penyelenggara.toLowerCase().includes(searchValue))
            || (item.cabangLomba && item.cabangLomba.toLowerCase().includes(searchValue));

        // 4. Dropdown Kategori
        const matchKategori = kategoriValue === 'semua' || item.kategori === kategoriValue
            || (item.skala && item.skala === kategoriValue);

        // 5. Dropdown Status
        const matchStatus = statusValue === 'semua' || item.status === statusValue;

        return matchSearch && matchKategori && matchStatus;
    });

    renderCards(type, filtered);
    updateResultsInfo(type, filtered.length, sourceData.length);
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
    const guidebookBtn = document.getElementById('modalGuidebook');

    if (daftarBtn) {
        if (item.linkDaftar) {
            daftarBtn.href = item.linkDaftar;
            daftarBtn.classList.remove('btn-disabled');
            const btnIcon = item.linkDaftarLabel === 'Guidebook' ? 'book-open' : 'external-link';
            const label = item.linkDaftarLabel === 'Buka myITS' ? 'Buka Portal myITS'
                : item.linkDaftarLabel === 'Cek Instagram' ? 'Kunjungi Akun Instagram'
                : item.linkDaftarLabel === 'Guidebook' ? 'Buka Buku Panduan'
                : 'Daftar Sekarang';
            daftarBtn.innerHTML = `<i data-lucide="${btnIcon}"></i> <span>${label}</span>`;
        } else {
            // Jika belum ada link pendaftaran di lembar data, arahkan untuk bertanya ke Adkesma
            daftarBtn.href = 'https://www.instagram.com/adkezzmoy';
            daftarBtn.classList.remove('btn-disabled');
            daftarBtn.innerHTML = `<i data-lucide="message-circle"></i> <span>Tanya Link ke Adkesma</span>`;
        }
    }

    if (guidebookBtn) {
        if (item.linkGuidebook && item.linkGuidebook !== item.linkDaftar) {
            guidebookBtn.href = item.linkGuidebook;
            guidebookBtn.classList.remove('hidden');
        } else {
            guidebookBtn.classList.add('hidden');
        }
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

// Modal Bookmark button → Buka Folder Modal ala TikTok
document.getElementById('modalBookmarkBtn').addEventListener('click', () => {
    if (!currentModalData) return;
    openFolderModal(currentModalData, currentModalType);
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
// WATCHLIST & TIKTOK-STYLE BOOKMARK COLLECTIONS
// ═══════════════════════════════════════════════════════════════
function isInWatchlist(id, type) {
    return watchlist.some(w => w.id === id && w.type === type);
}

function getWatchlistItem(id, type) {
    return watchlist.find(w => w.id === id && w.type === type);
}

function updateModalBookmarkBtn(item) {
    const btn = document.getElementById('modalBookmarkBtn');
    if (!btn) return;
    const type = currentModalType;
    const isBookmarked = type ? isInWatchlist(item.id, type) : false;
    btn.classList.toggle('bookmarked', isBookmarked);
    btn.title = isBookmarked ? 'Kelola folder bookmark' : 'Simpan ke bookmark';
    btn.innerHTML = `<i data-lucide="${isBookmarked ? 'bookmark-check' : 'bookmark'}"></i> ${isBookmarked ? 'Tersimpan' : 'Bookmark'}`;
    lucide.createIcons();
}

function updateBookmarkBadge() {
    const badge = document.getElementById('navBookmarkBadge');
    if (!badge) return;
    const count = watchlist.length;
    badge.textContent = count;
    if (count > 0) {
        badge.classList.remove('zero');
        badge.classList.add('has-items');
    } else {
        badge.classList.add('zero');
        badge.classList.remove('has-items');
    }
}

// ── Folder Selection Modal Logic ──
function initFolderModal() {
    const overlay = document.getElementById('folderModalOverlay');
    const closeBtn = document.getElementById('folderModalClose');
    const saveBtn = document.getElementById('btnSaveToFolders');
    const createBtn = document.getElementById('btnCreateNewFolder');
    const nameInput = document.getElementById('newFolderNameInput');
    const openNewFolderBtn = document.getElementById('btnOpenNewFolderModal');

    if (closeBtn) closeBtn.addEventListener('click', closeFolderModal);
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeFolderModal();
        });
    }

    if (saveBtn) saveBtn.addEventListener('click', saveFoldersSelection);

    const handleCreateFolder = () => {
        if (!nameInput) return;
        const name = nameInput.value.trim();
        if (!name) return;
        createNewFolder(name);
        nameInput.value = '';
    };

    if (createBtn) createBtn.addEventListener('click', handleCreateFolder);
    if (nameInput) {
        nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleCreateFolder();
            }
        });
    }

    // Button "+ Folder Baru" di bagian bookmark section
    if (openNewFolderBtn) {
        openNewFolderBtn.addEventListener('click', () => {
            const folderName = prompt('Masukkan nama folder koleksi baru (cth: Target Riset 2026):');
            if (folderName && folderName.trim()) {
                createNewFolder(folderName.trim());
                showToast(`📁 Folder "${folderName.trim()}" berhasil dibuat!`);
            }
        });
    }
}

function openFolderModal(item, type) {
    const overlay = document.getElementById('folderModalOverlay');
    const nameEl = document.getElementById('folderModalItemName');
    if (!overlay || !item) return;

    const existing = getWatchlistItem(item.id, type);
    let tempFolders = [];
    if (existing && existing.folders && existing.folders.length > 0) {
        tempFolders = [...existing.folders];
    } else {
        // Default: tambahkan ke 'Semua Tersimpan' dan folder yang sedang aktif (jika ada)
        tempFolders = ['Semua Tersimpan'];
        if (activeCollection && activeCollection !== 'Semua Tersimpan' && !tempFolders.includes(activeCollection)) {
            tempFolders.push(activeCollection);
        }
    }

    pendingFolderTarget = {
        id: item.id,
        type: type,
        item: item,
        tempFolders: tempFolders
    };

    if (nameEl) {
        nameEl.textContent = `${type === 'beasiswa' ? '🎓' : '🏆'} ${item.nama}`;
    }

    renderFolderList();

    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    lucide.createIcons();
}

function closeFolderModal() {
    const overlay = document.getElementById('folderModalOverlay');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
    pendingFolderTarget = null;
    const nameInput = document.getElementById('newFolderNameInput');
    if (nameInput) nameInput.value = '';
}

function renderFolderList() {
    const listEl = document.getElementById('folderList');
    if (!listEl || !pendingFolderTarget) return;

    listEl.innerHTML = collections.map(folder => {
        const isChecked = pendingFolderTarget.tempFolders.includes(folder);
        return `
            <div class="folder-item ${isChecked ? 'selected' : ''}" data-folder="${folder}">
                <div class="folder-item-left">
                    <i data-lucide="${folder === 'Semua Tersimpan' ? 'bookmark' : 'folder'}"></i>
                    <span>${folder}</span>
                </div>
                <input type="checkbox" class="folder-checkbox" ${isChecked ? 'checked' : ''} data-folder="${folder}">
            </div>
        `;
    }).join('');

    listEl.querySelectorAll('.folder-item').forEach(itemEl => {
        itemEl.addEventListener('click', (e) => {
            const folder = itemEl.dataset.folder;
            const checkbox = itemEl.querySelector('.folder-checkbox');
            if (e.target !== checkbox) {
                checkbox.checked = !checkbox.checked;
            }
            if (checkbox.checked) {
                if (!pendingFolderTarget.tempFolders.includes(folder)) {
                    pendingFolderTarget.tempFolders.push(folder);
                }
                itemEl.classList.add('selected');
            } else {
                pendingFolderTarget.tempFolders = pendingFolderTarget.tempFolders.filter(f => f !== folder);
                itemEl.classList.remove('selected');
            }
        });
    });

    lucide.createIcons();
}

function createNewFolder(name) {
    if (!name) return;
    if (!collections.includes(name)) {
        collections.push(name);
        localStorage.setItem('kesmanews-collections', JSON.stringify(collections));
    }
    if (pendingFolderTarget && !pendingFolderTarget.tempFolders.includes(name)) {
        pendingFolderTarget.tempFolders.push(name);
    }
    renderFolderList();
    renderCollectionsTabs();
    showToast(`📁 Folder "${name}" ditambahkan!`);
}

function deleteFolder(folderName) {
    if (folderName === 'Semua Tersimpan') return;
    if (!confirm(`Hapus folder "${folderName}"? (Item di dalamnya tidak terhapus dan tetap ada di folder lain)`)) return;

    collections = collections.filter(f => f !== folderName);
    localStorage.setItem('kesmanews-collections', JSON.stringify(collections));

    // Bersihkan nama folder dari watchlist
    watchlist.forEach(w => {
        if (w.folders) {
            w.folders = w.folders.filter(f => f !== folderName);
            if (w.folders.length === 0) w.folders = ['Semua Tersimpan'];
        }
    });
    localStorage.setItem('kesmanews-watchlist', JSON.stringify(watchlist));

    if (activeCollection === folderName) {
        activeCollection = 'Semua Tersimpan';
    }

    renderCollectionsTabs();
    renderWatchlist();
    showToast(`Folder "${folderName}" dihapus`);
}

function saveFoldersSelection() {
    if (!pendingFolderTarget) return;

    const { id, type, item, tempFolders } = pendingFolderTarget;
    const existingIndex = watchlist.findIndex(w => w.id === id && w.type === type);

    if (tempFolders.length === 0) {
        // Jika semua folder di-uncheck, hapus dari watchlist
        if (existingIndex >= 0) {
            watchlist.splice(existingIndex, 1);
            showToast('Dihapus dari bookmark');
        }
    } else {
        if (existingIndex >= 0) {
            watchlist[existingIndex].folders = [...tempFolders];
        } else {
            watchlist.push({
                id,
                type,
                nama: item.nama,
                deadline: item.deadline,
                status: item.status,
                folders: [...tempFolders]
            });
        }
        showToast(`✅ Disimpan ke ${tempFolders.length} folder!`);
    }

    localStorage.setItem('kesmanews-watchlist', JSON.stringify(watchlist));
    updateBookmarkBadge();
    if (currentModalData && currentModalData.id === id) {
        updateModalBookmarkBtn(currentModalData);
    }

    renderWatchlist();
    renderCards('beasiswa', beasiswaData);
    renderCards('lomba', lombaData);
    closeFolderModal();
    lucide.createIcons();
}

function renderCollectionsTabs() {
    const tabsBar = document.getElementById('collectionsTabsBar');
    if (!tabsBar) return;

    tabsBar.innerHTML = collections.map(folder => {
        const count = folder === 'Semua Tersimpan'
            ? watchlist.length
            : watchlist.filter(w => w.folders && w.folders.includes(folder)).length;
        const isActive = activeCollection === folder;
        const isDeletable = folder !== 'Semua Tersimpan';

        return `
            <div class="collection-tab ${isActive ? 'active' : ''}" data-folder="${folder}">
                <i data-lucide="${folder === 'Semua Tersimpan' ? 'bookmark' : 'folder'}"></i>
                <span>${folder}</span>
                <span class="collection-tab-count">${count}</span>
                ${isDeletable ? `
                    <button type="button" class="btn-delete-folder" data-folder="${folder}" title="Hapus folder">
                        <i data-lucide="trash-2"></i>
                    </button>
                ` : ''}
            </div>
        `;
    }).join('');

    tabsBar.querySelectorAll('.collection-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            if (e.target.closest('.btn-delete-folder')) return;
            activeCollection = tab.dataset.folder;
            renderCollectionsTabs();
            renderWatchlist();
            lucide.createIcons();
        });
    });

    tabsBar.querySelectorAll('.btn-delete-folder').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteFolder(btn.dataset.folder);
        });
    });
}

function initBookmarkToolbar() {
    const filterBtns = document.querySelectorAll('.watchlist-filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentBookmarkFilter = btn.dataset.filter || 'all';
            renderWatchlist();
        });
    });

    const clearBtn = document.getElementById('btnClearWatchlist');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (watchlist.length === 0) return;
            if (confirm('Apakah kamu yakin ingin menghapus semua bookmark tersimpan?')) {
                watchlist = [];
                localStorage.setItem('kesmanews-watchlist', JSON.stringify(watchlist));
                updateBookmarkBadge();
                renderWatchlist();
                renderCards('beasiswa', beasiswaData);
                renderCards('lomba', lombaData);
                showToast('Semua bookmark telah dihapus');
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        });
    }
}

function renderWatchlist() {
    const grid = document.getElementById('watchlistGrid');
    const empty = document.getElementById('watchlistEmpty');
    const toolbar = document.getElementById('watchlistToolbar');
    const collectionsSection = document.getElementById('bookmarkCollectionsSection');
    if (!grid || !empty) return;

    // Update counts
    const countAll = document.getElementById('countAll');
    const countBeasiswa = document.getElementById('countBeasiswa');
    const countLomba = document.getElementById('countLomba');

    const beasiswaCount = watchlist.filter(w => w.type === 'beasiswa').length;
    const lombaCount = watchlist.filter(w => w.type === 'lomba').length;

    if (countAll) countAll.textContent = watchlist.length;
    if (countBeasiswa) countBeasiswa.textContent = beasiswaCount;
    if (countLomba) countLomba.textContent = lombaCount;

    if (watchlist.length === 0) {
        if (toolbar) toolbar.classList.add('hidden');
        if (collectionsSection) collectionsSection.classList.add('hidden');
        grid.classList.add('hidden');
        empty.classList.remove('hidden');
    } else {
        if (toolbar) toolbar.classList.remove('hidden');
        if (collectionsSection) collectionsSection.classList.remove('hidden');
        grid.classList.remove('hidden');
        empty.classList.add('hidden');

        renderCollectionsTabs();

        // 1. Filter berdasarkan Folder Aktif
        let folderFiltered = watchlist;
        if (activeCollection && activeCollection !== 'Semua Tersimpan') {
            folderFiltered = watchlist.filter(w => w.folders && w.folders.includes(activeCollection));
        }

        // 2. Filter berdasarkan Tipe (Semua / Beasiswa / Lomba)
        const filtered = folderFiltered.filter(w => {
            if (currentBookmarkFilter === 'beasiswa') return w.type === 'beasiswa';
            if (currentBookmarkFilter === 'lomba') return w.type === 'lomba';
            return true;
        });

        if (filtered.length === 0) {
            grid.innerHTML = `
                <div style="text-align:center; padding: 32px 20px; color: var(--color-text-secondary); background: var(--color-surface); border-radius: var(--radius-md); border: 1px dashed var(--color-border); width: 100%;">
                    <p style="margin:0; font-size:0.9rem;">Tidak ada item tersimpan di folder <strong>"${activeCollection}"</strong> untuk filter <strong>${currentBookmarkFilter === 'beasiswa' ? 'Beasiswa' : currentBookmarkFilter === 'lomba' ? 'Lomba' : 'Semua'}</strong>.</p>
                </div>
            `;
        } else {
            grid.innerHTML = filtered.map(w => {
                const daysLeft = getDaysLeft(w.deadline);
                const isExpired = daysLeft < 0;
                const folderBadges = (w.folders || [])
                    .filter(f => f !== 'Semua Tersimpan')
                    .map(f => `<span style="font-size:0.7rem;padding:2px 6px;border-radius:4px;background:rgba(46,196,182,0.12);color:var(--color-accent-dark);margin-right:4px;">📁 ${f}</span>`)
                    .join('');

                return `
                    <div class="watchlist-item ${isExpired ? 'expired' : ''}" data-id="${w.id}" data-type="${w.type}" style="cursor:pointer;">
                        <div class="watchlist-info">
                            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
                                <span class="watchlist-type-badge">${w.type === 'beasiswa' ? '🎓 Beasiswa' : '🏆 Lomba'}</span>
                                ${folderBadges}
                            </div>
                            <p class="watchlist-nama">${w.nama}</p>
                            <span class="watchlist-deadline ${isExpired ? 'expired-text' : ''}">
                                📅 ${w.deadline !== '2099-12-31' ? formatDate(w.deadline) : 'Lihat info'} — ${w.deadline !== '2099-12-31' ? getCountdownText(w.deadline) : '–'}
                            </span>
                        </div>
                        <div class="watchlist-actions">
                            <button class="btn-watchlist-folder" data-id="${w.id}" data-type="${w.type}" title="Kelola folder" style="background:none;border:none;color:var(--color-accent);cursor:pointer;padding:6px;display:inline-flex;align-items:center;">
                                <i data-lucide="folder-cog"></i>
                            </button>
                            <button class="btn-watchlist-remove" data-id="${w.id}" data-type="${w.type}" title="Hapus dari bookmark">
                                <i data-lucide="trash-2"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // Click on item → open modal
        grid.querySelectorAll('.watchlist-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.btn-watchlist-remove') || e.target.closest('.btn-watchlist-folder')) return;
                const id = parseInt(item.dataset.id);
                const type = item.dataset.type;
                const sourceData = type === 'beasiswa' ? beasiswaData : lombaData;
                const found = sourceData.find(d => d.id === id);
                if (found) openModal(found, type);
            });
        });

        // Folder manage handlers
        grid.querySelectorAll('.btn-watchlist-folder').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = parseInt(btn.dataset.id);
                const type = btn.dataset.type;
                const sourceData = type === 'beasiswa' ? beasiswaData : lombaData;
                const found = sourceData.find(d => d.id === id);
                if (found) openFolderModal(found, type);
            });
        });

        // Remove handlers
        grid.querySelectorAll('.btn-watchlist-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = parseInt(btn.dataset.id);
                const type = btn.dataset.type;
                const existing = watchlist.findIndex(w => w.id === id && w.type === type);
                if (existing >= 0) {
                    watchlist.splice(existing, 1);
                    localStorage.setItem('kesmanews-watchlist', JSON.stringify(watchlist));
                    updateBookmarkBadge();
                    renderWatchlist();
                    renderCards('beasiswa', beasiswaData);
                    renderCards('lomba', lombaData);
                    showToast('Dihapus dari bookmark');
                    lucide.createIcons();
                }
            });
        });
    }
    lucide.createIcons();
}

// ═══════════════════════════════════════════════════════════════
// SHARE TO WHATSAPP
// ═══════════════════════════════════════════════════════════════
function shareToWhatsApp(item) {
    const isBeasiswa = item.penyelenggara === undefined && item.cabangLomba === undefined;
    const typeLabel = isBeasiswa ? 'BEASISWA' : 'LOMBA';
    const countdownStr = item.deadline !== '2099-12-31' ? getCountdownText(item.deadline) : 'Cek info lengkap';
    const deadlineStr = item.deadline !== '2099-12-31' ? formatDate(item.deadline) : 'Segera / Cek info';

    let extraDetails = '';
    if (item.penyelenggara) extraDetails += `\n🏫 *Penyelenggara:* ${item.penyelenggara}`;
    if (item.cabangLomba)   extraDetails += `\n🎯 *Cabang Lomba:* ${item.cabangLomba}`;
    if (item.biaya)         extraDetails += `\n💳 *Biaya:* ${item.biaya}`;
    if (item.benefit && item.benefit.length > 0) {
        extraDetails += `\n🎁 *Benefit:* ${item.benefit[0]}`;
    }

    let linksText = '';
    if (item.linkDaftar && item.linkGuidebook && item.linkDaftar !== item.linkGuidebook) {
        linksText = `\n\n🔗 *Link Pendaftaran:*\n${item.linkDaftar}\n📖 *Buku Panduan/Guidebook:*\n${item.linkGuidebook}`;
    } else if (item.linkDaftar) {
        const label = item.linkDaftarLabel === 'Guidebook' ? 'Buku Panduan / Guidebook'
            : item.linkDaftarLabel === 'Buka myITS' ? 'Portal myITS StudentConnect'
            : item.linkDaftarLabel === 'Cek Instagram' ? 'Akun Instagram Info'
            : 'Link Pendaftaran';
        linksText = `\n\n🔗 *${label}:*\n${item.linkDaftar}`;
    } else if (item.linkGuidebook) {
        linksText = `\n\n📖 *Buku Panduan / Info:*\n${item.linkGuidebook}`;
    }

    const text =
`📢 *INFO ${typeLabel} MAHASISWA*
━━━━━━━━━━━━━━━━━━━━
📌 *${item.nama}*${extraDetails}

📅 *Deadline:* ${deadlineStr}
⏳ *Sisa Waktu:* ${countdownStr}
🟢 *Status:* ${item.status}${linksText}

🌐 *Portal Lengkap KESMA NEWS:*
https://kesmanews.netlify.app/
━━━━━━━━━━━━━━━━━━━━
_Disampaikan oleh Departemen Adkesma HMTK_`;

    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank', 'noopener,noreferrer');
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
