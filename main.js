const electron = require('electron');
const url = require('url');
const path = require('path');
const Store = require('electron-store');
const store = new Store();

var ipcMain = require('electron').ipcMain;
console.log(store.get("userid"));
// required auth
const electronOauth2 = require('electron-oauth2');
var axios = require('axios');

const {app, BrowserWindow} = electron;

let mainWindow;

// Listen and wait for app to be ready
app.on('ready',function(){
	// create the window
	mainWindow = new BrowserWindow({
		show: false,
		icon: 'img/icon4.png'
	});
	//mainWindow.setMenu(null);
	// open window maximized
	mainWindow.maximize();
	// load html
	mainWindow.loadURL(url.format({
		pathname: path.join(__dirname, 'pages/login.html'),
		protocol: 'file:',
		slahes: true
	}));
  // when closing, clear the local data
  mainWindow.on('close',function(){
    if(store.has("user")){
      store.delete("user");
    }
    if(store.has("itinid")){
      store.delete("itinid");
    }
  })
});


/*
 * ipc is the event listener for 'sigin' which is emitted by the index.html file
 */
ipcMain.on('signin', googleSignIn)

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

// auth (you need everything here)
var OAuthConfig = {
    clientId: '989100001352-4btfq6vummlpqrllo7gfdlgm1d2mu4el.apps.googleusercontent.com',
    clientSecret: 'EVD5v5UZb_gl_6Hhgyq3YNAR',
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://www.googleapis.com/oauth2/v4/token',
    useBasicAuthorizationHeader: false,
    redirectUri: 'http://localhost'
};

const OAuthWindowParams = {
  alwaysOnTop: true,
  autoHideMenuBar: true,
  webPreferences: {
      nodeIntegration: false
  }
}

const OAuthOptions = {
  scope: 'profile email',
  accessType: 'offline'
};

const myApiOauth = electronOauth2(OAuthConfig, OAuthWindowParams);

// opens up a new popup window to signin
function googleSignIn() {
  myApiOauth.getAccessToken(OAuthOptions)
    .then((token) => {
      // use your token.id_token
      // axios http request
      axios.get("http://roadtrip-env.us-west-1.elasticbeanstalk.com/Authenticate/" + token.id_token)
      .then(response => {
        // AUTOMATICALLY PARSES JSON FOR YOU
        console.log(response.data);
        if(response.data.success){
          // successful user creation ... move on
          authSuccess(response.data);
        }else{
          // user is not created ... create a new user
          axios.post("http://roadtrip-env.us-west-1.elasticbeanstalk.com/Authenticate", token.id_token)
          .then(response => {
            console.log(response.data);
            if(response.data.success){
              // successful user creation ... move on
              authSuccess(response.data);
            }else{
              // user is not created ... google error
              authenticationError(response.data.message);
            }
          })
          .catch(error => {
            console.log(error);
          })
        }
      })
      .catch(error => {
        console.log(error);
      })
    });
}

//These functions will get called after auth is cleared/not

// user is the object defined in the document, and user will always be filled
function authSuccess(user){
  console.log('success!');
  mainWindow.webContents.send('message', user.message);
  // store current user object locally in electron
  store.set("user", user);
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'pages/itinerary.html'),
    protocol: 'file:',
    slahes: true
  }));
}

// will get called if google throws an error - nothing we can do
function authError(message){
  console.log('error: ' + message);
  mainWindow.webContents.send('message', user.message);
}