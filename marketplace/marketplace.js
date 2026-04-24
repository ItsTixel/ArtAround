const API_BASE = window.location.hostname === "localhost"
    ? "http://localhost:8000"
    : "https://your-production-domain.com";

async function getMuseums() {
    const res = await fetch(`${API_BASE}/api/museums/`);
    if (!res.ok) throw new Error(res.statusText);
    return res.json();
}

async function fillBody() {
    const museums = await getMuseums()
    const div = document.getElementById("body")
    div.innerHTML += `<div>Elementi totali : ${museums.totalItems}</div>`
    div.innerHTML += `<div>Elementi nella pagina : ${museums.pageSize}</div>`
    museums.data.forEach(m => {
        div.innerHTML += `
        <museum-card>
      <span slot="museum-name">${m.name}</span>
      <span slot="museum-address">${m.address.street}</span>
    </museum-card>`
    });
    console.log(museums)

}

window.onload = async function(){
    await fillBody()
};