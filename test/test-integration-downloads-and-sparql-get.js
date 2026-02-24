const request = require("supertest");
const assert = require("assert");

const app = require("../config/app");

describe("Integration API - Downloads and SPARQL GET", function () {
  this.timeout(30000);

  function expectNotServerError(res) {
    const allowedWhenBackendIsDown = [502, 503];
    assert.ok(
      res.status < 500 || allowedWhenBackendIsDown.includes(res.status),
      `Expected < 500 or 502/503 backend-unavailable, got ${res.status}`
    );
  }

  async function getKnownPrefix() {
    const res = await request(app).get("/dataset/api/v2/vocabulary/list");
    if (res.status !== 200 || !Array.isArray(res.body) || !res.body.length) {
      return null;
    }

    const candidate = res.body.find((item) => item && typeof item.prefix === "string");
    return candidate ? candidate.prefix : null;
  }

  it("GET /dataset/sparql without query -> 400", async () => {
    const res = await request(app).get("/dataset/sparql");
    assert.strictEqual(res.status, 400);
  });

  it("GET /dataset/sparql basic query", async () => {
    const res = await request(app)
      .get("/dataset/sparql")
      .query({ query: "ASK { ?s ?p ?o }" })
      .set("Accept", "application/sparql-results+json");
    expectNotServerError(res);
  });

  it("GET /dataset/vocabs/:vocabPx/versions/:date.n3", async function () {
    const prefix = await getKnownPrefix();
    if (!prefix) this.skip();

    const res = await request(app).get(
      `/dataset/vocabs/${encodeURIComponent(prefix)}/versions/1900-01-01.n3`
    );

    assert.ok(
      [200, 404, 500].includes(res.status),
      `Unexpected status: ${res.status}`
    );
  });

  it("GET /dataset/vocabs/versions/:identifier/diagrams/:fileName.svg", async () => {
    const res = await request(app).get(
      "/dataset/vocabs/versions/invalid/diagrams/invalid.svg"
    );

    assert.ok(
      [200, 404, 500].includes(res.status),
      `Unexpected status: ${res.status}`
    );
  });

  it("GET /dataset/vocabs/:vocabPx/artifacts/:type/:fileName invalid type -> 400", async function () {
    const prefix = await getKnownPrefix();
    if (!prefix) this.skip();

    const res = await request(app).get(
      `/dataset/vocabs/${encodeURIComponent(prefix)}/artifacts/invalid/file.txt`
    );
    assert.strictEqual(res.status, 400);
  });

  it("GET /dataset/vocabs/:vocabPx/artifacts/:type/:fileName missing file -> 404", async function () {
    const prefix = await getKnownPrefix();
    if (!prefix) this.skip();

    const res = await request(app).get(
      `/dataset/vocabs/${encodeURIComponent(prefix)}/artifacts/tests/nonexistent-file.txt`
    );
    assert.strictEqual(res.status, 404);
  });
});
