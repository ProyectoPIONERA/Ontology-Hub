function downloadThemisTextFile(filename, text) {
  var element = document.createElement("a");
  element.setAttribute(
    "href",
    "data:text/plain;charset=utf-8," + encodeURIComponent(text)
  );
  element.setAttribute("download", filename);
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

function getThemisStats(text) {
  var raw = (text || "").replace(/\r\n/g, "\n");
  var lines = raw ? raw.split("\n").length : 0;
  var bytes = new TextEncoder().encode(raw).length;
  return { raw: raw, lines: lines, bytes: bytes };
}

function normalizeCheckStatus(value) {
  var token = (value || "").toString().toLowerCase().trim();
  if (
    token === "pass" ||
    token === "passed" ||
    token === "ok" ||
    token === "success" ||
    token === "true"
  ) {
    return "pass";
  }
  if (
    token === "fail" ||
    token === "failed" ||
    token === "error" ||
    token === "false"
  ) {
    return "fail";
  }
  if (token === "warn" || token === "warning") {
    return "warn";
  }
  return "other";
}

function extractChecksFromJson(value, acc, seen) {
  if (!value || acc.length > 500) {
    return;
  }
  if (typeof value !== "object") {
    return;
  }
  if (seen.has(value)) {
    return;
  }
  seen.add(value);

  if (Array.isArray(value)) {
    for (var i = 0; i < value.length; i += 1) {
      extractChecksFromJson(value[i], acc, seen);
    }
    return;
  }

  var statusSource =
    value.status ||
    value.result ||
    value.outcome ||
    value.verdict ||
    value.severity ||
    (typeof value.passed !== "undefined" ? String(value.passed) : "");
  var status = normalizeCheckStatus(statusSource);

  if (status !== "other") {
    var testName =
      value.name ||
      value.test ||
      value.rule ||
      value.check ||
      value.id ||
      value.message ||
      "Unnamed check";
    var problem =
      value.problem ||
      value.error ||
      value.details ||
      value.message ||
      (status === "pass" ? "None" : "-");

    acc.push({
      status: status,
      test: String(testName),
      problem: String(problem || (status === "pass" ? "None" : "-")),
    });
  }

  var keys = Object.keys(value);
  for (var j = 0; j < keys.length; j += 1) {
    extractChecksFromJson(value[keys[j]], acc, seen);
  }
}

function extractChecksFromText(raw) {
  var checks = [];
  var lines = (raw || "").split("\n");
  var statusPattern = /\b(pass(?:ed)?|ok|success|fail(?:ed)?|error|warn(?:ing)?)\b/i;

  for (var i = 0; i < lines.length; i += 1) {
    var line = lines[i].trim();
    if (!line) {
      continue;
    }
    var match = line.match(statusPattern);
    if (!match) {
      continue;
    }
    checks.push({
      status: normalizeCheckStatus(match[1]),
      test: line,
      problem: normalizeCheckStatus(match[1]) === "pass" ? "None" : "-",
    });
    if (checks.length > 500) {
      break;
    }
  }
  return checks;
}

function normalizeThemisResultToken(value) {
  var token = (value || "").toString().toLowerCase().trim();
  if (token === "pass" || token === "passed" || token === "ok" || token === "success" || token === "true") {
    return "pass";
  }
  if (token === "warn" || token === "warning") {
    return "warn";
  }
  return "fail";
}

function extractChecksFromThemisResults(value, acc) {
  if (!value || acc.length > 500) {
    return;
  }

  if (Array.isArray(value)) {
    for (var i = 0; i < value.length; i += 1) {
      extractChecksFromThemisResults(value[i], acc);
    }
    return;
  }

  if (typeof value !== "object") {
    return;
  }

  if (!value.Test || !Array.isArray(value.Results)) {
    return;
  }

  var status = "pass";
  for (var j = 0; j < value.Results.length; j += 1) {
    var resultItem = value.Results[j] || {};
    var resultStatus = normalizeThemisResultToken(resultItem.Result);
    if (resultStatus === "fail") {
      status = "fail";
      break;
    }
    if (resultStatus === "warn") {
      status = "warn";
    }
  }

  acc.push({
    status: status,
    test: "Test " + (acc.length + 1),
    problem: status === "pass" ? "None" : String(value.Test || "-"),
  });
}

function statusTagLabel(status) {
  if (status === "pass") return "Passed";
  if (status === "fail") return "Failed";
  if (status === "warn") return "Warning";
  return "Info";
}

function renderThemisVisual(raw, tableBodyEl) {
  if (!tableBodyEl) {
    return;
  }

  tableBodyEl.innerHTML = "";

  var checks = [];
  try {
    var parsed = JSON.parse(raw);
    extractChecksFromThemisResults(parsed, checks);
    if (checks.length === 0) {
      extractChecksFromJson(parsed, checks, new Set());
    }
  } catch (e) {}

  if (checks.length === 0) {
    checks = extractChecksFromText(raw);
  }

  if (checks.length === 0) {
    var emptyRow = document.createElement("tr");
    emptyRow.innerHTML =
      '<td colspan="3" class="themis-empty-row">No structured checks detected</td>';
    tableBodyEl.appendChild(emptyRow);
    return;
  }

  var maxItems = Math.min(checks.length, 120);
  for (var i = 0; i < maxItems; i += 1) {
    var item = checks[i];
    var row = document.createElement("tr");
    row.className = "themis-result-row";

    var testCell = document.createElement("td");
    testCell.className = "themis-test-cell";
    testCell.textContent = item.test || "Unnamed check";

    var resultCell = document.createElement("td");
    resultCell.className = "themis-result-cell";
    var statusTag = document.createElement("span");
    statusTag.className = "themis-result-tag themis-result-tag-" + item.status;
    statusTag.textContent = statusTagLabel(item.status);
    resultCell.appendChild(statusTag);

    var problemCell = document.createElement("td");
    problemCell.className = "themis-problem-cell";
    problemCell.textContent = item.problem || "-";

    row.appendChild(testCell);
    row.appendChild(resultCell);
    row.appendChild(problemCell);
    tableBodyEl.appendChild(row);
  }
}

function callThemisExample(sourceUrl, sourceText) {
  var payload = {};
  if (sourceText) {
    payload.sourceText = sourceText;
  } else if (sourceUrl) {
    payload.sourceUrl = sourceUrl;
  } else {
    return Promise.reject(new Error("Themis source is undefined."));
  }

  return fetch("/dataset/api/v2/validators/themis/example", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/plain;q=0.9, */*;q=0.8",
    },
    body: JSON.stringify(payload),
  }).then(function (response) {
    return response.text().then(function (body) {
      if (!response.ok) {
        var err = new Error("Themis example proxy error");
        err.status = response.status;
        err.statusText = response.statusText;
        err.body = body;
        throw err;
      }
      return body;
    });
  });
}

function callThemis(uri, tests, sourceUrl) {
  if (!uri) {
    return Promise.reject(new Error("Themis URI is undefined."));
  }

  var payload = { uri: uri, tests: tests || "" };
  if (sourceUrl) {
    payload.sourceUrl = sourceUrl;
  }
  return fetch("/dataset/api/v2/validators/themis", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/plain,*/*;q=0.8",
    },
    body: JSON.stringify(payload),
  }).then(function (response) {
    return response.text().then(function (body) {
      if (!response.ok) {
        var err = new Error("Themis proxy error");
        err.status = response.status;
        err.statusText = response.statusText;
        err.body = body;
        throw err;
      }
      return body;
    });
  });
}

