document.addEventListener("DOMContentLoaded", function () {

  // Obtener la URI del vocabulario desde el atributo data-uri
  const vocabContainer = document.getElementById("vocabContainer");
  const uri = vocabContainer.getAttribute("data-uri");
  const foopsHeader = document.getElementById("foopsHeader");

  // Inicialmente ocultar resultados y mensaje de carga
  document.getElementById("foops-results").style.display = "none";
  document.getElementById("loadingMessage").style.display = "block";
  document.getElementById("loadingImage").style.display = "none";
  document
    .getElementById("callFoopsButton")
    .addEventListener("click", function () {

      // Mostrar el mensaje de espera y el GIF
      document.getElementById("loadingMessage").style.display = "block";
      document.getElementById("loadingImage").style.display = "block";
      document.getElementById("callFoopsButton").style.display = "none"; // Ocultar el botón mientras se hace la llamada
      document.getElementById("loadingHint").style.display = "none"; // Oculta texto

      if (uri) {
        // Llamar a FOOPS con la URI correcta
        callFoops(uri);
        foopsHeader.classList.add("hide-hint");
      } else {
        console.error("La URI de la ontología no es válida.");
      }
    });
});

function callFoops(uri) {

  if (!uri) {
    console.error("Error: La URI está undefined o es inválida.");
    return; // Salir de la función si la URI no es válida
  }

  const data = JSON.stringify({ ontologyUri: uri });
  const xhr = new XMLHttpRequest();

  const startTime = performance.now();

  xhr.addEventListener("readystatechange", function () {
    if (this.readyState === this.DONE) {
      const endTime = performance.now();
      const executionTime = (endTime - startTime) / 1000; // Convertir a segundos

      // Ocultar el GIF de carga y volver a mostrar el botón
      document.getElementById("loadingImage").style.display = "none"; // Ocultar el GIF
      document.getElementById("loadingMessage").style.display = "none"; // Mostrar el botón nuevamente

      if (this.status === 200) {
        const results = JSON.parse(this.responseText);
        loadChecks(results);
        loadInfo(results);

        // Mostrar los resultados
        document.getElementById("foops-results").style.display = "block";
      } else {
        console.error("Error:", this.status, this.statusText);
        console.error("Response Text:", this.responseText);
        alert(
          "Error when contacting the server: " +
            this.status +
            " " +
            this.statusText
        );
      }
    }
  });

  xhr.open("POST", "https://foops.linkeddata.es/assessOntology");
  xhr.setRequestHeader("accept", "application/json;charset=UTF-8");
  xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");

  xhr.send(data);
}

function loadInfo(result) {
  var title = document.querySelector("#title");
  title.textContent = result.ontology_title;

  var URI = document.querySelector("#URI-title");
  URI.textContent = result.ontology_URI;

  var license = document.querySelector("#license");
  license.textContent = result.ontology_license;
}

var typeInputSelected = "URI";

function openInput(evt, elem) {
  hideTabContent();

  deactivateSelectors();

  showSelector(evt, elem);
}

function hideTabContent() {
  // Seleccionamos todos los elementos con selector-content y los ocultamos
  var tabcontent = document.getElementsByClassName("selector-content");
  for (var i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }
}

function deactivateSelectors() {
  // Se elimina active de todos los selector
  var tablinks = document.getElementsByClassName("selector");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }
}

function showSelector(evt, elem) {
  // Se muestra el contenido y se pone como active el contenido
  document.getElementById(elem).style.display = "flex";
  evt.currentTarget.className += " active";

  typeInputSelected = elem;
}

function run(object) {
  result = object;

  if (result != "Error") {
    loadResults();

    showResults();
  } else {
    showError();
  }
}

function showResults() {
  // Esconder Error
  var resultBlock = document.querySelector("#error");
  resultBlock.style.display = "none";

  // Muestra resultados
  var resultBlock = document.querySelector("#test-results");
  resultBlock.style.display = "block";
}

function showError() {
  // Esconde resultados
  var resultBlock = document.querySelector("#test-results");
  resultBlock.style.display = "none";

  // Muestra error
  var resultBlock = document.querySelector("#error");
  resultBlock.style.display = "block";
}

function loadResults() {
  loadInfo(result);

  loadGrafics(result);

  loadCategory("Findable", result);
  loadCategory("Accessible", result);
  loadCategory("Interoperable", result);
  loadCategory("Reusable", result);
}

