// GANTI URL DI BAWAH INI DENGAN URL DEPLOYMENT GOOGLE APPS SCRIPT ANDA
const API_URL = "https://script.google.com/macros/s/AKfycbx-0mPTIgUOcIJockj26TN3M-490tvUkw0ELEjms0vRd0NqBMCxiY_yG3sE1EaKnvTz/exec";

/**
 * Helper Fetch POST ke Google Apps Script
 * Menggunakan text/plain agar tidak terkena blokir CORS Preflight (OPTIONS)
 */
async function postAPI(payload) {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    });
    return await response.json();
  } catch (error) {
    console.error("API Error:", error);
    return { status: "error", message: "Gagal terhubung ke server. Pastikan API_URL sudah benar dan koneksi internet stabil." };
  }
}

function logout() {
  sessionStorage.clear();
  window.location.href = "index.html";
}

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

/* ============================================================================
 * 1. LOGIKA HALAMAN LOGIN & RESET PASSWORD (index.html)
 * ============================================================================ */
function initLoginPage() {
  const tabOrtu = document.getElementById("tabBtnOrtu");
  const tabGuru = document.getElementById("tabBtnGuru");
  const formOrtu = document.getElementById("formLoginOrtu");
  const formGuru = document.getElementById("formLoginGuru");
  const boxReset = document.getElementById("boxResetPassword");
  const boxLogin = document.getElementById("boxLoginMain");

  if (!formOrtu) return;

  // Switch Tab Login Ortu vs Guru
  tabOrtu.addEventListener("click", () => {
    tabOrtu.classList.add("active");
    tabGuru.classList.remove("active");
    formOrtu.classList.remove("hidden");
    formGuru.classList.add("hidden");
  });

  tabGuru.addEventListener("click", () => {
    tabGuru.classList.add("active");
    tabOrtu.classList.remove("active");
    formGuru.classList.remove("hidden");
    formOrtu.classList.add("hidden");
  });

  // Submit Login Ortu
  formOrtu.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = formOrtu.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = "Memverifikasi...";

    const nisn = document.getElementById("ortuNisn").value.trim();
    const password = document.getElementById("ortuPassword").value;

    const res = await postAPI({ action: "loginOrtu", nisn, password });
    btn.disabled = false;
    btn.textContent = "Masuk sebagai Orang Tua";

    if (res.status === "success") {
      sessionStorage.setItem("role", "ortu");
      sessionStorage.setItem("ortuData", JSON.stringify(res.data));

      if (res.isDefaultPassword) {
        // Redirect ke form Ubah Password jika masih password default
        sessionStorage.setItem("tempOldPass", password);
        boxLogin.classList.add("hidden");
        boxReset.classList.remove("hidden");
      } else {
        window.location.href = "ortu.html";
      }
    } else {
      alert(res.message);
    }
  });

  // Submit Form Reset Password Ortu
  const formReset = document.getElementById("formResetPassword");
  formReset.addEventListener("submit", async (e) => {
    e.preventDefault();
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (newPassword !== confirmPassword) {
      return alert("Konfirmasi password baru tidak cocok!");
    }

    const ortuData = JSON.parse(sessionStorage.getItem("ortuData") || "{}");
    const oldPassword = sessionStorage.getItem("tempOldPass");

    const btn = formReset.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = "Menyimpan Password Baru...";

    const res = await postAPI({
      action: "changePasswordOrtu",
      nisn: ortuData.NISN,
      oldPassword,
      newPassword
    });

    btn.disabled = false;
    btn.textContent = "Simpan & Lanjutkan ke Dasbor";

    if (res.status === "success") {
      sessionStorage.removeItem("tempOldPass");
      alert(res.message);
      window.location.href = "ortu.html";
    } else {
      alert(res.message);
    }
  });

  // Submit Login Guru
  formGuru.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = formGuru.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = "Memverifikasi...";

    const niy = document.getElementById("guruNiy").value.trim();
    const password = document.getElementById("guruPassword").value;

    const res = await postAPI({ action: "loginGuru", niy, password });
    btn.disabled = false;
    btn.textContent = "Masuk sebagai Guru";

    if (res.status === "success") {
      sessionStorage.setItem("role", "guru");
      sessionStorage.setItem("guruData", JSON.stringify(res.data));
      window.location.href = "guru.html";
    } else {
      alert(res.message);
    }
  });
}

