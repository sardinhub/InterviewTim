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
        {
            category: "Minat & Motivasi",
            text: "Apa yang membuat Anda sangat yakin bahwa industri penerbangan adalah masa depan Anda, dan mengapa Triesakti Institute menjadi pilihan utama?",
            indicator: "Kejelasan visi karir dan tingkat loyalitas terhadap brand lembaga.",
            key: "motivation"
        },
        {
            category: "Kapasitas Finansial",
            text: "Untuk mendukung kenyamanan studi Anda, sejauh mana kesiapan orang tua dalam komitmen pembiayaan bulanan? Apakah ada skema khusus yang Anda butuhkan?",
            indicator: "Kepastian arus kas (cash flow) bagi lembaga dan pemetaan risiko tunggakan.",
            key: "financial"
        },
        {
            category: "Program Referral (Trip Jogja)",
            text: "Jika Anda bisa membawa sahabat Anda sukses bersama di sini dan mendapatkan bonus Trip ke Jogja, seberapa tertarik Anda untuk menjadi duta (referral) kami?",
            indicator: "Potensi pertumbuhan leads organik dari internal siswa.",
            key: "referral"
        },
        {
            category: "Upgrade Kelas Akselerasi",
            text: "Kami memiliki kelas Akselerasi dengan manfaat prioritas OJT. Jika Anda diberikan kesempatan untuk lulus lebih cepat dan bekerja lebih awal, apakah Anda siap mengambil tantangan ini?",
            indicator: "Kesiapan siswa untuk membayar premium fee demi nilai tambah karir.",
            key: "acceleration"
        },
        {
            category: "Hal Pendukung Lainnya",
            text: "Sebutkan satu bakat unik atau hobi yang Anda miliki yang bisa dikembangkan melalui kegiatan ekstrakurikuler di kampus kita?",
            indicator: "Pemetaan bakat untuk branding (prestasi non-akademik).",
            key: "talent"
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
    // 1. Fetch Interviewers
    const { data: intData, error: intErr } = await supabaseClient.from('interviewers').select('*');
    if (!intErr) state.interviewers = intData;

    // 2. Fetch Students
    const { data: stuData, error: stuErr } = await supabaseClient.from('students').select('*');
    if (!stuErr) state.students = stuData;
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
    const loginBtn = document.getElementById('execute-login-btn');

    // Handle role change
    roleSelect.addEventListener('change', (e) => {
        if (e.target.value === 'interviewer') {
            interviewerGroup.classList.remove('hidden');
            renderLoginInterviewerList();
        } else {
            interviewerGroup.classList.add('hidden');
        }
    });

    // Execute Login
    loginBtn.addEventListener('click', () => {
        const role = roleSelect.value;
        let user;

        if (role === 'admin') {
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
    select.innerHTML = '<option value="">Pilih Nama...</option>';
    
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
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${int.name}</strong></td>
            <td>${int.role}</td>
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

    const filtered = state.students.filter(s => 
        s.name.toLowerCase().includes(filter.toLowerCase()) || 
        (s.program && s.program.toLowerCase().includes(filter.toLowerCase()))
    );

    filtered.forEach(s => {
        const row = document.createElement('tr');
        const isInterviewed = s.status === 'completed';
        
        row.innerHTML = `
            <td><input type="checkbox" class="student-checkbox" data-id="${s.id}" onchange="updateSelectionUI()"></td>
            <td><strong>${s.name}</strong></td>
            <td><span style="font-size: 0.8rem; opacity: 0.8;">${s.program || '-'}</span></td>
            <td>${s.assigned_to || '<span class="text-muted">Belum ditugaskan</span>'}</td>
            <td><span class="badge ${isInterviewed ? 'badge-green' : (s.assigned_to ? 'badge-yellow' : 'badge-red')}">
                ${isInterviewed ? 'Selesai' : (s.assigned_to ? 'Ditugaskan' : 'Draft')}</span>
            </td>
            <td>
                <button class="btn btn-ghost btn-sm" onclick="deleteStudent('${s.id}')"><i data-lucide="trash-2"></i></button>
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
                newStudents.push({
                    name: name,
                    program: program,
                    status: 'unassigned'
                });
            }
        });

        const { data, error } = await supabaseClient.from('students').insert(newStudents).select();

        if (error) return alert('Gagal mengimpor ke database cloud.');

        state.students = [...state.students, ...data];
        renderMasterStudentList();
        updateDashboardStats();
        alert(`Berhasil mengimpor ${data.length} siswa baru ke Cloud.`);
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
    alert(`Berhasil menugaskan ${selectedIds.length} siswa ke ${interviewerName} di Cloud.`);
}

async function deleteStudent(id) {
    if (!confirm('Hapus data siswa ini secara permanen?')) return;

    const { error } = await supabaseClient.from('students').delete().eq('id', id);
    if (error) return alert('Gagal menghapus dari database cloud.');

    state.students = state.students.filter(s => s.id !== id);
    
    if (state.currentView === 'admin') renderMasterStudentList();
    if (state.currentView === 'database') renderStudentList();
    updateDashboardStats();
}

async function resetStudentDatabase() {
    if (!confirm('PERINGATAN: Semua data siswa akan dihapus secara permanen dari Cloud. Yakin?')) return;

    const { error } = await supabaseClient.from('students').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    if (error) return alert('Gagal membersihkan database.');

    state.students = [];
    renderMasterStudentList();
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
    
    const updates = {
        motivation_level: answers.motivation >= 4 ? "Tinggi" : (answers.motivation >= 3 ? "Sedang" : "Rendah"),
        financial_profile: answers.financial >= 4 ? "Sangat Mampu" : (answers.financial >= 3 ? "Mampu dengan Cicilan" : "Perlu Perhatian Khusus"),
        referral_interest: answers.referral >= 4 ? "Ya" : (answers.referral >= 3 ? "Mungkin" : "Tidak"),
        acceleration_interest: answers.acceleration >= 4 ? "Ya" : (answers.acceleration >= 3 ? "Tertarik Nanti" : "Tidak"),
        answers: answers,
        notes: state.currentInterview.notes,
        status: 'completed'
    };

    const { error } = await supabaseClient.from('students').update(updates).eq('id', state.currentInterview.id);

    if (error) return alert('Gagal menyimpan hasil interview ke Cloud.');

    // Update local state
    const index = state.students.findIndex(s => s.id === state.currentInterview.id);
    if (index !== -1) {
        state.students[index] = { ...state.students[index], ...updates };
    }

    alert('Data Interview berhasil disimpan ke Database Online!');
    renderInterviewStudentSelect(); 
    document.getElementById('setup-step').classList.remove('hidden');
    document.getElementById('question-step').classList.add('hidden');
    updateDashboardStats();
    window.location.hash = 'database';
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
        const isInterviewed = s.answers && Object.keys(s.answers).length > 0;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${s.name}</strong></td>
            <td>${s.motivation_level || '-'}</td>
            <td><span class="badge ${getFinancialBadge(s.financial_profile)}">${s.financial_profile || 'Belum'}</span></td>
            <td>${s.referral_interest || '-'}</td>
            <td><span class="badge badge-blue">${s.acceleration_interest || '-'}</span></td>
            <td>
                <button class="btn btn-ghost btn-sm" onclick="viewStudentDetail(${s.id})">
                    <i data-lucide="${isInterviewed ? 'eye' : 'play-circle'}"></i>
                </button>
            </td>
        `;
        list.appendChild(row);
    });
    lucide.createIcons();
}

function getFinancialBadge(profile) {
    if (profile === 'Sangat Mampu') return 'badge-green';
    if (profile === 'Mampu dengan Cicilan') return 'badge-yellow';
    return 'badge-red';
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
    charts.fin = new Chart(document.getElementById('financial-chart'), {
        type: 'bar',
        data: {
            labels: Object.keys(finData),
            datasets: [{
                label: 'Jumlah Siswa',
                data: Object.values(finData),
                backgroundColor: '#C9A84C'
            }]
        },
        options: { 
            scales: { 
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#fff' } },
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
            <li>💰 <strong>${finData['Sangat Mampu']}</strong> siswa berada di profil finansial aman (Green Flag).</li>
        </ul>
    `;
}

// --- PDF & Export Logic ---
function generatePDF(s) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Design
    doc.setFillColor(10, 22, 40);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(201, 168, 76);
    doc.setFontSize(18);
    doc.text('Triesakti Institute of Airlines', 20, 25);
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text('RESUME HASIL INTERVIEW SISWA', 20, 32);

    // Content
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`Nama Siswa: ${s.name}`, 20, 55);
    doc.setFont(undefined, 'normal');
    doc.text(`Tanggal: ${new Date(s.date).toLocaleDateString('id-ID')}`, 140, 55);

    doc.line(20, 60, 190, 60);

    let y = 75;
    const metrics = [
        ["Kekuatan Motivasi", s.motivation_level],
        ["Profil Finansial", s.financial_profile],
        ["Minat Referral", s.referral_interest],
        ["Minat Akselerasi", s.acceleration_interest]
    ];

    metrics.forEach(m => {
        doc.setFont(undefined, 'bold');
        doc.text(m[0], 20, y);
        doc.setFont(undefined, 'normal');
        doc.text(`: ${m[1]}`, 70, y);
        y += 10;
    });

    y += 10;
    doc.setFont(undefined, 'bold');
    doc.text("Catatan Khusus (Bakat/Karakter):", 20, y);
    y += 10;
    doc.setFont(undefined, 'normal');
    
    state.questions.forEach(q => {
        const note = s.notes[q.key] || "-";
        const splitNote = doc.splitTextToSize(`${q.category}: ${note}`, 170);
        doc.text(splitNote, 20, y);
        y += (splitNote.length * 7);
    });

    doc.save(`Interview_${s.name}.pdf`);
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
