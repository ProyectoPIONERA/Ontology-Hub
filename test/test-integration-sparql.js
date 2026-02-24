const request = require("supertest");
const assert = require("assert");

const app = require("../config/app");

describe("Integration API - SPARQL POST", function () {
  this.timeout(20000);

  function expectNotServerError(res) {
    const allowedWhenBackendIsDown = [502, 503];
    assert.ok(
      res.status < 500 || allowedWhenBackendIsDown.includes(res.status),
      `Expected < 500 or 502/503 backend-unavailable, got ${res.status}`
    );
  }

  it("POST /dataset/sparql basic query", async () => {
    const res = await request(app)
      .post("/dataset/sparql")
      .send({ query: "ASK { ?s ?p ?o }" })
      .set("Content-Type", "application/json");

    expectNotServerError(res);
  });

  it("POST /dataset/sparql without query -> 400", async () => {
    const res = await request(app)
      .post("/dataset/sparql")
      .send({})
      .set("Content-Type", "application/json");

    assert.strictEqual(res.status, 400);
  });
});
