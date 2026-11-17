/* ========================================================
   SCRIPT.JS - PORTAL EDUSYNC SMPIT SABILUL HAQ
======================================================== */

// PERHATIAN: Masukkan Link Web App URL dari Google Apps Script Ustadzah di bawah ini!
const API_URL = "https://script.google.com/macros/s/AKfycbx-0mPTIgUOcIJockj26TN3M-490tvUkw0ELEjms0vRd0NqBMCxiY_yG3sE1EaKnvTz/exec";

// Variabel Global
let loggedInOrtu = JSON.parse(localStorage.getItem("loggedInOrtu"));
let loggedInGuru = JSON.parse(localStorage.getItem("loggedInGuru"));

// Inisialisasi saat halaman dimuat
document.addEventListener("DOMContentLoaded", () => {
  setupTabs();
  
  // Panggil setupFormSubmits hanya jika ada di halaman guru
  if (document.getElementById("formAkademik")) {
    setupFormSubmits(); 
  }

  // Cek apakah sedang di halaman Ortu
  if (document.getElementById("ortuDashboard")) {
    if (!loggedInOrtu) {
      window.location.href = "index.html"; 
    } else {
      document.getElementById("sapaanNamaSiswa").innerText = loggedInOrtu.Nama_Siswa;
      fetchDashboardOrtu();
      fetchPengumuman(); // <--- Memanggil Pengumuman untuk Ortu
    }
  }

  // Cek apakah sedang di halaman Guru
  if (document.getElementById("guruDashboard")) {
    if (!loggedInGuru) {
      window.location.href = "index.html";
    } else {
      document.getElementById("sapaanNamaGuru").innerText = loggedInGuru.Nama_Guru;
      fetchInitDataGuru();
      fetchPengumuman(); // <--- Memanggil Pengumuman untuk Guru
      
      const btnRiwayat = document.getElementById("btnTabRiwayat");
      if (btnRiwayat) {
        btnRiwayat.addEventListener("click", fetchRiwayatGuru);
      }
    }
  }
});

/* ==================== FUNGSI AUTH & LOGOUT ==================== */
function logout() {
  localStorage.removeItem("loggedInOrtu");
  localStorage.removeItem("loggedInGuru");
  window.location.href = "index.html";
}

/* ==================== FUNGSI LOGIN (HALAMAN AWAL) ==================== */
window.loginOrtu = async function() {
  const nisn = document.getElementById("ortuNisn").value; 
  const password = document.getElementById("ortuPassword").value; 

  if (!nisn || !password) {
    alert("NISN dan Password tidak boleh kosong!");
    return;
  }

  const btn = document.getElementById("btnLoginOrtu");
  const originalText = btn.innerText;
  btn.innerText = "Memverifikasi...";
  btn.disabled = true;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "loginOrtu", nisn: nisn, password: password })
    });
    const res = await response.json();
    if (res.status === "success") {
      localStorage.setItem("loggedInOrtu", JSON.stringify(res.data));
      window.location.href = "ortu.html"; 
    } else {
      alert(res.message);
    }
  } catch (err) {
    alert("Gagal terhubung ke server. Pastikan API_URL benar dan internet stabil.");
  } finally {
    btn.innerText = originalText;
    btn.disabled = false;
  }
};

window.loginGuru = async function() {
  const niy = document.getElementById("guruNiy").value; 
  const password = document.getElementById("guruPassword").value; 

  if (!niy || !password) {
    alert("NIY dan Password tidak boleh kosong!");
    return;
  }

  const btn = document.getElementById("btnLoginGuru");
  const originalText = btn.innerText;
  btn.innerText = "Memverifikasi...";
  btn.disabled = true;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "loginGuru", niy: niy, password: password })
    });
    const res = await response.json();
    if (res.status === "success") {
      localStorage.setItem("loggedInGuru", JSON.stringify(res.data));
      window.location.href = "guru.html"; 
    } else {
      alert(res.message);
    }
  } catch (err) {
    alert("Gagal terhubung ke server. Pastikan API_URL benar dan internet stabil.");
  } finally {
    btn.innerText = originalText;
    btn.disabled = false;
  }
};


/* ==================== FUNGSI DASBOR WALI MURID ==================== */
async function fetchDashboardOrtu() {
  const loading = document.getElementById("loadingOrtu");
  if(loading) loading.style.display = "block";

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "getDashboardOrtu", nisn: loggedInOrtu.NISN })
    });
    const res = await response.json();
    if (loading) loading.style.display = "none";

    if (res.status === "success") {
      renderDashboardOrtu(res);
    } else {
      alert("Gagal memuat data: " + res.message);
    }
  } catch (err) {
    if (loading) loading.style.display = "none";
    alert("Terjadi kesalahan jaringan.");
  }
}

