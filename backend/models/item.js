const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const descriptionSchema = new Schema({
  duration_sec: { type: Number, required: true },
  text:         { type: String, required: true, trim: true }
}, { _id: false });

const itemSchema = new Schema({
  marketplace_summary: {
    type: String, required: true, trim: true, maxLength: 300
  }, 

  artwork: {
    type: mongoose.Schema.Types.ObjectId, ref: 'Entity', required: true
  },

  author: {
    type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true
  },

  license: {
    type: String,
    enum: ['Public', "Private", "Reserved"],
    default: 'Public'
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
      validator: v => v.length > 0,
      message: 'Un item deve avere almeno una descrizione'
    }
  },

  image_url: { type: String, trim: true },
  alt_text:  { type: String, trim: true },

  tags: { type: [String], default: [] }

}, { timestamps: true });

const Item = model('Item', itemSchema);

module.exports = Item;
