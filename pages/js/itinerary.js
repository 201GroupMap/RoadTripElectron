/**
 *
 */
 /*
const Store = require('electron-store');
const store = new Store();
*/

var openItin = function(type) {
	$(".tabcontent").hide();
	$(".tablinks").removeClass("active");
	$("#"+type).show();
	$("#"+type+"button").addClass("active");
};

var renderItin = function(imagelink, itin_name, star_num, itinid, editAccess, type) {
	//console.log(itinid);
	let $div = $("<div>", {class:"itinerary"});
	let $container = $("<div>", {class:"container"});
	$container.append("<img src="+imagelink+">");
	$container.append("<div class='overlay'><div class='text'>View</div></div>");
	$div.append($container);
	$div.append("<p>"+itin_name+"</p>");
	// for(let i=0;i<star_num;++i) {
	// 	$div.append("<span class='fa fa-star checked'></span>");
	// }
	// for(let i=0;i<5-star_num;++i) {
	// 	$div.append("<span class='fa fa-star'></span>");
	// }
	$div.append("<span id='itinid' style='display:none'>"+itinid+"</span>");
	let $delete = $("<div>", {class:"delete"});
	if(type == 'myitin'){
		$delete.append("<button class='deletebutton btn btn-default'>Delete</button>");
	}
	$div.append($delete);
	//$div.append("<div><a>Delete this itinerary</a><div>")
	$container.click(function() {
		store.set("itinid", $(this).parent().find("#itinid").text());
		store.set("editAccess", editAccess);
		window.location = "map.html";
		return false;
	});
	$delete.click(function() {
		$.ajax({
			url: endpoint+'Itinerary/'+$(this).parent().find("#itinid").text(),
			type: 'DELETE',
			success: function(result) {
			}
		});
		$(".itinerary:contains('"+$(this).parent().find("#itinid").text()+"')").hide();
	});
	return $div;
}

var parseItin = function(type, itin_json) {
	if(itin_json.length > 1) {
		for(let i=0;i<itin_json.length;++i) {
			let tempitin = JSON.parse(itin_json[i]);
			let editAccess = hasEditAccess(tempitin, getUsername());
			$("#"+type).append(
				renderItin(tempitin.thumbnail_url, tempitin.name,
				3, tempitin._id.$oid, editAccess, type));
		}
	}
	else {
		let tempitin = JSON.parse(itin_json);
		let editAccess = hasEditAccess(tempitin, getUsername());
		$("#"+type).append(
				renderItin(tempitin.thumbnail_url, tempitin.name,
				3, tempitin._id.$oid, editAccess, type));
	}
}

var noItin = function(type) {
	//$("#"+type).append("<p>No itineraries available</p>");
	// don't do anything
}

var newItin = function() {
	if(store.has("itinid")) {
		store.delete("itinid");
	}
	store.set("editAccess", true);
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

function hasEditAccess(itinJson, username) {
	let sharedUsers = itinJson.shared_users;
	return ((username === itinJson.owner_name) | (sharedUsers.includes(username)));
}

function logout(){
	// delete the current user varialbe
	if(store.has("user")){
      store.delete("user");
    }
    // redirect to login page
    window.location = "login.html";
}