function getAverageChecks(checks) {
  total = 0;
  for (let i = 0; i < checks.length; i++) {
    total += checks[i].total_passed_tests / checks[i].total_tests_run;
  }
  return total / checks.length;
}

function getPassedChecks(checks) {
  var passedChecks = 0;
  var totalChecks = 0;

  for (let i = 0; i < checks.length; i++) {
    passedChecks += checks[i].total_passed_tests / checks[i].total_tests_run;
    totalChecks = i + 1;
  }

  if (passedChecks % 1 != 0) {
    passedChecks = passedChecks.toFixed(2);
  }

  return `(` + passedChecks + `/` + totalChecks + `)`;
}

function getAbsolutePassedChecks(checks) {
  var passedChecks = 0;

  for (let i = 0; i < checks.length; i++) {
    passedChecks += checks[i].total_passed_tests;
  }

  return passedChecks;
}

function loadGrafics(result) {
  var graphics = document.querySelector("#graphics");
  var graphicScore = document.querySelector("#graphicScore");
  var graphicSpider = document.querySelector("#graphicSpider");
  var popupScore = document.querySelector("#scorePopup");
  var passedChecks = 0;

  graphicScore.innerHTML = getRadialScoreHTML(result.overall_score, 1.6);
  graphicSpider.innerHTML = getSpiderGraphHTML(result);

  // checks = groupBy(result.checks, "category_id")
  // passedChecks = getAbsolutePassedChecks(checks['Findable']) + getAbsolutePassedChecks(checks['Accessible']) + getAbsolutePassedChecks(checks['Interoperable']) + getAbsolutePassedChecks(checks['Reusable']);

  //popupScore.innerHTML = `<h4>Overall score</h4>
  //                      <p>Percentage of passed tests (` + passedChecks + `/24)</p> `;

  //   graphics.innerHTML = `
  //     <div class="col-6 d-flex align-items-center justify-content-center">`
  //     + getRadialScoreHTML(result.overall_score, 1.6) +
  //     `
  //     </div>
  //     <div class="col-6 d-flex align-items-center justify-content-center pt-4">`
  //    + getSpiderGraphHTML(result) + `
  //    </div>
  //  `
}

function getSpiderGraphHTML(result) {
  checks = groupBy(result.checks, "category_id");

  category_results = {
    Findable: getAverageChecks(checks["Findable"]),
    Accessible: getAverageChecks(checks["Accessible"]),
    Interoperable: getAverageChecks(checks["Interoperable"]),
    Reusable: getAverageChecks(checks["Reusable"]),
  };

  points = {
    center: {
      x: 57,
      y: 50,
    },
    reusable: {
      x: 22,
      y: 50,
    },
    findable: {
      x: 57,
      y: 15,
    },
    accesible: {
      x: 91,
      y: 50,
    },
    interoperable: {
      x: 57,
      y: 85,
    },
  };

  expFindable = getPassedChecks(checks["Findable"]);

  expAccessible = getPassedChecks(checks["Accessible"]);

  expInteroperable = getPassedChecks(checks["Interoperable"]);

  expReusable = getPassedChecks(checks["Reusable"]);

  loadCategory("Findable", result);

  loadCategory("Accessible", result);

  loadCategory("Interoperable", result);

  loadCategory("Reusable", result);

  return (
    `
    <svg height="200" width="250" viewBox="-90 0 300 100" transform="scale(1.3,1.3)">  
      <rect x="50" y="-30" transform="rotate(45)" width="50" height="50" fill="#fff" stroke-width="1" stroke="black" />
      <line x1="22" y1="50" x2="91" y2="50" stroke-width="1" stroke="black"></line>
      <line x1="57" y1="15" x2="57" y2="85" stroke-width="1" stroke="black"></line>
      
      <!-- Nuevo color aplicado -->
      <path fill="#82bac78A" stroke-linecap="round" stroke-width="1" stroke="#82bac7" 
            d="` +
    getSpiderDraw(points, category_results) +
    `"/>
      
      <text x="10" y="50" text-anchor="end" dy="7" font-size="10">Reusable ` +
    expReusable +
    ` </text>
      <text x="57" y="0" text-anchor="middle" dy="7" font-size="10">Findable ` +
    expFindable +
    ` </text>
      <text x="95" y="50" text-anchor="start" dy="7" font-size="10">Accessible ` +
    expAccessible +
    ` </text>
      <text x="57" y="90" text-anchor="middle" dy="7" font-size="10">Interoperable ` +
    expInteroperable +
    ` </text>
    </svg>
    `
  );
}

