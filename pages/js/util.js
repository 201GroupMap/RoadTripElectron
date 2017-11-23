const Store = require('electron-store');
const store = new Store();

function getItineraryId () {
  let itineraryId = store.get("itinid");
  return itineraryId;
}
