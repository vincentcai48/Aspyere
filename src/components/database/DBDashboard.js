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
import DBAdmin from "./DBAdmin";
import DBQuestions from "./DBQuestions";
import Loading from "../Loading";

class DBDashboard extends React.Component {
  constructor() {
    super();
    this.state = {
      menuOption: 0, //0 for Questions, 1 for Settings & Admin
      isShowConnect: false,

      //To pass down to "DBQuestions" and "DBAdmin" as "parentState"
      dbId: null,
      accessLevel: 0,
      usersMap: {}, //mapping of users to their displayName,
      members: [],
      isViewable: false,
      admins: [],
      dbName: "",
      dbDescription: "",
      dbQuestions: [],
      limit: 20,

      //privateSettings:
      memberCode: "",

      //For code access,
      memberCodeTry: "",
      displayError: false,

      //just for when trying the member code, don't want to show the questions while updating.
      tempDenyAccess: false,

      //in case db id doesn't exist
      isExistent: true,
    };
  }

  componentDidMount() {
    this.setDBandUserData();
    pFirestore
      .collection("settings")
      .doc("usersMapping")
      .get()
      .then((doc) => {
        var usersMap = {};
        var dataObj = { ...doc.data() };
        var keys = Object.keys(dataObj);
        keys.forEach((userId) => {
          usersMap[userId] = dataObj[userId]["displayName"];
        });
        this.setState({ usersMap: usersMap });
      });
    pAuth.onAuthStateChanged((user) => {
      if (user) {
        this.setDBandUserData();
      }
      // if(user.id){ this.setDBandUserData();
      // console.log(user.id)}
      // else{}
    });
  }

  setDBandUserData = () => {
    var dbId = this.getURLParams();
    this.setState({ dbId: dbId });

    //Get the privateSettings too
    try {
      pFirestore
        .collection("dbPrivateSettings")
        .doc(dbId)
        .onSnapshot((snap) => {
          this.setState({ ...snap.data() });
        });
    } catch (e) {
      this.setState({
        memberCode: "Not Accessible",
      });
    }
    //only when the auth state loads.
    if (pAuth.currentUser) {
      this.setState({ accessLevel: 0 });
      //get the public settings
      try {
        pFirestore
          .collection("databases")
          .doc(dbId)
          .onSnapshot(
            (snap) => {
              var data = snap.data();
              var accessLevel = 0;

              //DB DOES NOT EXIST CASE
              if (!data) return this.setState({ isExistent: false });

              if (data.isViewable) accessLevel = 1;
              if (
                data["members"] &&
                data["members"].includes(pAuth.currentUser.uid)
              ) {
                accessLevel = 2;
              }
              if (
                data["admins"] &&
                data["admins"].includes(pAuth.currentUser.uid)
              )
                accessLevel = 3;
              this.setState({
                accessLevel: accessLevel,
                members: [...data["members"]],
                admins: [...data["admins"]],
                isViewable: data["isViewable"],
                dbName: data["name"],
                dbDescription: data["description"],
              });

              //getting all the DB Questions
              pFirestore
                .collection("databases")
                .doc(this.state.dbId)
                .collection("questions")
                .orderBy("lastUpdated", "desc")
                .onSnapshot((questions) => {
                  var qs = [];
                  questions.forEach((q) => {
                    qs.push({ ...q.data(), id: q.id });
                  });
                  this.setState({ dbQuestions: qs });
                });
            },
            (error) => {
              console.error(error);
            }
          );
      } catch (e) {
        //if the snapshot doesn't work because of security rules OR because url is wrong and database doesn't exist with that id.
        console.error(e);
        this.setState({ accessLevel: 0 });
      }
    }
  };

