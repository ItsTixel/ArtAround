const mongoose = require('mongoose');
const { Schema, model } = mongoose;

/*
Risorse per studiare i concetti che ho usato (pls leggeteli"):
Virtual : https://mongoosejs.com/docs/populate.html
*/

// TODO Add more fields
const museumSchema = new Schema({
    name : {
        type : String,
        required : true,
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