document.addEventListener("DOMContentLoaded", function () {
  var radar = document.getElementById("graphicSpider");
  var radarPopup = document.getElementById("radarPopup");

  var score = document.getElementById("graphicScore");
  var scorePopup = document.getElementById("scorePopup");

  radar.addEventListener("mouseover", showPopupSpider);
  radar.addEventListener("mouseout", hidePopup);

  score.addEventListener("mouseover", showPopupScore);
  score.addEventListener("mouseout", hidePopup);

  function showPopupSpider(evt) {
    var iconPos = radar.getBoundingClientRect();
    radarPopup.style.left = 250 + "px"; // Se mueve más a la izquierda
    radarPopup.style.top = 170 + "px";
    radarPopup.style.display = "block";
  }

  function showPopupScore(evt) {
    var iconPos = score.getBoundingClientRect();
    scorePopup.style.left = 250 + "px"; // Se mueve más a la izquierda
    scorePopup.style.top = 170 + "px";
    scorePopup.style.display = "block";
  }

  function hidePopup(evt) {
    radarPopup.style.display = "none";
    scorePopup.style.display = "none";
  }
});
