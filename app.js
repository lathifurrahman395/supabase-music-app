const SUPABASE_URL = 'https://auojmfiogicbuxnxvdkd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1b2ptZmlvZ2ljYnV4bnh2ZGtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNDE0NTEsImV4cCI6MjA3NjcxNzQ1MX0.-tPrCmF9YTjF5_42dQq1I6F7Z7cF9b87BMv4f3LfCNA';

// INISIALISASI SUPABASE (menggunakan sintaksis createClient() yang stabil untuk CDN)
// Deklarasikan variabel secara global (tanpa 'const')
let supabase; 

// Panggil fungsi createClient melalui objek global 'window.supabase'
// (Objek 'window.supabase' diekspos oleh CDN)
if (window.supabase) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
    // Jika window.supabase tidak ada, berarti CDN gagal dimuat.
    console.error("Supabase CDN gagal dimuat! Periksa koneksi atau firewall Anda.");
}

// Variabel global
let isLoginMode = true;
const currentPage = window.location.pathname;
let activeSongItem = null; 
window.currentUser = null; 

// Fungsi untuk membersihkan nama file dari karakter khusus
const cleanFileName = (name) => {
    return name
        .replace(/[^\w\d\.\-]/g, '-') 
        .replace(/--+/g, '-') // Membersihkan double hyphen
        .toLowerCase();
};

// =======================================================
// === FUNGSI NAVIGASI & AUTH ===
// =======================================================

function redirectToDashboard() {
    if (!currentPage.includes('index.html')) { window.location.href = 'index.html'; }
}

function redirectToLogin() {
    if (!currentPage.includes('login.html')) { window.location.href = 'login.html'; }
}

async function checkAuthAndRedirect() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) { redirectToDashboard(); } else { redirectToLogin(); }
}


// =======================================================
// === LOGIKA AUTENTIKASI (login.html) ===
// =======================================================
if (currentPage.includes('login.html')) {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const submitBtn = document.getElementById('submit-button');
    const toggleFormBtn = document.getElementById('toggle-form-btn');
    const titleEl = document.getElementById('form-title');
    const statusEl = document.getElementById('auth-status');

    async function registerAkun(email, password) {
        statusEl.textContent = 'Mendaftar...';
        statusEl.style.color = 'var(--color-primary)'; 

        const { error } = await supabase.auth.signUp({ email, password });

        if (error) {
            statusEl.style.color = 'var(--color-error)'; 
            statusEl.textContent = 'Daftar Gagal: ' + error.message;
        } else {
            statusEl.style.color = 'var(--color-primary)';
            statusEl.textContent = 'Pendaftaran berhasil! SILAKAN VERIFIKASI EMAIL ANDA. Anda akan dialihkan ke Login.';
            isLoginMode = false;
            setTimeout(() => {
                isLoginMode = false; 
                toggleForm();
                statusEl.textContent = 'Sekarang Anda bisa Login setelah verifikasi email.';
                statusEl.style.color = 'var(--color-link)';
            }, 5000); 
        }
    }

    async function loginAkun(email, password) {
        statusEl.textContent = 'Login...';
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            statusEl.textContent = 'Login Gagal: ' + error.message;
        } else if (data.session) {
            statusEl.style.color = 'var(--color-primary)';
            statusEl.textContent = 'Login Berhasil! Mengalihkan...';
            redirectToDashboard();
        }
    }

    function toggleForm() {
        isLoginMode = !isLoginMode;
        
        if (isLoginMode) {
            titleEl.textContent = 'MASUK KE EL-SONGS';
            submitBtn.textContent = 'LOGIN';
            toggleFormBtn.textContent = 'Belum punya akun? Daftar sekarang!';
        } else {
            titleEl.textContent = 'DAFTAR AKUN BARU';
            submitBtn.textContent = 'DAFTAR';
            toggleFormBtn.textContent = 'Sudah punya akun? Login di sini.';
        }
        statusEl.textContent = '';
        statusEl.style.color = 'var(--color-error)';
    }

    const handleAuth = (e) => {
        e.preventDefault(); 
        const email = emailInput.value;
        const password = passwordInput.value;
        
        if (!email || !password) {
            statusEl.textContent = "Email dan Password wajib diisi.";
            return;
        }

        if (isLoginMode) {
            loginAkun(email, password);
        } else {
            registerAkun(email, password);
        }
    };

    submitBtn.addEventListener('click', handleAuth);
    toggleFormBtn.addEventListener('click', toggleForm);
    
    supabase.auth.onAuthStateChange((event, session) => {
        if (session?.user) { redirectToDashboard(); }
    });
    
    checkAuthAndRedirect();
}

