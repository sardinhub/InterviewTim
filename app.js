/**
 * Triesakti Insight Hub - Main Logic
 */

// --- Supabase Config ---
const SUPABASE_URL = 'https://qkmounhnmatreqmhpigg.supabase.co';
const SUPABASE_KEY = 'sb_publishable_sugdY32OzOlkzZSSvwFeGg_w0kWLh69';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- App State ---
const state = {
    students: [],
    interviewers: [],
    currentUser: JSON.parse(localStorage.getItem('triesakti_current_user')) || null,
    currentView: 'home',
    currentInterview: null,
    currentQuestionIndex: 0,
    questions: [
        // 1. Minat dan Ketertarikan Dunia Penerbangan
        {
            category: "Visi & Motivasi",
            text: "Ceritakan, apa yang membuat kamu tertarik dengan dunia penerbangan? Apakah ada tokoh, pengalaman, atau tontonan tertentu yang memicu ketertarikan itu?",
            indicator: "Motivasi Awal",
            key: "mot_1"
        },
        {
            category: "Visi & Motivasi",
            text: "Menurut kamu, tantangan terbesar profesi di maskapai penerbangan saat ini apa? Dan bagaimana kamu melihat peluangmu di dalamnya?",
            indicator: "Pengetahuan Industri",
            key: "mot_2"
        },
        {
            category: "Visi & Motivasi",
            text: "Jika nanti ada materi yang sulit (misal: Aviation Knowledge atau bahasa Inggris aviation), apa yang akan kamu lakukan untuk tetap semangat?",
            indicator: "Komitmen Belajar",
            key: "mot_3"
        },
        // 2. Potensi Referral
        {
            category: "Potensi Referral",
            text: "Pernahkah kamu mengajak teman untuk ikut kegiatan positif (les, ekskul, lomba)? Ceritakan caramu meyakinkan mereka.",
            indicator: "Social Influence",
            key: "ref_1"
        },
        {
            category: "Potensi Referral",
            text: "Jika kamu nantinya merasa puas dan pas dengan pendidikan di sini, apakah kamu bersedia merekomendasikan ke teman atau adik kelas? Kira-kira berapa banyak yang bisa kamu ajak dalam 3 bulan?",
            indicator: "Kepercayaan Diri",
            key: "ref_2"
        },
        {
            category: "Potensi Referral",
            text: "Tours ke Jogja sebagai reward menurut kamu menarik atau tidak? Kenapa?",
            indicator: "Persepsi Reward",
            key: "ref_3"
        },
        // 3. Kelas Akselerasi
        {
            category: "Kelas Akselerasi",
            text: "Tahu perbedaan kelas reguler dan akselerasi? Kelas akselerasi punya OJT lebih cepat. Apa ekspektasimu tentang OJT?",
            indicator: "Pemahaman OJT",
            key: "acc_1"
        },
        {
            category: "Kelas Akselerasi",
            text: "Di kelas akselerasi, waktu belajar lebih padat dan evaluasi lebih ketat. Dalam skala 1–10, seberapa siap kamu? Mengapa?",
            indicator: "Kesiapan Belajar",
            key: "acc_2"
        },
        {
            category: "Kelas Akselerasi",
            text: "Jika ada dua pilihan: (A) lulus lebih cepat dengan OJT langsung, (B) santai tapi tidak dapat prioritas rekrutmen. Kamu pilih mana? Mengapa?",
            indicator: "Prioritas Akhir",
            key: "acc_3"
        },
        // 4. Dukungan Finansial
        {
            category: "Dukungan Finansial",
            text: "Apakah orang tua sudah tahu detail biaya per bulan? Kapan terakhir kali kamu diskusi biaya ini dengan mereka?",
            indicator: "Pola Komunikasi",
            key: "fin_1"
        },
        {
            category: "Dukungan Finansial",
            text: "Dari biaya pendidikan dan biaya-biaya lain, seluruhnya menjadi tanggungan orang tua, dan apakah ada skenario jika terjadi keterlambatan?",
            indicator: "Kemampuan Finansial",
            key: "fin_2"
        },
        // 5. Hobi dan Bakat
        {
            category: "Hobi dan Bakat",
            text: "Selain akademik, apa yang paling sering kamu lakukan di waktu luang? Sudah pernah juara atau tampil di depan umum?",
            indicator: "Soft Skill",
            key: "tal_1"
        },
        {
            category: "Hobi dan Bakat",
            text: "Apakah hobimu bisa membantu karir penerbangan? Contoh: orang yang hobi bahasa asing, fotografi, atau olahraga tim.",
            indicator: "Relevansi Aviasi",
            key: "tal_2"
        },
        {
            category: "Hobi dan Bakat",
            text: "Jika kampus butuh perwakilan untuk lomba vlog, drama, atau public speaking, kira-kira bakatmu cocok di mana?",
            indicator: "Potensi Promo",
            key: "tal_3"
        }
    ]
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    lucide.createIcons();
    initRouter();
    await fetchInitialData(); // Ambil data dari cloud
    initLogin(); 
    setupEventListeners();
});

async function fetchInitialData() {
    const loginBtn = document.getElementById('execute-login-btn');
    if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.innerHTML = 'Menghubungkan ke Database... <i class="spinner"></i>';
    }

    try {
        // 1. Fetch Interviewers
        const { data: intData, error: intErr } = await supabaseClient.from('interviewers').select('*');
        if (intErr) throw intErr;
        state.interviewers = intData || [];

        // 2. Fetch Students
        const { data: stuData, error: stuErr } = await supabaseClient.from('students').select('*');
        if (stuErr) throw stuErr;
        state.students = stuData || [];

        console.log('Database Connected Successfully');
    } catch (err) {
        console.error('Database Connection Error:', err);
        alert('Gagal terhubung ke database. Pastikan internet stabil dan API Key benar.');
    } finally {
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.innerHTML = 'Masuk ke Dashboard <i data-lucide="log-in"></i>';
            lucide.createIcons();
        }
        renderLoginInterviewerList(); // Segarkan daftar dropdown
    }
}