  getURLParams = () => {
    //checking if there is url param. if so, then return it, if not, return null,
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has("db")) {
      return urlParams.get("db");
    } else {
      return null;
    }
  };

  changeState = (e) => {
    const { name, value } = e.target;
    this.setState({ [name]: value });
  };

  // uploadFile = (e) =>{
  //     console.log(e.target.files[0]);
  //     var file = e.target.files[0];
  //     this.setState({isUploading: true});
  //     pStorageRef.child("dbfiles/"+uuid()).put(file).then((result)=>{
  //         var arr = this.state.imageURLs;
  //         result.ref.getDownloadURL().then((url)=>{
  //             arr.push(url);
  //             console.log(url);
  //             console.log(arr);
  //             this.setState({imageURLs: arr});
  //         })
  //         this.setState({isUploading: false});
  //         console.log(result.bytesTransferred/result.totalBytes);
  //     })
  // }

  // addTag = (e) => {
  //     if(!this.state.tagInput) return
  //     var arr = this.state.tags;
  //     arr.push(this.state.tagInput);
  //     this.setState({tags: arr, tagInput: ""})
  // }

  // deleteTag = (e) => {
  //     var arr = this.state.tags;
  //     for(var i =0; i< arr.length; i++){
  //         if(arr[i]==e.target.name) arr.splice(i,1);
  //     }
  //     this.setState({tags: arr});
  // }

  // addAnswer = (e) => {
  //     if(!this.state.answerInput) return;
  //     var arr = this.state.answers;
  //     arr.push(this.state.answerInput);
  //     this.setState({answers: arr, answerInput: ""})
  // }

  // deleteAnswer = (e) => {
  //     var arr = this.state.answers;
  //     for(var i =0; i< arr.length; i++){
  //         if(arr[i]==e.target.name) arr.splice(i,1);
  //     }
  //     this.setState({answers: arr});
  // }

  // deleteImage = (e) => {
  //     var arr = this.state.imageURLs;
  //     for(var i =0; i< arr.length; i++){
  //         if(arr[i]==e.target.name) arr.splice(i,1);
  //     }
  //     this.setState({imageURLs: arr});
  // }

  // addQuestion = (questionId) => {
  //     pFirestore.collection('databases').doc(this.state.dbId).collection("questions").add({
  //         text: this.state.questionText,
  //         answers: this.state.answers,
  //         imageURLs: this.state.imageURLs,
  //         tags: this.state.tags,
  //         lastUpdated: fbFieldValue.serverTimestamp(),
  //         creator: pAuth.currentUser.displayName,
  //         lastEditor: pAuth.currentUser.displayName,
  //     })
  //     this.setState({
  //         text: "",
  //         answers: [],
  //         imageURLs: [],
  //         tags: [],

  //     })
  // }

  // checkboxIsViewable = (e) => {
  //     pFirestore.collection("databases").doc(this.state.dbId).update({isViewable: e.target.checked})
  // }

  // codeUpdate = () => {
  //     pFirestore.collection("databases").doc(this.state.dbId).update({memberCode: this.state.memberCodeInput})
  // }

  // //this will delete the user from all access privileges.
  // deleteUser = (userId,isFinal) => {
  //     this.setState({userToDelete: userId})
  //     if(isFinal){
  //         var members = this.state.members;
  //         for(var i =0;i<members.length;i++){
  //             if(members[i]==userId) members.splice(i,1);
  //         }
  //         var admins = this.state.admins;
  //         for(var i =0;i<admins.length;i++){
  //             if(admins[i]==userId) admins.splice(i,1);
  //         }
  //         var newObj = {
  //             members: members,
  //             admins: admins,
  //         }
  //         pFirestore.collection("databases").doc(this.state.dbId).update(newObj).then(()=>{
  //             this.setState({userToDelete: null})
  //         })
  //     }
  // }

  tryMemberCode = () => {
    this.setState({ tempDenyAccess: true });

    var tryDBMemberCode = pFunctions.httpsCallable("tryDBMemberCode");
    tryDBMemberCode({
      dbId: this.state.dbId,
      memberCodeTry: this.state.memberCodeTry,
    }).then((res) => {
      if (res.data) {
        this.setState({ tempDenyAccess: false });
      } else {
        this.setState({
          displayError: true,
          tempDenyAccess: false,
        }); //tempDenyAccess is false because you already denied access if it is an error.
      }
    });
  };

  // // tryEditingCodeFromViewing = () => {
  // //     var viewers = this.state.viewers;
  // //     for(var i =0;i<viewers.length;i++){
  // //        if(viewers[i]==pAuth.currentUser.uid) viewers.splice(i,1);
  // //     }
  // //     pFirestore.collection("databases").doc(this.state.dbId).update({viewers: viewers}).then(()=>{
  // //         // this.tryEditingCode();
  // //     })
  // // }

  // promoteToAdmin = (userId,isFinal) => {
  //     if(isFinal){
  //         var members = this.state.members;
  //         for(var i =0;i<members.length;i++){
  //             if(members[i]==userId) members.splice(i,1);
  //         }
  //         var admins = this.state.admins;
  //         for(var i =0;i<admins.length;i++){
  //             if(admins[i]==userId) admins.splice(i,1);
  //         }
  //         admins.push(userId);
  //         var newObj = {
  //             members: members,
  //             admins: admins,
  //         }
  //         pFirestore.collection("databases").doc(this.state.dbId).update(newObj).then(()=>{
  //             this.setState({userToPromote: null})
  //         })
  //     }
  //     this.setState({userToPromote: userId})
  // }

  copyDbId = () => {
    navigator.permissions.query({ name: "clipboard-write" }).then((result) => {
      if (result.state == "granted" || result.state == "prompt") {
        navigator.clipboard.writeText(this.state.dbId).then(
          () => {
            alert("Copied to clipboard");
            this.setState({ isShowConnect: false });
          },
          () => {
            alert("Error");
          }
        );
      }
    });
  };

  render() {
    if (!pAuth.currentUser) return <Auth />;
    return (
      <div id="dbdashboard-main">
        <div>
          <Link className="react-link arrow-button toDBListButton" to="/dblist">
            <span>{"<<< "}</span>List of Databases
          </Link>
        </div>

        {!this.state.isExistent ? (
          <div id="nonexistent-db">
            This database either does not exist no longer exists
          </div>
        ) : (
          <div>
            <div id="db-title">
              <h2>{this.state.dbName}</h2>
              <p>{this.state.dbDescription}</p>
              <button
                onClick={() => this.setState({ isShowConnect: true })}
                className="bb connect-button"
              >
                <i className="fas fa-link"></i>Connect
              </button>
            </div>
            {this.state.accessLevel > 0 && !this.state.tempDenyAccess ? (
              <div>
                {this.state.accessLevel <= 1 && (
                  <div>
                    <h3>No Editing Access</h3>
                    <input
                      onChange={this.changeState}
                      name="memberCodeTry"
                      placeholder="Member Code"
                      value={this.state.memberCodeTry}
                    ></input>
                    <button onClick={this.tryMemberCode} className="sb">
                      Submit
                    </button>
                  </div>
                )}

                <div className="switch-menu" id="db-dashboard-switch-menu">
                  <button
                    onClick={() => {
                      this.setState({ menuOption: 0 });
                    }}
                    className={this.state.menuOption == 0 ? "selected" : ""}
                  >
                    <div>Questions</div>
                    <span></span>
                  </button>
                  <button
                    onClick={() => {
                      this.setState({ menuOption: 1 });
                    }}
                    className={this.state.menuOption == 1 ? "selected" : ""}
                  >
                    <div> Settings {"&"} Admin</div>
                    <span></span>
                  </button>
                </div>

                {this.state.menuOption == 0 ? (
                  <div>
                    <DBQuestions
                      parentState={this.state}
                      changeParentState={(updates) => this.setState(updates)}
                    />
                  </div>
                ) : (
                  <div>
                    <DBAdmin parentState={this.state} />
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div>
                  <h3>No Access</h3>
                  <input
                    onChange={this.changeState}
                    name="memberCodeTry"
                    placeholder="Member Code"
                    value={this.state.memberCodeTry}
                  ></input>
                  <button onClick={this.tryMemberCode} className="sb">
                    Submit
                  </button>
                </div>
                <h3>
                  To administer this database, you must be promoted by an
                  existing admin and have editing access.
                </h3>
              </div>
            )}

            {this.state.isShowConnect && (
              <div className="grayed-out-background">
                <div className="popup dbId-container nsp">
                  <h4>Public Database Identifier</h4>
                  <p>
                    Use to connect this database to platforms you administer.
                  </p>
                  <main>
                    <div>{this.state.dbId}</div>
                    <button className="copy-button" onClick={this.copyDbId}>
                      <i className="far fa-copy"></i>
                    </button>
                  </main>
                  <button
                    className="cancel-button"
                    onClick={() => this.setState({ isShowConnect: false })}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {this.state.displayError && (
              <div className="grayed-out-background">
                <div className="popup nsp">
                  <div>Access Error</div>
                  <button
                    className="cancel-button nsp"
                    onClick={() => this.setState({ displayError: false })}
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}

            {this.state.tempDenyAccess && <Loading isPopup={true} />}
          </div>
        )}
      </div>
    );
  }
}

export default DBDashboard;

/***{this.state.accessLevel>=3?<section id="db-credentials">
            <ul id="db-admin-settings">



                <li><input type="checkbox" name="isViewable" onChange={this.checkboxIsViewable} checked={this.state.isViewable}></input>Publicly Viewable</li>
    
                <li>
                    Member Code: {this.state.memberCode}
                    <input onChange={this.changeState} name="memberCodeInput" placeholder="Change Member Code" value={this.state.memberCodeInput}></input>
                    <button onClick={()=>this.codeUpdate()}>Update</button>
                    <ul id="dbdashboard-editors">
                        <div>Members:</div>
                        {this.state.members&&this.state.members.map(e=> <li name={e}>{this.state.usersMap[e]}
                        <button onClick={()=>this.deleteUser(e,false)}>X</button>
                        <button onClick={()=>this.promoteToAdmin(e,false)}>Promote to Admin</button>
                        </li>)}
                    </ul>
                </li>

                <li>
                    <div>Admins:</div>
                        {this.state.admins.map(e=> <li name={e}>{this.state.usersMap[e]}
                        </li>)}
                </li>
            </ul>
        </section>:<p>To administer this database, you must be promoted by an exisiting administrator</p>}


        {this.state.accessLevel>=1?<section id="add-to-database">
            <h5>Add a Question to the Database</h5>
            <textarea name="questionText" value={this.state.questionText} onChange={this.changeState} value={this.state.questionText} placeholder="Question Text"></textarea>
                <div>{this.state.imageURLs.map(e=>{return <div className="add-q-image-container"><img src={e}></img><button onClick={this.deleteImage} name={e}>X</button></div>})}</div>
            <div>Upload an Image: <input type="file" accept="image/png, image/jpeg" onChange={this.uploadFile}></input></div>
            {this.state.isUploading&&<div>Uploading ... </div>}
            <div id="add-q-tags">
                <ul id="add-q-tags-list">{this.state.tags.map(t=><li>{t}<button onClick={this.deleteTag} name={t}>X</button></li>)}</ul>
                <div><input type="text" onChange={this.changeState} placeholder="Write a tag name" name="tagInput" value={this.state.tagInput}></input><button className="x-out-button" onClick={this.addTag}>Add this tag</button></div>
            </div>
            <div id="add-q-answers">
                <ul id="add-q-answers-list">{this.state.answers.map(a=><li>{a}<button onClick={this.deleteAnswer} name={a}>X</button></li>)}</ul>
                <div><input type="text" onChange={this.changeState} name="answerInput" placeholder="Write an answer"value={this.state.answerInput}></input><button className="x-out-button" onClick={this.addAnswer}>Add this Answer</button></div>
            </div>
            <button onClick={()=>this.addQuestion(uuid())}>Submit</button>
            </section>:
            <div>
                <h3>No Editing Access</h3>
                <input onChange={this.changeState} name="editingCodeTry" placeholder="Editing Code" value={this.state.editingCodeTry}></input>
                <button onClick={this.tryEditingCodeFromViewing}>Submit</button>
            </div>
        }
 */
