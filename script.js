/* ========================================================
   SCRIPT.JS - PORTAL EDUSYNC SMPIT SABILUL HAQ
======================================================== */
const API_URL = "https://script.google.com/macros/s/AKfycbx-0mPTIgUOcIJockj26TN3M-490tvUkw0ELEjms0vRd0NqBMCxiY_yG3sE1EaKnvTz/exec";

let loggedInOrtu = JSON.parse(localStorage.getItem("loggedInOrtu"));
let loggedInGuru = JSON.parse(localStorage.getItem("loggedInGuru"));
window.dataSiswaGlobal = []; 

document.addEventListener("DOMContentLoaded", () => {
  setupTabs();
  
  if (document.getElementById("formAkademik")) {
    setupFormSubmits(); 
  }

  if (document.getElementById("ortuDashboard")) {
    if (!loggedInOrtu) {
      window.location.href = "index.html"; 
    } else {
      document.getElementById("sapaanNamaSiswa").innerText = loggedInOrtu.Nama_Siswa;
      fetchDashboardOrtu();
      fetchPengumuman();
    }
  }

  if (document.getElementById("guruDashboard")) {
    if (!loggedInGuru) {
      window.location.href = "index.html";
    } else {
      document.getElementById("sapaanNamaGuru").innerText = loggedInGuru.Nama_Guru;
      fetchInitDataGuru();
      fetchPengumuman();
      setupFilterSiswa(); 
      
      const btnRiwayat = document.getElementById("btnTabRiwayat");
      if (btnRiwayat) {
        btnRiwayat.addEventListener("click", fetchRiwayatGuru);
      }
    }
  }
});

function logout() {
  localStorage.removeItem("loggedInOrtu");
  localStorage.removeItem("loggedInGuru");
  window.location.href = "index.html";
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
      const board = document.getElementById("pengumumanBoard");
      const list = document.getElementById("listPengumuman");
      if (board && list) {
        list.innerHTML = "";
        res.data.forEach(item => {
          list.innerHTML += `<li style="margin-bottom: 8px;"><strong>${item.Tanggal || '-'}:</strong> ${item.Isi_Pengumuman || '-'}</li>`;
        });
        board.style.display = "block"; 
      }
    }
  } catch (err) {}
}

/* ==================== FUNGSI LOGIN ==================== */
window.loginOrtu = async function() {
  const nisn = document.getElementById("ortuNisn").value; 
  const password = document.getElementById("ortuPassword").value; 
  if (!nisn || !password) { alert("NISN dan Password tidak boleh kosong!"); return; }

  const btn = document.getElementById("btnLoginOrtu");
  const originalText = btn.innerText;
  btn.innerText = "Memverifikasi..."; btn.disabled = true;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "loginOrtu", nisn: nisn, password: password })
    });
    const res = await response.json();
    if (res.status === "success") {
      localStorage.setItem("loggedInOrtu", JSON.stringify(res.data));
      window.location.href = "ortu.html"; 
    } else { alert(res.message); }
  } catch (err) { alert("Gagal terhubung ke server."); } 
  finally { btn.innerText = originalText; btn.disabled = false; }
};

window.loginGuru = async function() {
  const niy = document.getElementById("guruNiy").value; 
  const password = document.getElementById("guruPassword").value; 
  if (!niy || !password) { alert("NIY dan Password tidak boleh kosong!"); return; }

  const btn = document.getElementById("btnLoginGuru");
  const originalText = btn.innerText;
  btn.innerText = "Memverifikasi..."; btn.disabled = true;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "loginGuru", niy: niy, password: password })
    });
    const res = await response.json();
    if (res.status === "success") {
      localStorage.setItem("loggedInGuru", JSON.stringify(res.data));
      window.location.href = "guru.html"; 
    } else { alert(res.message); }
  } catch (err) { alert("Gagal terhubung ke server."); } 
  finally { btn.innerText = originalText; btn.disabled = false; }
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
    if (res.status === "success") { renderDashboardOrtu(res); } 
    else { alert("Gagal memuat data: " + res.message); }
  } catch (err) {
    if (loading) loading.style.display = "none";
  }
}