// --- Router ---
function initRouter() {
    const handleRoute = () => {
        const hash = window.location.hash.replace('#', '') || 'home';
        state.currentView = hash;
        
        // Update Nav
        document.querySelectorAll('.nav-links li').forEach(li => {
            li.classList.toggle('active', li.dataset.page === hash);
        });

        // Update Pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.toggle('active', page.id === hash);
        });

        if (hash === 'interview' && state.currentUser && state.currentUser.isAdmin) {
            window.location.hash = 'home';
            return;
        }

        if (hash === 'analytics') renderAnalytics();
        if (hash === 'database') renderStudentList();
        if (hash === 'interview') renderInterviewStudentSelect();
        if (hash === 'admin') {
            renderInterviewerList();
            renderMasterStudentList();
        }
    };

    window.addEventListener('hashchange', handleRoute);
    handleRoute();
}

// --- Event Listeners ---
function setupEventListeners() {
    // Start Interview
    document.getElementById('start-interview-btn').addEventListener('click', startNewInterview);

    // Interview Navigation
    document.getElementById('prev-btn').addEventListener('click', prevQuestion);
    document.getElementById('next-btn').addEventListener('click', nextQuestion);

    // General Search (Main Database)
    document.getElementById('search-input').addEventListener('input', (e) => {
        renderStudentList(e.target.value);
    });

    // Admin Master Search
    const adminSearch = document.getElementById('admin-search-input');
    if (adminSearch) {
        adminSearch.addEventListener('input', (e) => {
            renderMasterStudentList(e.target.value);
        });
    }

    // Modal Close
    document.querySelector('.close-modal').addEventListener('click', closeModal);
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
        if (e.target.id === 'modal-overlay') closeModal();
    });

    // Export & Import
    document.getElementById('export-csv').addEventListener('click', exportToCSV);
    document.getElementById('import-btn').addEventListener('click', () => {
        document.getElementById('csv-file-input').click();
    });
    document.getElementById('csv-file-input').addEventListener('change', handleImportCSV);

    // Admin: Interviewer Management
    document.getElementById('show-add-interviewer').addEventListener('click', () => {
        document.getElementById('interviewer-modal').classList.remove('hidden');
    });
    document.getElementById('save-interviewer-btn').addEventListener('click', addInterviewer);

    // Admin: Bulk Actions
    document.getElementById('select-all-students').addEventListener('change', (e) => {
        const checkboxes = document.querySelectorAll('.student-checkbox');
        checkboxes.forEach(cb => cb.checked = e.target.checked);
        updateSelectionUI();
    });
    document.getElementById('bulk-assign-btn').addEventListener('click', openAssignModal);
    document.getElementById('confirm-assign-btn').addEventListener('click', confirmBulkAssign);

    // Admin: Clear Data
    document.getElementById('clear-students-btn').addEventListener('click', resetStudentDatabase);

    // Session: Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
}

// --- Login Logic ---
function initLogin() {
    const roleSelect = document.getElementById('login-role-select');
    const interviewerGroup = document.getElementById('interviewer-select-group');
    const adminPasswordGroup = document.getElementById('admin-password-group');
    const loginBtn = document.getElementById('execute-login-btn');

    // Handle role change
    roleSelect.addEventListener('change', (e) => {
        if (e.target.value === 'interviewer') {
            interviewerGroup.classList.remove('hidden');
            adminPasswordGroup.classList.add('hidden'); // Sembunyikan password jika pilih interviewer
            renderLoginInterviewerList();
        } else {
            interviewerGroup.classList.add('hidden');
            adminPasswordGroup.classList.remove('hidden'); // Tampilkan password jika pilih admin
        }
    });

    // Execute Login
    loginBtn.addEventListener('click', () => {
        const role = roleSelect.value;
        let user;

        if (role === 'admin') {
            const password = document.getElementById('admin-password').value;
            if (password !== 'Rahasiaku123') {
                return alert('Password Administrator salah!');
            }
            user = { name: 'Super Admin', role: 'Administrator', isAdmin: true };
        } else {
            const interviewerName = document.getElementById('login-interviewer-name').value;
            if (!interviewerName) return alert('Pilih nama interviewer.');
            
            const interviewerData = state.interviewers.find(i => i.name === interviewerName);
            user = { ...interviewerData, isAdmin: false };
        }

        loginAs(user);
    });

    // Check existing session
    const savedUser = JSON.parse(localStorage.getItem('triesakti_current_user'));
    if (savedUser) {
        loginAs(savedUser);
    } else {
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('main-app').classList.add('hidden');
    }
}

function renderLoginInterviewerList() {
    const select = document.getElementById('login-interviewer-name');
    if (!select) return;
    
    if (state.interviewers.length === 0) {
        select.innerHTML = '<option value="">(Belum ada Interviewer terdaftar)</option>';
        return;
    }

    select.innerHTML = '<option value="">Pilih Nama Anda...</option>';
    state.interviewers.forEach(int => {
        const opt = document.createElement('option');
        opt.value = int.name;
        opt.textContent = int.name;
        select.appendChild(opt);
    });
}

function loginAs(user) {
    state.currentUser = user;
    localStorage.setItem('triesakti_current_user', JSON.stringify(user));
    
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    
    // Role-based UI visibility
    const adminElements = document.querySelectorAll('.admin-only');
    const interviewerElements = document.querySelectorAll('.interviewer-only');
    
    if (user.isAdmin) {
        adminElements.forEach(el => el.classList.remove('hidden'));
        interviewerElements.forEach(el => el.classList.add('hidden'));
        if (state.currentView === 'interview') window.location.hash = 'home';
    } else {
        adminElements.forEach(el => el.classList.add('hidden'));
        interviewerElements.forEach(el => el.classList.remove('hidden'));
    }

    updateInterviewerDisplay();
    updateDashboardStats();
    if (state.currentView === 'database') renderStudentList();
    if (state.currentView === 'analytics') renderAnalytics();
    
    // Check access for Admin-only views
    if (!state.currentUser.isAdmin && (state.currentView === 'admin')) {
        window.location.hash = 'home';
    }

    lucide.createIcons();
}

function logout() {
    if (!confirm('Anda yakin ingin logout?')) return;
    localStorage.removeItem('triesakti_current_user');
    location.reload();
}

