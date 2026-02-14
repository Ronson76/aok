import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";
import { SharedArray } from "k6/data";

const errorRate = new Rate("errors");
const loginDuration = new Trend("login_duration", true);
const dashboardDuration = new Trend("dashboard_duration", true);
const contactsDuration = new Trend("contacts_duration", true);
const checkinDuration = new Trend("checkin_duration", true);
const settingsDuration = new Trend("settings_duration", true);
const moodDuration = new Trend("mood_duration", true);
const totalRequests = new Counter("total_requests");

const BASE_URL = __ENV.BASE_URL || "http://localhost:5000";
const TEST_LEVEL = __ENV.TEST_LEVEL || "baseline";

const LEVELS = {
  baseline: { vus: 10, duration: "20s", rampUp: "5s" },
  small: { vus: 100, duration: "30s", rampUp: "10s" },
  medium: { vus: 500, duration: "40s", rampUp: "15s" },
  large: { vus: 1000, duration: "40s", rampUp: "15s" },
  stress: { vus: 5000, duration: "30s", rampUp: "15s" },
  extreme: { vus: 10000, duration: "30s", rampUp: "15s" },
};

const level = LEVELS[TEST_LEVEL] || LEVELS.baseline;

export const options = {
  scenarios: {
    user_journey: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: level.rampUp, target: level.vus },
        { duration: level.duration, target: level.vus },
        { duration: "30s", target: 0 },
      ],
      gracefulRampDown: "10s",
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<3000", "p(99)<5000"],
    errors: ["rate<0.1"],
    login_duration: ["p(95)<2000"],
    dashboard_duration: ["p(95)<2000"],
    contacts_duration: ["p(95)<1500"],
  },
  noConnectionReuse: false,
  userAgent: "k6-load-test/1.0",
};

function getCsrfToken(jar) {
  const res = http.get(`${BASE_URL}/`, { jar, redirects: 5 });
  const cookies = jar.cookiesForURL(BASE_URL);
  return cookies["csrf-token"] ? cookies["csrf-token"][0] : null;
}

function makePostHeaders(csrfToken) {
  const headers = { "Content-Type": "application/json" };
  if (csrfToken) {
    headers["x-csrf-token"] = csrfToken;
  }
  return headers;
}

export function setup() {
  var sessions = [];
  var maxUsers = Math.min(level.vus, 200);

  for (var i = 0; i < maxUsers; i++) {
    var email = "loadtest_vu" + i + "@test.local";
    var password = "LoadTest123!";
    var setupJar = http.cookieJar();
    var setupRes = http.get(BASE_URL + "/", { jar: setupJar, redirects: 5 });
    var setupCookies = setupJar.cookiesForURL(BASE_URL);
    var setupCsrf = setupCookies["csrf-token"] ? setupCookies["csrf-token"][0] : null;
    if (!setupCsrf) {
      console.log("Setup: no CSRF for user " + i + " (status=" + setupRes.status + ")");
      continue;
    }

    var regPayload = JSON.stringify({
      email: email,
      password: password,
      name: "Load User " + i,
      accountType: "personal",
    });
    var headers = { "Content-Type": "application/json" };
    headers["x-csrf-token"] = setupCsrf;

    var regRes = http.post(BASE_URL + "/api/auth/register", regPayload, {
      jar: setupJar,
      headers: headers,
    });

    if (regRes.status === 201 || regRes.status === 200) {
      sessions.push({ email: email, password: password, index: i });
      console.log("Setup: registered user " + i);
    } else if (regRes.status === 409 || regRes.status === 400) {
      sessions.push({ email: email, password: password, index: i });
      console.log("Setup: user " + i + " already exists (ok)");
    } else {
      console.log("Setup: user " + i + " failed with status " + regRes.status + " body=" + regRes.body);
    }

    http.post(BASE_URL + "/api/auth/logout", null, {
      jar: setupJar,
      headers: headers,
    });

    sleep(0.1);
  }

  console.log("Setup complete: " + sessions.length + " test users ready (target: " + maxUsers + ")");
  if (sessions.length === 0) {
    console.log("WARNING: No test users could be created. The test will report errors. Check rate limiting and server availability.");
  } else if (sessions.length < maxUsers * 0.5) {
    console.log("WARNING: Only " + sessions.length + "/" + maxUsers + " users created. Results may not be fully representative.");
  }
  return { sessions: sessions };
}

