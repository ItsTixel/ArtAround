const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const visitSchema = new Schema({

})
const Visit = model('Visit', visitSchema)

module.exports = Visit