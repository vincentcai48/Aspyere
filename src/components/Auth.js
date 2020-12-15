import React from "react";
import gIcon from "../images/googleicon.png";
import {
  fbFieldValue,
  googleAuthProvider,
  pAuth,
  pFirestore,
} from "../services/config";

class Auth extends React.Component {
  constructor() {
    super();
    this.state = {
      showEPLogin: false,
      registerEmail: "",
      registerPassword: "",
      loginEmail: "",
      loginPassword: "",
      errorMessage: null,
    };
  }

  login = () => {
    pAuth.signInWithPopup(googleAuthProvider).then((result) => {
      const user = result.user;
      console.log("Success");
      pFirestore
        .collection("users")
        .doc(user.uid)
        .get()
        .then((doc) => {
          //Already in the onNewUser cloud function.
          //   if (!doc.exists) {
          //     pFirestore.collection("users").doc(user.uid).set({
          //       displayName: user.displayName,
          //       email: user.email,
          //       dateCreated: fbFieldValue.serverTimestamp(),
          //       imageURL: user.photoURL,
          //     });
          //   }
        });
    });
  };

  changeState = (e) => {
    const { name, value } = e.target;
    this.setState({ [name]: value });
  };

  emailRegister = () => {
    pAuth
      .createUserWithEmailAndPassword(
        this.state.registerEmail,
        this.state.registerPassword
      )
      .then(() => {})
      .catch((e) => this.setState({ errorMessage: e.message }));
  };

  emailLogin = () => {
    pAuth
      .signInWithEmailAndPassword(
        this.state.loginEmail,
        this.state.loginPassword
      )
      .then(() => {})
      .catch((e) => {
        this.setState({ errorMessage: e.message });
      });
  };

  render() {
    return (
      <div id="auth-container">
        <h2>Login</h2>
        <p>{pAuth.currentUser && pAuth.currentUser.displayName}</p>
        <button id="auth-button" onClick={this.login}>
          <img
            id="gIcon-image"
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Google_%22G%22_Logo.svg/1004px-Google_%22G%22_Logo.svg.png"
          ></img>
          Login With Google
        </button>
        <section>
          <button
            className="ep-button"
            onClick={() =>
              this.setState((p) => {
                return { showEPLogin: !p.showEPLogin };
              })
            }
          >
            Or use email and password
          </button>
          {this.state.showEPLogin && (
            <div id="EP-area">
              <section id="register-EP">
                <h3>Register New User</h3>
                <input
                  placeholder="email"
                  onChange={this.changeState}
                  value={this.state.registerEmail}
                  name="registerEmail"
                ></input>

                <input
                  placeholder="password"
                  onChange={this.changeState}
                  value={this.state.registerPassword}
                  name="registerPassword"
                  type="password"
                ></input>

                <button className="sb" onClick={this.emailRegister}>
                  Register
                </button>
              </section>
              <section id="login-EP">
                <h3>Login</h3>
                <input
                  placeholder="email"
                  onChange={this.changeState}
                  value={this.state.loginEmail}
                  name="loginEmail"
                ></input>

                <input
                  placeholder="password"
                  onChange={this.changeState}
                  value={this.state.loginPassword}
                  name="loginPassword"
                  type="password"
                ></input>

                <button className="sb" onClick={this.emailLogin}>
                  Login
                </button>
              </section>
            </div>
          )}
        </section>

        {this.state.errorMessage && (
          <div className="grayed-out-background">
            <div className="popup nsp">
              <h4>{this.state.errorMessage}</h4>
              <button
                onClick={() => this.setState({ errorMessage: null })}
                className="cancel-button"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default Auth;
