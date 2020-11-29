import React from "react";
import { Link } from "react-router-dom";
import {
  pAuth,
  googleAuthProvider,
  pFirestore,
  fbFieldValue,
} from "../services/config";

class Header extends React.Component {
  constructor() {
    super();
    this.state = {};
  }

  logout = () => {
    pAuth
      .signOut()
      .then(() => console.log("success"))
      .catch((e) => console.log("Log Out Error", e));
  };

  login = () => {
    pAuth.signInWithPopup(googleAuthProvider).then((result) => {
      const user = result.user;
      console.log("Success");
      pFirestore
        .collection("users")
        .doc(user.uid)
        .get()
        .then((doc) => {
          if (!doc.exists) {
            pFirestore.collection("users").doc(user.uid).set({
              displayName: user.displayName,
              email: user.email,
              dateCreated: fbFieldValue.serverTimestamp(),
              imageURL: user.photoURL,
            });
          }
        });
    });
  };

  render() {
    return (
      <header>
        <Link className="react-link" to="/">
          <h1 id="title-h1">Aspyere</h1>
        </Link>
        <div id="header-space"></div>
        <Link className="react-link header-link" to="/dblist">
          Databases
        </Link>
        <div id="header-account-area">
          {pAuth.currentUser ? (
            <a href="/account" id="header-account-button">
              <img
                id="header-profilepic"
                src={pAuth.currentUser.photoURL}
              ></img>
              Account
            </a>
          ) : (
            <button id="header-account-button" onClick={this.login}>
              Login
            </button>
          )}
        </div>
      </header>
    );
  }
}

export default Header;
