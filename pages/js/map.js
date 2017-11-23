const Sortable = require('sortablejs');

$(document).ready(function () {
  $(".route-option").click(function () {
    $(this).toggleClass("route-option-clicked");
  });
  /*
  $(".route-option").hover(function () {
    if (!$(this).hasClass("route-option-clicked")) {
      $(this).css("background-color", "#eeeeee");
    }
  }, function () {
    if (!$(this).hasClass("route-option-clicked")) {
      $(this).css("background-color", "initial");
    }
  });
  */
  $("#route-search-button").click(function () {
    console.log("go button clicked");
    m.routeSearch();
  });
  $("#itinerary-name-input").change(function () {
    m.setName($(this).val());
  });
  $("#itinerary-settings-button").click(function () {
    $("#settings-modal").modal("show");
  });

  $("#home-button").click(function () {
    window.location = "itinerary.html";
  });

  $("#settings-button").click(function () {
    $("#settings-modal").modal("show");
  });

  $("#save-button").click(function () {
    m.save();
    $("#save-icon").removeClass("fa-floppy-o");
    $("#save-icon").addClass("fa-refresh");
    $("#save-icon").addClass("fa-spin");
  });

  $("#shared-users-input").on("keyup", function (e) {
    if (e.keyCode == 13) {
      let username = $(this).val();
      m.addSharedUser(username);
      $(this).val("");
    }
  });

  Sortable.create(document.getElementById("stops-list"), {
    animation: 150,
    onUpdate: function (event) {
      let oldIndex = event.oldIndex;
      let newIndex = event.newIndex;
      m.swapStops(oldIndex, newIndex);
    }
  });
});

function getSearchRadius() {
  return $("#route-search-radius-select").find(":selected").val();
}
