import React, { useContext, useState } from "react";
import { pAuth, pFunctions } from "../services/config";
import { PContext } from "../services/context";
import Auth from "./Auth";
import personIcon from "../images/person-icon.png";
import Loading from "./Loading";

function Account() {
  const [isAuth, changeIsAuth] = useState(pAuth.currentUser);
  const [usernamePopup, setUsernamePopup] = useState(false);
  const [deletePopup, setDeletePopup] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [loading, setLoading] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const context = useContext(PContext);

  pAuth.onAuthStateChanged((user) => {
    if (user) {
      changeIsAuth(true);
    } else {
      changeIsAuth(false);
    }
  });

  var logout = async () => {
    await pAuth
      .signOut()
      .then(() => {})
      .catch(() => {});
  };

  const sendPasswordResetEmail = async () => {
    try {
      await pAuth.sendPasswordResetEmail(pAuth.currentUser.email);
    } catch (e) {
      console.error(e);
    }
  };

  const updateUsername = async () => {
    setUsernamePopup(false);
    setLoading(true);
    const username = usernameInput;
    try {
      await pAuth.currentUser.updateProfile({
        displayName: username,
      });
    } catch (e) {
      console.error(e);
    }
    try {
      var updateUsername = pFunctions.httpsCallable("updateUsername");
      await updateUsername({ username: username });
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const deleteAccount = async () => {
    setLoading(true);
    setDeletePopup(false);
    var user = { ...pAuth.currentUser };

    try {
      await pAuth.currentUser.delete();
      await logout();
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  if (!isAuth) return <Auth />;
  if (!pAuth.currentUser.uid) return;
  return (
    <div id="account-container">
      <h2>Account</h2>
      <img
        src={pAuth.currentUser.photoURL || personIcon}
        className="account-img"
      ></img>
      <div className="account-displayName">
        <span className="username-text">Username:</span>{" "}
        {context.rootUserData.displayName || pAuth.currentUser.email}
      </div>
      <button
        className="ssb reset-username-button"
        onClick={() => setUsernamePopup(true)}
      >
        Reset Username
      </button>

      <button id="logout-button" onClick={logout}>
        Logout
      </button>

      <button
        className="bb delete-account-button"
        onClick={() => setDeletePopup(true)}
      >
        Delete This Account
      </button>

      {loading && (
        <div className="grayed-out-background">
          <div className="popup nsp">
            <Loading />
          </div>
        </div>
      )}

      {usernamePopup && (
        <div className="grayed-out-background">
          <div className="popup nsp username-popup">
            <h5>Change Username</h5>
            <input
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder="New Username"
              value={usernameInput}
            ></input>
            <button className="submit-button" onClick={updateUsername}>
              Change My Username
            </button>
            <button
              className="cancel-button"
              onClick={() => {
                setUsernamePopup(false);
                setUsernameInput("");
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {deletePopup && (
        <div className="grayed-out-background">
          <div className="popup red nsp">
            <h4>Are You Sure You Want to Delete Your Account?</h4>
            <p>
              This action is irreversible. This will delete all your account
              information, and you will not be able to log into this account
              again. Records you made on Aspyere will remain (e.g. questions you
              added to a database), but you will no longer be able to access
              them under this account.
            </p>
            <input
              className="redinput"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="confirm"
            ></input>
            {confirmText === "confirm" && (
              <button className="cancel-button" onClick={deleteAccount}>
                Delete My Account
              </button>
            )}
            <button
              className="cancel-button"
              onClick={() => {
                setConfirmText("");
                setDeletePopup(false);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Account;
