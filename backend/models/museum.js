const mongoose = require('mongoose');
const { Schema, model } = mongoose;

/*
Risorse per studiare i concetti che ho usato (pls leggeteli"):
Virtual : https://mongoosejs.com/docs/populate.html
*/

// TODO Add more fields
const museumSchema = new Schema({
    name : {
    type: String,
    required: true,
    trim: true,
  },
  address: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    zip: { type: String, trim: true },
    country: { type: String, trim: true, default: 'Italia' }
  },

    
}, {
  toJSON: { virtuals: true }, 
  toObject: { virtuals: true }
})

museumSchema.virtual('entities', {
  ref: 'Entity',
  localField: '_id',
  foreignField: 'museum'
});
const Museum = model('Museum', museumSchema)

module.exports = Museum