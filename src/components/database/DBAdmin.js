import React, { version } from "react";
import {
  fbFieldValue,
  pAuth,
  pFirestore,
  pStorageRef,
} from "../../services/config";
import ProgressBar from "../ProgressBar";
import { uuid } from "uuidv4";
import Auth from "../Auth";
import { Link } from "react-router-dom";

class DBAdmin extends React.Component {
  constructor(props) {
    super();
    this.state = {
      //Coming from "props.parentState",from FIRESTORE from DBDashborad.
      // dbId: null,
      // accessLevel: 0,
      // usersMap: {}, //mapping of users to their displayName,
      // memberCode: "",
      // members: [],
      // isViewable: false,
      // admins: [],
      // dbName: '',
      // dbDescription: '',

      userToDelete: null,
      userToPromote: null,
      memberCodeInput: "",
    };
  }

  // componentDidMount(){
  //     this.setDBandUserData();
  //     pFirestore.collection("users").onSnapshot(docs=>{
  //         var usersMap = {};
  //         docs.forEach(doc=>{
  //             usersMap[doc.id] = doc.data()["displayName"]
  //         })
  //         this.setState({usersMap: usersMap})
  //     })
  //     pAuth.onAuthStateChanged((user)=>{
  //         if(user) {
  //             console.log(user.uid,pAuth.currentUser.uid);
  //             this.setDBandUserData();
  //         }
  //         // if(user.id){ this.setDBandUserData();
  //         // console.log(user.id)}
  //         // else{}
  //     })
  // }

  // setDBandUserData = () => {
  //     var dbId = this.getURLParams();
  //     this.setState({dbId: dbId})
  //     console.log(pAuth.currentUser)
  //     if(pAuth.currentUser){
  //         console.log(pAuth.currentUser.uid)
  //         this.setState({accessLevel: 0, })
  //         try{
  //             pFirestore.collection("databases").doc(dbId).onSnapshot(snap=>{
  //                 var data = snap.data();
  //                 var accessLevel = 0;
  //                 if (data.isViewable) accessLevel = 1;
  //                 if(data["members"]&&data["members"].includes(pAuth.currentUser.uid)){
  //                     accessLevel = 2;
  //                 }
  //                 if(data['admins']&&data['admins'].includes(pAuth.currentUser.uid)) accessLevel = 3;
  //                 this.setState({
  //                     accessLevel: accessLevel,
  //                     members: data['members'],
  //                     admins: data["admins"],
  //                     memberCode: data['memberCode'],
  //                     isViewable: data["isViewable"],
  //                     dbName: data['name'],
  //                     dbDescription: data['description'],
  //                 })
  //             })
  //         } catch(e){
  //             //if the snapshot doesn't work because of security rules.
  //             console.log("FAIL")
  //             this.setState({accessLevel: 0, })
  //         }

  //     }

  // }

  // getURLParams = () => {
  //     //checking if there is url param. if so, then return it, if not, return null,
  //     const urlParams = new URLSearchParams(window.location.search);
  //     if (urlParams.has("db")) {
  //       return urlParams.get("db");
  //     }else{
  //         return null;
  //     }
  //   }

  changeState = (e) => {
    const { name, value } = e.target;
    this.setState({ [name]: value });
  };

  checkboxIsViewable = (e) => {
    pFirestore
      .collection("databases")
      .doc(this.props.parentState.dbId)
      .update({ isViewable: e.target.checked });
  };

  codeUpdate = () => {
    pFirestore
      .collection("databases")
      .doc(this.props.parentState.dbId)
      .update({ memberCode: this.state.memberCodeInput });
  };

  //this will delete the user from all access privileges.
  deleteUser = (userId, isFinal) => {
    this.setState({ userToDelete: userId });
    if (isFinal) {
      var members = this.props.parentState.members;
      for (var i = 0; i < members.length; i++) {
        if (members[i] == userId) members.splice(i, 1);
      }
      var admins = this.props.parentState.admins;
      for (var i = 0; i < admins.length; i++) {
        if (admins[i] == userId) admins.splice(i, 1);
      }
      var newObj = {
        members: members,
        admins: admins,
      };
      pFirestore
        .collection("databases")
        .doc(this.props.parentState.dbId)
        .update(newObj)
        .then(() => {
          this.setState({ userToDelete: null });
        });
    }
  };

