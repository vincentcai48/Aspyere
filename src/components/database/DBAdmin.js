import React, { version } from "react";
import {
  fbFieldValue,
  pAuth,
  pFirestore,
  pFunctions,
  pStorageRef,
} from "../../services/config";
import ProgressBar from "../ProgressBar";
import { uuid } from "uuidv4";
import Auth from "../Auth";
import { Link } from "react-router-dom";
import Loading from "../Loading";

//PROPS: parentState: Object() (the state of DBDashboard), changeParentState Function(Object() of updates) (this is setState() for DBDashboard)
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
      name: "",
      description: "",
      isViewable: "",
      isNotSaved: false,
      isLoading: false,
      isError: false,
    };
  }

  componentDidMount() {
    this.setDBNameAndDescription(
      this.props.parentState.dbName,
      this.props.parentState.dbDescription,
      this.props.parentState.isViewable
    );
  }

  componentDidUpdate(prevProps) {
    if (prevProps != this.props) {
      this.setDBNameAndDescription(
        this.props.parentState.dbName,
        this.props.parentState.dbDescription,
        this.props.parentState.isViewable
      );
    }
  }

  setDBNameAndDescription = (name, description, isViewable) => {
    this.setState({
      name: name,
      description: description,
      isViewable: isViewable,
    });
  };

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

  saveChanges = () => {
    this.setState({ isLoading: true });
    var updateDBSettings = pFunctions.httpsCallable("updateDBSettings");
    updateDBSettings({
      name: this.state.name,
      description: this.state.description,
      isViewable: this.state.isViewable,
      dbId: this.props.parentState.dbId,
    })
      .then((res) => {
        console.log(res);
        this.setState({ isNotSaved: false, isLoading: false });
      })
      .catch((e) => {
        this.setState({ isError: true, isLoading: false });
      });
  };

  changeState = (e) => {
    const { name, value } = e.target;
    this.setState({ [name]: value, isError: false });
  };

  checkboxIsViewable = (e) => {
    this.setState({
      isNotSaved: true,
      isError: false,
      isViewable: e.target.checked,
    });
  };

  codeUpdate = () => {
    this.setState({ isLoading: true });
    var updateMemberCode = pFunctions.httpsCallable("updateMemberCode");
    updateMemberCode({
      memberCode: this.state.memberCodeInput,
      dbId: this.props.parentState.dbId,
    }).then((res) => {
      if (res) {
        this.setState({ isLoading: false });
      } else {
        this.setState({ isLoading: false, isError: true });
      }
    });
  };

  //this will delete the user from all access privileges.
  deleteUser = (userId, isFinal) => {
    this.setState({ userToDelete: userId, isLoading: isFinal });
    if (isFinal) {
      var deleteDBUser = pFunctions.httpsCallable("deleteDBUser");
      deleteDBUser({
        dbId: this.props.parentState.dbId,
        userId: userId,
      })
        .then(() => {
          this.setState({ userToDelete: null, isLoading: false });
        })
        .catch((e) => {
          this.setState({ isLoading: false });
        });
    }
  };

  promoteToAdmin = (userId, isFinal) => {
    this.setState({ userToPromote: userId, isLoading: isFinal });
    if (isFinal) {
      var promoteDBUser = pFunctions.httpsCallable("promoteDBUser");
      promoteDBUser({
        dbId: this.props.parentState.dbId,
        userId: userId,
      })
        .then(() => {
          this.setState({ userToPromote: null, isLoading: true });
        })
        .catch((e) => {
          this.setState({ isLoading: false });
        });
    }
  };

  render() {
    console.log(this.props.parentState);
    if (!pAuth.currentUser) return <Auth />;
    return (
      <div>
        {this.props.parentState.accessLevel >= 3 ? (
          <section id="db-credentials">
            {this.state.isNotSaved && (
              <div id="save-changes-bar">
                {this.state.isError ? (
                  <div>An Error Occurred </div>
                ) : (
                  <div>
                    {this.state.isLoading ? (
                      <Loading />
                    ) : (
                      "Changes have yet to be saved"
                    )}
                  </div>
                )}

                {!this.state.isLoading && (
                  <button className="sb" onClick={this.saveChanges}>
                    Save Changes
                  </button>
                )}
              </div>
            )}

            {this.state.isError && !this.state.isNotSaved && (
              <div className="heading-note">An Error Occurred</div>
            )}
            {this.state.isLoading && !this.state.isNotSaved && (
              <div className="heading-note">
                <Loading />
              </div>
            )}

            <ul id="db-admin-settings">
              <li className="db-admin-dbName">
                <input
                  value={this.state.name}
                  onChange={(e) => {
                    this.changeState(e);
                    this.setState({ isNotSaved: true, isError: false });
                  }}
                  name="name"
                  placeholder="Database Name"
                ></input>
              </li>
              <li className="db-admin-dbDescription">
                <textarea
                  value={this.state.description}
                  onChange={(e) => {
                    this.changeState(e);
                    this.setState({ isNotSaved: true, isError: false });
                  }}
                  name="description"
                  placeholder="Description of Database"
                ></textarea>
              </li>
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
                  checked={this.state.isViewable}
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
            <div className="popup nsp">
              <div>
                Are You sure you want to delete this user from this database?
                This will remove this user from all access privileges, viewing
                (if not public), editing and admin.
              </div>
              <button
                className="submit-button"
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
