const request = require("supertest");
const assert = require("assert");

const app = require("../config/app");

describe("Integration API v2 - Terms", function () {
  this.timeout(20000);

  function expectNotServerError(res) {
    const allowedWhenBackendIsDown = [502, 503];
    assert.ok(
      res.status < 500 || allowedWhenBackendIsDown.includes(res.status),
      `Expected < 500 or 502/503 backend-unavailable, got ${res.status}`
    );
  }

  function expectJsonContractOn200(res) {
    if (res.status !== 200) return;
    assert.ok(
      (res.headers["content-type"] || "").includes("application/json"),
      `Expected JSON content-type, got ${res.headers["content-type"]}`
    );
    assert.ok(res.body !== null && res.body !== undefined, "Expected non-empty JSON body");
  }

  function expectSearchContractOn200(res){
    if(res.status !== 200) return;

    assert.ok(
      (res.headers["content-type"] || "").includes("application/json"),
      `Expected JSON content-type, got ${res.headers["content-type"]}`
    );
    assert.strictEqual(typeof res.body, "object");
    assert.ok(!Array.isArray(res.body), "Expected object response for search");
    assert.ok(Array.isArray(res.body.results), "Expected body.results to be an array");

    if(res.body.total_results !== undefined){
      assert.ok(
        Number.isFinite(Number(res.body.total_results)),
        "Expected body.total_results to be numeric"
      );
    }
  }

  it("GET /dataset/api/v2/term/suggest without q -> 400", async () => {
    const res = await request(app).get("/dataset/api/v2/term/suggest");
    assert.strictEqual(res.status, 400);
  });

  it("GET /dataset/api/v2/term/suggest?q=test", async () => {
    const res = await request(app)
      .get("/dataset/api/v2/term/suggest")
      .query({ q: "test" });
    expectNotServerError(res);
    expectJsonContractOn200(res);
  });

  it("GET /dataset/api/v2/term/autocomplete?q=test", async () => {
    const res = await request(app)
      .get("/dataset/api/v2/term/autocomplete")
      .query({ q: "test" });
    expectNotServerError(res);
    expectJsonContractOn200(res);
  });

  it("GET /dataset/api/v2/term/autocompleteLabels?q=test", async () => {
    const res = await request(app)
      .get("/dataset/api/v2/term/autocompleteLabels")
      .query({ q: "test" });
    expectNotServerError(res);
    expectJsonContractOn200(res);
  });

  it("GET /dataset/api/v2/term/searchScoreExplain?q=test", async () => {
    const res = await request(app)
      .get("/dataset/api/v2/term/searchScoreExplain")
      .query({ q: "test" });
    expectNotServerError(res);
    expectJsonContractOn200(res);
  });

  it("GET /dataset/api/v2/term/search/metadata?q=test", async () => {
    const res = await request(app)
      .get("/dataset/api/v2/term/search/metadata")
      .query({ q: "test" });
    expectNotServerError(res);
    expectJsonContractOn200(res);
    expectSearchContractOn200(res)
  });
});