function getSpiderPoint(center, maximum, score) {
  distance_x = maximum.x - center.x;
  distance_y = maximum.y - center.y;

  point = null;

  if (distance_x == 0) {
    point = { x: center.x, y: center.y + distance_y * score };
  } else {
    point = { x: center.x + distance_x * score, y: center.y };
  }

  return point.x + ` ` + point.y;
}

function getSpiderDraw(points, category_results) {
  return (
    `M ` +
    getSpiderPoint(points.center, points.reusable, category_results.Reusable) +
    ` L ` +
    getSpiderPoint(points.center, points.findable, category_results.Findable) +
    ` L ` +
    getSpiderPoint(
      points.center,
      points.accesible,
      category_results.Accessible
    ) +
    ` L ` +
    getSpiderPoint(
      points.center,
      points.interoperable,
      category_results.Interoperable
    ) +
    ` L ` +
    getSpiderPoint(points.center, points.reusable, category_results.Reusable)
  );
}

function getRadialScoreHTML(score, size) {
  const percentage = Math.round(score * 100);
  const barWidth = 130 * size; // Ajusta tamaño según el factor `size`
  const barHeight = 30 * size;

  let color;
  if (score === 0) {
    color = "#FFFFFF"; // blanco
  } else if (score < 0.5) {
    color = "#E65A28"; // naranja
  } else if (score < 1) {
    color = "#ffa500"; // amarillo
  } else {
    color = "#84B399"; // verde
  }

  return `
    <div style="width: ${barWidth}px; height: ${barHeight}px; background-color: #FBFBFB; border: 1px solid #ccc; overflow: hidden; position: relative;">
      <div style="width: ${percentage}%; height: 100%; background-color: ${color}; transition: width 0.3s;"></div>
      <span style="position: absolute; top: 0; left: 50%; transform: translateX(-50%); font-size: ${
        14 * size
      }px; line-height: ${barHeight}px; color: #000;">
        ${percentage}%
      </span>
    </div>
  `;
}

/*
function getRadialScoreHTML(score, size) {
  total = 251.2;
  graphic_value = total * score;
  stroke = total - graphic_value;

  if (score == 1) {
    return (
      `
    <svg height="100" width="100" transform="scale(` +
      size +
      `,` +
      size +
      `)">
      <circle cx="50" cy="50" r="45" fill="#FBFBFB"/>
      <path fill="none" stroke-linecap="round" stroke-width="5" stroke="#84B399"
            stroke-dasharray="` +
      graphic_value +
      `,` +
      stroke +
      `"
            d="M50 10
              a 40 40 0 0 1 0 80
              a 40 40 0 0 1 0 -80"/>
      <text x="50" y="50" text-anchor="middle" dy="7" font-size="20">` +
      Math.round(score * 100) +
      `%</text>
    </svg>
      `
    );
  }

  return (
    `
    <svg height="100" width="100" transform="scale(` +
    size +
    `,` +
    size +
    `)">
      <circle cx="50" cy="50" r="45" fill="#FBFBFB"/>
      <path fill="none" stroke-linecap="round" stroke-width="5" stroke="#E65A28"
            stroke-dasharray="` +
    graphic_value +
    `,` +
    stroke +
    `"
            d="M50 10
              a 40 40 0 0 1 0 80
              a 40 40 0 0 1 0 -80"/>
      <text x="50" y="50" text-anchor="middle" dy="7" font-size="20">` +
    Math.round(score * 100) +
    `%</text>
    </svg>
  
    `
  );
}
*/

/**
 * Dummy method for returning a hardcoded JSON for testing
 */