function renderDashboardOrtu(data) {
  document.getElementById("profilNama").innerText = data.profil.Nama_Siswa || "-";
  document.getElementById("profilNisn").innerText = data.profil.NISN || "-";
  document.getElementById("profilKelas").innerText = data.profil.Kelas_Reguler || "-";
  document.getElementById("profilHalaqah").innerText = data.profil.Kelompok_Tahfizh || "-";
  if (document.getElementById("profilWaliKelas")) document.getElementById("profilWaliKelas").innerText = data.profil.Wali_Kelas || "-";

  const tbodyAkademik = document.getElementById("tbodyAkademik");
  if (tbodyAkademik) {
    tbodyAkademik.innerHTML = data.akademik.length === 0 ? "<tr><td colspan='6' style='text-align: center;'>Belum ada data.</td></tr>" : "";
    data.akademik.forEach(row => {
      tbodyAkademik.innerHTML += `<tr><td>${row.Timestamp || "-"}</td><td>${row.Mata_Pelajaran || "-"}</td><td>${row.Materi || "-"}</td><td>${row.Jenis_Penilaian || "-"}</td><td><strong>${row.Nilai || "-"}</strong></td><td>${row.Catatan_Guru || row.Nama_Guru || "-"}</td></tr>`;
    });
  }

  const tbodyTahfizh = document.getElementById("tbodyTahfizh");
  if (tbodyTahfizh) {
    tbodyTahfizh.innerHTML = data.tahfizh.length === 0 ? "<tr><td colspan='4' style='text-align: center;'>Belum ada data.</td></tr>" : "";
    data.tahfizh.forEach(row => {
      tbodyTahfizh.innerHTML += `<tr><td>${row.Timestamp || "-"}</td><td>Pekan ${row.Pekan_Ke || "-"}</td><td>${row.Capaian || "-"}</td><td>${row.Catatan_Guru || "-"}</td></tr>`;
    });
  }

  const tbodyKehadiran = document.getElementById("tbodyKehadiran");
  if (tbodyKehadiran) {
    tbodyKehadiran.innerHTML = data.kehadiran.length === 0 ? "<tr><td colspan='5' style='text-align: center;'>Belum ada data.</td></tr>" : "";
    data.kehadiran.forEach(row => {
      tbodyKehadiran.innerHTML += `<tr><td>${row.Timestamp || "-"}</td><td>Pekan ${row.Pekan_Ke || "-"}</td><td style="color: red;">${row.Sakit || "0"}</td><td style="color: orange;">${row.Izin || "0"}</td><td style="color: darkred;">${row.Alpa || "0"}</td></tr>`;
    });
  }

  const tbodyAdab = document.getElementById("tbodyAdab");
  if (tbodyAdab) {
    tbodyAdab.innerHTML = data.adab.length === 0 ? "<tr><td colspan='4' style='text-align: center;'>Belum ada data.</td></tr>" : "";
    data.adab.forEach(row => {
      tbodyAdab.innerHTML += `<tr><td>${row.Tanggal || row.Timestamp || "-"}</td><td>${row.Kategori || "-"}</td><td>${row.Catatan_Perilaku || "-"}</td><td>${row.Nama_Pelapor || "-"}</td></tr>`;
    });
  }
}

/* ==================== FUNGSI DASBOR GURU & FILTER ==================== */
async function fetchInitDataGuru() {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "getInitDataGuru", niy: loggedInGuru.NIY })
    });
    const res = await response.json();
    if (res.status === "success") {
      window.dataSiswaGlobal = res.siswaList; 
      populateGuruDropdowns(res.penugasan);
    }
  } catch (err) {
    console.error("Gagal memuat data awal guru:", err);
  }
}