/* ============================================================================
 * 2. LOGIKA DASBOR ORANG TUA (ortu.html)
 * ============================================================================ */
async function initOrtuPage() {
  const ortuContainer = document.getElementById("ortuDashboard");
  if (!ortuContainer) return;

  const ortuData = JSON.parse(sessionStorage.getItem("ortuData") || "null");
  if (!ortuData || sessionStorage.getItem("role") !== "ortu") {
    window.location.href = "index.html";
    return;
  }

  muatPengumuman();

  // Render informasi awal (SAPAAN ORTU DITAMBAHKAN DI SINI)
  document.getElementById("sapaanNamaSiswa").textContent = ortuData.Nama_Siswa;
  document.getElementById("profilNama").textContent = ortuData.Nama_Siswa;
  document.getElementById("profilNisn").textContent = ortuData.NISN;
  document.getElementById("profilKelas").textContent = ortuData.Kelas_Reguler;
  document.getElementById("profilHalaqah").textContent = ortuData.Kelompok_Tahfizh;

  // Setup Tab Navigasi Riwayat
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabPanes = document.querySelectorAll(".tab-pane");
  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      tabBtns.forEach(b => b.classList.remove("active"));
      tabPanes.forEach(p => p.classList.add("hidden"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.target).classList.remove("hidden");
    });
  });

  // Ambil seluruh riwayat transaksional dari Spreadsheet
  const res = await postAPI({ action: "getDashboardOrtu", nisn: ortuData.NISN });
  document.getElementById("loadingOrtu").classList.add("hidden");

  if (res.status !== "success") {
    alert(res.message);
    return;
  }

  // Render Tabel Akademik
  const tbodyAkademik = document.getElementById("tbodyAkademik");
  tbodyAkademik.innerHTML = res.akademik.length
    ? res.akademik.map(r => `
      <tr>
        <td>${r.Timestamp}</td>
        <td><strong>${r.Mata_Pelajaran}</strong></td>
        <td>${r.Jenis_Penilaian}</td>
        <td><span class="badge badge-success">${r.Nilai}</span></td>
        <td>${r.Semester}</td>
        <td>${r.Nama_Guru}</td>
      </tr>`).join("")
    : `<tr><td colspan="6" style="text-align:center;">Belum ada riwayat nilai akademik.</td></tr>`;

  // Render Tabel Tahfizh (beserta Catatan Guru)
  const tbodyTahfizh = document.getElementById("tbodyTahfizh");
  tbodyTahfizh.innerHTML = res.tahfizh.length
    ? res.tahfizh.map(r => `
      <tr>
        <td>${r.Tanggal}</td>
        <td>${r.Jenis_Setoran}</td>
        <td><strong>${r.Surah}</strong> : ${r.Ayat}</td>
        <td><span class="badge badge-warning">${r.Predikat}</span></td>
        <td>${r.Catatan_Guru || "-"}</td>
        <td>${r.Nama_Guru}</td>
      </tr>`).join("")
    : `<tr><td colspan="6" style="text-align:center;">Belum ada riwayat setoran Tahfizh.</td></tr>`;

  // Render Tabel Kehadiran
  const tbodyKehadiran = document.getElementById("tbodyKehadiran");
  tbodyKehadiran.innerHTML = res.kehadiran.length
    ? res.kehadiran.map(r => `
      <tr>
        <td>${r.Tanggal}</td>
        <td><span class="badge ${r.Status === 'Hadir' ? 'badge-success' : 'badge-danger'}">${r.Status}</span></td>
        <td>${r.Keterangan || "-"}</td>
      </tr>`).join("")
    : `<tr><td colspan="3" style="text-align:center;">Belum ada riwayat presensi kehadiran.</td></tr>`;

  // Render Tabel Adab
  const tbodyAdab = document.getElementById("tbodyAdab");
  tbodyAdab.innerHTML = res.adab.length
    ? res.adab.map(r => `
      <tr>
        <td>${r.Tanggal}</td>
        <td><strong>${r.Kategori}</strong></td>
        <td>${r.Catatan_Perilaku}</td>
        <td>${r.Nama_Pelapor}</td>
      </tr>`).join("")
    : `<tr><td colspan="4" style="text-align:center;">Belum ada catatan adab & perilaku.</td></tr>`;
}

