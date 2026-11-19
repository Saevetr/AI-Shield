const assert = require("node:assert/strict");
const { test } = require("node:test");
const createHarness = require("./check-harness.cjs");

const block = (overrides = {}) => ({
  blacklist_id: 1, user_id: 7, blacklist_type: "LINE", blacklist_value: "fixture_test_line",
  note: "使用者自行加入", created_at: "2026-11-17T00:00:00Z", ...overrides,
});
const submit = (h, type = "LINE", value = "fixture_test_line", userId = 7) =>
  h.request("post", "/report", { body: { userId, type, value, reason: "測試通報內容" } });
const history = (h, userId = 7) => h.request("get", "/reports", { query: { userId } });
const blacklist = (h, userId = 7) => h.request("get", "/blacklist", { query: { userId } });

test("phone and LINE lookups never write reports or blacklist entries", async () => {
  const h = createHarness();
  for (const [endpoint, body] of [["check-phone", { phone: "0000000000" }], ["check-line", { lineId: "fixture_test_line" }]]) {
    const result = await h.request("post", `/${endpoint}`, { body: { ...body, userId: 7 } });
    assert.equal(result.body.success, true);
  }
  assert.equal(h.calls.some((call) => /INSERT|UPDATE|DELETE/.test(call.sql)), false);
  assert.equal((await history(h)).body.data.length, 0);
  assert.equal((await blacklist(h)).body.items.length, 0);
});

test("phone and LINE reports appear in history but not the blacklist", async () => {
  const h = createHarness();
  for (const [type, value] of [["PHONE", "0000000000"], ["LINE", "fixture_test_line"]]) {
    const result = await submit(h, type, value);
    assert.equal(result.body.success, true);
    assert.equal(result.body.data.status, "審核中");
    assert.equal(result.body.data.risk, null);
    assert.equal(result.body.data.reason, "測試通報內容");
  }
  assert.equal((await history(h)).body.data.length, 2);
  assert.equal((await blacklist(h)).body.items.length, 0);
  assert.equal(h.state.reports.length, 2);
  assert.equal(h.state.blacklist.length, 0);
  assert.equal(h.calls.some((call) => /INSERT INTO blacklist/.test(call.sql)), false);
});

test("manual blocking does not create a report; later reporting leaves the block untouched", async () => {
  const h = createHarness();
  const added = await h.request("post", "/blacklist", {
    body: { userId: 7, type: "LINE ID", value: "fixture_test_line", note: "個人備註" },
  });
  assert.equal(added.statusCode, 201);
  assert.equal(added.body.data.note, "個人備註");
  assert.equal((await history(h)).body.data.length, 0);
  const originalBlock = { ...h.state.blacklist[0] };
  await submit(h);
  assert.deepEqual(h.state.blacklist[0], originalBlock);
  assert.equal((await history(h)).body.data.length, 1);
  assert.equal((await blacklist(h)).body.items.length, 1);
});

test("after reporting, manually blocking and unblocking keeps report history", async () => {
  const h = createHarness();
  await submit(h);
  const added = await h.request("post", "/blacklist", {
    body: { userId: 7, type: "LINE ID", value: "fixture_test_line" },
  });
  assert.equal(added.statusCode, 201);
  const removed = await h.request("delete", "/blacklist/:id", {
    query: { userId: 7 }, params: { id: added.body.data.id },
  });
  assert.equal(removed.body.success, true);
  assert.equal((await blacklist(h)).body.items.length, 0);
  assert.equal((await history(h)).body.data.length, 1);
});

test("repeated reports are idempotent per user and type", async () => {
  const h = createHarness();
  await submit(h);
  const repeated = await submit(h, "LINE", "FIXTURE_TEST_LINE");
  assert.equal(repeated.body.duplicate, true);
  await submit(h, "LINE", "fixture_test_line", 8);
  await submit(h, "PHONE", "0000000000");
  await submit(h, "LINE", "0000000000");
  assert.equal(h.state.reports.length, 4);
  assert.equal((await history(h)).body.data.length, 3);
  assert.equal((await history(h, 8)).body.data.length, 1);
});

test("legacy report-only blocks are hidden, preserved and can later be manually blocked", async () => {
  const h = createHarness({ blacklist: [block({ note: "使用者通報：舊通報" })] });
  assert.equal((await history(h)).body.data[0].reason, "舊通報");
  assert.equal((await blacklist(h)).body.items.length, 0);
  const added = await h.request("post", "/blacklist", {
    body: { userId: 7, type: "LINE ID", value: "fixture_test_line", note: "手動封鎖" },
  });
  assert.equal(added.statusCode, 201);
  assert.equal((await blacklist(h)).body.items.length, 1);
  assert.equal((await history(h)).body.data.length, 1);
  await submit(h);
  assert.equal((await history(h)).body.data.length, 1);
  assert.equal(h.state.blacklist.length, 2);
});

