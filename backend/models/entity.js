const mongoose = require('mongoose');
const { Schema, model } = mongoose;
/*
Risorse per studiare i concetti che ho usato (pls leggeteli"):
Validatori : https://mongoosejs.com/docs/validation.html
Enum : https://www.geeksforgeeks.org/mongodb/how-to-create-and-use-enum-in-mongoose/
Trim : https://stackoverflow.com/questions/20766360/whats-the-meaning-of-trim-when-use-in-mongoose
*/
const entitySchema = new Schema({
    name: {
        type: String,
        required: true
    },
    // Helps differentiate between actual artwork and concept 
    is_physical: {
        type: Boolean,
        required: true
    },
    museum: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Museum",
        validate: {
            validator: function (value) {
                if (!this.is_physical) { return value == null }
                return true;
            },
            message: "An abstract concept can't have a museum"
        }
    },
    /* TODO: Discuss about design of location field
    Advantages of having it in here : easier navigation in navigator (e.g. check if current room and next room is different istantly)
    */
    location: {
        type: {
            room: {
                type: String,
                trim: true
            },
            floor: {
                type: String,
                trim: true
            },
            note: {
                type: String,
                trim: true
            }
        },

        validate: {
            validator: function (value) {
                if (!this.is_physical) { return value == null }
                return true;
            },
            message: "An abstract concept can't have a location"
        }

    },
    author: {
        type: String,
        trim: true
    },



})
const Entity = model('Entity', entitySchema)

module.exports = Entity