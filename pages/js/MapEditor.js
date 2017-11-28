const BACKEND_URL = "http://roadtrip-env.us-west-1.elasticbeanstalk.com";

const API_KEY = "AIzaSyAMNN3WNSG_h7EX8RXhI3s9ux7Q6Hyqg1s";
const MARKER_ICON_URL = "https://maps.gstatic.com/mapfiles/api-3/images/spotlight-poi_hdpi.png";
const USC_COORDS = {lat: 34.021707, lng: -118.288242};
const SIDEBAR_WIDTH = 400;
const PHOTO_WIDTH = 200;

var m = new MapEditor();

function MapEditor () {
  this.username = getUsername();

  this.mapContainer = document.getElementById("map");
  this.startSearchBarContainer = document.getElementById("start-search-bar");
  this.endSearchBarContainer = document.getElementById("end-search-bar");
  this.stopsSearchBarContainer = document.getElementById("stops-search-bar");
  this.startSearchBarWrapper = document.getElementById("start-search-bar-wrapper");
  this.endSearchBarWrapper = document.getElementById("end-search-bar-wrapper");
  this.startPanelContainer = document.getElementById("start-panel");
  this.endPanelContainer = document.getElementById("end-panel");

  this.searchResultMarkers = [];
  this.sharedUsers = [];
}

MapEditor.prototype.init = function () {
  this.initMap();
  this.initSearchBars();
  this.data = {};

  this.directionsDisplay = new google.maps.DirectionsRenderer({
    markerOptions: {
      optimized: false,
      zIndex: 9999999999
    }
  });
  this.directionsDisplay.setMap(this.map);
  this.directionsService = new google.maps.DirectionsService();

  this.routeBounds = [];
  this.placesService = new google.maps.places.PlacesService(this.map);

  this.stops = new Map();
  if (getItineraryId()) {
    this.id = getItineraryId();
    this.getPreviousData(this.loadPreviousData);
  }

  if (getItineraryId()) {
    setInterval(this.checkChanged.bind(this), 500);
  }
}

MapEditor.prototype.checkChanged = function () {
  console.log("requesting");
  $.get({
    url: BACKEND_URL + "/Itinerary" + "/" + getItineraryId(),
    dataType: "json",
    context: this,
    success: function (results) {
      //callback.call(this, results);
      if(results.lastModified.$date != this.lastModifiedDate) {
        this.lastModifiedDate = results.lastModified.$date;
        console.log("changed");
        // Check start
        if(results.startId!=this.data.start.place_id) {
          console.log("Start changed, updating");
          this.getPlaceInfo(results.startId, this.addStart.bind(this));
        }
        // Check end
        if(results.endId!=this.data.end.place_id) {
          console.log("End changed, updating");
          this.getPlaceInfo(results.endId, this.addEnd.bind(this));
        }
        // Check stops
        if(!this.checkArrayChanged(results.stops, Array.from(this.stops.keys()))) {
          this.removeAllStops();
          for (let i = 0; i < results.stops.length; i++) {
            let placeId = results.stops[i];
            this.getPlaceInfo(placeId, this.addStop.bind(this));
          }
        }
        // Check shared users
        m.drawRoute();
      }
    }
  });
}

MapEditor.prototype.checkArrayChanged = function (arr1, arr2) {
  if(arr1.length!=arr2.length) return false;
  for(var i=0;i<arr1.length;i++) {
    if(arr1[i]!=arr2[i]) return false;
  }
  return true;
}

MapEditor.prototype.getPreviousData = function (callback) {
  $.get({
    url: BACKEND_URL + "/Itinerary" + "/" + getItineraryId(),
    dataType: "json",
    context: this,
    success: function (results) {
      callback.call(this, results);
    }
  });
}

MapEditor.prototype.loadPreviousData = function (results) {
  console.log("previous data received", results);
  // Add start location
  let startId = results.startId;
  this.getPlaceInfo(startId, this.addStart.bind(this));
  // Add end location
  let endId = results.endId;
  this.getPlaceInfo(endId, this.addEnd.bind(this));
  // Add stops
  for (let i = 0; i < results.stops.length; i++) {
    let placeId = results.stops[i];
    this.getPlaceInfo(placeId, this.addStop.bind(this));
  }
  // Add shared users
  for (let i = 0; i < results.shared_users.length; i++) {
    let username = results.shared_users[i];
    // console.log("detected", username);
    this.addSharedUser(username);
  }
  // Set the name
  this.name = results.name;
  $("#itinerary-name-input").val(results.name);
  // Set the owner name
  this.ownerName = results.owner_name;
  $("#itinerary-owner").text(`By ${this.ownerName}`);
  $("#modal-itinerary-owner").text(`Owner: ${this.ownerName}`);
  // Set the time stamp
  this.lastModifiedDate = results.lastModified.$date;
  // Set visibility
  $("#visibility-select").children("option").prop("selected", false);
  if (results.public) {
    $("#visibility-public").prop("selected", true);
  } else {
    $("#visibility-private").prop("selected", true);
  }
}

