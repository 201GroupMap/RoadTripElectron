const Store = require('electron-store');
const store = new Store();

function getItineraryId () {
  let itineraryId = store.get("itinid");
  return itineraryId;
}

function getUsername () {
  let user = store.get("user");
  if (user == null) return null;
  return user.name;
}
