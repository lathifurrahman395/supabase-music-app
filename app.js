const SUPABASE_URL = 'https://auojmfiogicbuxnxvdkd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1b2ptZmlvZ2ljYnV4bnh2ZGtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNDE0NTEsImV4cCI6MjA3NjcxNzQ1MX0.-tPrCmF9YTjF5_42dQq1I6F7Z7cF9b87BMv4f3LfCNA';

// INISIALISASI SUPABASE
let supabase;

if (window.supabase) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase berhasil diinisialisasi');
} else {
    console.error("❌ Supabase CDN gagal dimuat! Periksa koneksi atau firewall Anda.");
}

// Variabel global
let isLoginMode = true;
let activeSongItem = null;
window.currentUser = null;

// Cache untuk menghindari request berulang
const cache = {
    songs: null,
    songsTimestamp: null,
    CACHE_DURATION: 30000 // 30 detik
};

// Fungsi untuk membersihkan nama file
const cleanFileName = (name) => {
    return name
        .replace(/[^\w\d\.\-]/g, '-')
        .replace(/--+/g, '-')
        .toLowerCase();
};

// Fungsi untuk mendeteksi halaman dengan lebih akurat
function getCurrentPage() {
    const path = window.location.pathname;
    const filename = path.substring(path.lastIndexOf('/') + 1);
    
    if (!filename || filename === '' || filename === '/') {
        return 'index.html';
    }
    
    return filename;
}

const currentPage = getCurrentPage();
console.log('📄 Halaman saat ini:', currentPage);

// =======================================================
// === FUNGSI NAVIGASI & AUTH ===
// =======================================================

function redirectToDashboard() {
    console.log('🔄 Redirect ke Dashboard...');
    window.location.href = 'elsong.html';
}

function redirectToLogin() {
    console.log('🔄 Redirect ke Login...');
    window.location.href = 'index.html';
}

async function checkAuthAndRedirect() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('Error checking auth:', error);
            return;
        }
        
        const isLoginPage = currentPage === 'index.html' || currentPage === '';
        const isDashboardPage = currentPage === 'elsong.html';
        
        if (session && isLoginPage) {
            console.log('✅ Sudah login, redirect ke dashboard');
            redirectToDashboard();
        } else if (!session && isDashboardPage) {
            console.log('❌ Belum login, redirect ke login');
            redirectToLogin();
        }
    } catch (error) {
        console.error('Error in checkAuthAndRedirect:', error);
    }
}