function toggleUserMenu() {
    const menu = document.getElementById('user-menu');
    menu.classList.toggle('hidden');
    renderUserList();
}

function renderUserList() {
    const list = document.getElementById('available-users');
    list.innerHTML = '';

    // Admin option
    const adminDiv = document.createElement('div');
    adminDiv.className = 'user-option';
    adminDiv.innerHTML = `<strong>Super Admin</strong> (Administrator)`;
    adminDiv.onclick = () => loginAs({ name: 'Super Admin', role: 'Administrator', isAdmin: true });
    list.appendChild(adminDiv);

    // Interviewer options
    state.interviewers.forEach(int => {
        const div = document.createElement('div');
        div.className = 'user-option';
        div.innerHTML = `<strong>${int.name}</strong> (${int.role})`;
        div.onclick = () => loginAs({ ...int, isAdmin: false });
        list.appendChild(div);
    });
}

function updateInterviewerDisplay() {
    const footer = document.querySelector('.interviewer-info');
    if (!footer) return;
    
    footer.innerHTML = `
        <div class="avatar">${state.currentUser.name.charAt(0)}</div>
        <div class="details">
            <p class="name">${state.currentUser.name}</p>
            <p class="role">${state.currentUser.role}</p>
        </div>
    `;

    // Update Dashboard Welcome Message
    const welcomeMsg = document.getElementById('welcome-message');
    if (welcomeMsg) {
        welcomeMsg.textContent = `Selamat Datang, ${state.currentUser.name}`;
    }
    
    // Global visibility based on role
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = state.currentUser.isAdmin ? 'block' : 'none';
    });
}