function getThemisErrorText(err) {
  var raw = err && (err.body || err.message) ? (err.body || err.message) : String(err || "");
  raw = raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return raw.substring(0, 500) || "Themis request failed.";
}

function runThemisFromToolbar(uri, sourceUrl) {
  if (typeof window.activateOntologyTab === "function") {
    window.activateOntologyTab("themis");
  }

  var container = document.getElementById("themisVocabContainer");
  var finalUri = uri || (container ? container.getAttribute("data-uri") : "");
  var finalSourceUrl =
    sourceUrl || (container ? container.getAttribute("data-source-url") : "");

  window.__themisPendingRun = { uri: finalUri, sourceUrl: finalSourceUrl };

  var runButton = document.getElementById("callThemisButton");
  if (runButton) {
    setTimeout(function () {
      runButton.click();
    }, 0);
  }
}

document.addEventListener("DOMContentLoaded", function () {
  var container = document.getElementById("themisVocabContainer");
  var generateButton = document.getElementById("callThemisButton");
  var executeButton = document.getElementById("executeThemisButton");
  var downloadButton = document.getElementById("downloadThemisButton");
  var editorContainer = document.getElementById("themis-editor-container");
  var editor = document.getElementById("themisTestEditor");
  var editorMeta = document.getElementById("themisEditorMeta");
  var loadingImage = document.getElementById("themisLoadingImage");
  var loadingHint = document.getElementById("themisLoadingHint");
  var results = document.getElementById("themis-results");
  var resultsBody = document.getElementById("themisResultsBody");
  var modeAuto = document.getElementById("themisModeAuto");
  var modeManual = document.getElementById("themisModeManual");
  var uploadContainer = document.getElementById("themisUploadContainer");
  var testFileInput = document.getElementById("themisTestFile");
  var fileMeta = document.getElementById("themisFileMeta");

  if (
    !container ||
    !generateButton ||
    !executeButton ||
    !editorContainer ||
    !editor ||
    !results
  ) {
    return;
  }

  function resolveFallbackSourceUrl(sourceUrl) {
    if (sourceUrl) {
      return sourceUrl;
    }

    var direct = container.getAttribute("data-source-url") || "";
    if (direct) {
      return direct;
    }

    var prefix = container.getAttribute("data-vocab-prefix") || "";
    var versionName = container.getAttribute("data-version-name") || "";
    if (prefix && /^v\d{4}-\d{2}-\d{2}$/.test(versionName)) {
      return "/dataset/vocabs/" + prefix + "/versions/" + versionName.substring(1) + ".n3";
    }

    return "";
  }

  var defaultUri = container.getAttribute("data-uri");
  var defaultSourceUrl = resolveFallbackSourceUrl(
    container.getAttribute("data-source-url")
  );
  var latest = "";
  var autoLatest = "";
  var autoTestsCache = "";
  var manualTestsCache = "";
  var currentAutoMode = isAutoMode();

  results.style.display = "none";
  editorContainer.style.display = "none";
  if (loadingImage) {
    loadingImage.style.display = "none";
  }
  executeButton.disabled = true;
  if (downloadButton) {
    downloadButton.style.display = "none";
    downloadButton.disabled = true;
  }

  function setDownloadVisibility(visible) {
    if (!downloadButton) {
      return;
    }
    downloadButton.style.display = visible ? "" : "none";
    downloadButton.disabled = !visible;
  }

  function setLoading(active, text) {
    if (loadingHint) {
      loadingHint.textContent = text || "It may take a few seconds";
      loadingHint.style.display = "block";
    }
    if (loadingImage) {
      loadingImage.style.display = active ? "block" : "none";
    }
    generateButton.disabled = active;
    executeButton.disabled = active || !editor.value.trim();
  }

  function setManualTestsFromText(text, filename){
    var normalized = (text || "").replace(/\r\n/g, "\n");
    manualTestsCache = normalized;
    editor.value = normalized;
    executeButton.disabled = !normalized.trim();

    if(fileMeta){
      if(filename){
        fileMeta.textContent = 
          "Loaded: " + filename + " (" + normalized.split("\n").length + " lines)";
      }else{
        fileMeta.textContent = normalized.trim()
          ? "Loaded from file."
          : "No file selected.";
      }
    }
  }

  if(testFileInput){
    testFileInput.addEventListener("change", function (){
      var file = testFileInput.files && testFileInput.files[0];
      if(!file){
        setManualTestsFromText("", "");
        return;
      }

      var reader = new FileReader();

      reader.onload = function(evt){
        var content = (evt && evt.target && evt.target.result) || "";
        setManualTestsFromText(String(content), file.name);
      };

      reader.onerror = function(){
        alert("Error reading file.");
        setManualTestsFromText("", "");
      };

      reader.readAsText(file, "utf-8");
    });
  }

  function isAutoMode() {
    return !!(modeAuto && modeAuto.checked);
  }

  function refreshModeUI() {
    var auto = isAutoMode();

    if (currentAutoMode) {
      autoTestsCache = editor.value || "";
    } else {
      manualTestsCache = editor.value || "";
    }
    currentAutoMode = auto;

    generateButton.textContent = auto ? "EXECUTE THEMIS" : "PREPARE TESTS";
    generateButton.style.display = auto ? "" : "none";
    executeButton.style.display = auto ? "none" : "";

    if (editorMeta) {
      editorMeta.textContent = auto
        ? "Example tests generated. You can edit them before execution."
        : "Manual mode. Upload a text file with your tests.";
    }
    if (editor) {
      editor.style.display = auto ? "block" : "none";
    }
    if (uploadContainer) {
      uploadContainer.style.display = auto ? "none" : "block";
    }

    if (loadingHint) {
      loadingHint.textContent = auto
        ? "Automatic mode: tests will be generated from API."
        : "Manual mode: use your own tests.";
    }

    if (!auto) {
      editor.value = manualTestsCache;
      editorContainer.style.display = "block";
      results.style.display = "none";
      setDownloadVisibility(false);
      executeButton.disabled = !editor.value.trim();
      if (!editor.value.trim()) {
        editor.focus();
      }
      return;
    }

    editor.value = autoTestsCache;
    editorContainer.style.display = autoTestsCache.trim() ? "block" : "none";
    if (autoLatest.trim()) {
      latest = autoLatest;
      renderThemisVisual(autoLatest, resultsBody);
      results.style.display = "block";
      setDownloadVisibility(true);
    } else {
      results.style.display = "none";
      setDownloadVisibility(false);
    }
    executeButton.disabled = true;
  }

  editor.addEventListener("input", function () {
    executeButton.disabled = !editor.value.trim();
    if (isAutoMode()) {
      autoTestsCache = editor.value || "";
    } else {
      manualTestsCache = editor.value || "";
    }
  });

  if (modeAuto) modeAuto.addEventListener("change", refreshModeUI);
  if (modeManual) modeManual.addEventListener("change", refreshModeUI);
  refreshModeUI();

  generateButton.addEventListener("click", function () {
    var pending = window.__themisPendingRun || {};
    var sourceUrl = resolveFallbackSourceUrl(
      pending.sourceUrl || defaultSourceUrl
    );
    if (pending.uri) {
      defaultUri = pending.uri;
    }
    if (pending.sourceUrl) {
      defaultSourceUrl = resolveFallbackSourceUrl(pending.sourceUrl);
    }
    window.__themisPendingRun = null;

    if (!isAutoMode()) {
      editorContainer.style.display = "block";
      results.style.display = "none";
      executeButton.disabled = !editor.value.trim();
      if (!editor.value.trim()) {
        editor.focus();
      }
      setLoading(false, "Manual mode: upload a text file with your tests.");
      return;
    }

    var currentTests = autoTestsCache || editor.value || "";
    if (currentTests.trim()) {
      setLoading(true, "Running Themis with current tests...");
      editorContainer.style.display = "block";
      results.style.display = "none";
      callThemis(defaultUri, currentTests, sourceUrl)
        .then(function (text) {
          var stats = getThemisStats(text);
          latest = stats.raw;
          autoLatest = stats.raw;
          renderThemisVisual(latest, resultsBody);
          results.style.display = "block";
          setDownloadVisibility(true);
        })
        .catch(function (err) {
          var errText = getThemisErrorText(err);
          alert("Error running Themis: " + errText);
          setDownloadVisibility(false);
        })
        .finally(function () {
          setLoading(false, "Tests ready for editing.");
        });
      return;
    }

    if (!sourceUrl) {
      setLoading(true, "Running Themis directly from ontology URI...");
      callThemis(defaultUri, "", "")
        .then(function (text) {
          var stats = getThemisStats(text);
          latest = stats.raw;
          autoLatest = stats.raw;
          renderThemisVisual(latest, resultsBody);
          results.style.display = "block";
          setDownloadVisibility(true);
        })
        .catch(function (err) {
          var errText = getThemisErrorText(err);
          alert("Error in automatic mode: " + errText);
          setDownloadVisibility(false);
        })
        .finally(function () {
          setLoading(false, "Tests ready for editing.");
        });
      return;
    }

    setLoading(true, "Generating example tests...");
    callThemisExample(sourceUrl)
      .then(function (text) {
        var generatedTests = (text || "").replace(/\r\n/g, "\n");
        autoTestsCache = generatedTests;
        editor.value = generatedTests;
        editorContainer.style.display = "block";
        executeButton.disabled = !editor.value.trim();
        results.style.display = "none";
        return callThemis(defaultUri, generatedTests, sourceUrl);
      })
      .then(function (text) {
        var stats = getThemisStats(text);
        latest = stats.raw;
        autoLatest = stats.raw;
        renderThemisVisual(latest, resultsBody);
        results.style.display = "block";
        setDownloadVisibility(true);
      })
      .catch(function (err) {
        var exampleError = getThemisErrorText(err);
        setLoading(true, "Themis could not generate example tests. Running direct validation...");
        return callThemis(defaultUri, "", sourceUrl)
          .then(function (text) {
            var stats = getThemisStats(text);
            latest = stats.raw;
            autoLatest = stats.raw;
            renderThemisVisual(latest, resultsBody);
            results.style.display = "block";
            setDownloadVisibility(true);
          })
          .catch(function (directErr) {
            var directError = getThemisErrorText(directErr);
            editorContainer.style.display = "block";
            results.style.display = "none";
            alert("Themis automatic mode failed. Example generation: " + exampleError + " Direct validation: " + directError);
            setDownloadVisibility(false);
          });
      })
      .finally(function () {
        setLoading(false, "Tests ready for editing.");
      });
  });

  executeButton.addEventListener("click", function () {
    var tests = editor.value || "";
    if (!tests.trim()) {
      return;
    }

    setLoading(true, "Running Themis with your tests...");
    results.style.display = "none";

    callThemis(defaultUri, tests, resolveFallbackSourceUrl(defaultSourceUrl))
      .then(function (text) {
        var stats = getThemisStats(text);
        latest = stats.raw;
        renderThemisVisual(latest, resultsBody);
        results.style.display = "block";
        setDownloadVisibility(true);
      })
      .catch(function (err) {
        var errText = err.body || err.message || String(err);
        renderThemisVisual("", resultsBody);
        results.style.display = "block";
        setDownloadVisibility(false);
      })
      .finally(function () {
        setLoading(false, "Tests ready for editing.");
      });
  });

  if (downloadButton) {
    downloadButton.addEventListener("click", function () {
      if (!latest || !latest.trim()) {
        return;
      }
      var now = new Date();
      var stamp =
        now.getFullYear() +
        "-" +
        String(now.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(now.getDate()).padStart(2, "0") +
        "_" +
        String(now.getHours()).padStart(2, "0") +
        String(now.getMinutes()).padStart(2, "0") +
        String(now.getSeconds()).padStart(2, "0");
      downloadThemisTextFile("themis-results-" + stamp + ".txt", latest);
    });
  }
});