function getResults() {
  var input = document.querySelector("#" + typeInputSelected + "_input").value;

  if (input == "error") {
    return "Error";
  }

  // TO-DO
  // Aqui iría la llamada al backend

  return {
    ontology_URI: "la uri https://w3id.org/okn/o/sd",
    ontology_title: " probando The Software Description Ontology",
    ontology_license: " la licencia",
    overall_score: 0.8888889,
    checks: [
      {
        id: "CN1",
        principle_id: "A1",
        category_id: "Accessible",
        status: "ok",
        explanation: "Ontology available in: HTML, RDF",
        description:
          "Checks if the ontology URI is published following the right content negotiation for RDF and HTML",
        total_passed_tests: 2,
        total_tests_run: 5,
        affected_elements: ["URI1", "URI2"],
      },
      {
        id: "PURL1",
        principle_id: "F1",
        category_id: "Findable",
        status: "ok",
        explanation:
          "Ontology URI is persistent (w3id, purl, DOI, or a W3C URL)",
        description: " Check if the ontology uses a persistent URL",
        total_passed_tests: 3,
        total_tests_run: 4,
      },
      {
        id: "DOC1",
        principle_id: "R1",
        category_id: "Reusable",
        status: "ok",
        explanation: "Ontology available in HTML",
        description: "Check if the ontology has an HTML documentation",
        total_passed_tests: 2,
        total_tests_run: 6,
      },
      {
        id: "RDF1",
        principle_id: "I1",
        category_id: "Interoperable",
        status: "ok",
        explanation: "Ontology available in RDF",
        description: "Check if the ontology has an RDF serialization",
        total_passed_tests: 3,
        total_tests_run: 3,
      },
      {
        id: "OM1",
        principle_id: "F2",
        category_id: "Findable",
        status: "unchecked",
        explanation: "All metadata found!",
        description:
          "Check to see is the following  minimum metadata [title, description, license, version iri, creator, creationDate, namespace URI] are present",
        total_passed_tests: 5,
        total_tests_run: 6,
      },
      {
        id: "OM2",
        principle_id: "F2",
        category_id: "Findable",
        status: "unchecked",
        explanation:
          "The following metadata was not found: creation date, citation",
        description:
          "Check to see if the following recommended metadata [NS Prefix, version info, contributor, creation date, citation] are present",
        total_passed_tests: 3,
        total_tests_run: 5,
      },
      {
        id: "OM4.1",
        principle_id: "R1.1",
        category_id: "Reusable",
        status: "ok",
        explanation:
          "A license was found http://creativecommons.org/licenses/by/2.0/",
        description:
          "Check to see if there is a license associated with the ontology",
        total_passed_tests: 1,
        total_tests_run: 1,
      },
      {
        id: "OM4.2",
        principle_id: "R1.1",
        category_id: "Reusable",
        status: "ok",
        explanation: "License could be resolved",
        description: "Check to see if the license is resolvable",
        total_passed_tests: 1,
        total_tests_run: 1,
      },
    ],
  };
}

function getPrincipleDescription(principle) {
  switch (principle) {
    case "F1":
      return "(meta)data are assigned a globally unique and persistent identifier";
      break;

    case "F2":
      return 'data are described with rich metadata (defined by <a href="#R1">R1</a> below)';
      break;

    case "F3":
      return "metadata clearly and explicitly include the identifier of the data it describes";
      break;

    case "F4":
      return "(meta)data are registered or indexed in a searchable resource";
      break;

    case "A1":
      return "(meta)data are retrievable by their identifier using a standardized communications protocol";
      break;

    case "A1.1":
      return "the protocol is open, free, and universally implementable";
      break;

    case "A1.2":
      return "the protocol allows for an authentication and authorization procedure, where necessary";
      break;

    case "A2":
      return "metadata are accessible, even when the data are no longer available";
      break;

    case "I1":
      return "(meta)data use a formal, accessible, shared, and broadly applicable language for knowledge representation";
      break;

    case "I2":
      return "(meta)data use vocabularies that follow FAIR principles";
      break;

    case "I3":
      return "(meta)data include qualified references to other (meta)data";
      break;

    case "R1":
      return "meta(data) are richly described with a plurality of accurate and relevant attributes";
      break;

    case "R1.1":
      return "(meta)data are released with a clear and accessible data usage license";
      break;

    case "R1.2":
      return "(meta)data are associated with detailed provenance";
      break;

    case "R1.3":
      return "(meta)data meet domain-relevant community standards";
      break;

    default:
      return "I DON'T HAVE THAT PRINCIPLE";
  }
  return "I DON'T HAVE THAT PRINCIPLE";
}

function loadInfo(result) {
  var title = document.querySelector("#title");
  title.textContent = result.ontology_title;

  var URI = document.querySelector("#URI-title");
  URI.textContent = result.ontology_URI;

  var license = document.querySelector("#license");
  license.textContent = result.ontology_license;
}

function loadCategory(category, result) {
  var checks_div = document.getElementById(category + "-checks");
  if (!checks_div) {
    console.error("Elemento no encontrado:", category + "-checks");
    return; // Salir de la función si el elemento no existe
  }
  checks_div.innerHTML = getLineHTMLNoLine();

  checks = getCategoryChecks(category, result);

  loadPrinciples(checks, checks_div);
}