// --- Admin: Interviewer Logic ---
function renderInterviewerList() {
    const list = document.getElementById('interviewer-table-body');
    list.innerHTML = '';

    state.interviewers.forEach(int => {
        // Hitung Progress Interviewer
        const assignedStudents = state.students.filter(s => s.assigned_to === int.name);
        const totalAssigned = assignedStudents.length;
        const completedCount = assignedStudents.filter(s => s.status === 'completed').length;
        
        let progressHtml = '-';
        if (totalAssigned > 0) {
            const percentage = Math.round((completedCount / totalAssigned) * 100);
            progressHtml = `
                <div style="display: flex; align-items: center; gap: 0.5rem; min-width: 150px;">
                    <div style="flex-grow: 1; height: 6px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
                        <div style="height: 100%; width: ${percentage}%; background: ${percentage === 100 ? '#10B981' : 'var(--accent)'}; border-radius: 4px; transition: width 0.3s ease;"></div>
                    </div>
                    <span style="font-size: 0.8rem; white-space: nowrap;">${completedCount} / ${totalAssigned} (${percentage}%)</span>
                </div>
            `;
        } else {
            progressHtml = '<span class="text-muted" style="font-size: 0.8rem;">Belum ada tugas</span>';
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><a href="javascript:void(0)" onclick="viewInterviewerDetails('${int.name.replace(/'/g, "\\'")}')" style="color: var(--accent); text-decoration: none; font-weight: bold; border-bottom: 1px dashed var(--accent); cursor: pointer; display: inline-block; padding-bottom: 2px;">${int.name}</a></td>
            <td>${int.role}</td>
            <td>${progressHtml}</td>
            <td>
                <button class="btn btn-ghost btn-sm" onclick="deleteInterviewer(${int.id})" ${int.id === 1 ? 'disabled' : ''}>
                    <i data-lucide="trash-2"></i>
                </button>
            </td>
        `;
        list.appendChild(row);
    });
    lucide.createIcons();
}

function viewInterviewerDetails(interviewerName) {
    const assignedStudents = state.students.filter(s => s.assigned_to === interviewerName);
    const completedStudents = assignedStudents.filter(s => s.status === 'completed');
    const pendingStudents = assignedStudents.filter(s => s.status !== 'completed');

    const modal = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    const title = document.getElementById('modal-title');

    title.textContent = "Detail Penugasan: " + interviewerName;
    
    const pdfBtn = document.getElementById('download-pdf-btn');
    if (pdfBtn) pdfBtn.classList.add('hidden');

    let html = \`
        <div style="margin-bottom: 2rem;">
            <h4 style="margin-bottom: 1rem; color: #10B981; display: flex; align-items: center; gap: 0.5rem;">
                <i data-lucide="check-circle"></i> Sudah Diinterview (\${completedStudents.length})
            </h4>
            \${completedStudents.length > 0 ? \`
                <ul style="list-style: none; padding: 0;">
                    \${completedStudents.map(s => \`
                        <li style="padding: 0.75rem; background: rgba(16, 185, 129, 0.1); border-left: 3px solid #10B981; margin-bottom: 0.5rem; border-radius: 4px;">
                            <strong>\${s.name}</strong> <span style="font-size: 0.8rem; color: var(--text-muted);">— \${s.decision || 'Selesai'}</span>
                        </li>
                    \`).join('')}
                </ul>
            \` : '<p style="color: var(--text-muted); font-size: 0.9rem;">Belum ada siswa yang selesai diinterview.</p>'}
        </div>

        <div>
            <h4 style="margin-bottom: 1rem; color: #F59E0B; display: flex; align-items: center; gap: 0.5rem;">
                <i data-lucide="clock"></i> Belum Diinterview (\${pendingStudents.length})
            </h4>
            \${pendingStudents.length > 0 ? \`
                <ul style="list-style: none; padding: 0;">
                    \${pendingStudents.map(s => \`
                        <li style="padding: 0.75rem; background: rgba(245, 158, 11, 0.1); border-left: 3px solid #F59E0B; margin-bottom: 0.5rem; border-radius: 4px;">
                            <strong>\${s.name}</strong> <span style="font-size: 0.8rem; color: var(--text-muted);">— \${s.program || '-'}</span>
                        </li>
                    \`).join('')}
                </ul>
            \` : '<p style="color: var(--text-muted); font-size: 0.9rem;">Tidak ada tugas interview yang tertunda.</p>'}
        </div>
    \`;

    content.innerHTML = html;
    modal.classList.remove('hidden');
    lucide.createIcons();
}

async function addInterviewer() {
    const name = document.getElementById('new-interviewer-name').value.trim();
    const role = document.getElementById('new-interviewer-role').value.trim();

    if (!name || !role) return alert('Silakan isi nama dan jabatan.');

    const { data, error } = await supabaseClient.from('interviewers').insert([{ name, role }]).select();

    if (error) return alert('Gagal menyimpan ke database.');

    state.interviewers.push(data[0]);

    // Reset & Close
    document.getElementById('new-interviewer-name').value = '';
    document.getElementById('new-interviewer-role').value = '';
    document.getElementById('interviewer-modal').classList.add('hidden');
    
    renderInterviewerList();
    alert('Interviewer berhasil ditambahkan.');
}

async function deleteInterviewer(id) {
    if (!confirm('Hapus interviewer ini?')) return;

    const { error } = await supabaseClient.from('interviewers').delete().eq('id', id);
    if (error) return alert('Gagal menghapus data.');

    state.interviewers = state.interviewers.filter(int => int.id !== id);
    renderInterviewerList();
}

// --- Admin: Student Master & Import Logic ---
function renderMasterStudentList(filter = '') {
    const list = document.getElementById('master-student-table-body');
    if (!list) return;
    list.innerHTML = '';

    const filtered = state.students.filter(s => {
        const name = s.name ? s.name.toLowerCase() : '';
        const program = s.program ? s.program.toLowerCase() : '';
        const f = filter.toLowerCase();
        return name.includes(f) || program.includes(f);
    });

        filtered.forEach(s => {
            const row = document.createElement('tr');
            const isInterviewed = s.status === 'completed';
            const displayDecision = s.decision || s.answers?.calculated_decision;
            
            row.innerHTML = `
                <td><input type="checkbox" class="student-checkbox" data-id="${s.id}" onchange="updateSelectionUI()"></td>
                <td><strong>${s.name}</strong></td>
                <td><span style="font-size: 0.8rem; opacity: 0.8;">${s.program || '-'}</span></td>
                <td>${s.assigned_to || '<span class="text-muted">Belum ditugaskan</span>'}</td>
                <td><span class="badge ${getDecisionBadge(displayDecision)}">${displayDecision || (s.assigned_to ? 'Ditugaskan' : 'Draft')}</span></td>
                <td>
                <div style="display: flex; gap: 0.5rem;">
                    ${isInterviewed ? 
                        `<button class="btn btn-secondary btn-sm" onclick="viewInterviewResult('${s.id}')">
                            <i data-lucide="eye"></i> Hasil
                        </button>` : 
                        `<button class="btn btn-ghost btn-sm" onclick="deleteStudent('${s.id}')">
                            <i data-lucide="trash-2"></i>
                        </button>`
                    }
                </div>
            </td>
        `;
        list.appendChild(row);
    });
    lucide.createIcons();
    updateSelectionUI();
}

function updateSelectionUI() {
    const selected = document.querySelectorAll('.student-checkbox:checked');
    const count = selected.length;
    const btn = document.getElementById('bulk-assign-btn');
    const countDisplay = document.getElementById('selected-count');

    if (count > 0) {
        btn.classList.remove('hidden');
        countDisplay.textContent = count;
    } else {
        btn.classList.add('hidden');
    }
}

function handleImportCSV(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(event) {
        const text = event.target.result;
        const lines = text.split('\n');
        const newStudents = [];

        lines.forEach(line => {
            const delimiter = line.includes(';') ? ';' : ',';
            const parts = line.split(delimiter);
            
            const name = parts[0] ? parts[0].trim() : '';
            const program = parts[1] ? parts[1].trim() : '';

            if (name && name !== "Nama" && name !== "Nama Siswa") {
                // CEK DUPLIKAT: Jangan masukkan jika nama sudah ada di daftar
                const isDuplicate = state.students.some(s => s.name.toLowerCase() === name.toLowerCase());
                
                if (!isDuplicate) {
                    newStudents.push({
                        name: name,
                        program: program,
                        status: 'unassigned'
                    });
                }
            }
        });

        if (newStudents.length === 0) {
            alert('Semua siswa dalam file CSV sudah ada di database (tidak ada data baru).');
            e.target.value = '';
            return;
        }

        const { data, error } = await supabaseClient.from('students').insert(newStudents).select();

        if (error) return alert('Gagal mengimpor ke database cloud: ' + error.message);

        if (data && data.length > 0) {
            // Ambil ulang data terbaru dari cloud agar sinkron
            await fetchInitialData(); 
            renderMasterStudentList();
            updateDashboardStats();
            alert(`Berhasil mengimpor ${data.length} siswa baru ke Cloud.`);
        } else {
            alert('Tidak ada siswa baru yang ditemukan di file CSV.');
        }
        e.target.value = ''; // Reset input
    };
    reader.readAsText(file);
}

function openAssignModal() {
    const selected = document.querySelectorAll('.student-checkbox:checked');
    document.getElementById('assign-count-display').textContent = selected.length;

    const select = document.getElementById('assign-interviewer-select');
    select.innerHTML = '<option value="">Pilih Interviewer...</option>';
    
    state.interviewers.forEach(int => {
        const opt = document.createElement('option');
        opt.value = int.name;
        opt.textContent = `${int.name} (${int.role})`;
        select.appendChild(opt);
    });

    document.getElementById('assign-modal').classList.remove('hidden');
}

async function confirmBulkAssign() {
    const interviewerName = document.getElementById('assign-interviewer-select').value;
    if (!interviewerName) return alert('Silakan pilih interviewer.');

    const selectedCheckboxes = document.querySelectorAll('.student-checkbox:checked');
    const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.dataset.id);

    const { error } = await supabaseClient
        .from('students')
        .update({ assigned_to: interviewerName, status: 'assigned' })
        .in('id', selectedIds);

    if (error) return alert('Gagal menugaskan di database cloud.');

    state.students.forEach(s => {
        if (selectedIds.includes(s.id)) {
            s.assigned_to = interviewerName;
            s.status = 'assigned';
        }
    });

    document.getElementById('assign-modal').classList.add('hidden');
    document.getElementById('select-all-students').checked = false;
    renderMasterStudentList();
    renderInterviewerList();
    alert(`Berhasil menugaskan ${selectedIds.length} siswa ke ${interviewerName} di Cloud.`);
}

async function deleteStudent(id) {
    if (!confirm('Hapus data siswa ini secara permanen?')) return;

    const { error } = await supabaseClient.from('students').delete().eq('id', id);
    if (error) return alert('Gagal menghapus dari database cloud.');

    state.students = state.students.filter(s => s.id !== id);
    
    if (state.currentView === 'admin') {
        renderMasterStudentList();
        renderInterviewerList();
    }
    if (state.currentView === 'database') renderStudentList();
    updateDashboardStats();
}

async function resetStudentDatabase() {
    if (!confirm('PERINGATAN: Semua data siswa akan dihapus secara permanen dari Cloud. Yakin?')) return;

    const { error } = await supabaseClient.from('students').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    if (error) return alert('Gagal membersihkan database.');

    state.students = [];
    renderMasterStudentList();
    renderInterviewerList();
    if (state.currentView === 'database') renderStudentList();
    updateDashboardStats();
    
    alert('Database cloud telah dibersihkan.');
}

// --- Dashboard Logic ---
function updateDashboardStats() {
    const isAdmin = state.currentUser.isAdmin;
    
    // Filter data based on user
    const userStudents = isAdmin 
        ? state.students 
        : state.students.filter(s => s.assigned_to === state.currentUser.name);

    const total = userStudents.length;
    const interviewed = userStudents.filter(s => s.status === 'completed').length;
    const pending = total - interviewed;

    document.getElementById('total-students').textContent = total;
    document.getElementById('interviewed-count').textContent = interviewed;
    document.getElementById('pending-count').textContent = Math.max(0, pending);
}

// --- Interview Logic ---
function renderInterviewStudentSelect() {
    const select = document.getElementById('student-name-select');
    if (!select) return;
    
    select.innerHTML = '<option value="">Pilih Siswa...</option>';

    // Filter: Assigned to CURRENT user AND NOT yet interviewed
    const pendingStudents = state.students.filter(s => 
        s.assigned_to === state.currentUser.name && 
        (s.status !== 'completed')
    );

    pendingStudents.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.name + (s.program ? ` (${s.program})` : '');
        select.appendChild(opt);
    });
}

function startNewInterview() {
    const studentId = document.getElementById('student-name-select').value;
    if (!studentId) return alert('Silakan pilih siswa dari daftar.');

    const student = state.students.find(s => s.id == studentId);
    if (!student) return alert('Siswa tidak ditemukan.');

    // Ensure data structures exist for new/imported students
    if (!student.answers) student.answers = {};
    if (!student.notes) student.notes = {};

    state.currentInterview = student;
    state.currentQuestionIndex = 0;
    
    document.getElementById('setup-step').classList.add('hidden');
    document.getElementById('question-step').classList.remove('hidden');
    document.getElementById('current-student-display').textContent = student.name;
    
    renderQuestion();
}

function startAssignedInterview(student) {
    if (!student.answers) student.answers = {};
    if (!student.notes) student.notes = {};

    state.currentInterview = student;
    state.currentQuestionIndex = 0;
    
    // Switch view
    window.location.hash = 'interview';
    
    document.getElementById('setup-step').classList.add('hidden');
    document.getElementById('question-step').classList.remove('hidden');
    document.getElementById('current-student-display').textContent = student.name;
    
    renderQuestion();
}

function renderQuestion() {
    const q = state.questions[state.currentQuestionIndex];
    if (!q) {
        console.error("Question not found at index:", state.currentQuestionIndex);
        return;
    }

    const progress = ((state.currentQuestionIndex + 1) / state.questions.length) * 100;
    const progressBar = document.querySelector('.progress-bar');
    if (progressBar) progressBar.style.width = `${progress}%`;

    const container = document.getElementById('question-content');
    if (!container) {
        console.error("Element #question-content not found");
        return;
    }

    // Clear and Inject
    container.innerHTML = `
        <div class="question-card">
            <span class="category-label">${q.category}</span>
            <h4 class="question-text" style="margin: 1.5rem 0; line-height: 1.6; color: white;">${q.text}</h4>
            
            <p style="font-size: 0.85rem; color: var(--accent); margin-bottom: 1.5rem; opacity: 0.8;">Indikator: ${q.indicator}</p>

            <div class="options-grid">
                ${[1, 2, 3, 4, 5].map(score => `
                    <div class="option-item">
                        <input type="radio" name="score" id="score-${score}" value="${score}" 
                            ${(state.currentInterview.answers && state.currentInterview.answers[q.key] == score) ? 'checked' : ''}>
                        <label for="score-${score}" class="option-label">
                            <span class="score">${score}</span>
                            <span class="desc">${getScoreLabel(score)}</span>
                        </label>
                    </div>
                `).join('')}
            </div>

            <div class="form-group" style="margin-top: 2rem;">
                <label>Catatan Tambahan (Optional)</label>
                <textarea id="q-note" rows="3" placeholder="Tambahkan catatan khusus..." style="width: 100%; background: rgba(0,0,0,0.2); color: white; border: 1px solid rgba(255,255,255,0.1); padding: 1rem; border-radius: 12px;">${(state.currentInterview.notes && state.currentInterview.notes[q.key]) || ''}</textarea>
            </div>
        </div>
    `;

    // Handle button text
    const nextBtn = document.getElementById('next-btn');
    if (nextBtn) {
        if (state.currentQuestionIndex === state.questions.length - 1) {
            nextBtn.innerHTML = 'Selesai & Simpan <i data-lucide="check"></i>';
        } else {
            nextBtn.innerHTML = 'Selanjutnya <i data-lucide="chevron-right"></i>';
        }
    }
    lucide.createIcons();
}

function getScoreLabel(score) {
    const labels = ["Sangat Rendah", "Rendah", "Cukup", "Baik", "Sangat Baik"];
    return labels[score - 1];
}

function nextQuestion() {
    const selectedScore = document.querySelector('input[name="score"]:checked');
    if (!selectedScore) return alert('Silakan pilih skor indikator.');

    const q = state.questions[state.currentQuestionIndex];
    state.currentInterview.answers[q.key] = parseInt(selectedScore.value);
    state.currentInterview.notes[q.key] = document.getElementById('q-note').value;

    if (state.currentQuestionIndex < state.questions.length - 1) {
        state.currentQuestionIndex++;
        renderQuestion();
    } else {
        finishInterview();
    }
}

function prevQuestion() {
    if (state.currentQuestionIndex > 0) {
        state.currentQuestionIndex--;
        renderQuestion();
    }
}

async function finishInterview() {
    const answers = state.currentInterview.answers;
    
    // Hitung Rata-rata Kategori
    const motScore = ((answers.mot_1 || 0) + (answers.mot_2 || 0) + (answers.mot_3 || 0)) / 3;
    const finScore = ((answers.fin_1 || 0) + (answers.fin_2 || 0)) / 2;
    const refScore = ((answers.ref_1 || 0) + (answers.ref_2 || 0) + (answers.ref_3 || 0)) / 3;
    const accScore = ((answers.acc_1 || 0) + (answers.acc_2 || 0) + (answers.acc_3 || 0)) / 3;
    const talScore = ((answers.tal_1 || 0) + (answers.tal_2 || 0) + (answers.tal_3 || 0)) / 3;

    const decision = getDecisionRecommendation(motScore, finScore, accScore);

    // Format Label (Agar sesuai dengan tipe data TEXT di Supabase)
    const motLabel = motScore >= 4 ? "Tinggi" : (motScore >= 3 ? "Sedang" : "Rendah");
    const finLabel = finScore >= 4 ? "Sangat Mampu" : (finScore >= 3 ? "Mampu dengan Cicilan" : "Perlu Perhatian");
    const refLabel = refScore >= 4 ? "Ya" : (refScore >= 3 ? "Mungkin" : "Tidak");
    const accLabel = accScore >= 4 ? "Ya" : (accScore >= 3 ? "Tertarik Nanti" : "Tidak");

    const updates = {
        motivation_level: motLabel,
        financial_profile: finLabel,
        referral_interest: refLabel,
        acceleration_interest: accLabel,
        talent_score: Math.round(talScore),
        decision: decision,
        answers: { 
            ...answers, 
            calculated_decision: decision,
            avg_mot: motScore,
            avg_fin: finScore
        },
        notes: state.currentInterview.notes,
        status: 'completed',
        date: new Date().toLocaleDateString('id-ID')
    };

    const { error } = await supabaseClient.from('students').update(updates).eq('id', state.currentInterview.id);

    if (error) {
        console.warn('First attempt failed, retrying with minimal columns...', error);
        
        // Cadangan: Hanya kirim kolom yang PASTI ada di tabel lama
        const fallback = {
            motivation_level: motLabel,
            financial_profile: finLabel,
            referral_interest: refLabel,
            acceleration_interest: accLabel,
            answers: updates.answers,
            notes: updates.notes,
            status: 'completed'
        };

        const { error: error2 } = await supabaseClient.from('students').update(fallback).eq('id', state.currentInterview.id);
        
        if (error2) {
            console.error('Final Save Error:', error2);
            return alert('Gagal menyimpan ke Cloud. Mohon pastikan tabel "students" di Supabase masih aktif.');
        }
    }

    // Update local state
    const index = state.students.findIndex(s => s.id === state.currentInterview.id);
    if (index !== -1) {
        state.students[index] = { ...state.students[index], ...updates };
    }

    alert(`Interview Berhasil Disimpan!\nKeputusan: ${decision}`);
    renderInterviewStudentSelect(); 
    document.getElementById('setup-step').classList.remove('hidden');
    document.getElementById('question-step').classList.add('hidden');
    updateDashboardStats();
    window.location.hash = 'database';
}

function getDecisionRecommendation(mot, fin, acc) {
    // Kriteria Berdasarkan Skala 1-5
    if (mot >= 4 && fin >= 3.5) return "Highly Recommended";
    if (mot >= 4 && acc >= 4) return "Recommended (Acceleration Class)";
    if (mot >= 3 && fin >= 3) return "Recommended (Regular Class)";
    if (mot >= 3.5 && fin < 3) return "Conditional (Needs Financial Review)";
    if (mot < 2.5 && fin < 2.5) return "Not Recommended";
    return "Under Review";
}

// --- Database Logic ---
function renderStudentList(filter = '') {
    const list = document.getElementById('student-list');
    list.innerHTML = '';

    // Filter by role: Admin sees all, Interviewer sees only assigned
    let userStudents = state.currentUser.isAdmin 
        ? state.students 
        : state.students.filter(s => s.assigned_to === state.currentUser.name);

    // Apply text search filter
    const filtered = userStudents.filter(s => s.name.toLowerCase().includes(filter.toLowerCase()));

    filtered.reverse().forEach(s => {
        const isInterviewed = s.status === 'completed';
        const displayDecision = s.decision || s.answers?.calculated_decision;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${s.name}</strong></td>
            <td>${s.program || '-'}</td>
            <td><span class="badge ${getDecisionBadge(displayDecision)}">${displayDecision || 'Draft'}</span></td>
            <td>${s.assigned_to || '-'}</td>
            <td>
                <div style="display: flex; gap: 0.5rem;">
                    ${isInterviewed ? 
                        `<button class="btn btn-secondary btn-sm" onclick="viewInterviewResult('${s.id}')">
                            <i data-lucide="eye"></i> Hasil
                        </button>` : 
                        `<button class="btn btn-primary btn-sm" onclick="viewStudentDetail('${s.id}')">
                            <i data-lucide="play-circle"></i> Mulai
                        </button>`
                    }
                </div>
            </td>
        `;
        list.appendChild(row);
    });
    lucide.createIcons();
}