MapEditor.prototype.initMap = function () {
  this.map = new google.maps.Map(this.mapContainer, {
    center: USC_COORDS,
    zoom: 13,
    mapTypeId: "roadmap",
    mapTypeControl: false
  });
}

MapEditor.prototype.initSearchBars = function () {
  this.startSearchBar = new google.maps.places.SearchBox(
    this.startSearchBarContainer
  );
  this.startSearchBar.addListener("places_changed", this.updateSearchStart.bind(this));

  this.endSearchBar = new google.maps.places.SearchBox(
    this.endSearchBarContainer
  );
  this.endSearchBar.addListener("places_changed", this.updateSearchEnd.bind(this));

  this.stopsSearchBar = new google.maps.places.SearchBox(
    this.stopsSearchBarContainer
  );
  this.stopsSearchBar.addListener("places_changed", this.updateSearchStops.bind(this));

  this.markers = [];

  this.map.addListener("bounds_changed", () => {
    this.startSearchBar.setBounds(this.map.getBounds());
    this.endSearchBar.setBounds(this.map.getBounds());
    this.stopsSearchBar.setBounds(this.map.getBounds());
  });

  this.map.addListener("idle", () => {
    this.activeBounds = [];
    let mapBounds = this.map.getBounds();
    for (let i = 0; i < this.routeBounds.length; i++) {
      if (mapBounds.contains(this.routeBounds[i].getCenter())) {
        this.activeBounds.push(this.routeBounds[i]);
      }
    }
    /*
    if (this.activeBounds.length < 10) {
      $("#search-button").prop("disabled", false);
    } else {
      $("#search-button").prop("disabled", true);
    }
    */
    console.log("active bounds are", this.activeBounds);
    //this.routeSearch();
  });
}

MapEditor.prototype.routeSearch = function () {
  console.log("Beginning route search");
  // Clear previous search results
  this.searchResults = [];
  this.searchResultMarkers.forEach((marker) => {
    marker.setMap(null);
  });
  this.activeBounds.forEach((bounds, index) => {
    this.searchWithDelay(bounds, index * 400);
  });
}

