import * as firebase from "firebase/app";
import "firebase/firestore";
import "firebase/storage";
import "firebase/auth";
import "firebase/analytics";
import "firebase/functions";

var firebaseConfig = {
  apiKey: "AIzaSyC9RlSBUSLKVBwPxOOE_eCiTZGiA0StGFA",
  authDomain: "circular-symbol-293515.firebaseapp.com",
  databaseURL: "https://circular-symbol-293515.firebaseio.com",
  projectId: "circular-symbol-293515",
  storageBucket: "circular-symbol-293515.appspot.com",
  messagingSenderId: "262632815974",
  appId: "1:262632815974:web:db1420ed0bcb25ff82dca7",
  measurementId: "G-H04JQDDNPX",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
firebase.analytics();

const pAuth = firebase.auth();
const pFirestore = firebase.firestore();
const pStorage = firebase.storage();
const googleAuthProvider = new firebase.auth.GoogleAuthProvider();
const fbFieldValue = firebase.firestore.FieldValue;
const fbTimestamp = firebase.firestore.Timestamp;
const pStorageRef = firebase.storage().ref();
const pFunctions = firebase.functions();

export {
  pAuth,
  pFirestore,
  pStorage,
  fbFieldValue,
  googleAuthProvider,
  pStorageRef,
  pFunctions,
  fbTimestamp,
};
