const request = require("supertest");
const assert = require("assert");

const app = require("../config/app");

describe("Integration API v2 - Vocabularies", function () {
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

  function expectVocabInfoContractOn200(res){
    if(res.status !== 200) return;
    assert.ok((res.headers["content-type"] || "").includes("application/json"));
    assert.strictEqual(typeof res.body,"object");
    assert.ok(
      !!(res.body.prefix || res.body.uri || res.body._id),
      "Expected at least one stable identifier (prefix, uri or _id)"
    );
  }

  it("GET /dataset/api/v2/vocabulary/search without q -> 400", async () => {
    const res = await request(app).get("/dataset/api/v2/vocabulary/search");
    assert.strictEqual(res.status, 400);
  });

  it("GET /dataset/api/v2/vocabulary/search?q=test", async () => {
    const res = await request(app)
      .get("/dataset/api/v2/vocabulary/search")
      .query({ q: "test" });
    expectNotServerError(res);
    expectJsonContractOn200(res);
    expectSearchContractOn200(res);
  });

  it("GET /dataset/api/v2/vocabulary/info?vocab=test", async () => {
    const res = await request(app)
      .get("/dataset/api/v2/vocabulary/info")
      .query({ vocab: "test" });
    expectNotServerError(res);
    expectJsonContractOn200(res);
    expectVocabInfoContractOn200(res);
  });

  it("GET /dataset/api/v2/vocabulary/distributions without vocab -> 400", async () => {
    const res = await request(app).get("/dataset/api/v2/vocabulary/distributions");
    assert.strictEqual(res.status, 400);
  });

  it("GET /dataset/api/v2/vocabulary/distributions?vocab=test", async () => {
    const res = await request(app)
      .get("/dataset/api/v2/vocabulary/distributions")
      .query({ vocab: "test" });
    expectNotServerError(res);
    expectJsonContractOn200(res);
  });

  it("GET /dataset/api/v2/vocabulary/distributions_all", async () => {
    const res = await request(app).get(
      "/dataset/api/v2/vocabulary/distributions_all"
    );
    expectNotServerError(res);
    expectJsonContractOn200(res);
  });

  it("GET /dataset/api/v2/vocabulary/distributions/latest without vocab -> 400", async () => {
    const res = await request(app).get(
      "/dataset/api/v2/vocabulary/distributions/latest"
    );
    assert.strictEqual(res.status, 400);
  });

  it("GET /dataset/api/v2/vocabulary/distributions/latest?vocab=test", async () => {
    const res = await request(app)
      .get("/dataset/api/v2/vocabulary/distributions/latest")
      .query({ vocab: "test" });
    expectNotServerError(res);
    expectJsonContractOn200(res);
  });

  it("GET /dataset/api/v2/vocabulary/{invalid}/distributions/{invalid}", async () => {
    const res = await request(app).get(
      "/dataset/api/v2/vocabulary/invalid/distributions/invalid"
    );
    expectNotServerError(res);
    expectJsonContractOn200(res);
  });
});
