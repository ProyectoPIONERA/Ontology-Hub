const request = require("supertest");
const assert = require("assert");

const app = require("../../config/app");

describe("Contract API v2 - Agent Info", function () {
  this.timeout(20000);

  it("returns 500 when agent query param is missing (current contract)", async () => {
    const res = await request(app).get("/dataset/api/v2/agent/info");
    assert.strictEqual(res.status, 500);
  });

  it("returns JSON when agent query param is provided", async () => {
    const res = await request(app)
      .get("/dataset/api/v2/agent/info")
      .query({ agent: "test" });

    assert.ok(
      [200, 404].includes(res.status),
      `Unexpected status: ${res.status}`
    );

    if (res.status === 200) {
      assert.ok((res.headers["content-type"] || "").includes("application/json"));
      assert.strictEqual(typeof res.body, "object");
    }
  });
});
