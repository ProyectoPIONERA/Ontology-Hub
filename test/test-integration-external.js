const request = require("supertest");
const assert = require("assert");
const net = require("net");

const app = require("../config/app");

if (process.env.RUN_EXTERNAL_TESTS === "1") {
  describe("Integration External Dependencies", function () {
    this.timeout(30000);

    function expectNotServerError(res) {
      const allowedWhenBackendIsDown = [502, 503];
      assert.ok(
        res.status < 500 || allowedWhenBackendIsDown.includes(res.status),
        `Expected < 500 or 502/503 backend-unavailable, got ${res.status}`
      );
    }

    function isTcpServiceAvailable(host, port, timeoutMs) {
      return new Promise((resolve) => {
        const socket = new net.Socket();
        let settled = false;

        const done = (value) => {
          if (settled) return;
          settled = true;
          socket.destroy();
          resolve(value);
        };

        socket.setTimeout(timeoutMs);
        socket.once("connect", () => done(true));
        socket.once("timeout", () => done(false));
        socket.once("error", () => done(false));
        socket.connect(port, host);
      });
    }

    it("GET /dataset/api/v2/searchMulti?q=test (requires localhost:8181)", async () => {
      const recoAvailable = await isTcpServiceAvailable("127.0.0.1", 8181, 500);
      assert.ok(
        recoAvailable,
        "External dependency not available: expected recommendation service on 127.0.0.1:8181"
      );

      const res = await request(app)
        .get("/dataset/api/v2/searchMulti")
        .query({ q: "test" });
      expectNotServerError(res);
    });

    it("GET /dataset/api/v2/log/sparql", async () => {
      const res = await request(app)
        .get("/dataset/api/v2/log/sparql")
        .timeout({ response: 5000, deadline: 7000 });
      expectNotServerError(res);
    });
  });
}

