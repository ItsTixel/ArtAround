const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const questionSchema = new Schema({
  text: { type: String, required: true, trim: true },
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' }, // opzionale: opera a cui si riferisce
  options: {
    type: [String],
    required: true,
    validate: { validator: v => v.length >= 2, message: 'Servono almeno 2 opzioni' }
  },
  correct_option_index: {
    type: Number,
    required: true,
    validate: {
      validator: function (v) { return Number.isInteger(v) && v >= 0 && v < this.options.length; },
      message: 'correct_option_index deve essere un indice valido di options'
    }
  }
}, { _id: true });

const quizSchema = new Schema({
  title: { type: String, trim: true, maxLength: 200 },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  questions: {
    type: [questionSchema],
    required: true,
    validate: { validator: v => v.length > 0, message: 'Un quiz deve avere almeno una domanda' }
  }
}, { timestamps: true });

module.exports = model('Quiz', quizSchema);
