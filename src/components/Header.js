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
              Aspyere
              {/* {!this.context.platformName || !this.context.platform ? (
                "Aspyere"
              ) : (
                <div>
                  {this.context.platformName}
                  <div id="h1-onAspyere">on&nbsp;Aspyere</div>
                </div>
              )} */}
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

                <button
                  className="d-item react-link"
                  onClick={() => {
                    this.context.setIsShowPlatformPopup(true);
                  }}
                >
                  Platform
                </button>
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

        {this.context.isShowPlatformPopup && (
          <div className="grayed-out-background">
            <div className="popup platformPopup">
              <div className="first-row">
                <h4>Platforms</h4>

                <button
                  className="x-out-platforms"
                  onClick={() => this.context.setIsShowPlatformPopup(false)}
                >
                  Close
                </button>
              </div>
              <Link
                className="enp arrow-button"
                to="/"
                onClick={() => {
                  this.context.setIsShowPlatformPopup(false);
                }}
              >
                Explore New Platforms <span>{">>>"}</span>
              </Link>
              <ul id="user-allPlatforms">
                {this.context.rootUserData &&
                  this.context.rootUserData.allPlatforms &&
                  this.context.rootUserData.allPlatforms.map((p) => {
                    var platforms = this.context.allPlatforms.filter(
                      (pl) => pl.id == p
                    );

                    if (!platforms[0]) return "";
                    var pData = platforms[0];
                    if (!pData.name && !pData.description) return "";
                    return (
                      <li className="single-myPlatform" key={pData.id}>
                        <div>
                          {this.context.rootUserData.platform == p ? (
                            <div className="joined-text">Joined</div>
                          ) : (
                            <button
                              className="join-platform-button"
                              onClick={async () => {
                                await this.context.joinPlatform(p);
                                this.context.setIsShowPlatformPopup(false);
                                window.location.reload();
                              }}
                            >
                              Join
                            </button>
                          )}
                        </div>
                        <div className="platform-nd">
                          <h5>{pData.name}</h5>
                          <p>
                            {pData.description && pData.description.length > 100
                              ? pData.description.substr(0, 100) + "..."
                              : pData.description}
                          </p>
                        </div>
                      </li>
                    );
                  })}
              </ul>
            </div>
          </div>
        )}
      </header>
    );
  }
}
Header.contextType = PContext;

export default Header;