function getDecisionBadge(decision) {
    if (decision === 'Highly Recommended') return 'badge-green';
    if (decision?.includes('Recommended')) return 'badge-blue';
    if (decision?.includes('Conditional')) return 'badge-yellow';
    if (decision === 'Not Recommended') return 'badge-red';
    return 'badge-gray';
}

function viewStudentDetail(id) {
    const s = state.students.find(x => x.id === id);
    if (!s) return;

    const isInterviewed = s.answers && Object.keys(s.answers).length > 0;

    // If not interviewed yet and user is not admin, start interview directly
    if (!isInterviewed && !state.currentUser.isAdmin) {
        startAssignedInterview(s);
        return;
    }

    state.viewingStudent = s;
    const modal = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    
    document.getElementById('modal-title').textContent = s.name;
    
    if (isInterviewed) {
        content.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem;">
                <div class="stat-info">
                    <p class="label">Motivasi</p>
                    <p class="val">${s.motivation_level}</p>
                </div>
                <div class="stat-info">
                    <p class="label">Finansial</p>
                    <p class="val">${s.financial_profile}</p>
                </div>
                <div class="stat-info">
                    <p class="label">Minat Referral</p>
                    <p class="val">${s.referral_interest}</p>
                </div>
                <div class="stat-info">
                    <p class="label">Minat Akselerasi</p>
                    <p class="val">${s.acceleration_interest}</p>
                </div>
            </div>
            <h4>Catatan Interview:</h4>
            <ul style="list-style: none; margin-top: 1rem;">
                ${state.questions.map(q => `
                    <li style="margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <p style="color: var(--accent); font-weight: 600; font-size: 0.8rem;">${q.category} (Skor: ${s.answers[q.key]}/5)</p>
                        <p style="font-size: 0.9rem;">${s.notes[q.key] || 'Tidak ada catatan.'}</p>
                    </li>
                `).join('')}
            </ul>
        `;
        document.getElementById('download-pdf-btn').classList.remove('hidden');
        document.getElementById('download-pdf-btn').onclick = () => generatePDF(s);
    } else {
        content.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <i data-lucide="info" style="width: 48px; height: 48px; color: var(--accent); margin-bottom: 1rem;"></i>
                <p>Siswa ini belum diinterview.</p>
                ${state.currentUser.isAdmin ? '<p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.5rem;">Hanya interviewer yang ditugaskan yang dapat memulai interview.</p>' : ''}
            </div>
        `;
        document.getElementById('download-pdf-btn').classList.add('hidden');
    }

    modal.classList.remove('hidden');
    lucide.createIcons();
}