test("legacy mixed records retain explicit block notes and survive unblocking as reports", async () => {
  const h = createHarness({ blacklist: [block({ note: "REPORT: 舊通報\n原備註：我的備註" })] });
  assert.equal((await blacklist(h)).body.items[0].note, "我的備註");
  assert.equal((await history(h)).body.data[0].reason, "舊通報");
  await h.request("delete", "/blacklist/:id", { query: { userId: 7 }, params: { id: 1 } });
  assert.equal((await blacklist(h)).body.items.length, 0);
  assert.equal((await history(h)).body.data.length, 1);
});

test("manual notes mentioning reports and numeric LINE IDs are not misclassified", async () => {
  const h = createHarness();
  await h.request("post", "/blacklist", {
    body: { userId: 7, type: "LINE ID", value: "123456", note: "REPORT: 我的自訂備註" },
  });
  assert.equal((await history(h)).body.data.length, 0);
  assert.equal((await blacklist(h)).body.items[0].type, "LINE ID");
  assert.equal((await blacklist(h)).body.items[0].note, "REPORT: 我的自訂備註");
});

test("lookups exclude other users' blocks and legacy report-only records", async () => {
  const h = createHarness({ blacklist: [
    block({ user_id: 8 }), block({ blacklist_id: 2, note: "REPORT: 舊通報" }),
  ] });
  const result = await h.request("post", "/check-line", { body: { lineId: "fixture_test_line", userId: 7 } });
  assert.equal(result.body.isScam, false);
  assert.equal(result.body.matches.length, 0);
  const anonymous = await h.request("post", "/check-line", { body: { lineId: "fixture_test_line" } });
  assert.equal(anonymous.body.isScam, false);
});

test("missing member IDs never expose, save or remove personal records", async () => {
  const h = createHarness({ blacklist: [block()] });
  for (const userId of [undefined, null, "", 0, -1, "not-a-member", [], true]) {
    for (const [method, endpoint] of [["get", "/reports"], ["get", "/blacklist"],
      ["post", "/report"], ["post", "/report-line"], ["post", "/blacklist"], ["delete", "/blacklist/:id"]]) {
      const result = await h.request(method, endpoint, {
        query: { userId }, body: { userId, type: "LINE", value: "fixture_test_line" }, params: { id: 1 },
      });
      assert.equal(result.statusCode, 401);
    }
  }
  assert.equal(h.calls.length, 0);
});

test("read or write failures do not fall back to the blacklist or falsely report success", async () => {
  for (const option of ["failRead", "failWrite", "emptyWrite"]) {
    const h = createHarness({ [option]: true });
    const result = await submit(h);
    assert.equal(result.statusCode, 500);
    assert.equal(result.body.success, false);
    assert.equal(h.state.blacklist.length, 0);
    assert.equal(h.state.reports.length, 0);
    assert.equal(h.calls.some((call) => /INSERT INTO blacklist/.test(call.sql)), false);
  }
});

test("old LINE report endpoint writes to report, not blacklist", async () => {
  const h = createHarness();
  const result = await h.request("post", "/report-line", {
    body: { user_id: "7", lineId: "fixture_test_line", reason: "Test" },
  });
  assert.equal(result.body.success, true);
  assert.equal(h.state.reports.length, 1);
  assert.equal(h.state.blacklist.length, 0);
});

test("old plain-text reports can still be read via their related fraud record", async () => {
  const h = createHarness({
    reports: [{ report_id: 3, user_id: 7, fraud_id: 2, report_content: "舊內容" }],
    fraud: [{ fraud_id: 2, fraud_type: "LINE_ID", fraud_value: "fixture_test_line" }],
  });
  const result = await history(h);
  assert.equal(result.body.data[0].target, "fixture_test_line");
  assert.equal(result.body.data[0].type, "LINE");
});

test("deleting a block cannot remove another user's item", async () => {
  const h = createHarness({ blacklist: [block({ user_id: 8 })] });
  const result = await h.request("delete", "/blacklist/:id", { query: { userId: 7 }, params: { id: 1 } });
  assert.equal(result.statusCode, 404);
  assert.equal(h.state.blacklist.length, 1);
});
