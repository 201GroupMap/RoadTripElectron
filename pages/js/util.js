const Store = require('electron-store');
const store = new Store();

function getItineraryId () {
  let itineraryId = store.get("itinid");
  //let itineraryId = "5a122d14cda57820b082e4a8";
  //return false;
  return itineraryId;
}
