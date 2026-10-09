document.querySelectorAll(".menu a").forEach(function (link) {
  link.addEventListener("click", function (event) {
    event.preventDefault();
    window.location.href = link.dataset.pagina;
  });
});