function renderDashboardOrtu(data) {
  document.getElementById("profilNama").innerText = data.profil.Nama_Siswa || "-";
  document.getElementById("profilNisn").innerText = data.profil.NISN || "-";
  document.getElementById("profilKelas").innerText = data.profil.Kelas_Reguler || "-";
  document.getElementById("profilHalaqah").innerText = data.profil.Kelompok_Tahfizh || "-";
  const waliKelasEl = document.getElementById("profilWaliKelas");
  if (waliKelasEl) waliKelasEl.innerText = data.profil.Wali_Kelas || "-";

  const tbodyAkademik = document.getElementById("tbodyAkademik");
  if (tbodyAkademik) {
    tbodyAkademik.innerHTML = "";
    if (data.akademik.length === 0) {
      tbodyAkademik.innerHTML = "<tr><td colspan='6' style='text-align: center;'>Belum ada data.</td></tr>";
    } else {
      data.akademik.forEach(row => {
        tbodyAkademik.innerHTML += `<tr>
          <td>${row.Timestamp || "-"}</td>
          <td>${row.Mata_Pelajaran || "-"}</td>
          <td>${row.Materi || "-"}</td>
          <td>${row.Jenis_Penilaian || "-"}</td>
          <td><strong>${row.Nilai || "-"}</strong></td>
          <td>${row.Catatan_Guru || row.Nama_Guru || "-"}</td>
        </tr>`;
      });
    }
  }

  const tbodyTahfizh = document.getElementById("tbodyTahfizh");
  if (tbodyTahfizh) {
    tbodyTahfizh.innerHTML = "";
    if (data.tahfizh.length === 0) {
      tbodyTahfizh.innerHTML = "<tr><td colspan='4' style='text-align: center;'>Belum ada data.</td></tr>";
    } else {
      data.tahfizh.forEach(row => {
        tbodyTahfizh.innerHTML += `<tr>
          <td>${row.Timestamp || "-"}</td>
          <td>Pekan ${row.Pekan_Ke || "-"}</td>
          <td>${row.Capaian || "-"}</td>
          <td>${row.Catatan_Guru || "-"}</td>
        </tr>`;
      });
    }
  }

  const tbodyKehadiran = document.getElementById("tbodyKehadiran");
  if (tbodyKehadiran) {
    tbodyKehadiran.innerHTML = "";
    if (data.kehadiran.length === 0) {
      tbodyKehadiran.innerHTML = "<tr><td colspan='5' style='text-align: center;'>Belum ada data.</td></tr>";
    } else {
      data.kehadiran.forEach(row => {
        tbodyKehadiran.innerHTML += `<tr>
          <td>${row.Timestamp || "-"}</td>
          <td>Pekan ${row.Pekan_Ke || "-"}</td>
          <td style="color: red; font-weight: bold;">${row.Sakit || "0"}</td>
          <td style="color: orange; font-weight: bold;">${row.Izin || "0"}</td>
          <td style="color: darkred; font-weight: bold;">${row.Alpa || "0"}</td>
        </tr>`;
      });
    }
  }

  const tbodyAdab = document.getElementById("tbodyAdab");
  if (tbodyAdab) {
    tbodyAdab.innerHTML = "";
    if (data.adab.length === 0) {
      tbodyAdab.innerHTML = "<tr><td colspan='4' style='text-align: center;'>Belum ada data.</td></tr>";
    } else {
      data.adab.forEach(row => {
        tbodyAdab.innerHTML += `<tr>
          <td>${row.Tanggal || row.Timestamp || "-"}</td>
          <td>${row.Kategori || "-"}</td>
          <td>${row.Catatan_Perilaku || "-"}</td>
          <td>${row.Nama_Pelapor || "-"}</td>
        </tr>`;
      });
    }
  }
}

/* ==================== FUNGSI DASBOR GURU & INPUT ==================== */
async function fetchInitDataGuru() {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "getInitDataGuru", niy: loggedInGuru.NIY })
    });
    const res = await response.json();
    if (res.status === "success") {
      populateGuruDropdowns(res.penugasan, res.siswaList);
    }
  } catch (err) {
    console.error("Gagal memuat data awal guru:", err);
  }
}

