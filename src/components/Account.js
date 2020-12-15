import React, { useContext, useState } from "react";
import { pAuth } from "../services/config";
import { PContext } from "../services/context";
import Auth from "./Auth";
import personIcon from "../images/person-icon.png";

function Account() {
  const [isAuth, changeIsAuth] = useState(pAuth.currentUser);
  const context = useContext(PContext);

  pAuth.onAuthStateChanged((user) => {
    if (user) {
      changeIsAuth(true);
    } else {
      changeIsAuth(false);
    }
  });

  var logout = () => {
    pAuth
      .signOut()
      .then(() => {})
      .catch(() => {});
  };

  if (!isAuth) return <Auth />;
  return (
    <div id="account-container">
      <h2>Account</h2>
      <img
        src={pAuth.currentUser.photoURL || personIcon}
        className="account-img"
      ></img>
      <div className="account-displayName">
        {context.rootUserData.displayName || pAuth.currentUser.email}
      </div>
      <button id="logout-button" onClick={logout}>
        Logout
      </button>
    </div>
  );
}

export default Account;