function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
}

// --- Analytics Logic ---
let charts = {};

function renderAnalytics() {
    if (state.students.length === 0) return;

    // Data Aggregation
    const accelData = { 'Ya': 0, 'Tertarik Nanti': 0, 'Tidak': 0 };
    const finData = { 'Sangat Mampu': 0, 'Mampu dengan Cicilan': 0, 'Perlu Perhatian Khusus': 0 };
    const refData = { 'Ya': 0, 'Mungkin': 0, 'Tidak': 0 };

    state.students.forEach(s => {
        accelData[s.acceleration_interest]++;
        finData[s.financial_profile]++;
        refData[s.referral_interest]++;
    });

    // Destroy existing charts if any
    Object.values(charts).forEach(c => c.destroy());

    // Acceleration Chart
    charts.accel = new Chart(document.getElementById('acceleration-chart'), {
        type: 'pie',
        data: {
            labels: Object.keys(accelData),
            datasets: [{
                data: Object.values(accelData),
                backgroundColor: ['#10B981', '#C9A84C', '#EF4444']
            }]
        },
        options: { plugins: { legend: { position: 'bottom', labels: { color: '#fff' } } } }
    });

    // Financial Chart
    // FIX: Ensure labels match what is saved in finishInterview ("Perlu Perhatian")
    const finLabels = ['Sangat Mampu', 'Mampu dengan Cicilan', 'Perlu Perhatian'];
    const finValues = finLabels.map(label => finData[label] || 0);

    charts.fin = new Chart(document.getElementById('financial-chart'), {
        type: 'bar',
        data: {
            labels: finLabels,
            datasets: [{
                label: 'Jumlah Siswa',
                data: finValues,
                backgroundColor: '#C9A84C'
            }]
        },
        options: { 
            scales: { 
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#fff', stepSize: 1 } },
                x: { ticks: { color: '#fff' } }
            },
            plugins: { legend: { display: false } }
        }
    });

    // Referral Chart
    charts.ref = new Chart(document.getElementById('referral-chart'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(refData),
            datasets: [{
                data: Object.values(refData),
                backgroundColor: ['#10B981', '#3b82f6', '#EF4444']
            }]
        },
        options: { plugins: { legend: { position: 'bottom', labels: { color: '#fff' } } } }
    });

    // Summary Text Generation
    const total = state.students.length;
    const accelRate = ((accelData['Ya'] / total) * 100).toFixed(1);
    const refRate = ((refData['Ya'] / total) * 100).toFixed(1);
    const potentialRevenue = accelData['Ya'] * 5000000; // Contoh asumsi Rp 5jt premium fee

    document.getElementById('strategic-summary').innerHTML = `
        <p>Dari total <strong>${total}</strong> siswa yang diinterview:</p>
        <ul style="margin-top: 1rem; list-style: none;">
            <li style="margin-bottom: 0.5rem;">🚀 <strong>${accelRate}%</strong> berminat kelas Akselerasi (Potensi pendapatan tambahan ± Rp ${potentialRevenue.toLocaleString('id-ID')}).</li>
            <li style="margin-bottom: 0.5rem;">📣 <strong>${refRate}%</strong> siap menjalankan program referral, menghemat biaya marketing organik.</li>
            <li>💰 <strong>${finData['Sangat Mampu'] || 0}</strong> siswa berada di profil finansial aman (Green Flag).</li>
        </ul>
    `;
}

