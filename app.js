/* ═══════════════════════════════════════════════════════════════
   KESMA NEWS — App Logic
   Departemen Adkesma HMTK
   ═══════════════════════════════════════════════════════════════ */

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
// DATA LOADING
// ═══════════════════════════════════════════════════════════════
async function loadData() {
    try {
        const [beasiswaRes, lombaRes] = await Promise.all([
            fetch('data/beasiswa.json'),
            fetch('data/lomba.json')
        ]);

        beasiswaData = await beasiswaRes.json();
        lombaData = await lombaRes.json();

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

    } catch (error) {
        console.error('Error loading data:', error);
        document.getElementById('skeletonBeasiswa').classList.add('hidden');
        document.getElementById('skeletonLomba').classList.add('hidden');
        document.getElementById('emptyBeasiswa').classList.remove('hidden');
        document.getElementById('emptyLomba').classList.remove('hidden');
    }
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
            // Nearest deadline first, regardless of status
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
            // Don't open modal if clicking on action buttons
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
            // Re-render to update button state
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
            const intervalId = setInterval(() => updateCardCountdown(el, deadline), 60000); // Update every minute
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

    const benefitPreview = item.benefit ? item.benefit[0] : '';

    return `
        <div class="card" data-id="${item.id}">
            <div class="card-top">
                <div class="card-badges">
                    <span class="badge ${isOpen ? 'badge-open' : 'badge-closed'}">
                        ${item.status}
                    </span>
                    <span class="badge badge-kategori">${item.kategori}</span>
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
                    <span>Deadline: ${formatDate(item.deadline)}</span>
                </div>
            </div>
            <div class="card-countdown ${isExpired ? 'expired' : ''}">
                <i data-lucide="timer"></i>
                <span class="card-countdown-text" data-deadline="${item.deadline}">
                    ${getCountdownText(item.deadline)}
                </span>
            </div>
            ${benefitPreview ? `
                <div class="card-benefit-preview">
                    <strong>${type === 'beasiswa' ? '💰' : '🏆'}</strong> ${benefitPreview}
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
                <a href="${item.linkGuidebook || '#'}" 
                   class="btn btn-outline btn-card ${!item.linkGuidebook ? 'btn-disabled' : ''}" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   onclick="event.stopPropagation()">
                    <i data-lucide="book-open"></i>
                    Guidebook
                </a>
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
        const matchSearch = !searchValue || item.nama.toLowerCase().includes(searchValue);
        const matchKategori = kategoriValue === 'semua' || item.kategori === kategoriValue;
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
    // Simpan type secara eksplisit — jangan tebak dari ID karena beasiswa & lomba punya ID yang overlap
    currentModalType = type || (beasiswaData.some(d => d.id === item.id && d.nama === item.nama) ? 'beasiswa' : 'lomba');
    const overlay = document.getElementById('modalOverlay');
    
    // Fill modal content
    document.getElementById('modalTitle').textContent = item.nama;
    
    const statusEl = document.getElementById('modalStatus');
    statusEl.innerHTML = `<span class="badge ${item.status === 'Buka' ? 'badge-open' : 'badge-closed'}">${item.status}</span>`;
    
    document.getElementById('modalKategori').textContent = `📂 ${item.kategori}`;
    document.getElementById('modalDeadline').textContent = `📅 ${formatDate(item.deadline)}`;

    // Countdown
    renderModalCountdown(item.deadline);

    // Persyaratan
    const persyaratanList = document.getElementById('modalPersyaratan');
    persyaratanList.innerHTML = item.persyaratan
        .map(p => `<li>${p}</li>`)
        .join('');

    // Benefit
    const benefitList = document.getElementById('modalBenefit');
    benefitList.innerHTML = item.benefit
        .map(b => `<li>${b}</li>`)
        .join('');

    // Timeline
    document.getElementById('modalTimeline').textContent = item.timelinePenting || 'Belum tersedia';

    // Action buttons
    const daftarBtn = document.getElementById('modalDaftar');
    const guidebookBtn = document.getElementById('modalGuidebook');

    if (item.linkDaftar) {
        daftarBtn.href = item.linkDaftar;
        daftarBtn.classList.remove('btn-disabled');
    } else {
        daftarBtn.href = '#';
        daftarBtn.classList.add('btn-disabled');
    }

    if (item.linkGuidebook) {
        guidebookBtn.href = item.linkGuidebook;
        guidebookBtn.classList.remove('btn-disabled');
    } else {
        guidebookBtn.href = '#';
        guidebookBtn.classList.add('btn-disabled');
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
    // Update modal bookmark btn if open
    if (currentModalData) updateModalBookmarkBtn(currentModalData);
}

function updateModalBookmarkBtn(item) {
    const btn = document.getElementById('modalBookmarkBtn');
    if (!btn) return;
    // Gunakan currentModalType — JANGAN tebak dari ID karena beasiswa & lomba punya ID overlap (keduanya mulai dari 1)
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
                            📅 ${formatDate(w.deadline)} — ${getCountdownText(w.deadline)}
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
                // Don't open modal if clicking the remove button
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
                // Also re-render cards to update bookmark state
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
    const daysLeft = getDaysLeft(item.deadline);
    const countdownStr = getCountdownText(item.deadline);
    const linkPart = item.linkDaftar ? `\n🔗 *Link Daftar:* ${item.linkDaftar}` : '';

    const text =
        `📢 *INFO ${item.kategori?.toUpperCase() || 'BEASISWA/LOMBA'}*\n` +
        `\n📌 *${item.nama}*` +
        `\n\n📅 *Deadline:* ${formatDate(item.deadline)}` +
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
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDate(dateStr) {
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return new Date(dateStr).toLocaleDateString('id-ID', options);
}

function getDaysLeft(deadline) {
    const now = new Date();
    const target = new Date(deadline + 'T23:59:59');
    const diff = target - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getCountdownText(deadline) {
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
    el.textContent = getCountdownText(deadline);
    const parent = el.closest('.card-countdown');
    if (getDaysLeft(deadline) < 0) {
        parent.classList.add('expired');
    } else {
        parent.classList.remove('expired');
    }
}
