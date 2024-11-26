const mongoose = require('mongoose');

const colleagueSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    message: { type: String, required: true },
    code: { type: String, required: true }
});

const Colleague = mongoose.model('Colleague', colleagueSchema);

module.exports = Colleague;