// --- PDF & Export Logic ---
// Consolidated PDF Generation Function
async function generatePDF(studentIdOrObject) {
    let s;
    if (typeof studentIdOrObject === 'string') {
        s = state.students.find(x => x.id === studentIdOrObject);
    } else {
        s = studentIdOrObject;
    }

    if (!s) return alert('Data siswa tidak ditemukan.');

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Header design
    doc.setFillColor(10, 22, 40);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(201, 168, 76);
    doc.setFontSize(22);
    doc.text('Triesakti Institute of Airlines', 20, 25);
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text('PROFESSIONAL INTERVIEW SUMMARY REPORT', 20, 32);

    // Profile Section
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text("IDENTITAS SISWA", 20, 50);
    doc.setFont(undefined, 'normal');
    
    const profile = [
        ["Nama Lengkap", s.name],
        ["Program Studi", s.program || "-"],
        ["Interviewer", s.assigned_to || "-"],
        ["Tanggal Interview", s.date || "-"]
    ];

    let y = 60;
    profile.forEach(p => {
        doc.text(p[0], 20, y);
        doc.text(`: ${p[1]}`, 70, y);
        y += 8;
    });

    // Decision Section
    y += 5;
    const displayDecision = s.decision || s.answers?.calculated_decision || "UNDER REVIEW";
    doc.setFillColor(240, 240, 240);
    doc.rect(20, y, 170, 15, 'F');
    doc.setFont(undefined, 'bold');
    doc.text("REKOMENDASI KEPUTUSAN:", 25, y + 10);
    
    // Color code decision
    if (displayDecision.includes("Highly")) doc.setTextColor(16, 185, 129);
    else if (displayDecision.includes("Recommended")) doc.setTextColor(59, 130, 246);
    else if (displayDecision.includes("Conditional")) doc.setTextColor(245, 158, 11);
    else if (displayDecision.includes("Not")) doc.setTextColor(239, 68, 68);
    else doc.setTextColor(100, 100, 100);

    doc.text(displayDecision.toUpperCase(), 85, y + 10);
    doc.setTextColor(0, 0, 0);
    
    // Metrics Summary
    y += 25;
    doc.setFont(undefined, 'bold');
    doc.text("RINGKASAN METRIK", 20, y);
    doc.setFont(undefined, 'normal');
    y += 10;
    
    const metrics = [
        ["Kekuatan Motivasi", s.motivation_level || "-"],
        ["Profil Finansial", s.financial_profile || "-"],
        ["Minat Referral", s.referral_interest || "-"],
        ["Minat Akselerasi", s.acceleration_interest || "-"]
    ];

    metrics.forEach(m => {
        doc.text(m[0], 25, y);
        doc.text(`: ${m[1]}`, 75, y);
        y += 8;
    });

    // Detail Answers
    y += 10;
    doc.setFont(undefined, 'bold');
    doc.text("DETAIL HASIL INTERVIEW (14 ASPEK)", 20, y);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    y += 10;

    state.questions.forEach((q, i) => {
        if (y > 270) {
            doc.addPage();
            y = 20;
        }
        
        doc.setFont(undefined, 'bold');
        const catText = `${i+1}. [${q.category}] ${q.indicator}`;
        doc.text(catText, 20, y);
        y += 5;
        
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 100, 100);
        const score = s.answers && s.answers[q.key] ? s.answers[q.key] : 0;
        doc.text(`Skor: ${score}/5`, 20, y);
        
        y += 5;
        doc.setTextColor(0, 0, 0);
        const note = s.notes && s.notes[q.key] ? s.notes[q.key] : "-";
        const splitNote = doc.splitTextToSize(`Catatan: ${note}`, 160);
        doc.text(splitNote, 20, y);
        y += (splitNote.length * 5) + 5;
    });

    doc.save(`Triesakti_Report_${s.name.replace(/\s+/g, '_')}.pdf`);
}

