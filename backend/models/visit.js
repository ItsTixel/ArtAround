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

    steps: {
        type: [visitStepSchema],
        required: true,
        validate: {
            validator: value => value.length > 0,
            message: 'One visit must have at least one step'
        }
    },

    base_price: {
        type: Number,
        default : 0,
        min: [0, 'Price must be non negative'],
    },

    public: {
        type: Boolean,
        default: false
    }

})

//TODO Check price calculation
visitSchema.virtual('total_price').get(function () {
    return this.steps
        .flatMap(step => step.items)
        .reduce((sum, item) => sum + (item.price ?? 0), this.base_price ?? 0);
});


//visitSchema.set('toJSON', { virtuals: true });//serve per includere i campi virtuali (come total_price) quando si converte il documento in JSON 

const Visit = model('Visit', visitSchema)

module.exports = Visit