// =======================================================
// === LOGIKA AUTENTIKASI (index.html) ===
// =======================================================
if (currentPage === 'index.html' || currentPage === '') {
    console.log('🔐 Inisialisasi halaman Login');
    
    document.addEventListener('DOMContentLoaded', () => {
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const submitBtn = document.getElementById('submit-button');
        const toggleFormBtn = document.getElementById('toggle-form-btn');
        const titleEl = document.getElementById('form-title');
        const statusEl = document.getElementById('auth-status');

        if (!emailInput || !passwordInput || !submitBtn) {
            console.error('❌ Elemen form tidak ditemukan!');
            return;
        }

        console.log('✅ Elemen form ditemukan');

        async function registerAkun(email, password) {
            console.log('📝 Mendaftar akun:', email);
            statusEl.textContent = 'Mendaftar...';
            statusEl.style.color = '#1ed760';

            try {
                const { data, error } = await supabase.auth.signUp({ 
                    email, 
                    password,
                    options: {
                        emailRedirectTo: window.location.origin + '/elsong.html'
                    }
                });

                if (error) {
                    console.error('Register error:', error);
                    statusEl.style.color = '#ff5555';
                    statusEl.textContent = 'Daftar Gagal: ' + error.message;
                } else {
                    console.log('✅ Pendaftaran berhasil');
                    statusEl.style.color = '#1ed760';
                    statusEl.textContent = 'Pendaftaran berhasil! Silakan cek email untuk verifikasi.';
                    
                    setTimeout(() => {
                        isLoginMode = true;
                        toggleForm();
                        statusEl.textContent = 'Silakan login setelah verifikasi email.';
                        statusEl.style.color = '#cccccc';
                    }, 3000);
                }
            } catch (err) {
                console.error('Register exception:', err);
                statusEl.style.color = '#ff5555';
                statusEl.textContent = 'Terjadi kesalahan: ' + err.message;
            }
        }

        async function loginAkun(email, password) {
            console.log('🔑 Login akun:', email);
            statusEl.textContent = 'Login...';
            statusEl.style.color = '#1ed760';

            try {
                const { data, error } = await supabase.auth.signInWithPassword({ 
                    email, 
                    password 
                });

                if (error) {
                    console.error('Login error:', error);
                    statusEl.style.color = '#ff5555';
                    statusEl.textContent = 'Login Gagal: ' + error.message;
                } else if (data.session) {
                    console.log('✅ Login berhasil');
                    statusEl.style.color = '#1ed760';
                    statusEl.textContent = 'Login Berhasil! Mengalihkan...';
                    
                    setTimeout(() => {
                        redirectToDashboard();
                    }, 500);
                }
            } catch (err) {
                console.error('Login exception:', err);
                statusEl.style.color = '#ff5555';
                statusEl.textContent = 'Terjadi kesalahan: ' + err.message;
            }
        }

        function toggleForm() {
            isLoginMode = !isLoginMode;

            if (isLoginMode) {
                titleEl.textContent = 'Masuk ke Akun Anda';
                submitBtn.textContent = 'LOGIN';
                toggleFormBtn.textContent = 'Belum punya akun? Daftar sekarang!';
            } else {
                titleEl.textContent = 'DAFTAR AKUN BARU';
                submitBtn.textContent = 'DAFTAR';
                toggleFormBtn.textContent = 'Sudah punya akun? Login di sini.';
            }
            statusEl.textContent = '';
            statusEl.style.color = '#ff5555';
            
            console.log('🔄 Mode form:', isLoginMode ? 'Login' : 'Register');
        }

        const handleAuth = (e) => {
            e.preventDefault();
            const email = emailInput.value.trim();
            const password = passwordInput.value;

            console.log('📋 Form submit:', { email, passwordLength: password.length });

            if (!email || !password) {
                statusEl.style.color = '#ff5555';
                statusEl.textContent = "Email dan Password wajib diisi.";
                return;
            }

            if (password.length < 6) {
                statusEl.style.color = '#ff5555';
                statusEl.textContent = "Password minimal 6 karakter.";
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
        
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleAuth(e);
            }
        });

        supabase.auth.onAuthStateChange((event, session) => {
            console.log('🔔 Auth state changed:', event);
            if (session?.user && event === 'SIGNED_IN') {
                console.log('✅ User signed in, redirecting...');
                setTimeout(() => {
                    redirectToDashboard();
                }, 500);
            }
        });

        checkAuthAndRedirect();
    });
}

