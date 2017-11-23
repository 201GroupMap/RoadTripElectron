$(document).ready(function () {
  initialize();
  calcRoute();
});

var map;
var directionDisplay;
var directionsService;
var stepDisplay;
var markerArray = [];
var position;
var marker = null;
var polyline = null;
var poly2 = null;
var timerHandle = null;

function createMarker(latlng, label, html) {
    // alert("createMarker("+latlng+","+label+","+html+","+color+")");
    var contentString = '<b>' + label + '</b><br>' + html;
    var marker = new google.maps.Marker({
        position: latlng,
        map: map,
        title: label,
        zIndex: Math.round(latlng.lat() * -100000) << 5
    });
    marker.myname = label;
    // gmarkers.push(marker);

    return marker;
}


function initialize() {
    // Instantiate a directions service.
    directionsService = new google.maps.DirectionsService();

    // Create a map and center it on Manhattan.
    var myOptions = {
        zoom: 13,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        disableDefaultUI: true
    }
    map = new google.maps.Map(document.getElementById("map-canvas"), myOptions);

    address = 'new york'
    geocoder = new google.maps.Geocoder();
    geocoder.geocode({
        'address': address
    }, function(results, status) {
        map.setCenter(results[0].geometry.location);
    });

    // Create a renderer for directions and bind it to the map.
    var rendererOptions = {
        map: map,
        preserveViewport: true
    }
    directionsDisplay = new google.maps.DirectionsRenderer(rendererOptions);

    polyline = new google.maps.Polyline({
        path: [],
        strokeColor: '#4885ed',
        strokeWeight: 3,
        strokeOpacity: 0
    });
    poly2 = new google.maps.Polyline({
        path: [],
        strokeColor: '#4885ed',
        strokeWeight: 3,
        strokeOpacity: 0
    });
}



var steps = []

function calcRoute() {

    if (timerHandle) {
        clearTimeout(timerHandle);
    }
    if (marker) {
        marker.setMap(null);
    }
    polyline.setMap(null);
    poly2.setMap(null);
    directionsDisplay.setMap(null);
    polyline = new google.maps.Polyline({
        path: [],
        strokeColor: '#4885ed',
        strokeWeight: 3,
        strokeOpacity: 0
    });
    poly2 = new google.maps.Polyline({
        path: [],
        strokeColor: '#4885ed',
        strokeWeight: 3,
        strokeOpacity: 0
    });
    // Create a renderer for directions and bind it to the map.
    var rendererOptions = {
        map: map,
        preserveViewport: true,
        suppressMarkers: true,
        polylineOptions : new google.maps.Polyline({
          strokeColor: "#fd5c63",
          strokeWeight: 7,
          strokeOpacity: 0,
          icons: [{
            icon: {
              path: 'M 0,-1 0,1',
              strokeOpacity: 1,
              scale: 4
            },
            offset: '0',
            repeat: '20px'
          }],
        })
    }
    directionsDisplay = new google.maps.DirectionsRenderer(rendererOptions);

    var start = "Los Angeles, CA";
    var end = "New York, NY";
    var travelMode = google.maps.DirectionsTravelMode.DRIVING

    var request = {
        origin: start,
        destination: end,
        travelMode: travelMode
    };

    // Route the directions and pass the response to a
    // function to create markers for each step.
    directionsService.route(request, function(response, status) {
        if (status == google.maps.DirectionsStatus.OK) {
            console.log(response);
            directionsDisplay.setDirections(response);

            var bounds = new google.maps.LatLngBounds();
            var route = response.routes[0];
            startLocation = new Object();
            endLocation = new Object();

            // For each route, display summary information.
            var path = response.routes[0].overview_path;
            var legs = response.routes[0].legs;
            for (i = 0; i < legs.length; i++) {
                endLocation.latlng = legs[i].end_location;
                endLocation.address = legs[i].end_address;
                var steps = legs[i].steps;
                for (j = 0; j < steps.length; j++) {
                    var nextSegment = steps[j].path;
                    for (k = 0; k < nextSegment.length; k++) {
                        polyline.getPath().push(nextSegment[k]);
                        bounds.extend(nextSegment[k]);
                    }
                }
            }

            polyline.setMap(map);
            map.setCenter(polyline.getPath().getAt(0));
            map.setZoom(15);
            /*
            map.fitBounds(bounds);
            map.setZoom(20);
            */
            startAnimation();
        }
    });
}



var step = 1; // 5; // metres
var tick = 1; // milliseconds
var eol;
var k = 0;
var stepnum = 0;
var lastVertex = 1;


//=============== animation functions ======================
function updatePoly(d) {
    // Spawn a new polyline every 20 vertices, because updating a 100-vertex poly is too slow
    if (poly2.getPath().getLength() > 20) {
        poly2 = new google.maps.Polyline([polyline.getPath().getAt(lastVertex - 1)]);
        // map.addOverlay(poly2)
    }

    if (polyline.GetIndexAtDistance(d) < lastVertex + 2) {
        if (poly2.getPath().getLength() > 1) {
            poly2.getPath().removeAt(poly2.getPath().getLength() - 1)
        }
        poly2.getPath().insertAt(poly2.getPath().getLength(), polyline.GetPointAtDistance(d));
    } else {
        poly2.getPath().insertAt(poly2.getPath().getLength(), endLocation.latlng);
    }
}


function animate(d) {
    // alert("animate("+d+")");
    if (d > eol) {
        map.panTo(endLocation.latlng);
        // marker.setPosition(endLocation.latlng);
        return;
    }
    var p = polyline.GetPointAtDistance(d);
    map.panTo(p);
    map.setZoom(15);
    // marker.setPosition(p);
    updatePoly(d);
    timerHandle = setTimeout("animate(" + (d + step) + ")", tick);
}


function startAnimation() {
    eol = polyline.Distance();
    map.setCenter(polyline.getPath().getAt(0));
    map.setZoom(15);
    // map.addOverlay(new google.maps.Marker(polyline.getAt(0),G_START_ICON));
    // map.addOverlay(new GMarker(polyline.getVertex(polyline.getVertexCount()-1),G_END_ICON));
    // marker = new google.maps.Marker({location:polyline.getPath().getAt(0)} /* ,{icon:car} */);
    // map.addOverlay(marker);
    poly2 = new google.maps.Polyline({
        path: [polyline.getPath().getAt(0)],
        strokeColor: "#0000FF",
        strokeWeight: 10
    });
    // map.addOverlay(poly2);
    setTimeout("animate(50)", 2000); // Allow time for the initial map display
}
