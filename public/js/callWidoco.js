function runWidocoFromToolbar(uri, sourceUrl, prefix) {
  var container = document.getElementById("widocoVocabContainer");
  if (container) {
    if (uri) container.setAttribute("data-uri", uri);
    if (sourceUrl) container.setAttribute("data-source-url", sourceUrl);
    if (prefix) container.setAttribute("data-vocab-prefix", prefix);
  }

  if (typeof window.activateOntologyTab === "function") {
    window.activateOntologyTab("widoco");
  }
}

function fetchWidocoLatest(prefix, ontologyVersion) {
  var query = "prefix=" + encodeURIComponent(prefix || "");
  if (ontologyVersion) {
    query += "&ontologyVersion=" + encodeURIComponent(ontologyVersion);
  }
  return fetch("/dataset/api/v2/docs/widoco/latest?" + query, {
    method: "GET",
    headers: {
      Accept: "application/json, text/plain;q=0.9, */*;q=0.8",
    },
  }).then(function (response) {
    return response.text().then(function (raw) {
      var body = {};
      try {
        body = raw ? JSON.parse(raw) : {};
      } catch (e) {
        body = { error: raw || "Invalid response from server" };
      }
      if (!response.ok) {
        var err = new Error(body.error || "No WIDOCO documentation available.");
        err.status = response.status;
        err.body = body;
        throw err;
      }
      return body;
    });
  });
}

function generateWidoco(uri, sourceUrl, prefix, ontologyVersion, version) {
  return fetch("/dataset/api/v2/docs/widoco", {
    method: "POST",
    headers: {
      Accept: "application/json, text/plain;q=0.9, */*;q=0.8",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      uri: uri || "",
      sourceUrl: sourceUrl || "",
      prefix: prefix || "ontology",
      ontologyVersion: ontologyVersion || "",
      version: version || "v1.4.25",
    }),
  }).then(function (response) {
    return response.text().then(function (raw) {
      var body = {};
      try {
        body = raw ? JSON.parse(raw) : {};
      } catch (e) {
        body = { error: raw || "Invalid response from server" };
      }
      if (!response.ok) {
        var err = new Error(body.error || "WIDOCO generation failed.");
        err.status = response.status;
        err.body = body;
        throw err;
      }
      return body;
    });
  });
}

document.addEventListener("DOMContentLoaded", function () {
  var container = document.getElementById("widocoVocabContainer");
  var loadingHint = document.getElementById("widocoLoadingHint");
  var results = document.getElementById("widoco-results");
  var releaseLink = document.getElementById("widocoReleaseLink");
  var downloadLink = document.getElementById("widocoDownloadLink");
  var previewFrame = document.getElementById("widocoPreviewFrame");
  var previewPlaceholder = document.getElementById("widocoPreviewPlaceholder");
  var preview = document.getElementById("widocoPreview");

  if (
    !container ||
    !loadingHint ||
    !results ||
    !releaseLink ||
    !downloadLink ||
    !previewFrame ||
    !previewPlaceholder ||
    !preview
  ) {
    return;
  }

  function adaptWidocoIframe() {
    try {
      var doc =
        preview.contentDocument ||
        (preview.contentWindow && preview.contentWindow.document);
      if (!doc || !doc.head || !doc.body) return;
      var styleId = "hub-widoco-frame-fix";
      if (!doc.getElementById(styleId)) {
        var style = doc.createElement("style");
        style.id = styleId;
        style.textContent =
          "html,body{max-width:100% !important; overflow-x:auto !important;}" +
          ".container{max-width:100% !important; width:100% !important; margin:0 !important; box-sizing:border-box !important;}" +
          "img,svg,iframe,canvas{max-width:100% !important;}" +
          "#vowlGraph,#graph{max-width:100% !important;}";
        doc.head.appendChild(style);
      }
    } catch (e) {}
  }

  preview.addEventListener("load", adaptWidocoIframe);

  function showUnavailable(message) {
    loadingHint.textContent = message || "WIDOCO documentation is not available yet.";
    previewFrame.style.display = "block";
    previewPlaceholder.style.display = "flex";
    preview.style.display = "none";
    preview.removeAttribute("src");
    results.style.display = "none";
  }

  function showAvailable(data) {
    var outputUrl = data.outputUrl || "";
    var zipUrl = data.zipUrl || "";
    if (!outputUrl) {
      return showUnavailable("WIDOCO documentation is not available yet.");
    }

    loadingHint.textContent = "WIDOCO documentation available.";
    releaseLink.href = outputUrl;
    releaseLink.textContent = "Open generated documentation";
    if (zipUrl) {
      downloadLink.href = zipUrl;
      downloadLink.style.display = "inline";
    } else {
      downloadLink.style.display = "none";
      downloadLink.setAttribute("href", "#");
    }
    results.style.display = "block";
    preview.setAttribute("src", outputUrl);
    previewPlaceholder.style.display = "none";
    preview.style.display = "block";
  }

  var prefix = container.getAttribute("data-vocab-prefix") || "";
  var ontologyVersion = container.getAttribute("data-ontology-version") || "";
  var uri = container.getAttribute("data-uri") || "";
  var sourceUrl = container.getAttribute("data-source-url") || "";
  var version = container.getAttribute("data-version") || "v1.4.25";

  if (!prefix) {
    showUnavailable("WIDOCO documentation is not available yet.");
    return;
  }

  function generateAndShow(message) {
    loadingHint.textContent = message || "Generating WIDOCO documentation. This may take a few minutes...";
    return generateWidoco(uri, sourceUrl, prefix, ontologyVersion, version)
      .then(showAvailable)
      .catch(function (error) {
        var details = error && error.body && error.body.error ? " " + error.body.error : "";
        showUnavailable("WIDOCO generation failed." + details);
      });
  }

  fetchWidocoLatest(prefix, ontologyVersion)
    .then(showAvailable)
    .catch(function () {
      if (ontologyVersion) {
        fetchWidocoLatest(prefix, "")
          .then(showAvailable)
          .catch(function () {
            generateAndShow("Generating WIDOCO documentation for this ontology version. This may take a few minutes...");
          });
      } else {
        generateAndShow("Generating WIDOCO documentation for this ontology. This may take a few minutes...");
      }
    });
});
