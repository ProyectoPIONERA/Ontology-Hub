function downloadTextFile(filename, text) {
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

function getAstreaStats(text) {
  var raw = (text || "").replace(/\r\n/g, "\n");
  var lines = raw ? raw.split("\n").length : 0;
  var shapes = (raw.match(/\bsh:NodeShape\b/g) || []).length;
  var bytes = new TextEncoder().encode(raw).length;
  return { raw: raw, lines: lines, shapes: shapes, bytes: bytes };
}

function callAstrea(uri, sourceUrl, options) {
  var opts = options || {};
  if (!uri && !sourceUrl) {
    return Promise.reject(new Error("Astrea input is undefined."));
  }

  var endpoint = "/dataset/api/v2/validators/astrea?";
  var params = [];
  if (uri) params.push("uri=" + encodeURIComponent(uri));
  if (sourceUrl) params.push("sourceUrl=" + encodeURIComponent(sourceUrl));
  endpoint += params.join("&");

  return fetch(endpoint, {
    method: "GET",
    headers: { Accept: "text/rdf+turtle,text/plain;q=0.9,*/*;q=0.8" },
  })
    .then(function (response) {
      return response.text().then(function (body) {
        if (!response.ok) {
          var err = new Error("Astrea proxy error");
          err.status = response.status;
          err.statusText = response.statusText;
          err.body = body;
          throw err;
        }
        return body;
      });
    })
    .then(function (text) {
      if (opts.download !== false) {
        downloadTextFile("astrea.ttl", text);
      }
      if (typeof opts.onSuccess === "function") {
        opts.onSuccess(text);
      }
      return text;
    });
}

function runAstreaFromToolbar(uri, sourceUrl) {
  if (typeof window.activateOntologyTab === "function") {
    window.activateOntologyTab("astrea");
  }

  var container = document.getElementById("astreaVocabContainer");
  if (!uri && container) {
    uri = container.getAttribute("data-uri");
  }
  if (!sourceUrl && container) {
    sourceUrl = container.getAttribute("data-source-url");
  }
  window.__astreaPendingRun = { uri: uri, sourceUrl: sourceUrl };

  var runButton = document.getElementById("callAstreaButton");
  if (runButton) {
    setTimeout(function () {
      runButton.click();
    }, 0);
  }
}

document.addEventListener("DOMContentLoaded", function () {
  var tabs = document.querySelectorAll(".ontology-tab");
  var panels = document.querySelectorAll(".ontology-tab-panel");

  function activateOntologyTab(name) {
    tabs.forEach(function (tab) {
      var active = tab.getAttribute("data-onto-target") === name;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });
    panels.forEach(function (panel) {
      panel.classList.toggle(
        "is-active",
        panel.getAttribute("data-onto-panel") === name
      );
    });
    if (typeof window.jQuery === "function") {
      window.jQuery(window).trigger("resize");
    }
    if (
      name === "version-history" &&
      window.tl &&
      typeof window.tl.layout === "function"
    ) {
      setTimeout(function () {
        window.tl.layout();
      }, 0);
    }
  }

  window.activateOntologyTab = activateOntologyTab;

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function (event) {
      event.preventDefault();
      activateOntologyTab(tab.getAttribute("data-onto-target"));
    });
  });

  if (tabs.length && panels.length) {
    activateOntologyTab("general");
  }

  var container = document.getElementById("astreaVocabContainer");
  var runButton = document.getElementById("callAstreaButton");
  var loadingMessage = document.getElementById("astreaLoadingMessage");
  var loadingHint = document.getElementById("astreaLoadingHint");
  var loadingImage = document.getElementById("astreaLoadingImage");
  var results = document.getElementById("astrea-results");
  var output = document.getElementById("astreaOutput");
  var meta = document.getElementById("astreaMeta");
  var copyButton = document.getElementById("copyAstreaButton");
  var downloadButton = document.getElementById("downloadAstreaButton");

  if (
    !container ||
    !runButton ||
    !loadingMessage ||
    !loadingHint ||
    !loadingImage ||
    !results ||
    !output ||
    !meta ||
    !copyButton ||
    !downloadButton
  ) {
    return;
  }

  var latest = "";
  var defaultUri = container.getAttribute("data-uri");
  var defaultSourceUrl = container.getAttribute("data-source-url");

  results.style.display = "none";
  loadingMessage.style.display = "block";
  loadingImage.style.display = "none";
  copyButton.disabled = true;
  downloadButton.disabled = true;

  runButton.addEventListener("click", function () {
    var pending = window.__astreaPendingRun || {};
    var uri = pending.uri || defaultUri;
    var sourceUrl = pending.sourceUrl || defaultSourceUrl;
    window.__astreaPendingRun = null;

    runButton.disabled = true;
    loadingHint.style.display = "none";
    loadingImage.style.display = "block";
    results.style.display = "none";

    callAstrea(uri, sourceUrl, {
      download: false,
      onSuccess: function (text) {
        var stats = getAstreaStats(text);
        latest = stats.raw;
        output.textContent = latest || "Empty Astrea response.";
        meta.textContent =
          "Lines: " +
          stats.lines +
          " | NodeShapes: " +
          stats.shapes +
          " | Size: " +
          stats.bytes +
          " bytes";
        copyButton.disabled = latest.length === 0;
        downloadButton.disabled = latest.length === 0;
        results.style.display = "block";
      },
    })
      .catch(function (error) {
        var details = error && error.body ? "\n" + error.body : "";
        output.textContent =
          "Error when contacting Astrea: " +
          (error.status || "") +
          " " +
          (error.statusText || error.message || "Unknown error") +
          details;
        meta.textContent = "";
        copyButton.disabled = true;
        downloadButton.disabled = true;
        results.style.display = "block";
      })
      .finally(function () {
        runButton.disabled = false;
        loadingImage.style.display = "none";
        loadingMessage.style.display = "none";
      });
  });

  copyButton.addEventListener("click", function () {
    if (!latest || !navigator.clipboard) {
      return;
    }
    navigator.clipboard.writeText(latest).catch(function () {});
  });

  downloadButton.addEventListener("click", function () {
    if (!latest) {
      return;
    }
    downloadTextFile("astrea.ttl", latest);
  });
});
