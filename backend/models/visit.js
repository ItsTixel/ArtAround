const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const visitStepSchema = new Schema({


    entity: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Entity',
        required: true
    },

    items: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Item'
    }],

    logistic_note: {
        type: String,
        trim: true
    },

    order: {
        type: Number,
        required: true
    }

}, { _id: true });


const visitSchema = new Schema({

    title: {
        type: String,
        required: true,
        trim: true,
        maxLength: 200
    },

    description: {
        type: String,
        trim: true,
        default: ''
    },

    museum: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Museum',
        required: true
    },

    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    logistic_info: {
        ticket_info: { type: String, trim: true, default: '' },
        start_time: { type: String, trim: true, default: '' },
    },

    steps: {
        type: [visitStepSchema],
        required: true,
        validate: {
            validator: value => value.length > 0,
            message: 'One visit must have at least one step'
        }
    },

    license: {
        type: String,
        enum: ['Copyright', 'CC-BY', 'CC-BY-NC', 'CC0'],
    },

    price: {
        type: Number,
        default: 0,
        min: [0, 'Price must be non negative'],
        validate: {
            validator: function (value) {
                return !(this.license !== 'Copyright' && value > 0);
            },
            message: 'Only Copyright visits can have a price greater than 0.'
        }
    },

})
const Visit = model('Visit', visitSchema)

module.exports = Visit