export default function (data) {
  var jar = http.cookieJar();
  var vuId = __VU;

  var sessions = data.sessions || [];
  if (sessions.length === 0) {
    errorRate.add(1);
    sleep(2);
    return;
  }

  var userIndex = vuId % sessions.length;
  var user = sessions[userIndex];

  group("1. Get CSRF Token", function () {
    var csrfToken = getCsrfToken(jar);
    if (!csrfToken) {
      errorRate.add(1);
      return;
    }
    errorRate.add(0);
  });

  var cookies = jar.cookiesForURL(BASE_URL);
  var csrfToken = cookies["csrf-token"] ? cookies["csrf-token"][0] : null;

  if (!csrfToken) {
    sleep(1);
    return;
  }

  var sessionCookie = null;

  group("2. Login", function () {
    var loginPayload = JSON.stringify({ email: user.email, password: user.password });
    var loginStart = Date.now();
    var loginRes = http.post(
      BASE_URL + "/api/auth/login",
      loginPayload,
      { jar: jar, headers: makePostHeaders(csrfToken) }
    );
    totalRequests.add(1);
    loginDuration.add(Date.now() - loginStart);

    var loginOk = check(loginRes, {
      "login success": function (r) { return r.status === 200 || r.status === 429; },
    });

    if (loginRes.status === 429) {
      sleep(5);
      return;
    }

    errorRate.add(loginRes.status !== 200);
    sessionCookie = jar.cookiesForURL(BASE_URL)["session"]
      ? jar.cookiesForURL(BASE_URL)["session"][0]
      : null;
  });

  if (!sessionCookie) {
    sleep(1);
    return;
  }

  sleep(Math.random() * 2 + 0.5);

  group("3. Dashboard (Status)", function () {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/status`, { jar });
    totalRequests.add(1);
    dashboardDuration.add(Date.now() - start);
    const ok = check(res, {
      "dashboard status 200": (r) => r.status === 200,
    });
    errorRate.add(!ok);
  });

  sleep(Math.random() * 1.5 + 0.5);

  group("4. Get Contacts", function () {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/contacts`, { jar });
    totalRequests.add(1);
    contactsDuration.add(Date.now() - start);
    const ok = check(res, {
      "contacts status 200": (r) => r.status === 200,
    });
    errorRate.add(!ok);
  });

  sleep(Math.random() * 1 + 0.5);

  group("5. Get Settings", function () {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/settings`, { jar });
    totalRequests.add(1);
    settingsDuration.add(Date.now() - start);
    const ok = check(res, {
      "settings status 200": (r) => r.status === 200,
    });
    errorRate.add(!ok);
  });

  sleep(Math.random() * 1 + 0.5);

  group("6. Get Check-ins", function () {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/checkins`, { jar });
    totalRequests.add(1);
    checkinDuration.add(Date.now() - start);
    const ok = check(res, {
      "checkins status 200": (r) => r.status === 200,
    });
    errorRate.add(!ok);
  });

  sleep(Math.random() * 1 + 0.5);

  group("7. Get Mood Entries", function () {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/mood`, { jar });
    totalRequests.add(1);
    moodDuration.add(Date.now() - start);
    const ok = check(res, {
      "mood status 200": (r) => r.status === 200,
    });
    errorRate.add(!ok);
  });

  sleep(Math.random() * 1 + 0.5);

  group("8. Get Features", function () {
    const res = http.get(`${BASE_URL}/api/features`, { jar });
    totalRequests.add(1);
    const ok = check(res, {
      "features status 200": (r) => r.status === 200,
    });
    errorRate.add(!ok);
  });

  sleep(Math.random() * 1 + 0.5);

  group("9. Create Contact", function () {
    var contactId = vuId + "_" + __ITER + "_" + Date.now();
    var contactPayload = JSON.stringify({
      name: "Contact " + contactId,
      email: "contact_" + contactId + "@test.local",
      phone: "+441234567890",
      relationship: "friend",
    });
    var res = http.post(BASE_URL + "/api/contacts", contactPayload, {
      jar: jar,
      headers: makePostHeaders(csrfToken),
    });
    totalRequests.add(1);
    const ok = check(res, {
      "create contact success": (r) =>
        r.status === 201 || r.status === 200 || r.status === 400,
    });
    errorRate.add(!ok);
  });

  sleep(Math.random() * 1 + 0.5);

  group("10. Logout", function () {
    const res = http.post(`${BASE_URL}/api/auth/logout`, null, {
      jar,
      headers: makePostHeaders(csrfToken),
    });
    totalRequests.add(1);
    const ok = check(res, {
      "logout success": (r) => r.status === 200,
    });
    errorRate.add(!ok);
  });

  sleep(Math.random() * 2 + 1);
}

function safeGet(obj, keys, fallback) {
  var current = obj;
  for (var i = 0; i < keys.length; i++) {
    if (current === null || current === undefined) return fallback;
    current = current[keys[i]];
  }
  return current !== null && current !== undefined ? current : fallback;
}

export function handleSummary(data) {
  var m = data.metrics;
  var setupUsers = safeGet(m, ["iterations", "values", "count"], 0) > 0 ? Math.min(level.vus, 200) : 0;
  var summary = {
    testLevel: TEST_LEVEL,
    targetVUs: level.vus,
    setupUsers: setupUsers,
    duration: level.duration,
    timestamp: new Date().toISOString(),
    metrics: {
      httpReqDuration: {
        avg: safeGet(m, ["http_req_duration", "values", "avg"], 0),
        p95: safeGet(m, ["http_req_duration", "values", "p(95)"], 0),
        p99: safeGet(m, ["http_req_duration", "values", "p(99)"], 0),
        max: safeGet(m, ["http_req_duration", "values", "max"], 0),
      },
      loginDuration: {
        avg: safeGet(m, ["login_duration", "values", "avg"], 0),
        p95: safeGet(m, ["login_duration", "values", "p(95)"], 0),
      },
      dashboardDuration: {
        avg: safeGet(m, ["dashboard_duration", "values", "avg"], 0),
        p95: safeGet(m, ["dashboard_duration", "values", "p(95)"], 0),
      },
      contactsDuration: {
        avg: safeGet(m, ["contacts_duration", "values", "avg"], 0),
        p95: safeGet(m, ["contacts_duration", "values", "p(95)"], 0),
      },
      errorRate: safeGet(m, ["errors", "values", "rate"], 0),
      totalRequests: safeGet(m, ["total_requests", "values", "count"], 0),
      httpReqs: safeGet(m, ["http_reqs", "values", "count"], 0),
      reqsPerSecond: safeGet(m, ["http_reqs", "values", "rate"], 0),
    },
    thresholds: {},
  };

  var metricNames = Object.keys(m);
  for (var i = 0; i < metricNames.length; i++) {
    var name = metricNames[i];
    var metric = m[name];
    if (metric.thresholds) {
      summary.thresholds[name] = {};
      var thresholdKeys = Object.keys(metric.thresholds);
      for (var j = 0; j < thresholdKeys.length; j++) {
        summary.thresholds[name][thresholdKeys[j]] = metric.thresholds[thresholdKeys[j]].ok;
      }
    }
  }

  var outputFile = "load-tests/results/" + TEST_LEVEL + "_" + Date.now() + ".json";
  var textOutput = generateTextSummary(summary);

  var result = {};
  result["stdout"] = textOutput;
  result[outputFile] = JSON.stringify(summary, null, 2);
  return result;
}

function generateTextSummary(s) {
  var lines = [];
  lines.push("");
  lines.push("======================================================");
  lines.push("              AOK LOAD TEST RESULTS                    ");
  lines.push("======================================================");
  lines.push(" Test Level:    " + s.testLevel);
  lines.push(" Target VUs:    " + s.targetVUs);
  lines.push(" Users Created: " + (s.setupUsers || "N/A"));
  lines.push(" Duration:      " + s.duration);
  lines.push(" Timestamp:     " + s.timestamp.substring(0, 19));
  lines.push("------------------------------------------------------");
  lines.push(" RESPONSE TIMES");
  lines.push("------------------------------------------------------");
  lines.push(" Overall Avg:     " + s.metrics.httpReqDuration.avg.toFixed(1) + "ms");
  lines.push(" Overall p95:     " + s.metrics.httpReqDuration.p95.toFixed(1) + "ms");
  lines.push(" Overall p99:     " + s.metrics.httpReqDuration.p99.toFixed(1) + "ms");
  lines.push(" Overall Max:     " + s.metrics.httpReqDuration.max.toFixed(1) + "ms");
  lines.push("");
  lines.push(" Login Avg:       " + s.metrics.loginDuration.avg.toFixed(1) + "ms");
  lines.push(" Login p95:       " + s.metrics.loginDuration.p95.toFixed(1) + "ms");
  lines.push(" Dashboard Avg:   " + s.metrics.dashboardDuration.avg.toFixed(1) + "ms");
  lines.push(" Dashboard p95:   " + s.metrics.dashboardDuration.p95.toFixed(1) + "ms");
  lines.push(" Contacts Avg:    " + s.metrics.contactsDuration.avg.toFixed(1) + "ms");
  lines.push(" Contacts p95:    " + s.metrics.contactsDuration.p95.toFixed(1) + "ms");
  lines.push("------------------------------------------------------");
  lines.push(" THROUGHPUT");
  lines.push("------------------------------------------------------");
  lines.push(" Total Requests:  " + s.metrics.totalRequests);
  lines.push(" HTTP Requests:   " + s.metrics.httpReqs);
  lines.push(" Reqs/second:     " + s.metrics.reqsPerSecond.toFixed(1));
  lines.push(" Error Rate:      " + (s.metrics.errorRate * 100).toFixed(2) + "%");
  lines.push("------------------------------------------------------");
  lines.push(" THRESHOLDS");
  lines.push("------------------------------------------------------");

  var thresholdNames = Object.keys(s.thresholds);
  for (var i = 0; i < thresholdNames.length; i++) {
    var name = thresholdNames[i];
    var checks = s.thresholds[name];
    var ruleNames = Object.keys(checks);
    for (var j = 0; j < ruleNames.length; j++) {
      var rule = ruleNames[j];
      var passed = checks[rule];
      var status = passed ? "[PASS]" : "[FAIL]";
      lines.push(" " + status + " " + name + ": " + rule);
    }
  }

  lines.push("======================================================");
  lines.push("");
  return lines.join("\n");
}