/* ============================================================================
 * 3. LOGIKA DASBOR GURU & SMART FORM (guru.html)
 * ============================================================================ */
let GLOBAL_PENUGASAN = { mapelUmum: [], kelompokTahfizh: [] };
let GLOBAL_SISWA = [];

async function initGuruPage() {
  const guruContainer = document.getElementById("guruDashboard");
  if (!guruContainer) return;

  const guruData = JSON.parse(sessionStorage.getItem("guruData") || "null");
  if (!guruData || sessionStorage.getItem("role") !== "guru") {
    window.location.href = "index.html";
    return;
  }

  muatPengumuman(); 

  // SAPAAN GURU DIAKTIFKAN DI SINI (tanda // sudah dihapus)
  document.getElementById("namaGuruHeader").textContent = `${guruData.Nama_Guru} (NIY: ${guruData.NIY})`;

  // Set default tanggal hari ini di semua form tanggal
  document.querySelectorAll("input[type=date]").forEach(el => el.value = getTodayDate());

  // Ambil Hak Akses Penugasan & Data Siswa
  const res = await postAPI({ action: "getInitDataGuru", niy: guruData.NIY });
  document.getElementById("loadingGuru").classList.add("hidden");

  if (res.status !== "success") {
    alert(res.message);
    return;
  }

  GLOBAL_PENUGASAN = res.penugasan;
  GLOBAL_SISWA = res.siswaList;

  setupSmartFormMapel(guruData.NIY);
  setupSmartFormTahfizh(guruData.NIY);
  setupFormKehadiranDanAdab(guruData.NIY);
  setupGuruTabs();
}

function setupGuruTabs() {
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabPanes = document.querySelectorAll(".tab-pane");

  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      tabBtns.forEach(b => b.classList.remove("active"));
      tabPanes.forEach(p => p.classList.add("hidden"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.target).classList.remove("hidden");
    });
  });
}

/**
 * Filter Siswa Dinamis berdasarkan Kelas_Reguler atau Kelompok_Tahfizh
 */
function populateDropdownSiswa(selectElement, filterType, filterValue) {
  selectElement.innerHTML = `<option value="">-- Pilih Siswa --</option>`;
  if (!filterValue) return;

  const filtered = GLOBAL_SISWA.filter(s => {
    if (filterType === "REGULER") {
      return String(s.Kelas_Reguler).trim() === String(filterValue).trim();
    } else if (filterType === "TAHFIZH") {
      return String(s.Kelompok_Tahfizh).trim() === String(filterValue).trim();
    }
    return false;
  });

  filtered.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s.NISN;
    opt.textContent = `${s.Nama_Siswa} (${s.NISN})`;
    selectElement.appendChild(opt);
  });
}

/**
 * Setup Form Mapel Umum (Dinamis sesuai Penugasan)
 */
