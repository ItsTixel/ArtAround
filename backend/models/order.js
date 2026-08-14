const mongoose = require('mongoose');
const { Schema, model } = mongoose;

// Un ordine viene creato quando un utente adotta una visita (vedi
// adoptVisit in controllers/user.js) e cancellato se la rimuove. Tiene
// traccia di prezzo pagato e data, cosa che il semplice array
// User.adopted_visits non permette, per rendere possibile lo storico
// acquisti (lato buyer) e lo storico vendite (lato seller/author).
const orderSchema = new Schema({
    buyer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    visit: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Visit',
        required: true
    },

    price_paid: {
        type: Number,
        required: true,
        min: [0, 'Price must be non negative']
    }
}, {
    timestamps: true
});

// Un utente adotta una data visita una volta sola (adoptVisit usa
// $addToSet sull'array equivalente su User).
orderSchema.index({ buyer: 1, visit: 1 }, { unique: true });

const Order = model('Order', orderSchema);

module.exports = Order;