  promoteToAdmin = (userId, isFinal) => {
    if (isFinal) {
      var members = this.props.parentState.members;
      for (var i = 0; i < members.length; i++) {
        if (members[i] == userId) members.splice(i, 1);
      }
      var admins = this.props.parentState.admins;
      for (var i = 0; i < admins.length; i++) {
        if (admins[i] == userId) admins.splice(i, 1);
      }
      admins.push(userId);
      var newObj = {
        members: members,
        admins: admins,
      };
      pFirestore
        .collection("databases")
        .doc(this.props.parentState.dbId)
        .update(newObj)
        .then(() => {
          this.setState({ userToPromote: null });
        });
    }
    this.setState({ userToPromote: userId });
  };

  render() {
    if (!pAuth.currentUser) return <Auth />;
    return (
      <div>
        {this.props.parentState.accessLevel >= 3 ? (
          <section id="db-credentials">
            <ul id="db-admin-settings">
              <li className="dbadmin-memberCode">
                Member Code: {this.props.parentState.memberCode}
              </li>

              <li className="db-admin-changeMemberCode">
                <input
                  autoComplete="off"
                  onChange={this.changeState}
                  name="memberCodeInput"
                  placeholder="Change Member Code"
                  value={this.state.memberCodeInput}
                ></input>
                <button onClick={() => this.codeUpdate()} className="sb">
                  Update Member Code
                </button>
              </li>

              <li className="dbadmin-checkbox">
                <input
                  type="checkbox"
                  name="isViewable"
                  onChange={this.checkboxIsViewable}
                  checked={this.props.parentState.isViewable}
                ></input>
                Publicly Viewable
              </li>

              <li className="dbadmin-members">
                <ul>
                  <div>Members:</div>
                  {this.props.parentState.members &&
                    this.props.parentState.members.map((e) => (
                      <li name={e}>
                        {this.props.parentState.usersMap[e]}
                        <button
                          onClick={() => this.deleteUser(e, false)}
                          className="x-out"
                        >
                          X
                        </button>
                        <button
                          onClick={() => this.promoteToAdmin(e, false)}
                          className="sb"
                        >
                          Promote to Admin
                        </button>
                        <hr></hr>
                      </li>
                    ))}
                </ul>
              </li>

              <li className="dbadmin-admins">
                <ul>
                  <div>Admins:</div>
                  {this.props.parentState.admins.map((e) => (
                    <li name={e}>
                      {this.props.parentState.usersMap[e]}
                      <hr></hr>
                    </li>
                  ))}
                </ul>
              </li>
            </ul>
          </section>
        ) : (
          <p id="admin-text">
            To administer this database, you must be promoted by an exisiting
            administrator
          </p>
        )}

        {this.state.userToDelete && (
          <div className="grayed-out-background">
            <div className="popup">
              <div>
                Are You sure you want to delete this from this database? This
                will remove this user from all access privileges, viewing (if
                not public), editing and admin.
              </div>
              <button
                className="confirm-button"
                onClick={() => this.deleteUser(this.state.userToDelete, true)}
              >
                Confirm
              </button>
              <button
                className="cancel-button"
                onClick={() => this.setState({ userToDelete: null })}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {this.state.userToPromote && (
          <div className="grayed-out-background">
            <div className="popup">
              <div>
                Are you sure you want to promote this user? This action is
                irreversible. Admins can change access codes, delete users,
                promote other admins, change anything in the database, and
                delete the entire database.
              </div>
              <button
                className="submit-button"
                onClick={() =>
                  this.promoteToAdmin(this.state.userToPromote, true)
                }
              >
                Confirm
              </button>
              <button
                className="cancel-button"
                onClick={() => this.setState({ userToPromote: null })}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default DBAdmin;
