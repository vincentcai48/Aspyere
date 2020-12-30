import React from "react";
import { Link, Redirect } from "react-router-dom";
import {
  pAuth,
  googleAuthProvider,
  pFirestore,
  fbFieldValue,
} from "../services/config";
import { PContext } from "../services/context";
import personIcon from "../images/person-icon.png";

class Header extends React.Component {
  constructor() {
    super();
    this.state = {
      redirect: null,
      showMobileDropdown: false,
    };
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
        <div className="header-s1">
          <Link className="react-link" to="/">
            <h1 id="title-h1">
              {!this.context.platformName || !this.context.platform ? (
                "Aspyere"
              ) : (
                <div>
                  {this.context.platformName}
                  <div id="h1-onAspyere">on&nbsp;Aspyere</div>
                </div>
              )}
            </h1>
          </Link>
          {this.context.isMobile && (
            <div
              id="menu-button"
              className="fas fa-bars"
              onClick={() => {
                this.setState((p) => {
                  return { showMobileDropdown: !p.showMobileDropdown };
                });
              }}
            ></div>
          )}
        </div>

        {!this.context.isMobile && <div id="header-space"></div>}

        {!this.state.showMobileDropdown && this.context.isMobile ? (
          <span></span>
        ) : (
          <div className="header-s2">
            <div className="options-header">
              <div className="header-text">
                Options<i className="fas fa-caret-down"></i>
              </div>
              <ul className="dropdown">
                <Link className="react-link d-item" to="/dblist">
                  Databases
                </Link>

                <Link
                  to="/"
                  className="d-item react-link"
                  onClick={() => {
                    this.context.setIsShowPlatformPopup(true);
                  }}
                >
                  Platform
                </Link>
              </ul>
            </div>

            <div id="header-account-area">
              {pAuth.currentUser ? (
                <a href="/account" id="header-account-button">
                  <img
                    id="header-profilepic"
                    src={pAuth.currentUser.photoURL || personIcon}
                  ></img>
                  Account
                </a>
              ) : (
                <button id="header-account-button" onClick={this.login}>
                  Login
                </button>
              )}
            </div>
          </div>
        )}
      </header>
    );
  }
}
Header.contextType = PContext;

export default Header;
