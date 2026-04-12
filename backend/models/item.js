const mongoose = require('mongoose');
const { Schema, model } = mongoose;

/*
Risorse per studiare i concetti che ho usato (pls leggeteli"):
Validatori : https://mongoosejs.com/docs/validation.html
Enum : https://www.geeksforgeeks.org/mongodb/how-to-create-and-use-enum-in-mongoose/
*/

const descriptionSchema = new Schema({
    duration_sec: { type: Number, required: true },
    text: { type: String, required: true }
}, { _id: false });


const itemSchema = new Schema({
    marketplace_summary: {
        type: String,
        required: true,
        maxLength: 300
    },
    artwork: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Entity',
        required: true
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    license: {
        type: String,
        enum: ['Copyright', 'CC-BY', 'CC-BY-NC', 'CC0'],
    },
    tone: {
        type: String,
        enum: ['childish', 'simple', 'medium', 'technical'],
    },
    descriptions: [descriptionSchema],

    price: {
        type: Number,
        default: 0,
        min: [0, 'Price must be non negative'],
        validate: {
            validator: function (value) {
                return !(this.license !== 'Copyright' && value > 0);
            },
            message: 'Only Copyright items can have a price greater than 0.'
        }
    },

    image_url: String
})

const Item = model('Item', itemSchema)

module.exports = Item