function populateGuruDropdowns(penugasan) {
  // 1. Mapel
  const selMapel = document.getElementById("akademikMapel");
  if (selMapel) {
    selMapel.innerHTML = '<option value="">-- Pilih Mata Pelajaran --</option>';
    penugasan.mapelUmum.forEach(p => {
      selMapel.innerHTML += `<option value="${p.mapel}">${p.mapel} (Kelas ${p.kelas})</option>`;
    });
  }

  // 2. Kumpulkan HANYA Kelas/Halaqah yang diampu guru yang login
  const kelasDiampu = [...new Set(penugasan.mapelUmum.map(p => p.kelas))].filter(Boolean).sort();
  const halaqahDiampu = penugasan.kelompokTahfizh || [];
  
  // 3. Kelas Global (Khusus form Adab)
  const semuaKelas = [...new Set(window.dataSiswaGlobal.map(s => s.Kelas_Reguler))].filter(Boolean).sort();

  // 4. Kunci Akademik & Kehadiran (Hanya kelas yang diampu)
  ["akademikKelas", "kehadiranKelas"].forEach(id => {
    const sel = document.getElementById(id);
    if (sel) {
      if (kelasDiampu.length === 0) {
        sel.innerHTML = '<option value="">-- Tidak ada jam mengajar --</option>';
        sel.disabled = true;
      } else {
        sel.innerHTML = '<option value="">-- Pilih Kelas --</option>';
        kelasDiampu.forEach(k => sel.innerHTML += `<option value="${k}">${k}</option>`);
        sel.disabled = false;
      }
    }
  });

  // 5. Bebaskan Adab (Semua kelas tampil)
  const selAdab = document.getElementById("adabKelas");
  if (selAdab) {
    selAdab.innerHTML = '<option value="">-- Pilih Kelas --</option>';
    semuaKelas.forEach(k => selAdab.innerHTML += `<option value="${k}">${k}</option>`);
  }

  // 6. Kunci Form Tahfizh (Kunci dropdown dan matikan tombol simpannya)
  const selTahfizh = document.getElementById("tahfizhKelas");
  const btnSubmitTahfizh = document.querySelector("#formTahfizh button[type='submit']");
  
  if (selTahfizh) {
    if (halaqahDiampu.length === 0) {
      selTahfizh.innerHTML = '<option value="">-- Anda tidak mengampu Tahfizh --</option>';
      selTahfizh.disabled = true;
      if (btnSubmitTahfizh) btnSubmitTahfizh.disabled = true; 
    } else {
      selTahfizh.innerHTML = '<option value="">-- Pilih Kelompok --</option>';
      halaqahDiampu.forEach(h => selTahfizh.innerHTML += `<option value="${h}">${h}</option>`);
      selTahfizh.disabled = false;
      if (btnSubmitTahfizh) btnSubmitTahfizh.disabled = false;
    }
  }

  // 7. Kosongkan kotak siswa di awal
  ["akademikSiswa", "tahfizhSiswa", "kehadiranSiswa", "adabSiswa"].forEach(id => {
    const sel = document.getElementById(id);
    if (sel) sel.innerHTML = '<option value="">-- Pilih Kelas Terlebih Dahulu --</option>';
  });
}