function setupSmartFormMapel(niyGuru) {
  const selectMapel = document.getElementById("selectMapelUmum");
  const selectKelas = document.getElementById("selectKelasReguler");
  const selectSiswa = document.getElementById("selectSiswaMapel");
  const formMapel = document.getElementById("formInputAkademik");
  const infoNoMapel = document.getElementById("infoNoMapel");

  if (GLOBAL_PENUGASAN.mapelUmum.length === 0) {
    formMapel.classList.add("hidden");
    infoNoMapel.classList.remove("hidden");
    return;
  }

  // Ambil daftar mata pelajaran unik yang diampu guru ini
  const uniqueMapel = [...new Set(GLOBAL_PENUGASAN.mapelUmum.map(m => m.mapel))];
  selectMapel.innerHTML = `<option value="">-- Pilih Mata Pelajaran --</option>`;
  uniqueMapel.forEach(m => {
    selectMapel.innerHTML += `<option value="${m}">${m}</option>`;
  });

  // Saat Mapel dipilih -> filter Kelas Reguler yang diajar untuk mapel tersebut
  selectMapel.addEventListener("change", () => {
    const chosenMapel = selectMapel.value;
    selectKelas.innerHTML = `<option value="">-- Pilih Kelas Reguler --</option>`;
    selectSiswa.innerHTML = `<option value="">-- Pilih Kelas Terlebih Dahulu --</option>`;

    const kelasList = GLOBAL_PENUGASAN.mapelUmum
      .filter(p => p.mapel === chosenMapel)
      .map(p => p.kelas);

    [...new Set(kelasList)].forEach(kls => {
      selectKelas.innerHTML += `<option value="${kls}">${kls}</option>`;
    });
  });

  // Saat Kelas dipilih -> filter Siswa berdasarkan Kelas_Reguler di Data_Ortu
  selectKelas.addEventListener("change", () => {
    populateDropdownSiswa(selectSiswa, "REGULER", selectKelas.value);
  });

  // Submit Nilai Akademik
  formMapel.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = formMapel.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = "Menyimpan...";

    const res = await postAPI({
      action: "inputAkademik",
      nisn: selectSiswa.value,
      mapel: selectMapel.value,
      jenisPenilaian: document.getElementById("jenisPenilaian").value,
      nilai: document.getElementById("nilaiAkademik").value,
      semester: document.getElementById("semesterAkademik").value,
      niyGuru: niyGuru
    });

    btn.disabled = false;
    btn.textContent = "Simpan Nilai Akademik";
    alert(res.message);
    if (res.status === "success") {
      document.getElementById("nilaiAkademik").value = "";
    }
  });
}

/**
 * Setup Form Tahfizh (Hanya aktif jika guru memiliki penugasan Tahfizh)
 */
function setupSmartFormTahfizh(niyGuru) {
  const selectHalaqah = document.getElementById("selectKelompokTahfizh");
  const selectSiswa = document.getElementById("selectSiswaTahfizh");
  const formTahfizh = document.getElementById("formInputTahfizh");
  const infoNoTahfizh = document.getElementById("infoNoTahfizh");

  if (GLOBAL_PENUGASAN.kelompokTahfizh.length === 0) {
    formTahfizh.classList.add("hidden");
    infoNoTahfizh.classList.remove("hidden");
    return;
  }

  selectHalaqah.innerHTML = `<option value="">-- Pilih Kelompok Halaqah --</option>`;
  GLOBAL_PENUGASAN.kelompokTahfizh.forEach(hlq => {
    selectHalaqah.innerHTML += `<option value="${hlq}">${hlq}</option>`;
  });

  // Saat Kelompok Halaqah dipilih -> filter Siswa berdasarkan Kelompok_Tahfizh di Data_Ortu
  selectHalaqah.addEventListener("change", () => {
    populateDropdownSiswa(selectSiswa, "TAHFIZH", selectHalaqah.value);
  });

  // Submit Setoran Tahfizh
  formTahfizh.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = formTahfizh.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = "Menyimpan...";

    const res = await postAPI({
      action: "inputTahfizh",
      tanggal: document.getElementById("tanggalTahfizh").value,
      nisn: selectSiswa.value,
      jenisSetoran: document.getElementById("jenisSetoran").value,
      surah: document.getElementById("surahTahfizh").value,
      ayat: document.getElementById("ayatTahfizh").value,
      predikat: document.getElementById("predikatTahfizh").value,
      catatanGuru: document.getElementById("catatanGuruTahfizh").value.trim(),
      niyGuru: niyGuru
    });

    btn.disabled = false;
    btn.textContent = "Simpan Setoran Tahfizh";
    alert(res.message);
    if (res.status === "success") {
      document.getElementById("surahTahfizh").value = "";
      document.getElementById("ayatTahfizh").value = "";
      document.getElementById("catatanGuruTahfizh").value = "";
    }
  });
}

/**
 * Setup Form Kehadiran & Adab (Filter Kelas Reguler -> Siswa)
 */