// =======================================================
// === LOGIKA APLIKASI UTAMA (index.html) ===
// =======================================================
else if (currentPage.includes('index.html')) {
    checkAuthAndRedirect();
    
    // Ambil elemen DOM Dashboard
    const logoutBtnSidebar = document.getElementById('logout-btn-sidebar');
    const userDisplay = document.getElementById('user-display');
    const songListElement = document.getElementById('song-list');
    const audioPlayer = document.getElementById('audio-player');
    const currentTitleElement = document.getElementById('current-title');
    const currentArtistElement = document.getElementById('current-artist');
    const playerImage = document.getElementById('player-image');
    const menuItems = document.querySelectorAll('.sidebar-nav a');

    // Elemen Form Tambah Lagu
    const songTitleInput = document.getElementById('song-title-input');
    const songArtistInput = document.getElementById('song-artist-input');
    const songFileInput = document.getElementById('song-file-input');
    const coverImageInput = document.getElementById('cover-image-input');
    const uploadSongBtn = document.getElementById('upload-song-btn');
    const uploadStatus = document.getElementById('upload-status');
    
    // --- FUNGSI LOAD DATA PROFIL & NAVIGASI ---

    async function loadProfileData(user) {
        window.currentUser = user; 
        
        // Tampilkan di Sidebar
        userDisplay.textContent = user.email;

        // Tampilkan di Konten Profil
        document.getElementById('profile-email-full').textContent = user.email;
        document.getElementById('profile-id').textContent = user.id;
        document.getElementById('profile-email').textContent = user.email; // Di Beranda

        // Statistik (Total Lagu)
        const { count } = await supabase
            .from('songs')
            .select('*', { count: 'exact', head: true });

        document.getElementById('total-songs').textContent = count;
    }
    
    function switchContent(targetId) {
        // 1. Sembunyikan/Tampilkan Konten
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
            section.style.display = 'none'; 
        });

        const targetContent = document.getElementById(`content-${targetId}`);
        if (targetContent) {
            targetContent.classList.add('active');
            targetContent.style.display = 'block';
        }

        // 2. Atur status 'active' pada menu
        menuItems.forEach(item => {
            item.classList.remove('active');
        });
        const targetMenu = document.getElementById(`menu-${targetId}`);
        if (targetMenu) {
            targetMenu.classList.add('active');
        }
        
        // 3. Muat data spesifik
        if (targetId === 'daftar-lagu') {
            fetchSongs(); // Muat lagu hanya saat tab Daftar Lagu aktif
        } else if (targetId === 'beranda' && window.currentUser) {
             loadProfileData(window.currentUser); // Refresh statistik
        }
    }

    // --- SETUP AWAL DASHBOARD ---
    
    supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
            loadProfileData(user); 
            switchContent('beranda'); // Tampilkan Beranda sebagai default
        }
    });

    // --- EVENT LISTENERS NAVIGASI ---
    document.getElementById('menu-beranda').addEventListener('click', (e) => { e.preventDefault(); switchContent('beranda'); });
    document.getElementById('menu-daftar-lagu').addEventListener('click', (e) => { e.preventDefault(); switchContent('daftar-lagu'); });
    document.getElementById('menu-unggah').addEventListener('click', (e) => { e.preventDefault(); switchContent('unggah'); });
    document.getElementById('menu-profil').addEventListener('click', (e) => { e.preventDefault(); switchContent('profil'); });

    // Logout
    logoutBtnSidebar.addEventListener('click', async () => {
        await supabase.auth.signOut();
        redirectToLogin();
    });

    // =======================================================
    // === FUNGSI MUSIK (FETCH, RENDER, PLAY, DELETE) ===
    // =======================================================
    
    async function fetchSongs() {
        // PENTING: Tambahkan 'await' untuk memastikan data terbaru diambil
        const { data: songs, error } = await supabase
            .from('songs')
            .select('id, title, artist, storage_path, cover_path') 
            .order('title', { ascending: true });

        if (error) {
            console.error('Error saat mengambil lagu:', error.message);
            songListElement.innerHTML = `<li style="grid-column: 1 / -1; color: var(--color-error); background: none; box-shadow: none;">Error: ${error.message}. Pastikan RLS tabel 'songs' mengizinkan authenticated user.</li>`;
            return;
        }

        renderSongs(songs || []); 
    }
    
    async function deleteSong(songId, filePath, coverPath) {
        if (!confirm("Anda yakin ingin menghapus lagu ini?")) { return; }

        const userId = window.currentUser.id;
        let storageCleanupSuccess = true;

        try {
            // 1. Hapus Entry dari Database DULU (Kritis)
            const { error: dbDeleteError } = await supabase.from('songs').delete().eq('id', songId).eq('user_id', userId); 

            // **PENTING:** Jika penghapusan DB gagal, segera tampilkan error.
            if (dbDeleteError) {
                console.error("DB Delete Error:", dbDeleteError.message);
                throw new Error("Gagal menghapus entry database. Cek RLS DELETE."); 
            }
            
            // 2. Coba Hapus File Musik dari Storage
            const { error: musicRemoveError } = await supabase.storage.from('music').remove([filePath]);
            if (musicRemoveError) {
                console.warn('Gagal menghapus file musik dari storage:', musicRemoveError.message);
                storageCleanupSuccess = false;
            }
            
            // 3. Coba Hapus File Sampul dari Storage (jika ada)
            if (coverPath) {
                const { error: coverRemoveError } = await supabase.storage.from('cover').remove([coverPath]); 
                if (coverRemoveError) {
                    console.warn('Gagal menghapus file cover dari storage:', coverRemoveError.message);
                    storageCleanupSuccess = false;
                }
            }

            // Finalisasi
            await fetchSongs(); // Panggil dengan AWAIT untuk mendapatkan data terbaru
            loadProfileData(window.currentUser); 
            
            if (storageCleanupSuccess) {
                alert('Lagu berhasil dihapus secara permanen!');
            } else {
                alert('Lagu berhasil dihapus dari Database, tetapi file Storage mungkin gagal dihapus. Cek konsol.');
            }

        } catch (error) {
            console.error('Gagal menghapus lagu:', error.message);
            alert('Gagal menghapus lagu dari Database! Policy RLS DELETE di tabel songs mungkin bermasalah (auth.uid() = user_id).');
        }
    }

    function renderSongs(songs) { 
        songListElement.innerHTML = ''; 
        if (songs.length === 0) {
            songListElement.innerHTML = '<li style="grid-column: 1 / -1; color: var(--color-link); background: none; box-shadow: none;">Tambahkan lagu pertama Anda melalui menu Unggah!</li>';
            return;
        }
        songs.forEach(song => {
            const li = document.createElement('li');
            li.className = 'song-item';
            li.dataset.songId = song.id; 
            
            let coverUrl = 'https://placehold.co/60/121212/1DB954?text=♪'; 
            if (song.cover_path) {
                 const { data: coverData } = supabase.storage.from('cover').getPublicUrl(song.cover_path); 
                 if (coverData && coverData.publicUrl) { coverUrl = coverData.publicUrl; }
            }

            li.innerHTML = `
                <div style="display: flex; align-items: center; flex-grow: 1;">
                    <img src="${coverUrl}" alt="Cover Lagu">
                    <div class="song-info">
                        <div class="song-title">${song.title}</div>
                        <div class="song-artist">${song.artist}</div>
                    </div>
                </div>
                <div class="song-actions">
                    <button class="delete-btn" data-song-id="${song.id}" 
                        data-storage-path="${song.storage_path}"
                        data-cover-path="${song.cover_path || ''}">
                        <i class="fas fa-trash-alt" style="pointer-events: none;"></i>
                    </button>
                </div>
            `;
            
            // 1. Event listener untuk memutar lagu
            li.addEventListener('click', (e) => {
                // Pastikan klik TIDAK berasal dari tombol hapus atau ikon di dalamnya
                if (!e.target.closest('.delete-btn')) { 
                     playSong(song.id, song.storage_path, song.title, song.artist, coverUrl);
                }
            });
            
            // 2. Event listener untuk tombol hapus
            const deleteBtn = li.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // HENTIKAN event bubbling ke LI
                deleteSong(
                    deleteBtn.dataset.songId,
                    deleteBtn.dataset.storagePath,
                    deleteBtn.dataset.coverPath
                );
            });

            songListElement.appendChild(li);
        });
    }
    
    async function playSong(songId, storagePath, title, artist, coverUrl) { 
        if (activeSongItem) { activeSongItem.classList.remove('active'); }

        const currentSongItem = document.querySelector(`.song-item[data-song-id="${songId}"]`);
        if (currentSongItem) {
            currentSongItem.classList.add('active');
            activeSongItem = currentSongItem;
        }

        const { data: publicUrlData } = supabase.storage.from('music').getPublicUrl(storagePath); 

        if (publicUrlData && publicUrlData.publicUrl) {
            audioPlayer.src = publicUrlData.publicUrl;
            audioPlayer.play();
            
            // Update Player Bar
            currentTitleElement.textContent = title;
            currentArtistElement.textContent = artist || "Artis tidak dikenal";
            playerImage.src = coverUrl;
        } else {
            console.error('Gagal mendapatkan URL publik untuk file musik.');
            currentTitleElement.textContent = `Gagal memuat: ${title}`;
        }
    }

    // --- FUNGSI UNTUK UNGGAH LAGU ---
    uploadSongBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        uploadStatus.textContent = ''; 
        uploadStatus.style.color = 'var(--color-link)';

        const title = songTitleInput.value.trim();
        const artist = songArtistInput.value.trim();
        const songFile = songFileInput.files[0];
        const coverImageFile = coverImageInput.files[0];

        if (!title || !artist || !songFile) {
            uploadStatus.style.color = 'var(--color-logout)';
            uploadStatus.textContent = 'Judul, Artis, dan File Musik wajib diisi!';
            return;
        }

        uploadSongBtn.disabled = true;
        uploadStatus.textContent = 'Mengunggah file... Ini mungkin memakan waktu.';

        try {
            const cleanedSongName = cleanFileName(songFile.name); 
            const songFileName = `${Date.now()}-${cleanedSongName}`;
            
            const { data: songUploadData, error: songUploadError } = await supabase.storage
                .from('music') 
                .upload(songFileName, songFile, { cacheControl: '3600', upsert: false });

            if (songUploadError) throw songUploadError;
            const storage_path = songUploadData.path; 

            let cover_path = null;
            if (coverImageFile) {
                const cleanedCoverName = cleanFileName(coverImageFile.name); 
                const coverFileName = `${Date.now()}-${cleanedCoverName}`;
                
                const { data: coverUploadData } = await supabase.storage
                    .from('cover') // Menggunakan 'cover'
                    .upload(coverFileName, coverImageFile, { cacheControl: '3600', upsert: false });
                cover_path = coverUploadData?.path;
            }

            const { error: dbInsertError } = await supabase
                .from('songs')
                .insert([{ title, artist, storage_path, cover_path, user_id: window.currentUser.id }]);

            if (dbInsertError) throw dbInsertError;

            uploadStatus.style.color = 'var(--color-primary)';
            uploadStatus.textContent = 'Lagu berhasil diunggah dan ditambahkan!';

            songTitleInput.value = songArtistInput.value = songFileInput.value = coverImageInput.value = '';
            
            loadProfileData(window.currentUser); 
            switchContent('daftar-lagu'); 
            

        } catch (error) {
            uploadStatus.style.color = 'var(--color-logout)';
            uploadStatus.textContent = 'Gagal mengunggah lagu: ' + error.message;
            console.error('Error saat unggah lagu:', error);
        } finally {
            uploadSongBtn.disabled = false;
        }
    });
}
