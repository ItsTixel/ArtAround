class MuseumCard extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        const template = document.getElementById("museum-card-template");
        this.attachShadow({ mode: "open" })
            .appendChild(template.content.cloneNode(true));
    }
}
customElements.define("museum-card", MuseumCard);