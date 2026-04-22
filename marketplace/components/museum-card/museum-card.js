class MuseumCard extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        this.attachShadow({ mode: "open" }).innerHTML = `
        <div>Nome museo: <slot name="museum-name"></slot></div>
        <div>Indirizzo museo: <slot name="museum-address"></slot></div>

        `;
    }
}
customElements.define("museum-card", MuseumCard);