function getLineHTML() {
  return `
    <div class="row w-100 mx-0" style="display: block; height: 0px; margin-top: -10px;">
       <hr color="#000000">
    </div>
    `;
}

function getLineHTMLNoLine() {
  return `
    <div class="row w-100 mx-0" style="display: block; height: 0px; margin-top: -10px;">
    </div>
    `;
}

function getCategoryChecks(category, result) {
  var checks = result.checks.filter((check) => check.category_id == category);

  return groupBy(checks, "principle_id");
}

function loadPrinciples(principles, checks_div) {
  for (let principle in principles) {
    var title = document.createElement("div");
    title.className = "texto-principle";
    title.innerHTML = getPrincipleHTML(principle);
    checks_div.appendChild(title);

    principles[principle].forEach((check) => {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.classList.add("foops-result");
      cell.innerHTML = getCheckHTML(check);
      row.appendChild(cell);
      checks_div.appendChild(row);
    });
  }
}

function loadChecks(results) {
  // Crear títulos de categorías y resultados
  const categories = ["Findable", "Accessible", "Interoperable", "Reusable"];
  categories.forEach((category) => {
    const checks_div = document.getElementById(`${category}-checks`);
    if (!checks_div) {
      console.error(`Elemento no encontrado: ${category}-checks`);
      return; // Salir de la función si el elemento no existe
    }
    checks_div.innerHTML = getLineHTMLNoLine();

    const principles = getCategoryChecks(category, results);
    loadPrinciples(principles, checks_div);
  });

  // Mostrar el puntaje general
  const scoreContainer = document.getElementById("graphicScore");
  scoreContainer.innerHTML = getRadialScoreHTML(results.overall_score, 1.3);

  // Mostrar el gráfico spider
  const spiderContainer = document.getElementById("graphicSpider");
  spiderContainer.innerHTML = getSpiderGraphHTML(results);
}

function getCheckHTML(check_info) {
  let affected_URIs_HTML = ``;
  let reference_URIs_HTML = ``;

  if ("reference_resources" in check_info) {
    reference_URIs_HTML =
      `<div class="col-12 caja-affected">
        <div class="row">
          <p class="texto-affected pl-3 "> Imported/Reused URIs: </p>
        </div>` +
      getAffectedURIsHTML(
        check_info.reference_resources,
        check_info.principle_id,
        check_info.id
      ) +
      `</div>`;
  }

  if ("affected_elements" in check_info) {
    affected_URIs_HTML =
      `
      <div class="row m-0">
        <p class="texto-explanation pt-3 pl-3">
        </p>
      </div>
      <div class="col-12 caja-affected">
        <div class="row">
          <p class="texto-affected pl-3"> Affected URIs: </p>
        </div>
        ` +
      getAffectedURIsHTML(
        check_info.affected_elements,
        check_info.principle_id,
        check_info.id
      ) +
      `
      </div>`;
  }

  let score = check_info.total_passed_tests / check_info.total_tests_run;
  let divTexto = "";

  // CAMBIAR TOP:-30px si usamos barra de progreso, en caso de circulo top:-30px
  if (score == 1) {
    divTexto = `
      <div class="col-12 p-0 caja-blanca mt-2">
        <div class="row mt-2 mx-0">
          <div class="col-8">
            <span class="texto-check">
              <a href="${
                "https://w3id.org/foops/test/" + check_info.id
              }" target="_blank">
                ${check_info.id}: ${check_info.title}
              </a>
            </span>
          </div>
          <div class="col-2">
            <div style="position: absolute; top:10px;"> 
              ${getRadialScoreHTML(score, 0.5)}
            </div>
          </div>
          <div class="col-2 d-flex align-items-center justify-content-end">
            <img src="/img/dash.svg" onclick="arrowClicked(event, '${
              check_info.id // con id tmp cambia
            }')">
          </div>
        </div>
        <div class="row m-0" id="${check_info.id}" >
          ${getLineHTML()}
          <div class="row mx-0 mt-2 w-100">
          <p class="textDes">${check_info.description}</p>
            <dl>
              <!-- Comentado temporalmente -->
              <!-- <dt>Description</dt>
              <dd>${check_info.description}</dd> -->
              <dt>Explanation</dt>
              <dd>${check_info.explanation}</dd>
            </dl>
          </div>
          ${affected_URIs_HTML}
          ${reference_URIs_HTML}
        </div>
      </div>`;
  } else {
    divTexto = `
      <div class="col-12 p-0 caja-blanca mt-2">
        <div class="row mt-2 mx-0">
          <div class="col-8">
            <span class="texto-check">
              <a href="${
                "https://w3id.org/foops/test/" + check_info.id
              }" target="_blank">
                ${check_info.id}: ${check_info.title}
              </a>
            </span>
          </div>
          <div class="col-2">
            <div style="position: absolute; top:10px;">
              ${getRadialScoreHTML(score, 0.5)}
            </div>
          </div>
          <div class="col-2 d-flex align-items-center justify-content-end">
            <img src="/img/dash.svg" onclick="arrowClicked(event, '${
              check_info.id //No cambia con id el de abajo tampoco
            }')">
          </div>
        </div>
        <div class="row m-0" id="${check_info.id}" >
          ${getLineHTML()}
          <div class="row mx-0 mt-2 w-100">
          <p class="textDes">${check_info.description}</p>
            <dl>
              <!-- Comentado temporalmente -->
              <!-- <dt>Description</dt>
              <dd>${check_info.description}</dd> -->
              <dt>Explanation</dt>
              <dd>${check_info.explanation}</dd>
            </dl>
          </div>
        </div>
      </div>`;
  }

  return divTexto;
}