function setupFilterSiswa() {
  const applyFilter = (kelasId, siswaId, isTahfizh) => {
    const selKelas = document.getElementById(kelasId);
    const selSiswa = document.getElementById(siswaId);
    
    if (selKelas && selSiswa) {
      selKelas.addEventListener("change", () => {
        const val = selKelas.value;
        selSiswa.innerHTML = '<option value="">-- Pilih Siswa --</option>';
        if (!val) {
          selSiswa.innerHTML = '<option value="">-- Pilih Kelas Terlebih Dahulu --</option>';
          return;
        }

        const filtered = window.dataSiswaGlobal.filter(s => 
          isTahfizh ? s.Kelompok_Tahfizh === val : s.Kelas_Reguler === val
        );

        filtered.forEach(s => {
          selSiswa.innerHTML += `<option value="${s.NISN}">${s.Nama_Siswa}</option>`;
        });
      });
    }
  };

  applyFilter("akademikKelas", "akademikSiswa", false);
  applyFilter("kehadiranKelas", "kehadiranSiswa", false);
  applyFilter("adabKelas", "adabSiswa", false);
  applyFilter("tahfizhKelas", "tahfizhSiswa", true);
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
        namaSiswa: selSiswa.options[selSiswa.selectedIndex].text,
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
        namaSiswa: selSiswa.options[selSiswa.selectedIndex].text,
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
  btn.innerText = "Menyimpan Data..."; btn.disabled = true;
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    const res = await response.json();
    alert(res.message);
    if (res.status === "success") {
      document.getElementById(formId).reset();
      const selects = document.querySelectorAll(`#${formId} select`);
      selects.forEach(sel => { if(sel.id.includes("Siswa")) sel.innerHTML = '<option value="">-- Pilih Kelas Terlebih Dahulu --</option>'; });
    }
  } catch (err) { alert("Terjadi kesalahan jaringan."); } 
  finally { btn.innerText = originalText; btn.disabled = false; }
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
    if (res.status === "success") { renderRiwayatGuru(res.riwayat); }
  } catch (err) {}
}

function renderRiwayatGuru(riwayat) {
  const tabAkademik = document.getElementById("tabelRiwayatAkademikGuru");
  tabAkademik.innerHTML = riwayat.akademik.length === 0 ? "<tr><td colspan='4' style='text-align:center;'>Belum ada data.</td></tr>" : "";
  riwayat.akademik.forEach(row => { tabAkademik.innerHTML += `<tr><td>${row.Timestamp || '-'}</td><td><strong>${row.Nama_Siswa || row.NISN || '-'}</strong></td><td>${row.Mata_Pelajaran || '-'}<br><small style="color:gray;">${row.Materi || '-'}</small></td><td><strong>${row.Nilai || '-'}</strong></td></tr>`; });

  const tabTahfizh = document.getElementById("tabelRiwayatTahfizhGuru");
  tabTahfizh.innerHTML = riwayat.tahfizh.length === 0 ? "<tr><td colspan='4' style='text-align:center;'>Belum ada data.</td></tr>" : "";
  riwayat.tahfizh.forEach(row => { tabTahfizh.innerHTML += `<tr><td>${row.Timestamp || '-'}</td><td><strong>${row.Nama_Siswa || row.NISN || '-'}</strong></td><td>Pekan ${row.Pekan_Ke || '-'}<br><small style="color:gray;">${row.Capaian || '-'}</small></td><td>${row.Catatan_Guru || '-'}</td></tr>`; });

  const tabAdab = document.getElementById("tabelRiwayatAdabGuru");
  tabAdab.innerHTML = riwayat.adab.length === 0 ? "<tr><td colspan='4' style='text-align:center;'>Belum ada data.</td></tr>" : "";
  riwayat.adab.forEach(row => { tabAdab.innerHTML += `<tr><td>${row.Tanggal || row.Timestamp || '-'}</td><td><strong>${row.Nama_Siswa || row.NISN || '-'}</strong></td><td>${row.Kategori || '-'}<br><small style="color:gray;">${row.Catatan_Perilaku || '-'}</small></td><td>-</td></tr>`; });
}

/* ==================== FUNGSI BANTUAN (TAB NAVIGASI) ==================== */
function setupTabs() {
  const tabBtns = document.querySelectorAll(".tab-btn");
  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const container = btn.closest(".container, .auth-wrapper") || document.body;
      container.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      container.querySelectorAll(".tab-pane").forEach(p => { p.style.display = "none"; p.classList.add("hidden"); });
      
      btn.classList.add("active");
      const targetId = btn.getAttribute("data-target");
      if (targetId) {
        const targetPane = document.getElementById(targetId);
        if (targetPane) { targetPane.style.display = "block"; targetPane.classList.remove("hidden"); }
      }
    });
  });
}