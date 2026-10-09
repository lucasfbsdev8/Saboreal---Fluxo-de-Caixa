const links = document.querySelectorAll(".menu a");

links.forEach(function (link) {
  link.addEventListener("click", function (event) {
    event.preventDefault(); // impede o "#" de rolar a página
    window.location.href = link.dataset.pagina;
  });
});