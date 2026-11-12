(function () {
  var kunci = "tema";
  var pilihan = "terang";
  try {
    var simpan = localStorage.getItem(kunci);
    if (simpan === "gelap" || simpan === "terang") pilihan = simpan;
  } catch (e) {}
  document.documentElement.setAttribute("data-tema", pilihan);
})();
