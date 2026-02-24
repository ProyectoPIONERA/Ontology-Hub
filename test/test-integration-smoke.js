const request = require("supertest");
const assert = require("assert");

const app = require("../config/app");

describe("Integration API v2 - General Smoke", function () {
  this.timeout(20000);

  function expectNotServerError(res) {
    const allowedWhenBackendIsDown = [502, 503];
    assert.ok(
      res.status < 500 || allowedWhenBackendIsDown.includes(res.status),
      `Expected < 500 or 502/503 backend-unavailable, got ${res.status}`
    );
  }

  it("GET /dataset/api/v2/vocabulary/list", async () => {
    const res = await request(app).get("/dataset/api/v2/vocabulary/list");
    expectNotServerError(res);
  });

  it("GET /dataset/api/v2/search (term search alias) with q=test", async () => {
    const res = await request(app)
      .get("/dataset/api/v2/search")
      .query({ q: "test" });
    expectNotServerError(res);
  });

  it("GET /dataset/api/v2/validators/astrea without uri -> 400", async () => {
    const res = await request(app).get("/dataset/api/v2/validators/astrea");
    assert.strictEqual(res.status, 400);
  });

  it("GET /dataset/api/v2/validators/themis without uri -> 400", async () => {
    const res = await request(app).get("/dataset/api/v2/validators/themis");
    assert.strictEqual(res.status, 400);
  });

});
