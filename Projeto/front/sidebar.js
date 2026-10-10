var paginaAtual = location.pathname.split("/").pop() || "inicio.html";
 
document.querySelectorAll(".sidebar a[href$='.html']").forEach(function (link) {
  if (link.getAttribute("href") !== paginaAtual) return;
  link.classList.add("ativo");
  var grupo = link.closest(".grupo");
  if (grupo) grupo.classList.add("aberto");
});
var linksSub = document.querySelectorAll(".grupo.aberto .submenu a");
 
function mostrar(nome) {
  document.querySelectorAll(".secao").forEach(function (secao) {
    secao.classList.toggle("visivel", secao.id === nome);
  });
  linksSub.forEach(function (link) {
    var ativo = link.dataset.secao === nome;
    link.classList.toggle("ativo", ativo);
    if (ativo) document.querySelector(".topo h1").textContent = link.textContent.trim();
  });
}
 
if (linksSub.length > 0) {
  linksSub.forEach(function (link) {
    link.addEventListener("click", function (event) {
      event.preventDefault();
      mostrar(link.dataset.secao);
      history.replaceState(null, "", "#" + link.dataset.secao);
    });
  });
 
  var inicial = location.hash.slice(1);
  var existe = Array.from(linksSub).some(function (l) { return l.dataset.secao === inicial; });
  mostrar(existe ? inicial : linksSub[0].dataset.secao);
 
  var principal = document.querySelector(".grupo.aberto > a");
  principal.addEventListener("click", function (event) {
    event.preventDefault();
    mostrar(linksSub[0].dataset.secao);
    history.replaceState(null, "", location.pathname);
  });
}