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
    if(store.has("itinid")){
      store.delete("itinid");
    }
    window.location = "itinerary.html";
  });

  $("#settings-button").click(function () {
    $("#settings-modal").modal("show");
  });

  if (getEditAccess()) {
    // User has edit access
    $("#save-button").click(function () {
      m.save();
      $("#save-icon").removeClass("fa-floppy-o");
      $("#save-icon").addClass("fa-refresh");
      $("#save-icon").addClass("fa-spin");
    });
  } else {
    // User does not have edit access
    console.log("User does not have edit access, disabling save button");
    $("#save-button").removeClass("info-panel-button-hoverable");
    $("#save-button").css("color", "rgba(0, 0, 0, 0.5)");
    $("#save-icon").removeClass("fa-floppy-o");
    $("#save-icon").addClass("fa-ban");
  }

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
