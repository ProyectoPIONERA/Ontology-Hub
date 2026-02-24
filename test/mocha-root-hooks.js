"use strict";

const mongoose = require("mongoose");

module.exports = {
  mochaHooks: {
    async afterAll() {
      try {
        if (mongoose.connection && mongoose.connection.readyState !== 0) {
          await mongoose.connection.close();
        }
      } catch (err) {
        // Do not fail the suite because teardown could not close a non-critical handle.
        console.error("Test teardown warning:", err && err.message ? err.message : err);
      }
    },
  },
};

