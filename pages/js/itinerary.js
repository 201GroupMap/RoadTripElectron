/**
 * 
 */
const Store = require('electron-store');
const store = new Store();

var openItin = function(type) {
	$(".tabcontent").hide();
	$(".tablinks").removeClass("active");
	$("#"+type).show();
	$("#"+type+"button").addClass("active");
};

var renderItin = function(imagelink, itin_name, star_num, itinid) {
	//console.log(itinid);
	let $div = $("<div>", {class:"itinerary"});
	let $container = $("<div>", {class:"container"})
	$container.append("<img src="+imagelink+">");
	$container.append("<div class='overlay'><div class='text'>View Itinerary</div></div>")
	$div.append($container);
	$div.append("<p>"+itin_name+"</p>")
	// for(let i=0;i<star_num;++i) {
	// 	$div.append("<span class='fa fa-star checked'></span>");
	// }
	// for(let i=0;i<5-star_num;++i) {
	// 	$div.append("<span class='fa fa-star'></span>");
	// }
	$div.append("<span id='itinid' style='display:none'>"+itinid+"</span>");
	$div.append("<div><a>Delete this itinerary</a><div>")
	$container.click(function() {
		store.set("itinid", $(this).parent().find("#itinid").text());
		window.location = "map.html";
		return false;
	})
	return $div;
}

var parseItin = function(type, itin_json) {
	if(itin_json.length > 1) {
		for(let i=0;i<itin_json.length;++i) {
			let tempitin = JSON.parse(itin_json[i]);
			$("#"+type).append(
				renderItin(tempitin.thumbnail_url, tempitin.name, 
				3, tempitin._id.$oid));
		}
	}
	else {
		let tempitin = JSON.parse(itin_json);
		$("#"+type).append(
				renderItin(tempitin.thumbnail_url, tempitin.name, 
				3, tempitin._id.$oid));
	}
}

var noItin = function(type) {
	$("#"+type).append("<p>No itineraries available</p>");
}

var newItin = function() {
	if(store.has("itinid")) {
		store.delete("itinid");
	}
	window.location = "map.html";
}

var endpoint = "http://roadtrip-env.us-west-1.elasticbeanstalk.com/";


$.get(endpoint+"PublicItinerary", function(data, status) {
			if(data.length!=0) {
				parseItin("publicitin", data);
			}
			else noItin("publicitin");
		});


var user = store.get("user");
if(user == null) {
	$("#myitinbutton").hide();
	$("#shareditinbutton").hide();
	$("#newitinbutton").hide();
	$("#publicitinbutton").click();
}
else {
	var user_name = user.name;
	$("#profile_img").attr('src', user.picture);
	$.get(endpoint+"MyItinerary/"+user_name, function(data, status) {
			if(data.length!=0) {
				parseItin("myitin", data);
			}
			else noItin("myitin");
		});
	//wait for AWS to publish
	$.get(endpoint+"SharedItinerary/"+user_name, function(data, status) {
			if(data.length!=0) {
				parseItin("shareditin", data);
			}
			else noItin("shareditin");
		});
	$("#myitinbutton").click();
}


function logout(){
	// delete the current user varialbe
	if(store.has("user")){
      store.delete("user");
    }
    // redirect to login page
    window.location = "login.html";
}