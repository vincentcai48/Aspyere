import React from "react"
import gIcon from "../images/googleicon.png";
import { fbFieldValue, googleAuthProvider, pAuth, pFirestore } from "../services/config";

class Auth extends React.Component{

    login = () => {
        pAuth.signInWithPopup(googleAuthProvider).then((result)=>{
            const user = result.user;
            console.log("Success");
            pFirestore.collection("users").doc(user.uid).get().then(
                (doc)=>{
                  if(!doc.exists){
                    pFirestore.collection("users").doc(user.uid).set({
                        displayName: user.displayName,
                        email: user.email,
                        dateCreated: fbFieldValue.serverTimestamp(),
                        imageURL: user.photoURL,

                    })
                  }
                }
            )
        }
        )
    }

    render(){
    return(<div id="auth-container"><h2>Login</h2><p>{pAuth.currentUser&&pAuth.currentUser.displayName}</p><button id="auth-button" onClick={this.login}><img id="gIcon-image" src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Google_%22G%22_Logo.svg/1004px-Google_%22G%22_Logo.svg.png"></img>Login With Google</button></div>);
    }
}

export default Auth;