function setupFormKehadiranDanAdab(niyGuru) {
  const allKelasReguler = [...new Set(GLOBAL_SISWA.map(s => s.Kelas_Reguler))].sort();

  const selectKelasHadir = document.getElementById("selectKelasHadir");
  const selectSiswaHadir = document.getElementById("selectSiswaHadir");
  const selectKelasAdab = document.getElementById("selectKelasAdab");
  const selectSiswaAdab = document.getElementById("selectSiswaAdab");

  allKelasReguler.forEach(kls => {
    selectKelasHadir.innerHTML += `<option value="${kls}">${kls}</option>`;
    selectKelasAdab.innerHTML += `<option value="${kls}">${kls}</option>`;
  });

  selectKelasHadir.addEventListener("change", () => {
    populateDropdownSiswa(selectSiswaHadir, "REGULER", selectKelasHadir.value);
  });

  selectKelasAdab.addEventListener("change", () => {
    populateDropdownSiswa(selectSiswaAdab, "REGULER", selectKelasAdab.value);
  });

  // Submit Kehadiran
  const formHadir = document.getElementById("formInputKehadiran");
  formHadir.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = formHadir.querySelector("button[type=submit]");
    btn.disabled = true;

    const res = await postAPI({
      action: "inputKehadiran",
      tanggal: document.getElementById("tanggalHadir").value,
      nisn: selectSiswaHadir.value,
      statusHadir: document.getElementById("statusHadir").value,
      keterangan: document.getElementById("keteranganHadir").value.trim()
    });

    btn.disabled = false;
    alert(res.message);
    if (res.status === "success") document.getElementById("keteranganHadir").value = "";
  });

  // Submit Adab
  const formAdab = document.getElementById("formInputAdab");
  formAdab.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = formAdab.querySelector("button[type=submit]");
    btn.disabled = true;

    const res = await postAPI({
      action: "inputAdab",
      tanggal: document.getElementById("tanggalAdab").value,
      nisn: selectSiswaAdab.value,
      kategori: document.getElementById("kategoriAdab").value,
      catatanPerilaku: document.getElementById("catatanAdab").value.trim(),
      niyPelapor: niyGuru
    });

    btn.disabled = false;
    alert(res.message);
    if (res.status === "success") document.getElementById("catatanAdab").value = "";
  });
}

// Auto-init sesuai halaman yang sedang dibuka
document.addEventListener("DOMContentLoaded", () => {
  initLoginPage();
  initOrtuPage();
  initGuruPage();
});

async function ubahPasswordGuru(btn) {
  const oldPassword = document.getElementById("oldPassGuru").value;
  const newPassword = document.getElementById("newPassGuru").value;
  const guruData = JSON.parse(sessionStorage.getItem("guruData"));

  if (!oldPassword || !newPassword) {
    alert("Harap isi password lama dan password baru.");
    return;
  }

  // Ubah teks tombol saat memproses
  const originalText = btn.textContent;
  btn.textContent = "Menyimpan...";
  btn.disabled = true;

  try {
    const res = await postAPI({
      action: "changePasswordGuru",
      niy: guruData.NIY,
      oldPassword: oldPassword,
      newPassword: newPassword
    });

    if (res.status === "success") {
      alert("Password berhasil diubah!");
      // Tutup form dan bersihkan isian
      document.getElementById('formGantiPassGuru').style.display = 'none';
      document.getElementById("oldPassGuru").value = "";
      document.getElementById("newPassGuru").value = "";
    } else {
      alert("Gagal: " + res.message);
    }
  } catch (err) {
    alert("Terjadi kesalahan jaringan.");
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

async function muatPengumuman() {
  try {
    const res = await postAPI({ action: "getPengumuman" });
    if (res.status === "success" && res.data.length > 0) {
      document.getElementById("pengumumanBoard").style.display = "block";
      const list = document.getElementById("listPengumuman");
      list.innerHTML = ""; // Bersihkan list
      
      res.data.forEach(item => {
        list.innerHTML += `<li style="margin-bottom: 8px;"><strong>${item.Tanggal}</strong> - ${item.Isi_Pengumuman}</li>`;
      });
    }
  } catch (err) {
    console.error("Gagal memuat pengumuman:", err);
  }
}