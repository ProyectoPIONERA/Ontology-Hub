const request = require("supertest");
const assert = require("assert");

const app = require("../config/app");

describe("Integration API v2 - Remaining Endpoints", function () {
  this.timeout(30000);

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

  function expectSearchContractOn200(res) {
    if (res.status !== 200) return;

    assert.ok(
      (res.headers["content-type"] || "").includes("application/json"),
      `Expected JSON content-type, got ${res.headers["content-type"]}`
    );
    assert.strictEqual(typeof res.body, "object");
    assert.ok(!Array.isArray(res.body), "Expected object response for search");
    assert.ok(Array.isArray(res.body.results), "Expected body.results to be an array");

    if (res.body.total_results !== undefined) {
      assert.ok(
        Number.isFinite(Number(res.body.total_results)),
        "Expected body.total_results to be numeric"
      );
    }
  }

  async function getKnownPrefix() {
    const res = await request(app).get("/dataset/api/v2/vocabulary/list");
    if (res.status !== 200 || !Array.isArray(res.body) || !res.body.length) {
      return null;
    }

    const candidate = res.body.find((item) => item && typeof item.prefix === "string");
    return candidate ? candidate.prefix : null;
  }

  it("GET /dataset/api/v2/autocomplete/terms?q=test", async () => {
    const res = await request(app)
      .get("/dataset/api/v2/autocomplete/terms")
      .query({ q: "test" });
    expectNotServerError(res);
    expectJsonContractOn200(res);
  });

  it("GET /dataset/api/v2/term/search without q -> 400", async () => {
    const res = await request(app).get("/dataset/api/v2/term/search");
    assert.strictEqual(res.status, 400);
  });

  it("GET /dataset/api/v2/term/search?q=test", async () => {
    const res = await request(app)
      .get("/dataset/api/v2/term/search")
      .query({ q: "test" });
    expectNotServerError(res);
    expectJsonContractOn200(res);
    expectSearchContractOn200(res);
  });

  it("GET /dataset/api/v2/agent/autocomplete?q=test", async () => {
    const res = await request(app)
      .get("/dataset/api/v2/agent/autocomplete")
      .query({ q: "test" });
    expectNotServerError(res);
    expectJsonContractOn200(res);
  });

  it("GET /dataset/api/v2/agent/autocompleteFull?q=test", async () => {
    const res = await request(app)
      .get("/dataset/api/v2/agent/autocompleteFull")
      .query({ q: "test" });
    expectNotServerError(res);
    expectJsonContractOn200(res);
  });

  it("GET /dataset/api/v2/vocabulary/autocomplete?q=test", async () => {
    const res = await request(app)
      .get("/dataset/api/v2/vocabulary/autocomplete")
      .query({ q: "test" });
    expectNotServerError(res);
    expectJsonContractOn200(res);
  });

  it("GET /dataset/api/v2/autocomplete/vocabularies?q=test", async () => {
    const res = await request(app)
      .get("/dataset/api/v2/autocomplete/vocabularies")
      .query({ q: "test" });
    expectNotServerError(res);
    expectJsonContractOn200(res);
  });

  it("GET /dataset/api/v2/vocabulary/:artefact/resources", async function () {
    const prefix = await getKnownPrefix();
    if (!prefix) this.skip();

    const res = await request(app).get(
      `/dataset/api/v2/vocabulary/${encodeURIComponent(prefix)}/resources`
    );
    expectNotServerError(res);
    expectJsonContractOn200(res);
  });

  it("GET /dataset/api/v2/vocabulary/:artefact/resources/:resource", async function () {
    const prefix = await getKnownPrefix();
    if (!prefix) this.skip();

    const res = await request(app).get(
      `/dataset/api/v2/vocabulary/${encodeURIComponent(prefix)}/resources/nonexistent:resource`
    );

    assert.ok(
      [200, 404, 502, 503].includes(res.status) || res.status < 500,
      `Unexpected status: ${res.status}`
    );
    expectJsonContractOn200(res);
  });

  it("GET /dataset/api/v2/vocabulary/:vocab/resources/type/:type", async function () {
    const prefix = await getKnownPrefix();
    if (!prefix) this.skip();

    const res = await request(app).get(
      `/dataset/api/v2/vocabulary/${encodeURIComponent(prefix)}/resources/type/class`
    );
    expectNotServerError(res);
    expectJsonContractOn200(res);
  });

  it("GET /dataset/api/v2/vocabulary/prefix/exists without prefix -> 500 (current contract)", async () => {
    const res = await request(app).get("/dataset/api/v2/vocabulary/prefix/exists");
    assert.strictEqual(res.status, 500);
  });

  it("GET /dataset/api/v2/vocabulary/prefix/exists?prefix=test", async () => {
    const res = await request(app)
      .get("/dataset/api/v2/vocabulary/prefix/exists")
      .query({ prefix: "test" });
    expectNotServerError(res);
    expectJsonContractOn200(res);
  });

  it("GET /dataset/api/v2/log/clickEvent with minimal params", async () => {
    const res = await request(app).get("/dataset/api/v2/log/clickEvent").query({
      date: new Date().toISOString(),
      sess: "test-session",
      term: "test-term",
    });
    expectNotServerError(res);
    if (res.status === 200) {
      assert.strictEqual(typeof res.text, "string");
    }
  });

  it("GET /dataset/api/v2/log/clickVocEvent with minimal params", async () => {
    const res = await request(app).get("/dataset/api/v2/log/clickVocEvent").query({
      date: new Date().toISOString(),
      sessionId: "test-session",
      voc: "test-voc",
    });
    expectNotServerError(res);
    if (res.status === 200) {
      assert.strictEqual(typeof res.text, "string");
    }
  });

  it("GET /dataset/api/v2/log/queryVocEvent with minimal params", async () => {
    const res = await request(app).get("/dataset/api/v2/log/queryVocEvent").query({
      date: new Date().toISOString(),
      sessionId: "test-session",
      searchWords: "test",
      page: "1",
      nbResults: "0",
      results: "[]",
    });
    expectNotServerError(res);
    if (res.status === 200) {
      assert.strictEqual(typeof res.text, "string");
    }
  });

  it("GET /dataset/api/v2/patterns without vocs -> 400", async () => {
    const res = await request(app).get("/dataset/api/v2/patterns");
    assert.strictEqual(res.status, 400);
  });

  it("GET /dataset/api/v2/validators/astrea with uri", async () => {
    const res = await request(app)
      .get("/dataset/api/v2/validators/astrea")
      .query({ uri: "https://schema.org/" });
    expectNotServerError(res);
  });

  it("GET /dataset/api/v2/validators/themis with uri", async () => {
    const res = await request(app)
      .get("/dataset/api/v2/validators/themis")
      .query({ uri: "https://schema.org/" });
    expectNotServerError(res);
  });
});
