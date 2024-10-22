const { Schema, model } = require("mongoose");

let test = new Schema({
  name: {
    type: String,
    required: true,
  },
});

module.exports = model("testSchema", test);