function exportToCSV() {
    if (state.students.length === 0) return alert('Data kosong.');

    let csv = "Nama,Motivasi,Finansial,Referral,Akselerasi,Tanggal\n";
    state.students.forEach(s => {
        csv += `${s.name},${s.motivation_level},${s.financial_profile},${s.referral_interest},${s.acceleration_interest},${s.date}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'Triesakti_Interview_Data.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function viewInterviewResult(id) {
    const s = state.students.find(student => student.id === id);
    if (!s) return;

    const modal = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    const title = document.getElementById('modal-title');

    const displayDecision = s.decision || s.answers?.calculated_decision || 'Under Review';
    
    let html = `
        <div class="result-summary">
            <div style="margin-bottom: 1.5rem; padding: 1.25rem; background: rgba(255,255,255,0.05); border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
                <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.25rem;">Rekomendasi Keputusan:</div>
                <div style="font-size: 1.25rem; font-weight: bold; color: var(--accent);">${displayDecision}</div>
                <div style="margin-top: 0.75rem; font-size: 0.85rem; display: flex; gap: 1rem; opacity: 0.8;">
                    <span><i data-lucide="user"></i> ${s.assigned_to || '-'}</span>
                    <span><i data-lucide="calendar"></i> ${s.date || '-'}</span>
                </div>
            </div>

            <div class="notes-section">
                <h4 style="margin-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.5rem;">Detail Jawaban (14 Poin):</h4>
                <div style="display: flex; flex-direction: column; gap: 1rem; max-height: 400px; overflow-y: auto; padding-right: 0.5rem;">
                    ${state.questions.map(q => `
                        <div style="background: rgba(0,0,0,0.2); padding: 1rem; border-radius: 10px;">
                            <div style="font-size: 0.7rem; color: var(--accent); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.25rem;">${q.category}</div>
                            <div style="font-size: 0.85rem; color: white; margin-bottom: 0.5rem; line-height: 1.4;">${q.text}</div>
                            <div style="background: rgba(255,255,255,0.05); padding: 0.75rem; border-radius: 6px; font-size: 0.85rem; font-style: italic; color: var(--text-muted);">
                                "${s.notes && s.notes[q.key] ? s.notes[q.key] : '-'}"
                                <div style="margin-top: 0.5rem; font-weight: bold; font-style: normal; color: var(--accent);">Skor Indikator: ${s.answers && s.answers[q.key] ? s.answers[q.key] : 0}/5</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    content.innerHTML = html;
    modal.classList.remove('hidden');
    lucide.createIcons();

    // Setup PDF button for this specific student
    document.getElementById('download-pdf-btn').onclick = () => generatePDF(s);
}

// The old duplicate generatePDF function has been removed.