function populateGuruDropdowns(penugasan, siswaList) {
  const selMapel = document.getElementById("akademikMapel");
  if (selMapel) {
    selMapel.innerHTML = '<option value="">-- Pilih Mata Pelajaran --</option>';
    penugasan.mapelUmum.forEach(p => {
      selMapel.innerHTML += `<option value="${p.mapel}">${p.mapel} (Kelas ${p.kelas})</option>`;
    });
  }

  const dropdownIds = ["akademikSiswa", "tahfizhSiswa", "kehadiranSiswa", "adabSiswa"];
  dropdownIds.forEach(id => {
    const sel = document.getElementById(id);
    if (sel) {
      sel.innerHTML = '<option value="">-- Pilih Siswa --</option>';
      siswaList.forEach(s => {
        sel.innerHTML += `<option value="${s.NISN}">${s.Nama_Siswa} (${s.Kelas_Reguler})</option>`;
      });
    }
  });
}

function setupFormSubmits() {
  const formAkademik = document.getElementById("formAkademik");
  if (formAkademik) {
    formAkademik.addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = {
        action: "inputAkademik",
        nisn: document.getElementById("akademikSiswa").value,
        mapel: document.getElementById("akademikMapel").value,
        materi: document.getElementById("akademikMateri").value,
        jenisPenilaian: document.getElementById("akademikJenis").value,
        nilai: document.getElementById("akademikNilai").value,
        semester: document.getElementById("akademikSemester").value,
        catatanGuru: document.getElementById("akademikCatatan").value,
        niyGuru: loggedInGuru.NIY
      };
      await sendDataForm(payload, "formAkademik");
    });
  }

  const formTahfizh = document.getElementById("formTahfizh");
  if (formTahfizh) {
    formTahfizh.addEventListener("submit", async (e) => {
      e.preventDefault();
      const selSiswa = document.getElementById("tahfizhSiswa");
      const payload = {
        action: "inputTahfizh",
        nisn: selSiswa.value,
        namaSiswa: selSiswa.options[selSiswa.selectedIndex].text.split(" (")[0],
        pekanKe: document.getElementById("tahfizhPekan").value,
        capaian: document.getElementById("tahfizhCapaian").value,
        catatanGuru: document.getElementById("tahfizhCatatan").value
      };
      await sendDataForm(payload, "formTahfizh");
    });
  }

  const formKehadiran = document.getElementById("formKehadiran");
  if (formKehadiran) {
    formKehadiran.addEventListener("submit", async (e) => {
      e.preventDefault();
      const selSiswa = document.getElementById("kehadiranSiswa");
      const payload = {
        action: "inputKehadiran",
        nisn: selSiswa.value,
        namaSiswa: selSiswa.options[selSiswa.selectedIndex].text.split(" (")[0],
        pekanKe: document.getElementById("kehadiranPekan").value,
        sakit: document.getElementById("kehadiranSakit").value,
        izin: document.getElementById("kehadiranIzin").value,
        alpa: document.getElementById("kehadiranAlpa").value
      };
      await sendDataForm(payload, "formKehadiran");
    });
  }

  const formAdab = document.getElementById("formAdab");
  if (formAdab) {
    formAdab.addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = {
        action: "inputAdab",
        tanggal: document.getElementById("adabTanggal").value,
        nisn: document.getElementById("adabSiswa").value,
        kategori: document.getElementById("adabKategori").value,
        catatanPerilaku: document.getElementById("adabCatatan").value,
        niyPelapor: loggedInGuru.NIY
      };
      await sendDataForm(payload, "formAdab");
    });
  }
}

async function sendDataForm(payload, formId) {
  const btn = document.querySelector(`#${formId} button[type="submit"]`);
  const originalText = btn.innerText;
  btn.innerText = "Meyimpan Data...";
  btn.disabled = true;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    const res = await response.json();
    alert(res.message);
    if (res.status === "success") {
      document.getElementById(formId).reset();
    }
  } catch (err) {
    alert("Terjadi kesalahan jaringan saat menyimpan data.");
  } finally {
    btn.innerText = originalText;
    btn.disabled = false;
  }
}