MapEditor.prototype.searchWithDelay = function (bounds, delay) {
  let request = {
    bounds: bounds,
    radius: getSearchRadius(),
    rankBy: google.maps.places.RankBy.PROMINENCE,
    name: "attraction"
  };
  setTimeout(() => {
    this.placesService.nearbySearch(request, (data, status) => {
      console.log("Status is", status);
      if (status !== "OK") return;
      data.forEach((place) => {
        if (!place.types.includes("point_of_interest")) return;
        let marker = new google.maps.Marker({
          map: this.map,
          // title: place.name,
          position: place.geometry.location,
          //optimized: false,
          place: {
            location: place.geometry.location,
            placeId: place.place_id
          }
        });

        marker.addListener("click", function () {
          this.setAnimation(google.maps.Animation.BOUNCE);
          setTimeout(() => {this.setAnimation(null); }, 750);
        });

        // Click listener to add stop
        let self = this;
        marker.addListener("click", function () {
          self.getPlaceInfo(this.getPlace().placeId, self.addStop.bind(self));
        })

        let contentString = `
          <div class="infowindow-main-wrapper">
            <div class="infowindow-img-wrapper">
              ${place.photos ?
                `<img class="infowindow-img" src="${place.photos[0].getUrl({
                    maxWidth: 100,
                    maxWidth: 100
                })}"/ >`
                :
                ""
              }
            </div>
            <div class="infowindow-content-wrapper">
              <h3>${place.name}</h3>
              ${place.vicinity ? `<p>${place.vicinity}</p>` : ""}
              ${place.rating ? `<p>${place.rating}/5</p>` : ""}
            </div>
          </div>
        `;

        let infoWindow = new google.maps.InfoWindow({
          content: contentString
        });

        marker.addListener("mouseover", function (event) {
          infoWindow.open(self.map, this);
        });

        marker.addListener("mouseout", function () {
          infoWindow.close();
        });

        this.searchResultMarkers.push(marker);
      });
      this.searchResults = this.searchResults.concat(data);
      console.log(this.searchResults);
    })
  } , delay);
}

// takes in a FULL place object
MapEditor.prototype.addStop = function (place) {
  let placeId = place.place_id;
  console.log("Adding new stop", place);
  this.stops.set(placeId, place);
  let stopDiv = $(`
    <div id="${placeId}" class="panel-content" style="display: none;">
      <div class="panel-img-wrapper">
        ${place.photos ?
          `<img class="infowindow-img" src="${place.photos[0].getUrl({
              maxWidth: 120,
              maxWidth: 120
          })}"/ >`
          :
          ""
        }
      </div>
      <div class="panel-address">
        <p>
          <span style="font-weight: bold;">${place.name}</span><br />
          ${place.vicinity}
        </p>
      </div>
      <button type="button" class="close" aria-label="Close">
            <span aria-hidden="true">×</span>
      </button>
    </div>
  `);
  stopDiv.click(() => {
    this.map.setCenter(place.geometry.location);
    this.map.setZoom(10);
  })
  stopDiv.find("button").click(this.removeStop.bind(this, placeId));
  $("#stops-list").append(stopDiv);
  stopDiv.slideDown("fast");
  if (this.stops.size === 1) {
    // show Stops panel
    $("#stops-panel").slideDown("fast");
  }
  this.drawRoute();
}

MapEditor.prototype.removeStop = function (placeId) {
  console.log("removing stop with id of", placeId);
  $(`#${placeId}`).remove();
  this.stops.delete(placeId);
  if (this.stops.size === 0) {
    $("#stops-panel").slideUp("fast");
  }
  this.drawRoute();
}

MapEditor.prototype.removeAllStops = function () {
  let keys = Array.from(this.stops.keys());
  for (let i = 0; i < keys.length; i++) {
    let placeId = keys[i];
    this.removeStop(placeId);
  }
}

MapEditor.prototype.getThumbnailURL = function () {
  let tempBounds = new google.maps.LatLngBounds();
  let startLocation = this.data.start.geometry.location;
  let endLocation = this.data.end.geometry.location;
  tempBounds.extend(startLocation);
  tempBounds.extend(endLocation);
  this.stops.forEach((place, placeId) => {
    let stopLocation = place.geometry.location;
    tempBounds.extend(stopLocation);
  })
  let mapCenter = tempBounds.getCenter();
  let routePolyline = this.directions.routes[0].overview_polyline;
  let url = "https://maps.googleapis.com/maps/api/staticmap?";
  //url += `zoom=10`;
  url += `&size=400x400`;
  url += `&markers=color:red%7C${startLocation.lat()},${startLocation.lng()}`;
  this.stops.forEach((place, placeId) => {
    let stopLocation = place.geometry.location;
    url += `&markers=color:red%7C${stopLocation.lat()},${stopLocation.lng()}`;
  })
  url += `&markers=color:red%7C${endLocation.lat()},${endLocation.lng()}`;
  url += `&path=weight:3%7Ccolor:blue%7Cenc:${routePolyline}`;
  console.log("Map center is", mapCenter);
  /*
  let markers = [];
  markers.push(`color:red%7C${startLocation.lat()},${startLocation.lng()}`);
  this.stops.forEach((place, placeId) => {
    let stopLocation = place.geometry.location;
    markers.push(`color:red%7C${stopLocation.lat()},${stopLocation.lng()}`);
  })
  markers.push(`color:red%7C${endLocation.lat()},${endLocation.lng()}`);
  */
  /*
  let url = "https://maps.googleapis.com/maps/api/staticmap?";
  let params = $.param({
    zoom: 5,
    size: "400x400",
    markers: markers,
    key: API_KEY
  }, true);
  url += params;
  */
  return url;
}

MapEditor.prototype.showActiveBounds = function () {
  this.routeBounds.forEach((bound) => {
    let marker = new google.maps.Marker({
      map: this.map,
      title: "bounds marker",
      position: bound.getCenter(),
      optimized: false,
      animation: google.maps.Animation.DROP,
    });
  });
}

MapEditor.prototype.save = function () {
  if (!this.name) {
    alert("No name set.");
    return;
  }
  let self = this;
  $.post({
    url: BACKEND_URL + "/Itinerary",
    data: JSON.stringify(self.getSaveData()),
    success: function (data) {
      $("#save-icon").addClass("fa-floppy-o");
      $("#save-icon").removeClass("fa-refresh");
      $("#save-icon").removeClass("fa-spin");
      console.log(data);
    }
  })
}

MapEditor.prototype.getOwnerName = function () {
  if (this.ownerName == null) {
    this.ownerName = getUsername();
  }
  return this.ownerName;
}

MapEditor.prototype.getPublic = function () {
  let visibility = $("#visibility-select").find(":selected").val();
  return (visibility === "public");
}

MapEditor.prototype.getSaveData = function () {
  let data = {
    name: this.name,
    owner_name: this.getOwnerName(),
    public: this.getPublic(),
    startId: this.data.start.place_id,
    endId: this.data.end.place_id,
    stops: Array.from(this.stops.keys()),
    total_trip_time: this.getTripTime(),
    thumbnail_url: this.getThumbnailURL(),
    shared_users: this.sharedUsers,
    _id: {
      $oid: this.id
    },
  };
  return data;
}

MapEditor.prototype.getTripTime = function () {
  return 1234;
}

MapEditor.prototype.updateSearchStart = function () {
  let places = this.startSearchBar.getPlaces();
  console.log(places);
  if (places.length === 0) return;
  this.clearMarkers();
  this.searchBounds = new google.maps.LatLngBounds();
  if (places.length === 1) {
    this.addMarker(false, places[0]);
    this.addStart(places[0]);
  } else {
    places.forEach(this.addMarker.bind(this, this.addStart));
  }
  this.map.fitBounds(this.searchBounds);
}

MapEditor.prototype.updateSearchStops = function () {
  console.log("searching stops");
  let places = this.stopsSearchBar.getPlaces();
  if (places.length === 0) return;
  this.searchBounds = new google.maps.LatLngBounds();
  if (places.length === 1) {
    this.addMarker(false, places[0]);
    this.addStop(places[0]);
  } else {
    places.forEach(this.addMarker.bind(this, this.addStop));
  }
  $("#stops-search-bar").val("");
  this.map.fitBounds(this.searchBounds);
}

MapEditor.prototype.updateSearchEnd = function () {
  let places = this.endSearchBar.getPlaces();
  if (places.length === 0) return;
  this.clearMarkers();
  this.searchBounds = new google.maps.LatLngBounds();
  if (places.length === 1) {
    this.addMarker(false, places[0]);
    this.addEnd(places[0]);
  } else {
    places.forEach(this.addMarker.bind(this, this.addEnd));
  }
  this.map.fitBounds(this.searchBounds);
}

MapEditor.prototype.addMarker = function (callback, place) {
  if (!place.geometry) return;
  console.log(place);
  let marker = new google.maps.Marker({
    map: this.map,
    title: place.name,
    position: place.geometry.location,
    optimized: false,
    animation: google.maps.Animation.DROP,
    place: {
      location: place.geometry.location,
      placeId: place.place_id
    }
  });

  let self = this;
  marker.addListener("click", function () {
    this.setAnimation(google.maps.Animation.BOUNCE);
    setTimeout(() => {this.setAnimation(null); }, 750);
  })
  if (callback) {
    marker.addListener('click', function (event) {
      console.log("marker context", this);
      console.log("marker click event", event);
      console.log(this.getPlace());
      $(".location-confirm-tooltip").remove();
      let mouseEvent = event.va;
      let title = this.title;
      let tooltip = $("<div></div>");
      tooltip.addClass("location-confirm-tooltip")
             .addClass("popover")
             .addClass("popover-right");
      tooltip.append(`
        <h3 class="popover-title">Select this location?</h3>
        <div class="popover-content">
          <p id="tooltip-text"></p>
          <button id="confirm" type="button" class="btn btn-success">Yes!</button>
        </div>`);
      let tooltipPosition = self.getTooltipPosition(mouseEvent);
      tooltip.css(tooltipPosition);

      let placeId = this.getPlace().placeId;
      self.getPlaceInfo(placeId, function (data) {
        let name = data.name;
        let address = data.formatted_address;
        let photos = data.photos;
        $("#tooltip-text").html(`
          ${name}<br />
          ${address}
          `)
        console.log(data);
        /*
        console.log(data.photos[0].getUrl({
            maxWidth: 640
        }));
        */
      });

      $("#tooltip-container").append(tooltip);
      $("#confirm").click(function () {
        $(".location-confirm-tooltip").remove();
        callback.call(self, place);
      });
    });
  }

    this.markers.push(marker);

    if (place.geometry.viewport) {
      this.searchBounds.union(place.geometry.viewport);
    } else {
      this.searchBounds.extend(place.geometry.location);
    }
  }

MapEditor.prototype.addStart = function (place) {
  console.log("Setting start location as", place);
  this.data.start = place;
  let name = place.name;
  let address = place.formatted_address;
  let photos = place.photos;
  $(this.startSearchBarContainer).val("");
  $(this.startSearchBarContainer).attr("placeholder", "Update Starting Point");
  $(this.startPanelContainer).find(".panel-address").html(`
    <p>
      <span style="font-weight: bold;">${place.name}</span><br />
      ${address}
    </p>
  `);
  $(this.startPanelContainer).find(".panel-img-wrapper").empty();
  if (photos) {
    let imgUrl = photos[0].getUrl({
        maxWidth: 120,
        maxWidth: 120
    });
    $(this.startPanelContainer).find(".panel-img-wrapper").append(`<img src="${imgUrl}">`)
  }
  $(this.startSearchBarWrapper).slideUp("fast");
  $("#start-panel-content").click(function () {
    $("#start-search-bar-wrapper").slideDown("fast");
  });
  this.drawRoute();
}

MapEditor.prototype.addEnd = function (place) {
  console.log("Setting end location as", place);
  this.data.end = place;
  let name = place.name;
  let address = place.formatted_address;
  let photos = place.photos;
  $(this.endSearchBarContainer).val("");
  $(this.endSearchBarContainer).attr("placeholder", "Update Destination");
  $(this.endPanelContainer).find(".panel-address").html(`
    <p>
      <span style="font-weight: bold;">${place.name}</span><br />
      ${address}
    </p>
  `);
  $(this.endPanelContainer).find(".panel-img-wrapper").empty();
  if (photos) {
    let imgUrl = photos[0].getUrl({
        maxWidth: 120,
        maxWidth: 120
    });
    $(this.endPanelContainer).find(".panel-img-wrapper").append(`<img src="${imgUrl}">`)
  }
  $(this.endSearchBarWrapper).slideUp("fast");
  $("#end-panel-content").click(function () {
    $("#end-search-bar-wrapper").slideDown("fast");
  });
  this.drawRoute();
}

MapEditor.prototype.drawRoute = function () {
  if (typeof(this.data.start) === "undefined" ||
      typeof(this.data.end) === "undefined") {
    return;
  }
  this.clearMarkers();
  let request = {
    origin: {placeId: this.data.start.place_id},
    destination: {placeId: this.data.end.place_id},
    waypoints: this.getWaypoints(),
    travelMode: "DRIVING"
  };
  this.directionsService.route(request, (result, status) => {
    console.log("Drawing new route");
    console.log(result);
    this.directions = result;
    if (status === "OK") {
      this.directionsDisplay.setDirections(result);
      // show stops search bar
      $("#stops-search-bar-wrapper").slideDown();
    }
    let rb = new RouteBoxer();
    this.routeBounds = rb.box(result.routes[0].overview_path, getSearchRadius());
    //this.routeSearch();
  });
}

MapEditor.prototype.swapStops = function (index1, index2) {
  console.log("stops was", this.stops);
  let mapEntries = Array.from(this.stops.entries());
  let temp = mapEntries[index1];
  mapEntries[index1] = mapEntries[index2];
  mapEntries[index2] = temp;
  this.stops = new Map(mapEntries);
  console.log(mapEntries);
  console.log("stops is now", this.stops);
  this.drawRoute();
}

MapEditor.prototype.getWaypoints = function () {
  let waypoints = []
  this.stops.forEach((value, key) => {
    let placeId = key;
    waypoints.push({
      location: {
        placeId: placeId
      }
    });
  })
  return waypoints;
}

MapEditor.prototype.setName = function (name) {
  this.name = name;
}

MapEditor.prototype.addSharedUser = function (username) {
  this.sharedUsers.push(username);
  $("#shared-users").append(`<option>${username}</option>`);
}

MapEditor.prototype.getPlaceInfo = function (placeId, callback) {
  let request = {placeId: placeId};
  this.placesService.getDetails(request, callback);
}

MapEditor.prototype.getTooltipPosition = function (mouseEvent) {
  let top = mouseEvent.pageY - 15;
  let left = mouseEvent.pageX - SIDEBAR_WIDTH + 15;
  return {top: top, left: left};
}

MapEditor.prototype.clearMarkers = function () {
  this.markers.forEach((marker) => {
    marker.setMap(null);
  });
  this.markers = [];
}
