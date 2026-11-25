const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

// Run production route handlers without database credentials or network access.
module.exports = function createHarness({ reports = [], blacklist = [], fraud = [], ...options } = {}) {
  const state = {
    reports: reports.map((row) => ({ ...row })),
    blacklist: blacklist.map((row) => ({ ...row })),
    fraud: fraud.map((row) => ({ ...row })),
  };
  const calls = [];
  const routes = new Map();
  const router = Object.fromEntries(["get", "post", "delete"].map((method) => [
    method, (url, handler) => routes.set(`${method} ${url}`, handler),
  ]));
  const clean = (value) => String(value || "").trim().toLowerCase();
  const digits = (value) => String(value).replace(/\D/g, "");
  const db = {
    async query(sql, params = []) {
      calls.push({ sql, params: Array.from(params) });
      if (options.failRead && /^\s*SELECT/.test(sql)) throw new Error("Read unavailable");
      if (/^\s*SELECT/.test(sql)) {
        if (/FROM \[report\]/.test(sql)) {
          assert.match(sql, /WHERE r.user_id = \?/);
          return [state.reports.filter((row) => row.user_id === params[0])
            .map((row) => ({ ...row, ...state.fraud.find((item) => item.fraud_id === row.fraud_id) }))];
        }
        if (/FROM fraud_database/.test(sql)) {
          return [state.fraud.filter((row) => sql.includes("'PHONE'")
            ? row.fraud_type === "PHONE" && digits(row.fraud_value) === digits(params[0])
            : ["LINE", "LINE_ID"].includes(row.fraud_type) && clean(row.fraud_value) === clean(params[0]))];
        }
        if (/FROM blacklist/.test(sql)) {
          assert.match(sql, /user_id = \?/);
          if (/WHERE blacklist_id =/.test(sql)) {
            return [state.blacklist.filter((row) => row.blacklist_id === params[0] && row.user_id === params[1])];
          }
          if (/WHERE LOWER/.test(sql)) {
            return [state.blacklist.filter((row) => row.user_id === params[1]
              && clean(row.blacklist_value) === clean(params[0])
              && [params[2], params[3]].includes(row.blacklist_type.toUpperCase()))];
          }
          let rows = state.blacklist.filter((row) => row.user_id === params[0]);
          if (/LEFT\(note/.test(sql)) rows = rows.filter((row) =>
            String(row.note || "").startsWith(params[1]) || String(row.note || "").startsWith(params[2]));
          if (/blacklist_type\) = 'PHONE'/.test(sql)) rows = rows.filter((row) =>
            row.blacklist_type === "PHONE" && digits(row.blacklist_value) === digits(params[1]));
          if (/blacklist_type\) IN \('LINE'/.test(sql)) rows = rows.filter((row) =>
            ["LINE", "LINE_ID"].includes(row.blacklist_type) && clean(row.blacklist_value) === clean(params[1]));
          return [rows];
        }
      }
      if (options.failWrite) throw new Error("Write unavailable");
      if (options.emptyWrite) return [[]];
      if (/INSERT INTO \[report\]/.test(sql)) {
        const [user_id, report_content] = params;
        const row = { report_id: state.reports.length + 1, user_id, report_content,
          fraud_id: null, created_at: "2026-11-18T00:00:00Z" };
        state.reports.push(row);
        return [[row]];
      }
      if (/INSERT INTO blacklist/.test(sql)) {
        const [user_id, blacklist_type, blacklist_value, note] = params;
        const row = { blacklist_id: Math.max(0, ...state.blacklist.map((item) => item.blacklist_id)) + 1,
          user_id, blacklist_type, blacklist_value, note, created_at: "2026-11-18T00:00:00Z" };
        state.blacklist.push(row);
        return [[row]];
      }
      if (/UPDATE blacklist/.test(sql)) {
        const row = state.blacklist.find((item) => item.blacklist_id === params[1] && item.user_id === params[2]);
        if (row) row.note = params[0];
        return [[]];
      }
      if (/DELETE FROM blacklist/.test(sql)) {
        const index = state.blacklist.findIndex((row) => row.blacklist_id === params[0] && row.user_id === params[1]);
        return [index < 0 ? [] : state.blacklist.splice(index, 1)];
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
  };
  vm.runInNewContext(readFileSync(path.join(__dirname, "../routes/check.js"), "utf8"), {
    require: (name) => {
      if (name === "express") return { Router: () => router };
      if (name === "./db") return db;
      throw new Error(`Unexpected import: ${name}`);
    },
    module: { exports: {} }, console: { error() {}, warn() {} },
  });
  return {
    state, calls, options,
    async request(method, url, input = {}) {
      const response = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = JSON.parse(JSON.stringify(body)); return this; },
      };
      await routes.get(`${method} ${url}`)({ body: {}, query: {}, params: {}, ...input }, response);
      return response;
    },
  };
};