// =======================================================
// === LOGIKA APLIKASI UTAMA (elsong.html) ===
// =======================================================
else if (currentPage === 'elsong.html') {
    console.log('🎵 Inisialisasi Dashboard');
    
    document.addEventListener('DOMContentLoaded', async () => {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
            console.log('❌ Tidak ada sesi, redirect ke login');
            redirectToLogin();
            return;
        }

        console.log('✅ Sesi valid, load dashboard');

        const logoutBtnSidebar = document.getElementById('logout-btn-sidebar');
        const userDisplay = document.getElementById('user-display');
        const songListElement = document.getElementById('song-list');
        const audioPlayer = document.getElementById('audio-player');
        const currentTitleElement = document.getElementById('current-title');
        const currentArtistElement = document.getElementById('current-artist');
        const playerImage = document.getElementById('player-image');
        const menuItems = document.querySelectorAll('.sidebar-nav a');

        const songTitleInput = document.getElementById('song-title-input');
        const songArtistInput = document.getElementById('song-artist-input');
        const songFileInput = document.getElementById('song-file-input');
        const coverImageInput = document.getElementById('cover-image-input');
        const uploadSongBtn = document.getElementById('upload-song-btn');
        const uploadStatus = document.getElementById('upload-status');

        if (!logoutBtnSidebar || !userDisplay || !songListElement) {
            console.error('❌ Elemen dashboard tidak ditemukan!');
            return;
        }

        console.log('✅ Elemen dashboard ditemukan');

        async function loadProfileData(user) {
            window.currentUser = user;
            console.log('👤 Loading profile:', user.email);

            userDisplay.textContent = user.email;

            const profileEmailFull = document.getElementById('profile-email-full');
            const profileId = document.getElementById('profile-id');
            const profileEmail = document.getElementById('profile-email');
            
            if (profileEmailFull) profileEmailFull.textContent = user.email;
            if (profileId) profileId.textContent = user.id;
            if (profileEmail) profileEmail.textContent = user.email;

            loadStatistics();
        }

        async function loadStatistics() {
            try {
                const { count, error } = await supabase
                    .from('songs')
                    .select('*', { count: 'exact', head: true });

                if (error) {
                    console.error('Error loading statistics:', error);
                    document.getElementById('total-songs').textContent = '0';
                } else {
                    document.getElementById('total-songs').textContent = count || 0;
                    console.log('📊 Total lagu:', count);
                }
            } catch (error) {
                console.error('Exception loading statistics:', error);
                document.getElementById('total-songs').textContent = '0';
            }
        }

        function switchContent(targetId) {
            console.log('🔄 Switch content to:', targetId);
            
            document.querySelectorAll('.content-section').forEach(section => {
                section.classList.remove('active');
                section.style.display = 'none';
            });

            const targetContent = document.getElementById(`content-${targetId}`);
            if (targetContent) {
                targetContent.classList.add('active');
                targetContent.style.display = 'block';
            }

            menuItems.forEach(item => {
                item.classList.remove('active');
            });
            const targetMenu = document.getElementById(`menu-${targetId}`);
            if (targetMenu) {
                targetMenu.classList.add('active');
            }

            if (targetId === 'daftar-lagu') {
                fetchSongs();
            } else if (targetId === 'beranda' && window.currentUser) {
                loadStatistics();
            }
        }

        loadProfileData(session.user);
        switchContent('beranda');

        document.getElementById('menu-beranda').addEventListener('click', (e) => {
            e.preventDefault();
            switchContent('beranda');
        });
        
        document.getElementById('menu-daftar-lagu').addEventListener('click', (e) => {
            e.preventDefault();
            switchContent('daftar-lagu');
        });
        
        document.getElementById('menu-unggah').addEventListener('click', (e) => {
            e.preventDefault();
            switchContent('unggah');
        });
        
        document.getElementById('menu-profil').addEventListener('click', (e) => {
            e.preventDefault();
            switchContent('profil');
        });

        logoutBtnSidebar.addEventListener('click', async () => {
            console.log('🚪 Logging out...');
            await supabase.auth.signOut();
            redirectToLogin();
        });

        // =======================================================
        // === FUNGSI MUSIK ===
        // =======================================================

        async function fetchSongs(forceRefresh = false) {
            const now = Date.now();

            if (!forceRefresh && cache.songs && cache.songsTimestamp && 
                (now - cache.songsTimestamp) < cache.CACHE_DURATION) {
                console.log('📦 Using cached songs');
                renderSongs(cache.songs);
                return;
            }

            console.log('🔄 Fetching songs from database...');

            try {
                const { data: songs, error } = await supabase
                    .from('songs')
                    .select('id, title, artist, storage_path, cover_path')
                    .order('title', { ascending: true });

                if (error) {
                    console.error('Error fetching songs:', error);
                    songListElement.innerHTML = `<li style="grid-column: 1 / -1; color: #ff5555; background: none; box-shadow: none;">Error: ${error.message}</li>`;
                    return;
                }

                cache.songs = songs || [];
                cache.songsTimestamp = now;

                console.log('✅ Loaded', songs?.length || 0, 'songs');
                renderSongs(cache.songs);
            } catch (error) {
                console.error('Exception fetching songs:', error);
                songListElement.innerHTML = `<li style="grid-column: 1 / -1; color: #ff5555; background: none; box-shadow: none;">Error memuat lagu</li>`;
            }
        }

        async function deleteSong(songId, filePath, coverPath) {
            if (!confirm("Anda yakin ingin menghapus lagu ini?")) {
                return;
            }

            console.log('🗑️ Deleting song:', songId);
            console.log('📁 File paths:', { filePath, coverPath });

            const userId = window.currentUser.id;
            let storageCleanupSuccess = true;

            try {
                const { error: dbDeleteError } = await supabase
                    .from('songs')
                    .delete()
                    .eq('id', songId)
                    .eq('user_id', userId);

                if (dbDeleteError) {
                    console.error("DB Delete Error:", dbDeleteError);
                    throw new Error("Gagal menghapus dari database: " + dbDeleteError.message);
                }

                console.log('✅ Deleted from database');

                const deletePromises = [
                    supabase.storage.from('music').remove([filePath])
                ];

                if (coverPath) {
                    deletePromises.push(supabase.storage.from('cover').remove([coverPath]));
                }

                const results = await Promise.allSettled(deletePromises);
                
                results.forEach((result, index) => {
                    if (result.status === 'rejected' || result.value?.error) {
                        console.warn(`Storage delete warning:`, result.value?.error || result.reason);
                        storageCleanupSuccess = false;
                    } else {
                        console.log(`✅ Deleted from storage:`, index === 0 ? 'music' : 'cover');
                    }
                });

                cache.songs = null;
                await fetchSongs(true);
                loadStatistics();

                console.log('✅ Song deleted successfully');
                alert(storageCleanupSuccess ? 
                    'Lagu berhasil dihapus!' : 
                    'Lagu dihapus dari database, tapi beberapa file mungkin masih ada di storage.');

            } catch (error) {
                console.error('Delete song error:', error);
                alert('Gagal menghapus lagu: ' + error.message);
            }
        }

        function renderSongs(songs) {
            songListElement.innerHTML = '';
            
            if (songs.length === 0) {
                songListElement.innerHTML = '<li style="grid-column: 1 / -1; color: #b3b3b3; background: none; box-shadow: none;">Tambahkan lagu pertama Anda melalui menu Unggah!</li>';
                return;
            }

            const fragment = document.createDocumentFragment();

            songs.forEach(song => {
                const li = document.createElement('li');
                li.className = 'song-item';
                li.dataset.songId = song.id;

                let coverUrl = 'https://placehold.co/60/121212/1DB954?text=♪';
                if (song.cover_path) {
                    const { data: coverData } = supabase.storage.from('cover').getPublicUrl(song.cover_path);
                    if (coverData?.publicUrl) {
                        coverUrl = coverData.publicUrl;
                    }
                }

                li.innerHTML = `
                    <div style="display: flex; align-items: center; flex-grow: 1;">
                        <img src="${coverUrl}" alt="Cover" loading="lazy">
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

                li.addEventListener('click', (e) => {
                    if (!e.target.closest('.delete-btn')) {
                        playSong(song.id, song.storage_path, song.title, song.artist, coverUrl);
                    }
                });

                const deleteBtn = li.querySelector('.delete-btn');
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteSong(
                        deleteBtn.dataset.songId,
                        deleteBtn.dataset.storagePath,
                        deleteBtn.dataset.coverPath
                    );
                });

                fragment.appendChild(li);
            });

            songListElement.appendChild(fragment);
        }

        async function playSong(songId, storagePath, title, artist, coverUrl) {
            console.log('▶️ Playing:', title);
            console.log('📁 Storage path:', storagePath);

            if (activeSongItem) {
                activeSongItem.classList.remove('active');
            }

            const currentSongItem = document.querySelector(`.song-item[data-song-id="${songId}"]`);
            if (currentSongItem) {
                currentSongItem.classList.add('active');
                activeSongItem = currentSongItem;
            }

            currentTitleElement.textContent = title;
            currentArtistElement.textContent = artist || "Artis tidak dikenal";
            playerImage.src = coverUrl;

            try {
                // Gunakan createSignedUrl untuk akses yang lebih aman
                const { data: signedUrlData, error: urlError } = await supabase.storage
                    .from('music')
                    .createSignedUrl(storagePath, 3600); // Valid 1 jam

                if (urlError) {
                    console.error('❌ Error creating signed URL:', urlError);
                    // Fallback ke public URL
                    const { data: publicUrlData } = supabase.storage.from('music').getPublicUrl(storagePath);
                    if (!publicUrlData?.publicUrl) {
                        throw new Error('Tidak dapat mengambil URL');
                    }
                    var audioUrl = publicUrlData.publicUrl;
                } else {
                    var audioUrl = signedUrlData.signedUrl;
                }

                console.log('🔗 Audio URL:', audioUrl);

                audioPlayer.pause();
                audioPlayer.currentTime = 0;
                audioPlayer.src = audioUrl;
                audioPlayer.load();
                
                const playPromise = audioPlayer.play();
                
                if (playPromise !== undefined) {
                    playPromise
                        .then(() => {
                            console.log('✅ Audio playing successfully');
                        })
                        .catch(err => {
                            console.error('❌ Play error:', err);
                            console.error('Error name:', err.name);
                            console.error('Error message:', err.message);
                            
                            if (err.name === 'NotSupportedError') {
                                currentTitleElement.textContent = '❌ Format audio tidak didukung';
                                alert('File audio tidak dapat diputar. Pastikan file adalah format MP3, WAV, atau OGG yang valid.\n\nCoba buka URL ini di tab baru untuk test:\n' + audioUrl);
                            } else if (err.name === 'NotAllowedError') {
                                currentTitleElement.textContent = '❌ Autoplay diblokir browser';
                                alert('Browser memblokir autoplay. Klik tombol play pada audio player.');
                            } else {
                                currentTitleElement.textContent = '❌ Gagal memutar: ' + title;
                                alert('Gagal memutar audio: ' + err.message + '\n\nTest URL:\n' + audioUrl);
                            }
                        });
                }

            } catch (error) {
                console.error('❌ Error getting audio URL:', error);
                currentTitleElement.textContent = `Gagal memuat: ${title}`;
                alert('Tidak dapat memuat file audio: ' + error.message);
            }
        }

        // =======================================================
        // === UPLOAD LAGU (DENGAN USER FOLDER) ===
        // =======================================================
        uploadSongBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            uploadStatus.textContent = '';

            const title = songTitleInput.value.trim();
            const artist = songArtistInput.value.trim();
            const songFile = songFileInput.files[0];
            const coverImageFile = coverImageInput.files[0];

            if (!title || !artist || !songFile) {
                uploadStatus.style.color = '#ff5555';
                uploadStatus.textContent = 'Judul, Artis, dan File Musik wajib diisi!';
                return;
            }

            uploadSongBtn.disabled = true;
            uploadStatus.style.color = '#1ed760';
            uploadStatus.textContent = 'Mengunggah file...';

            console.log('📤 Uploading song:', title);

            try {
                // PENTING: Upload ke folder user_id untuk privacy
                const userId = window.currentUser.id;
                const cleanedSongName = cleanFileName(songFile.name);
                const songFileName = `${userId}/${Date.now()}-${cleanedSongName}`;

                console.log('📁 Upload path:', songFileName);

                const uploadPromises = [
                    supabase.storage.from('music').upload(songFileName, songFile, {
                        cacheControl: '3600',
                        upsert: false
                    })
                ];

                if (coverImageFile) {
                    const cleanedCoverName = cleanFileName(coverImageFile.name);
                    const coverFileName = `${userId}/${Date.now()}-${cleanedCoverName}`;
                    uploadPromises.push(
                        supabase.storage.from('cover').upload(coverFileName, coverImageFile, {
                            cacheControl: '3600',
                            upsert: false
                        })
                    );
                }

                const results = await Promise.all(uploadPromises);
                
                if (results[0].error) throw results[0].error;

                const storage_path = results[0].data.path;
                const cover_path = results[1]?.data?.path || null;

                console.log('✅ Files uploaded:', { storage_path, cover_path });

                const { error: dbInsertError } = await supabase
                    .from('songs')
                    .insert([{
                        title,
                        artist,
                        storage_path,
                        cover_path,
                        user_id: userId
                    }]);

                if (dbInsertError) throw dbInsertError;

                uploadStatus.style.color = '#1ed760';
                uploadStatus.textContent = 'Lagu berhasil diunggah!';

                songTitleInput.value = '';
                songArtistInput.value = '';
                songFileInput.value = '';
                coverImageInput.value = '';

                cache.songs = null;
                loadStatistics();
                
                setTimeout(() => {
                    switchContent('daftar-lagu');
                }, 1000);

                console.log('✅ Upload successful');

            } catch (error) {
                uploadStatus.style.color = '#ff5555';
                uploadStatus.textContent = 'Gagal mengunggah: ' + error.message;
                console.error('Upload error:', error);
            } finally {
                uploadSongBtn.disabled = false;
            }
        });
    });
}