/* ==================== FUNGSI RIWAYAT GURU ==================== */
async function fetchRiwayatGuru() {
  document.getElementById("tabelRiwayatAkademikGuru").innerHTML = "<tr><td colspan='4' style='text-align:center;'>Memuat data...</td></tr>";
  document.getElementById("tabelRiwayatTahfizhGuru").innerHTML = "<tr><td colspan='4' style='text-align:center;'>Memuat data...</td></tr>";
  document.getElementById("tabelRiwayatAdabGuru").innerHTML = "<tr><td colspan='4' style='text-align:center;'>Memuat data...</td></tr>";

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "getRiwayatGuru", niy: loggedInGuru.NIY })
    });
    const res = await response.json();
    
    if (res.status === "success") {
      renderRiwayatGuru(res.riwayat);
    }
  } catch (err) {
    console.error("Gagal menarik riwayat:", err);
  }
}

function renderRiwayatGuru(riwayat) {
  const tabAkademik = document.getElementById("tabelRiwayatAkademikGuru");
  tabAkademik.innerHTML = "";
  if (!riwayat.akademik || riwayat.akademik.length === 0) {
    tabAkademik.innerHTML = "<tr><td colspan='4' style='text-align:center;'>Belum ada data.</td></tr>";
  } else {
    riwayat.akademik.forEach(row => {
      tabAkademik.innerHTML += `<tr>
        <td>${row.Timestamp || '-'}</td>
        <td><strong>${row.Nama_Siswa || row.NISN || '-'}</strong></td>
        <td>${row.Mata_Pelajaran || '-'}<br><small style="color:gray;">${row.Materi || '-'}</small></td>
        <td><strong>${row.Nilai || '-'}</strong></td>
      </tr>`;
    });
  }

  const tabTahfizh = document.getElementById("tabelRiwayatTahfizhGuru");
  tabTahfizh.innerHTML = "";
  if (!riwayat.tahfizh || riwayat.tahfizh.length === 0) {
    tabTahfizh.innerHTML = "<tr><td colspan='4' style='text-align:center;'>Belum ada data.</td></tr>";
  } else {
    riwayat.tahfizh.forEach(row => {
      tabTahfizh.innerHTML += `<tr>
        <td>${row.Timestamp || '-'}</td>
        <td><strong>${row.Nama_Siswa || row.NISN || '-'}</strong></td>
        <td>Pekan ${row.Pekan_Ke || '-'}<br><small style="color:gray;">${row.Capaian || '-'}</small></td>
        <td>${row.Catatan_Guru || '-'}</td>
      </tr>`;
    });
  }

  const tabAdab = document.getElementById("tabelRiwayatAdabGuru");
  tabAdab.innerHTML = "";
  if (!riwayat.adab || riwayat.adab.length === 0) {
    tabAdab.innerHTML = "<tr><td colspan='4' style='text-align:center;'>Belum ada data.</td></tr>";
  } else {
    riwayat.adab.forEach(row => {
      tabAdab.innerHTML += `<tr>
        <td>${row.Tanggal || row.Timestamp || '-'}</td>
        <td><strong>${row.Nama_Siswa || row.NISN || '-'}</strong></td>
        <td>${row.Kategori || '-'}<br><small style="color:gray;">${row.Catatan_Perilaku || '-'}</small></td>
        <td>-</td>
      </tr>`;
    });
  }
}

/* ==================== FUNGSI BANTUAN (TAB NAVIGASI) ==================== */
function setupTabs() {
  const tabBtns = document.querySelectorAll(".tab-btn");
  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const container = btn.closest(".container, .auth-wrapper") || document.body;
      container.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      container.querySelectorAll(".tab-pane").forEach(p => {
        p.style.display = "none";
        p.classList.add("hidden");
      });
      
      btn.classList.add("active");
      const targetId = btn.getAttribute("data-target");
      if (targetId) {
        const targetPane = document.getElementById(targetId);
        if (targetPane) {
          targetPane.style.display = "block";
          targetPane.classList.remove("hidden");
        }
      }
    });
  });
}

/* ==================== FUNGSI PENGUMUMAN ==================== */
async function fetchPengumuman() {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "getPengumuman" })
    });
    const res = await response.json();
    
    if (res.status === "success" && res.data.length > 0) {
      renderPengumuman(res.data);
    }
  } catch (err) {
    console.error("Gagal memuat pengumuman:", err);
  }
}

function renderPengumuman(dataPengumuman) {
  const board = document.getElementById("pengumumanBoard");
  const list = document.getElementById("listPengumuman");
  
  if (board && list) {
    list.innerHTML = "";
    dataPengumuman.forEach(item => {
      list.innerHTML += `<li style="margin-bottom: 8px;">
        <strong>${item.Tanggal || '-'}:</strong> ${item.Isi_Pengumuman || '-'}
      </li>`;
    });
    board.style.display = "block"; // Munculkan kotaknya jika ada isinya
  }
}