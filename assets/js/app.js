"use strict";

(function () {
  const MAKS_LANGKAH = 8;
  const MAKS_PROMPT = 2000;
  const BERKAS = ["index.html", "style.css", "script.js"];
  const TUNGGU_LANGKAH = 120;

  const el = (id) => document.getElementById(id);

  const dom = {
    aplikasi: el("aplikasi"),
    formPrompt: el("form-prompt"),
    prompt: el("prompt"),
    petunjukPrompt: el("petunjuk-prompt"),
    tombolKirim: el("tombol-kirim"),

    daftarProject: el("daftar-project"),
    projectKosong: el("project-kosong"),
    tombolBaru: el("tombol-baru"),
    tplProject: el("tpl-project"),
    tombolProject: el("tombol-project"),
    tombolTutupProject: el("tombol-tutup-project"),
    jumlahProject: el("jumlah-project"),
    scrimProject: el("scrim-project"),

    judulProject: el("judul-project"),
    metaProject: el("meta-project"),
    statusProject: el("status-project"),
    tombolHapus: el("tombol-hapus"),

    thread: el("thread"),
    threadKosong: el("thread-kosong"),

    pratinjau: el("pratinjau"),
    pratinjauKosong: el("pratinjau-kosong"),
    urlPratinjau: el("url-pratinjau"),
    tombolKode: el("tombol-kode"),
    tombolUnduh: el("tombol-unduh"),
    kodePanel: el("kode-panel"),
    kodeTabs: el("kode-tabs"),
    kode: el("kode"),

    chipKuota: el("chip-kuota"),
    kuotaTeks: el("kuota-teks"),
    kuotaMeter: el("kuota-meter"),
    kuotaKecil: el("kuota-kecil"),
    avatar: el("avatar"),
    tombolTema: el("tombol-tema"),
    tombolKeluar: el("tombol-keluar"),

    toast: el("toast"),
  };

  const state = {
    sesi: null,
    kuota: null,
    proyek: [],
    aktif: null,
    pesan: [],
    sibuk: false,
    membangun: false,
    pratinjauUrl: "",
    kodeTerbuka: false,
    kodeTab: "index.html",
    toastTimer: 0,
    kunciPesan: new Set(),
    idKunciPesan: "",
    daftarMasuk: false,
  };

  /* -----------------------------------------------------------
     Utilitas
     ----------------------------------------------------------- */
  const angka = new Intl.NumberFormat("id-ID");

  function jeda(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function inisial(nama) {
    const teks = String(nama || "").trim();
    return teks ? teks.charAt(0).toUpperCase() : "?";
  }

  function slug(teks) {
    const hasil = String(teks || "website")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
    return hasil || "website";
  }

  function jamSekarang() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}.${String(
      d.getMinutes(),
    ).padStart(2, "0")}`;
  }

  function waktuRelatif(iso) {
    if (!iso) return "";
    const waktu = new Date(iso).getTime();
    if (!Number.isFinite(waktu)) return "";
    const detik = Math.max(0, Math.floor((Date.now() - waktu) / 1000));
    if (detik < 60) return "baru saja";
    if (detik < 3600) return `${Math.floor(detik / 60)} menit lalu`;
    if (detik < 86400) return `${Math.floor(detik / 3600)} jam lalu`;
    if (detik < 172800) return "kemarin";
    return new Date(waktu).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    });
  }

  function labelStatus(status) {
    if (status === "jalan") return "Berjalan";
    if (status === "selesai") return "Selesai";
    if (status === "gagal") return "Gagal";
    return "Kosong";
  }

  function metaProyek(project) {
    const status = project.status || "idle";
    let teks;
    if (status === "jalan") {
      const langkah = Number(project.step || 0);
      teks = langkah > 0 ? `Langkah ${langkah}` : "Sedang dibuat";
    } else {
      teks = labelStatus(status);
    }
    const relatif = waktuRelatif(project.updated_at);
    return relatif ? `${teks} · ${relatif}` : teks;
  }

  function tampilkanToast(teks, jenis) {
    if (!teks) return;
    clearTimeout(state.toastTimer);
    dom.toast.textContent = String(teks);
    if (jenis) dom.toast.dataset.jenis = jenis;
    else delete dom.toast.dataset.jenis;
    dom.toast.hidden = false;
    state.toastTimer = window.setTimeout(
      () => {
        dom.toast.hidden = true;
      },
      jenis === "salah" ? 6000 : 4200,
    );
  }

  async function api(jalur, opsi = {}) {
    const method = opsi.method || "GET";
    const body = opsi.body;
    let res;
    try {
      res = await fetch(jalur, {
        method,
        credentials: "same-origin",
        cache: "no-store",
        headers:
          body === undefined ? {} : { "content-type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      const e = new Error(
        "Tidak bisa terhubung ke server. Periksa koneksi internetmu.",
      );
      e.jaringan = true;
      throw e;
    }

    const tipe = res.headers.get("content-type") || "";
    let data = null;
    if (tipe.includes("application/json")) {
      try {
        data = await res.json();
      } catch {
        data = null;
      }
    } else {
      const teks = await res.text();
      try {
        data = teks ? JSON.parse(teks) : null;
      } catch {
        data = teks;
      }
    }

    if (!res.ok) {
      const pesan =
        (data && typeof data === "object" && data.galat) ||
        "Permintaan tidak bisa diproses.";
      const e = new Error(pesan);
      e.status = res.status;
      throw e;
    }
    return data;
  }

  function tanganiGalat(e) {
    if (!e) return;
    console.error(e);
    if (e.status === 401) {
      kembaliMasuk();
      return;
    }
    tampilkanToast(e.message || "Ada yang salah. Coba lagi.", "salah");
  }

  /* -----------------------------------------------------------
     Tema
     ----------------------------------------------------------- */
  function perbaruiTema() {
    const gelap =
      document.documentElement.getAttribute("data-tema") === "gelap";
    dom.tombolTema.textContent = gelap ? "☀" : "☾";
    dom.tombolTema.setAttribute(
      "aria-label",
      gelap ? "Pakai tema terang" : "Pakai tema gelap",
    );
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", gelap ? "#10172b" : "#ffe14d");
  }

  function gantiTema() {
    const sekarang =
      document.documentElement.getAttribute("data-tema") === "gelap"
        ? "gelap"
        : "terang";
    const baru = sekarang === "gelap" ? "terang" : "gelap";
    document.documentElement.setAttribute("data-tema", baru);
    try {
      localStorage.setItem("tema", baru);
    } catch {
      /* localStorage bisa dimatikan browser. Tema tetap berganti. */
    }
    perbaruiTema();
  }

  /* -----------------------------------------------------------
     Sesi & kuota
     ----------------------------------------------------------- */
  function perbaruiSesi(sesi) {
    state.sesi = sesi;
    const nama = sesi && sesi.nama ? sesi.nama : "Pengguna";
    dom.avatar.textContent = inisial(nama);
    dom.avatar.title = nama;
    dom.avatar.setAttribute("aria-label", `Akun ${nama}`);
    perbaruiKuota(sesi && sesi.kuota);
  }

  function perbaruiKuota(kuota) {
    const terpakai = Math.max(0, Number(kuota && kuota.terpakai) || 0);
    const batas = Math.max(1, Number(kuota && kuota.batas) || 5);
    state.kuota = { terpakai, batas };
    const sisa = Math.max(0, batas - terpakai);

    dom.chipKuota.textContent = `${terpakai} / ${batas} build hari ini`;
    dom.kuotaTeks.textContent = `${terpakai} / ${batas}`;
    dom.kuotaMeter.style.width = `${Math.min(
      100,
      Math.round((terpakai / batas) * 100),
    )}%`;
    dom.kuotaKecil.textContent = sisa
      ? `Reset tengah malam. Sisa ${sisa} build untuk hari ini.`
      : "Kuota habis. Reset tengah malam.";
    perbaruiTombolKirim();
  }

  function kembaliMasuk() {
    state.sibuk = false;
    state.membangun = false;
    if (state.pratinjauUrl) {
      URL.revokeObjectURL(state.pratinjauUrl);
      state.pratinjauUrl = "";
    }
    location.replace("/");
  }

  async function masukAplikasi(sesi) {
    perbaruiSesi(sesi);
    state.daftarMasuk = false;
    document.title = "Ruang kerja — Webiko Builder";
    try {
      await muatProyek();
    } catch (e) {
      tanganiGalat(e);
    }
  }

  async function segarkanSesi() {
    const sesi = await api("/api/sesi");
    if (!sesi || !sesi.masuk) {
      kembaliMasuk();
      return false;
    }
    perbaruiSesi(sesi);
    return true;
  }

  /* -----------------------------------------------------------
     Daftar project
     ----------------------------------------------------------- */
  function normalisasiDaftar(p) {
    return {
      id: p.id,
      name: p.name,
      status: p.status || "idle",
      step: Number(p.step || 0),
      tokens: Number(p.tokens || 0),
      updated_at: p.updated_at || null,
    };
  }

  function normalisasiDetail(p) {
    return {
      id: p.id,
      nama: p.nama || p.name || "Project baru",
      status: p.status || "idle",
      step: Number(p.step || 0),
      tokens: Number(p.tokens || 0),
      error: p.error || null,
      files: p.files && typeof p.files === "object" ? p.files : {},
      updated_at: p.diperbarui || p.updated_at || null,
    };
  }

  function renderDaftar() {
    dom.daftarProject.textContent = "";
    for (const p of state.proyek) {
      const node = dom.tplProject.content.firstElementChild.cloneNode(true);
      const aktif = state.aktif && state.aktif.id === p.id;
      node.dataset.status = p.status || "idle";
      if (aktif) node.dataset.active = "true";

      const tombol = node.querySelector(".project__btn");
      const nama = node.querySelector(".project__nama");
      const status = node.querySelector(".project__status");
      const hapus = node.querySelector(".project__hapus");

      nama.textContent = p.name;
      status.textContent = metaProyek(p);
      tombol.setAttribute("aria-pressed", aktif ? "true" : "false");
      tombol.setAttribute("aria-label", `Buka project ${p.name}`);
      tombol.addEventListener("click", () => {
        pilihProyek(p.id);
        if (!mediaProyek.matches) tutupProject(false);
      });
      hapus.setAttribute("aria-label", `Hapus project ${p.name}`);
      hapus.setAttribute("title", "Hapus project");
      hapus.addEventListener("click", (ev) => {
        ev.stopPropagation();
        hapusProyek(p.id);
      });

      dom.daftarProject.append(node);
    }
    dom.daftarProject.classList.toggle("daftar--masuk", !state.daftarMasuk);
    state.daftarMasuk = true;
    dom.projectKosong.hidden = state.proyek.length > 0;
    dom.jumlahProject.textContent = String(state.proyek.length);
    dom.jumlahProject.hidden = state.proyek.length === 0;
  }

  async function muatProyek(pilihId) {
    const data = await api("/api/proyek");
    const daftar = Array.isArray(data && data.projects) ? data.projects : [];
    state.proyek = daftar.map(normalisasiDaftar);

    if (!state.proyek.length) {
      state.aktif = null;
      state.pesan = [];
      state.kodeTerbuka = false;
      renderDaftar();
      renderAktif();
      renderThread();
      renderPreview();
      renderKode();
      return;
    }

    const dicari = pilihId || (state.aktif && state.aktif.id);
    const target = state.proyek.some((p) => p.id === dicari)
      ? dicari
      : state.proyek[0].id;
    await pilihProyek(target);
  }

  async function pilihProyek(id) {
    if (!id) return;
    if (state.sibuk || state.membangun) {
      tampilkanToast("Tunggu build selesai dulu, ya.", "salah");
      return;
    }
    try {
      const data = await api(`/api/proyek?id=${encodeURIComponent(id)}`);
      if (!data || !data.project) throw new Error("Project tidak ditemukan.");
      state.aktif = normalisasiDetail(data.project);
      state.pesan = Array.isArray(data.pesan)
        ? data.pesan.map((p) => ({
            peran: p.peran === "user" ? "user" : "ai",
            teks: String(p.teks || ""),
          }))
        : [];
      state.kodeTerbuka = false;
      state.kodeTab = "index.html";
      renderDaftar();
      renderAktif();
      renderThread();
      renderPreview();
      renderKode();
    } catch (e) {
      tanganiGalat(e);
    }
  }

  async function buatProyekBaru(dariKirim) {
    if (!dariKirim && (state.sibuk || state.membangun)) {
      tampilkanToast("Tunggu build selesai dulu, ya.", "salah");
      return false;
    }
    try {
      const data = await api("/api/proyek", {
        method: "POST",
        body: { nama: "Project baru" },
      });
      const p = data && data.project;
      if (!p) throw new Error("Project gagal dibuat.");

      const sekarang = new Date().toISOString();
      state.proyek.unshift({
        id: p.id,
        name: p.nama || "Project baru",
        status: "idle",
        step: 0,
        tokens: 0,
        updated_at: sekarang,
      });
      state.aktif = {
        id: p.id,
        nama: p.nama || "Project baru",
        status: "idle",
        step: 0,
        tokens: 0,
        error: null,
        files: {},
        updated_at: sekarang,
      };
      state.pesan = [];
      state.kodeTerbuka = false;
      state.kodeTab = "index.html";
      renderDaftar();
      renderAktif();
      renderThread();
      renderPreview();
      renderKode();
      dom.prompt.focus();
      return true;
    } catch (e) {
      tanganiGalat(e);
      return false;
    }
  }

  async function hapusProyek(id) {
    if (state.sibuk || state.membangun) {
      tampilkanToast("Tunggu build selesai dulu, ya.", "salah");
      return;
    }
    const p = state.proyek.find((x) => x.id === id);
    const nama = p ? p.name : "project ini";
    if (!window.confirm(`Hapus "${nama}"? Hasil dan riwayatnya ikut terhapus.`)) {
      return;
    }
    try {
      await api(`/api/proyek?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      state.proyek = state.proyek.filter((x) => x.id !== id);
      if (state.aktif && state.aktif.id === id) {
        state.aktif = null;
        state.pesan = [];
        state.kodeTerbuka = false;
        renderDaftar();
        renderAktif();
        renderThread();
        renderPreview();
        renderKode();
        if (state.proyek.length) await pilihProyek(state.proyek[0].id);
      } else {
        renderDaftar();
      }
      tampilkanToast("Project dihapus.", "sukses");
    } catch (e) {
      tanganiGalat(e);
    }
  }

  function sinkronProyekAktif() {
    if (!state.aktif) return;
    const p = state.proyek.find((x) => x.id === state.aktif.id);
    if (!p) return;
    p.name = state.aktif.nama;
    p.status = state.aktif.status;
    p.step = state.aktif.step;
    p.tokens = state.aktif.tokens;
    p.updated_at = state.aktif.updated_at;
    renderDaftar();
  }

  /* -----------------------------------------------------------
     Header & thread
     ----------------------------------------------------------- */
  function renderAktif() {
    const a = state.aktif;
    if (!a) {
      dom.judulProject.textContent = state.proyek.length
        ? "Pilih project"
        : "Mulai project pertama";
      dom.metaProject.textContent = "index.html · style.css · script.js";
      dom.statusProject.textContent = "Kosong";
      dom.statusProject.className = "badge badge--idle";
      dom.tombolHapus.hidden = true;
    } else {
      dom.judulProject.textContent = a.nama;
      dom.metaProject.textContent = "index.html · style.css · script.js";
      dom.statusProject.textContent = state.membangun
        ? "Membuat"
        : labelStatus(a.status);
      dom.statusProject.className = `badge badge--${
        state.membangun ? "jalan" : a.status || "idle"
      }`;
      dom.tombolHapus.hidden = false;
    }
    perbaruiTombolKirim();
  }

  function buatPesan(pesan) {
    const bungkus = document.createElement("div");
    bungkus.className = "msg";
    const user = pesan.peran === "user";
    if (user) bungkus.classList.add("msg--user");

    const avatar = document.createElement("div");
    avatar.className = "msg__avatar";
    avatar.setAttribute("aria-hidden", "true");
    if (!user) {
      avatar.classList.add("msg__avatar--ai");
      avatar.textContent = "AI";
    } else {
      avatar.textContent = inisial(state.sesi && state.sesi.nama);
    }

    const isi = document.createElement("div");
    isi.className = "msg__body";
    isi.textContent = pesan.teks;

    if (pesan.waktu) {
      const meta = document.createElement("div");
      meta.className = "msg__meta";
      meta.textContent = pesan.waktu;
      isi.append(meta);
    }

    bungkus.append(avatar, isi);
    return bungkus;
  }

  function buatProgress() {
    const a = state.aktif;
    if (!a) return null;

    const kotak = document.createElement("div");
    kotak.className = "progress";

    const atas = document.createElement("div");
    atas.className = "progress__top";
    const kiri = document.createElement("span");
    const kanan = document.createElement("span");

    const langkah = Math.max(0, Number(a.step || 0));
    if (state.membangun) {
      kiri.textContent = `Langkah ${Math.min(
        langkah + 1,
        MAKS_LANGKAH,
      )} dari ${MAKS_LANGKAH}`;
    } else if (a.status === "selesai") {
      kiri.textContent = langkah
        ? `Selesai dalam ${langkah} langkah`
        : "Selesai";
    } else if (a.status === "gagal") {
      kiri.textContent = langkah
        ? `Berhenti di langkah ${langkah}`
        : "Build gagal";
    } else {
      kiri.textContent = `Langkah ${
        langkah ? Math.min(langkah, MAKS_LANGKAH) : 1
      } dari ${MAKS_LANGKAH}`;
    }
    kanan.textContent = `${angka.format(Number(a.tokens || 0))} token`;
    atas.append(kiri, kanan);

    const baris = document.createElement("div");
    baris.className = "steps";
    baris.setAttribute("aria-hidden", "true");
    for (let i = 1; i <= MAKS_LANGKAH; i++) {
      const b = document.createElement("i");
      if (i <= langkah) b.classList.add("on");
      else if (state.membangun && i === Math.min(langkah + 1, MAKS_LANGKAH)) {
        b.classList.add("now");
      }
      baris.append(b);
    }

    const kecil = document.createElement("small");
    if (state.membangun) {
      kecil.textContent = "AI sedang menulis. Jangan tutup tab ini.";
    } else if (a.status === "selesai") {
      kecil.textContent =
        "Tiga berkas lolos pemeriksaan: tanpa aset eksternal, ukuran aman, pratinjau bisa dibuka.";
    } else if (a.status === "gagal") {
      kecil.textContent =
        a.error || "Build belum berhasil. Kirim perintah baru untuk mencoba lagi.";
    } else {
      kecil.textContent =
        "Build berhenti di tengah. Lanjutkan untuk menyelesaikan hasilnya.";
    }

    kotak.append(atas, baris, kecil);

    if (!state.membangun && a.status === "jalan") {
      const tombol = document.createElement("button");
      tombol.type = "button";
      tombol.className = "btn btn--sm btn--accent";
      tombol.textContent = "Lanjutkan build";
      tombol.addEventListener("click", lanjutkanBuild);
      kotak.append(tombol);
    }

    return kotak;
  }

  function kunciPesan(pesan) {
    return `${pesan.peran}\u0000${pesan.waktu || ""}\u0000${pesan.teks}`;
  }

  function renderThread() {
    dom.thread.querySelectorAll(".msg, .progress").forEach((n) => n.remove());

    const a = state.aktif;
    const idAktif = a ? a.id : "";
    if (state.idKunciPesan !== idAktif) {
      state.kunciPesan = new Set();
      state.idKunciPesan = idAktif;
    }

    const tampilProgress = Boolean(
      a &&
        (state.membangun ||
          a.status === "jalan" ||
          a.status === "gagal" ||
          Number(a.step || 0) > 0),
    );
    dom.threadKosong.hidden = state.pesan.length > 0 || tampilProgress;

    const fragmen = document.createDocumentFragment();
    const kunciBaru = new Set();
    for (const pesan of state.pesan) {
      if (!pesan.teks) continue;
      const kunci = kunciPesan(pesan);
      const node = buatPesan(pesan);
      if (!state.kunciPesan.has(kunci)) {
        node.classList.add("msg--baru");
        kunciBaru.add(kunci);
      }
      fragmen.append(node);
    }
    if (tampilProgress) {
      const progress = buatProgress();
      if (progress) fragmen.append(progress);
    }
    dom.thread.append(fragmen);

    for (const kunci of kunciBaru) state.kunciPesan.add(kunci);

    requestAnimationFrame(() => {
      dom.thread.scrollTop = dom.thread.scrollHeight;
    });
  }

  /* -----------------------------------------------------------
     Pratinjau & kode
     ----------------------------------------------------------- */
  function siapPratinjau() {
    const a = state.aktif;
    return Boolean(
      a &&
        Number(a.step || 0) > 0 &&
        a.files &&
        typeof a.files["index.html"] === "string",
    );
  }

  function sisipkanHead(html, potongan, sebelumPenutup) {
    if (/<\/head>/i.test(html)) {
      if (sebelumPenutup) {
        return html.replace(/<\/head>/i, `${potongan}\n</head>`);
      }
      return html.replace(/<head([^>]*)>/i, `<head$1>\n${potongan}`);
    }
    if (/<head[^>]*>/i.test(html)) {
      return html.replace(/<head([^>]*)>/i, `<head$1>\n${potongan}`);
    }
    if (/<body[^>]*>/i.test(html)) {
      return html.replace(
        /<body([^>]*)>/i,
        `<head>${potongan}</head>\n<body$1>`,
      );
    }
    return `<head>${potongan}</head>\n${html}`;
  }

  function bangunHalaman(files) {
    const htmlAwal = String(files["index.html"] || "");
    const css = String(files["style.css"] || "").replace(
      /<\/style/gi,
      "<\\/style",
    );
    const js = String(files["script.js"] || "").replace(
      /<\/script/gi,
      "<\\/script",
    );

    const tagGaya = `<style>\n${css}\n</style>`;
    const tagSkrip = `<script>\n${js}\n</script>`;

    let html = htmlAwal
      .replace(/<base\b[^>]*>/gi, "")
      .replace(
        /<meta[^>]+http-equiv\s*=\s*["']?\s*(?:refresh|content-security-policy)["']?[^>]*>/gi,
        "",
      );

    let adaGaya = false;
    html = html.replace(
      /<link\b[^>]*\bhref\s*=\s*(?:"(?:\.\/)?style\.css"|'(?:\.\/)?style\.css'|(?:\.\/)?style\.css)[^>]*>/gi,
      () => {
        adaGaya = true;
        return tagGaya;
      },
    );
    if (!adaGaya) html = sisipkanHead(html, tagGaya, true);

    let adaSkrip = false;
    html = html.replace(
      /<script\b[^>]*\bsrc\s*=\s*(?:"(?:\.\/)?script\.js"|'(?:\.\/)?script\.js'|(?:\.\/)?script\.js)[^>]*>\s*<\/script>/gi,
      () => {
        adaSkrip = true;
        return tagSkrip;
      },
    );
    if (!adaSkrip) {
      if (/<\/body>/i.test(html)) {
        html = html.replace(/<\/body>/i, `${tagSkrip}\n</body>`);
      } else if (/<\/html>/i.test(html)) {
        html = html.replace(/<\/html>/i, `${tagSkrip}\n</html>`);
      } else {
        html += `\n${tagSkrip}`;
      }
    }

    const csp =
      `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; ` +
      `style-src 'unsafe-inline'; script-src 'unsafe-inline'; ` +
      `img-src data: blob:; font-src data:; media-src data:; ` +
      `connect-src 'none'; frame-src 'none'; form-action 'none'; ` +
      `base-uri 'none'; object-src 'none'">`;
    html = sisipkanHead(html, csp, false);

    if (!/<meta[^>]+name\s*=\s*["']?viewport/i.test(html)) {
      html = sisipkanHead(
        html,
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
        false,
      );
    }

    return html;
  }

  function setPesanPratinjau(teks) {
    const p = dom.pratinjauKosong.querySelector("p");
    if (p) p.textContent = teks;
  }

  function perbaruiUnduhan() {
    const siap = siapPratinjau();
    if (siap && state.aktif) {
      dom.tombolUnduh.href = `/api/unduh?id=${encodeURIComponent(
        state.aktif.id,
      )}`;
      dom.tombolUnduh.setAttribute("aria-disabled", "false");
      dom.tombolUnduh.removeAttribute("tabindex");
    } else {
      dom.tombolUnduh.href = "#";
      dom.tombolUnduh.setAttribute("aria-disabled", "true");
      dom.tombolUnduh.setAttribute("tabindex", "-1");
    }
  }

  function renderPreview() {
    const siap = siapPratinjau();
    perbaruiUnduhan();

    if (!siap) {
      if (state.pratinjauUrl) {
        URL.revokeObjectURL(state.pratinjauUrl);
        state.pratinjauUrl = "";
      }
      dom.pratinjau.removeAttribute("src");
      dom.pratinjauKosong.hidden = false;
      dom.urlPratinjau.textContent = "preview.webiko.local";
      if (state.aktif && state.aktif.status === "gagal") {
        setPesanPratinjau(
          "Build belum berhasil. Kirim perintah lain, lalu pratinjau muncul di sini.",
        );
      } else if (state.membangun) {
        setPesanPratinjau("AI sedang menyusun halaman pertamamu.");
      } else {
        setPesanPratinjau(
          "Pratinjau muncul di sini setelah Build pertama selesai.",
        );
      }
      return;
    }

    const html = bangunHalaman(state.aktif.files);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const urlBaru = URL.createObjectURL(blob);
    const urlLama = state.pratinjauUrl;
    state.pratinjauUrl = urlBaru;
    dom.pratinjau.src = urlBaru;
    dom.pratinjauKosong.hidden = true;
    dom.urlPratinjau.textContent = `preview.webiko.local/${slug(
      state.aktif.nama,
    )}`;
    if (urlLama) URL.revokeObjectURL(urlLama);
  }

  function renderKode() {
    const siap = siapPratinjau();
    if (!siap) {
      state.kodeTerbuka = false;
      dom.kodePanel.hidden = true;
      dom.tombolKode.disabled = true;
      dom.tombolKode.textContent = "Kode";
      dom.tombolKode.setAttribute("aria-pressed", "false");
      dom.kodeTabs.textContent = "";
      dom.kode.textContent = "";
      return;
    }

    dom.tombolKode.disabled = false;
    dom.tombolKode.textContent = state.kodeTerbuka ? "Pratinjau" : "Kode";
    dom.tombolKode.setAttribute(
      "aria-pressed",
      state.kodeTerbuka ? "true" : "false",
    );

    if (!BERKAS.includes(state.kodeTab)) state.kodeTab = BERKAS[0];

    dom.kodeTabs.textContent = "";
    for (const nama of BERKAS) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = nama;
      b.setAttribute("role", "tab");
      b.setAttribute(
        "aria-selected",
        state.kodeTab === nama ? "true" : "false",
      );
      b.addEventListener("click", () => {
        state.kodeTab = nama;
        renderKode();
      });
      dom.kodeTabs.append(b);
    }

    dom.kode.textContent = String(
      state.aktif.files[state.kodeTab] || "",
    );
    dom.kodePanel.hidden = !state.kodeTerbuka;
  }

  function toggleKode() {
    if (!siapPratinjau()) return;
    state.kodeTerbuka = !state.kodeTerbuka;
    renderKode();
  }

  /* -----------------------------------------------------------
     Build
     ----------------------------------------------------------- */
  function perbaruiHint() {
    const n = dom.prompt.value.length;
    dom.petunjukPrompt.textContent = `${angka.format(n)} / ${angka.format(
      MAKS_PROMPT,
    )} karakter`;
  }

  function autoBesar() {
    dom.prompt.style.height = "auto";
    dom.prompt.style.height = `${Math.min(
      dom.prompt.scrollHeight || 56,
      160,
    )}px`;
  }

  function perbaruiTombolKirim() {
    const adaTeks = dom.prompt.value.trim().length > 0;
    const habis =
      state.kuota && state.kuota.terpakai >= state.kuota.batas;
    const tersendat = Boolean(
      state.aktif && state.aktif.status === "jalan" && !state.membangun,
    );
    const bisa =
      adaTeks &&
      !state.sibuk &&
      !state.membangun &&
      !habis &&
      !tersendat;
    dom.tombolKirim.disabled = !bisa;
    dom.tombolKirim.textContent =
      state.sibuk || state.membangun ? "Membuat..." : "Kirim";
  }

  function tambahPesanAi(teks) {
    let isi = String(teks || "").trim();
    if (!isi) return;
    if (isi.startsWith("{") || isi.startsWith("```")) return;
    if (isi.length > 4000) isi = `${isi.slice(0, 4000)}…`;
    const terakhir = state.pesan[state.pesan.length - 1];
    if (terakhir && terakhir.peran === "ai" && terakhir.teks === isi) return;
    state.pesan.push({ peran: "ai", teks: isi, waktu: jamSekarang() });
  }

  function terapkanHasil(hasil) {
    if (!hasil || !state.aktif || hasil.id !== state.aktif.id) return;

    state.aktif.nama = hasil.nama || state.aktif.nama;
    state.aktif.status = hasil.status || state.aktif.status;
    state.aktif.step = Number(hasil.step || 0);
    state.aktif.tokens = Number(hasil.tokens || 0);
    state.aktif.error = hasil.error || null;
    if (hasil.files && typeof hasil.files === "object") {
      state.aktif.files = hasil.files;
    }
    state.aktif.updated_at = new Date().toISOString();
    state.membangun = hasil.status === "jalan" && hasil.selesai !== true;

    tambahPesanAi(hasil.pesan);

    sinkronProyekAktif();
    renderAktif();
    renderThread();
    renderPreview();
    renderKode();
  }

  async function jalankanSisaLangkah(hasilPertama) {
    let hasil = hasilPertama;
    let putaran = 0;
    while (true) {
      terapkanHasil(hasil);
      if (!state.membangun) break;
      putaran += 1;
      if (putaran > MAKS_LANGKAH + 2) {
        state.membangun = false;
        tampilkanToast(
          "Build berhenti di batas langkah. Tekan Lanjutkan build.",
          "salah",
        );
        break;
      }
      await jeda(TUNGGU_LANGKAH);
      hasil = await api("/api/build-lanjut", {
        method: "POST",
        body: { project_id: state.aktif.id },
      });
    }
  }

  async function segarkanSesiDanDaftar() {
    const [sesi, daftar] = await Promise.allSettled([
      api("/api/sesi"),
      api("/api/proyek"),
    ]);

    if (sesi.status === "fulfilled") {
      if (!sesi.value || !sesi.value.masuk) {
        kembaliMasuk();
        return;
      }
      perbaruiSesi(sesi.value);
    }

    if (daftar.status === "fulfilled") {
      const isi = daftar.value && daftar.value.projects;
      state.proyek = (Array.isArray(isi) ? isi : []).map(normalisasiDaftar);
      if (state.aktif) {
        const p = state.proyek.find((x) => x.id === state.aktif.id);
        if (p) {
          state.aktif.nama = p.name;
          state.aktif.status = p.status;
          state.aktif.step = p.step;
          state.aktif.tokens = p.tokens;
          state.aktif.updated_at = p.updated_at;
        }
      }
      renderDaftar();
      renderAktif();
    }
  }

  async function pulihkanSetelahGalat() {
    if (!state.aktif) return;
    await jeda(300);
    try {
      const [detail, daftar] = await Promise.all([
        api(`/api/proyek?id=${encodeURIComponent(state.aktif.id)}`),
        api("/api/proyek"),
      ]);
      if (detail && detail.project) {
        const d = normalisasiDetail(detail.project);
        state.aktif = {
          ...state.aktif,
          ...d,
          files:
            d.files && Object.keys(d.files).length
              ? d.files
              : state.aktif.files,
        };
        state.pesan = Array.isArray(detail.pesan)
          ? detail.pesan.map((p) => ({
              peran: p.peran === "user" ? "user" : "ai",
              teks: String(p.teks || ""),
            }))
          : state.pesan;
      }
      if (daftar && Array.isArray(daftar.projects)) {
        state.proyek = daftar.projects.map(normalisasiDaftar);
      }
      renderDaftar();
      renderAktif();
      renderThread();
      renderPreview();
      renderKode();
    } catch (e) {
      if (e && e.status === 401) kembaliMasuk();
    }
  }

  async function akhirBuild() {
    renderAktif();
    renderThread();
    renderPreview();
    renderKode();
    await segarkanSesiDanDaftar();

    const a = state.aktif;
    if (!a) return;
    if (a.status === "selesai") {
      tampilkanToast(
        "Website selesai. Lihat pratinjau atau unduh ZIP.",
        "sukses",
      );
    } else if (a.status === "gagal") {
      tampilkanToast(
        a.error || "Build belum berhasil. Coba perintah lain.",
        "salah",
      );
    }
  }

  async function kirimPrompt(ev) {
    ev.preventDefault();
    if (state.sibuk || state.membangun) return;

    const teks = dom.prompt.value.trim();
    if (!teks) return;

    if (state.kuota && state.kuota.terpakai >= state.kuota.batas) {
      tampilkanToast(
        "Kuota Build hari ini habis. Coba lagi besok, ya.",
        "salah",
      );
      return;
    }

    if (state.aktif && state.aktif.status === "jalan") {
      tampilkanToast(
        "Build sebelumnya belum selesai. Tekan Lanjutkan build.",
        "salah",
      );
      return;
    }

    state.sibuk = true;
    perbaruiTombolKirim();

    try {
      if (!state.aktif) {
        const berhasil = await buatProyekBaru(true);
        if (!berhasil) return;
      }

      state.pesan.push({
        peran: "user",
        teks: teks.slice(0, MAKS_PROMPT),
        waktu: jamSekarang(),
      });
      dom.prompt.value = "";
      dom.prompt.style.height = "";
      perbaruiHint();
      autoBesar();

      state.aktif.status = "jalan";
      state.aktif.step = 0;
      state.aktif.tokens = 0;
      state.aktif.error = null;
      state.membangun = true;
      sinkronProyekAktif();
      renderAktif();
      renderThread();

      const hasil = await api("/api/build-mulai", {
        method: "POST",
        body: {
          project_id: state.aktif.id,
          prompt: teks.slice(0, MAKS_PROMPT),
        },
      });
      await jalankanSisaLangkah(hasil);

      if (state.membangun) {
        state.membangun = false;
        tampilkanToast(
          "Build berhenti di batas langkah. Tekan Lanjutkan build.",
          "salah",
        );
      }
      await akhirBuild();
    } catch (e) {
      tanganiGalat(e);
      await pulihkanSetelahGalat();
    } finally {
      state.sibuk = false;
      state.membangun = false;
      perbaruiTombolKirim();
      renderAktif();
      renderThread();
    }
  }

  async function lanjutkanBuild() {
    if (state.sibuk || state.membangun) return;
    if (!state.aktif || state.aktif.status !== "jalan") return;

    state.sibuk = true;
    state.membangun = true;
    perbaruiTombolKirim();
    renderAktif();
    renderThread();

    try {
      const hasil = await api("/api/build-lanjut", {
        method: "POST",
        body: { project_id: state.aktif.id },
      });
      await jalankanSisaLangkah(hasil);

      if (state.membangun) {
        state.membangun = false;
        tampilkanToast(
          "Build berhenti di batas langkah. Tekan Lanjutkan build.",
          "salah",
        );
      }
      await akhirBuild();
    } catch (e) {
      tanganiGalat(e);
      await pulihkanSetelahGalat();
    } finally {
      state.sibuk = false;
      state.membangun = false;
      perbaruiTombolKirim();
      renderAktif();
      renderThread();
    }
  }

  /* -----------------------------------------------------------
     Daftar project: sidebar bisa disembunyikan, drawer di HP
     ----------------------------------------------------------- */
  const mediaProyek = window.matchMedia("(min-width: 861px)");
  const ruangKerja = document.querySelector(".workspace");

  function kunciLatar(aktif) {
    if (ruangKerja) ruangKerja.inert = Boolean(aktif);
  }

  function kunciGulir(aktif) {
    if (aktif) {
      const lebar = window.innerWidth - document.documentElement.clientWidth;
      document.documentElement.style.overflow = "hidden";
      document.body.style.paddingRight = lebar > 0 ? `${lebar}px` : "";
    } else {
      document.documentElement.style.overflow = "";
      document.body.style.paddingRight = "";
    }
  }

  function projectTerbuka() {
    if (mediaProyek.matches) {
      return dom.aplikasi.getAttribute("data-projek") !== "tutup";
    }
    return dom.aplikasi.getAttribute("data-projek") === "buka";
  }

  function sinkronTombolProject() {
    const terbuka = projectTerbuka();
    const label = terbuka
      ? "Sembunyikan daftar project"
      : "Tampilkan daftar project";
    dom.tombolProject.setAttribute("aria-expanded", terbuka ? "true" : "false");
    dom.tombolProject.setAttribute("aria-label", label);
    dom.tombolProject.setAttribute("title", label);
  }

  function tutupProject(kembaliFokus) {
    if (mediaProyek.matches) {
      dom.aplikasi.setAttribute("data-projek", "tutup");
    } else {
      dom.aplikasi.removeAttribute("data-projek");
      kunciGulir(false);
      kunciLatar(false);
    }
    sinkronTombolProject();
    if (kembaliFokus) dom.tombolProject.focus();
  }

  function bukaProject() {
    if (mediaProyek.matches) {
      dom.aplikasi.removeAttribute("data-projek");
      sinkronTombolProject();
      return;
    }
    dom.aplikasi.setAttribute("data-projek", "buka");
    kunciGulir(true);
    kunciLatar(true);
    sinkronTombolProject();
    dom.tombolTutupProject.focus();
  }

  function toggleProject() {
    if (projectTerbuka()) tutupProject(true);
    else bukaProject();
  }

  function normalisasiProject() {
    if (
      mediaProyek.matches &&
      dom.aplikasi.getAttribute("data-projek") === "buka"
    ) {
      dom.aplikasi.removeAttribute("data-projek");
      kunciGulir(false);
      kunciLatar(false);
    }
    if (
      !mediaProyek.matches &&
      dom.aplikasi.getAttribute("data-projek") === "tutup"
    ) {
      dom.aplikasi.removeAttribute("data-projek");
    }
    sinkronTombolProject();
  }

  /* -----------------------------------------------------------
     Aksi lain
     ----------------------------------------------------------- */
  async function keluar() {
    if (
      (state.sibuk || state.membangun) &&
      !window.confirm(
        "Build masih berjalan dan akan berhenti kalau kamu keluar. Lanjut keluar?",
      )
    ) {
      return;
    }
    state.sibuk = false;
    state.membangun = false;
    try {
      await api("/api/auth-keluar", { method: "POST" });
    } catch {
      /* Cookie tetap dicoba dihapus lewat halaman masuk berikutnya. */
    }
    if (state.pratinjauUrl) URL.revokeObjectURL(state.pratinjauUrl);
    location.replace("/");
  }

  function pasangPendengar() {
    dom.formPrompt.addEventListener("submit", kirimPrompt);
    dom.tombolBaru.addEventListener("click", () => {
      if (!mediaProyek.matches) tutupProject(false);
    });
    dom.tombolBaru.addEventListener("click", buatProyekBaru);
    dom.tombolProject.addEventListener("click", toggleProject);
    dom.tombolTutupProject.addEventListener("click", () => tutupProject(true));
    dom.scrimProject.addEventListener("click", () => tutupProject(true));
    if (mediaProyek.addEventListener) {
      mediaProyek.addEventListener("change", normalisasiProject);
    }
    window.addEventListener("resize", normalisasiProject);
    document.addEventListener("keydown", (ev) => {
      if (ev.key !== "Escape" || dom.aplikasi.hidden) return;
      if (!mediaProyek.matches && projectTerbuka()) {
        tutupProject(true);
      } else if (mediaProyek.matches && !projectTerbuka()) {
        bukaProject();
      }
    });
    dom.tombolHapus.addEventListener("click", () => {
      if (state.aktif) hapusProyek(state.aktif.id);
    });
    dom.tombolKode.addEventListener("click", toggleKode);
    dom.tombolUnduh.addEventListener("click", (ev) => {
      if (dom.tombolUnduh.getAttribute("aria-disabled") === "true") {
        ev.preventDefault();
      }
    });
    dom.tombolTema.addEventListener("click", gantiTema);
    dom.tombolKeluar.addEventListener("click", keluar);

    dom.prompt.addEventListener("input", () => {
      perbaruiHint();
      autoBesar();
      perbaruiTombolKirim();
    });

    dom.prompt.addEventListener("keydown", (ev) => {
      if ((ev.ctrlKey || ev.metaKey) && ev.key === "Enter") {
        ev.preventDefault();
        dom.formPrompt.requestSubmit();
      }
    });

    document.querySelectorAll("[data-contoh]").forEach((tombol) => {
      tombol.addEventListener("click", () => {
        dom.prompt.value = tombol.dataset.contoh || "";
        perbaruiHint();
        autoBesar();
        perbaruiTombolKirim();
        dom.prompt.focus();
      });
    });

    window.addEventListener("beforeunload", (ev) => {
      if (state.sibuk || state.membangun) {
        ev.preventDefault();
        ev.returnValue = "";
      }
    });
  }

  async function mulai() {
    perbaruiTema();
    perbaruiHint();
    autoBesar();
    perbaruiTombolKirim();
    dom.pratinjau.setAttribute("sandbox", "allow-scripts");
    dom.pratinjau.setAttribute("referrerpolicy", "no-referrer");
    dom.tombolKode.disabled = true;

    pasangPendengar();
    sinkronTombolProject();

    try {
      const sesi = await api("/api/sesi");
      if (!sesi || !sesi.masuk) {
        kembaliMasuk();
        return;
      }
      await masukAplikasi(sesi);
    } catch (e) {
      if (e && e.status === 401) {
        kembaliMasuk();
        return;
      }
      tanganiGalat(e);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mulai, { once: true });
  } else {
    mulai();
  }
})();
