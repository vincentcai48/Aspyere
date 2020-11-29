import React, { useState } from "react";
import { pAuth } from "../services/config";
import Auth from "./Auth";

function Account() {
  const [isAuth, changeIsAuth] = useState(pAuth.currentUser);

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
      <img src={pAuth.currentUser.photoURL} className="account-img"></img>
      <div className="account-displayName">{pAuth.currentUser.displayName}</div>
      <button id="logout-button" onClick={logout}>
        Logout
      </button>
    </div>
  );
}

export default Account;
