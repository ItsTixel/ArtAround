const mongoose = require('mongoose');
const { Schema, model } = mongoose;

/*
Risorse per studiare i concetti che ho usato (pls leggeteli"):
Validatori : https://mongoosejs.com/docs/validation.html
Enum : https://www.geeksforgeeks.org/mongodb/how-to-create-and-use-enum-in-mongoose/
*/

const descriptionSchema = new Schema({
    duration_sec: { type: Number, required: true },
    text: { type: String, required: true, trim: true }
}, { _id: false });


const itemSchema = new Schema({
    marketplace_summary: {
        type: String,
        required: true,
        trim: true,// Remove leading and trailing whitespace from the string at the beginning and end of the string
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
        required: true
    },

    descriptions: {
        type: [descriptionSchema],
        required: true,
        validate: {
            validator: value => value.length > 0,
            message: 'Un item deve avere almeno una descrizione'
        }
    },

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

    image_url: {
        type: String,
        required: true,
        trim: true,
        match: [/^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i, 'Please fill a valid URL']
    }
},
    {
        timestamps: true //for ordering items by creation date
})


const Item = model('Item', itemSchema)

module.exports = Item