function getAffectedURIsHTML(URIs, principle_id, check_id) {
  var html = ``;

  for (let i = 0; i < URIs.length; i++) {
    html +=
      `<p class="texto-URI"> - <a href="` +
      URIs[i] +
      `" target="_blank">` +
      URIs[i] +
      `</a> </p>`;

    if (i == 4 && URIs.length > 9) {
      html +=
        `<div class="collapse" id="block-id-` + principle_id + check_id + `">`;
    }
  }

  if (URIs.length > 9) {
    html +=
      `</div>
            <p>
              <!-- aria-expanded attribute is mandatory -->
              <!-- bootstrap changes it to true/false on toggle -->
              <a href="#block-id-` +
      principle_id +
      check_id +
      `" class="btn btn-primary btn-sm" data-toggle="collapse" aria-expanded="false" aria-controls="block-id-` +
      principle_id +
      check_id +
      `">
                <span class="collapsed">
                  Show more
                </span>
                <span class="expanded">
                  Show Less
                </span>
              </a>
            </p>`;
  }

  return html;
}

function getPrincipleHTML(text) {
  return (
    `
      <div class="row my-3 pl-3">
        <span id="` +
    text +
    `"class="texto-principle pl-3">` +
    text +
    `: ` +
    getPrincipleDescription(text) +
    ` </span>
      </div>
    `
  );
}

function groupBy(objectArray, property) {
  return objectArray.reduce(function (acc, obj) {
    var key = obj[property];
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(obj);
    return acc;
  }, {});
}

function arrowClicked(event, id) {

  status = getArrowStatus(event);


  replaceArrow(event, status);

  if (status == "up") {
    hideContent(id);
  } else {
    showContent(id);
  }
}

function getArrowStatus(event) {
  let src = event.currentTarget.src;
  if (src.includes("dash.svg")) {
    return "up";
  } else {
    return "down";
  }
}

function replaceArrow(event, status) {
  if (status == "up") {
    event.currentTarget.src = event.currentTarget.src.replace(
      "dash.svg",
      "plus.svg"
    );
  } else {
    event.currentTarget.src = event.currentTarget.src.replace(
      "plus.svg",
      "dash.svg"
    );
  }
}

function escapeSelector(selector) {
  return selector.replace(/([ #;?%&,.+*~\':"!^$[\]()=>|\/@])/g, "\\$1");
}

function showContent(id) {
  var escapedId = escapeSelector(id);
  var resultBlock = document.querySelector("#" + escapedId);
  resultBlock.style.visibility = "visible";
  resultBlock.style.height = "auto"; // Asegura que el tamaño sea automático
}

function hideContent(id) {
  var escapedId = escapeSelector(id);
  var resultBlock = document.querySelector("#" + escapedId);
  resultBlock.style.visibility = "hidden";
  resultBlock.style.height = "0"; // Asegura que el tamaño sea cero cuando esté oculto
}

function example1(uri) {
  document.getElementById("URI_input").value = uri;
}
