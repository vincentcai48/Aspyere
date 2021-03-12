import React from "react";
import {
  fbFieldValue,
  pAuth,
  pFirestore,
  pFunctions,
} from "../../services/config";
import { PContext } from "../../services/context";
import Loading from "../Loading";
import personIcon from "../../images/person-icon.png";
import MyStats from "./MyStats";

/*PROPS:
 Object() groupData, 
 Function() getGroupAdminData, 
 Array[] recentActivity, 
 Array[] allUsers, 
 Date() lastViewed, 
 Object() privateGroupSettings, 
 String groupName, 
 Number limit, 
 Function() getLastViewed (only to get the initial last viewed from firestore. Only call it in componentDidMount())
 String platformId
String groupId
*/
class GroupAdmin extends React.Component {
  constructor() {
    super();
    this.state = {
      lastViewed: null, //a date object.
      allRecentActivity: [],
      inputName: "",
      inputDescription: "",
      inputIsPublic: "",
      inputJoinCode: "",
      inputDifficulty: "",
      settingsList: [
        "inputName",
        "inputDescription",
        "inputIsPublic",
        "inputDifficulty",
      ],
      changesToSave: false, //boolean whether changes need to be save or not.
      isLoading: false,
      isError: false,
      showSuccess: false,
      userToPromote: null,
      storedUserGroupData: {}, //store user group data when it is fetched from firestore, property of the userId has the userData (for this group). See the "openStatsPage" method
      statsPageData: null, //the current data to pass into the stats page, null to not show stats page
      statsUserName: "",
      showDeleteGroupPopup: false,
      confirmText: "",

      //for viewing a member's completed events and feedback.
      completedEvents: [],
      lastDocCompletedEvents: -1,
      userId: null,
    };
  }

  async componentDidMount() {
    this.setState({
      inputName: this.props.groupData.name,
      inputDescription: this.props.groupData.description,
      inputIsPublic: this.props.groupData.isPublic,
      inputJoinCode: this.props.privateGroupSettings.joinCode,
      inputDifficulty: this.props.groupData.difficulty,
    });

    //DO THIS IN PLATFORM.JS, ONLY IF ADMIN THOUGH.
    //this.props.getLastViewed(this.props.groupData.id);

    // var doc = await pFirestore
    //   .collection("platforms")
    //   .doc(this.props.platformId)
    //   .collection("users")
    //   .doc(pAuth.currentUser.uid)
    //   .get();
    // if (this.props.groupData) {
    //   var fieldName = "lastViewedGroupAdmin" + this.props.groupData.id;
    //   var lastViewed = doc.data()[fieldName]
    //     ? doc.data()[fieldName].toDate()
    //     : new Date();
    //   this.setState({
    //     lastViewed: lastViewed,
    //   });
    //   await this.props.getGroupAdminData(lastViewed, new Date());
    //   var updateUserViewTime = pFunctions.httpsCallable("updateUserViewTime");
    //   updateUserViewTime({
    //     platformId: this.props.platformId,
    //     fieldName: fieldName,
    //   })
    //     .then(() => {})
    //     .catch((e) => console.log(e));
    // }
  }

  componentDidUpdate(prevProps) {
    if (
      prevProps.groupData != this.props.groupData ||
      prevProps.privateGroupSettings != this.props.privateGroupSettings
    ) {
      this.setState({
        inputName: this.props.groupData.name,
        inputDescription: this.props.groupData.description,
        inputIsPublic: this.props.groupData.isPublic,
        inputJoinCode: this.props.privateGroupSettings.joinCode,
        inputDifficulty: this.props.groupData.difficulty,
      });
    }
  }

  getTimeString = (dateObj) => {
    var str = "";
    var year = dateObj.getFullYear();
    var month = dateObj.getMonth();
    var day = dateObj.getDate();
    var now = new Date();
    if (
      now.getFullYear() == year &&
      now.getMonth() == month &&
      now.getDate() == day
    ) {
      str = "Today";
    } else {
      now.setTime(now.getTime() - 24 * 60 * 60 * 1000);

      if (
        now.getFullYear() == year &&
        now.getMonth() == month &&
        now.getDate() == day
      ) {
        str = "Yesterday";
      } else {
        str = `${dateObj.getMonth() + 1}-${dateObj.getDate()}`;
      }
    }
    var hour =
      dateObj.getHours() > 12 ? dateObj.getHours() - 12 : dateObj.getHours();
    var amPm = dateObj.getHours() >= 12 ? "PM" : "AM";
    if (hour == 0) {
      hour = 12;
    }
    var min = dateObj.getMinutes() < 10 ? "0" : "";
    min += dateObj.getMinutes();
    str += " " + hour + ":" + min + amPm;
    return str;
  };

  getScore = (questionsArray) => {
    var points = 0;
    var total = 0;
    questionsArray.forEach((q) => {
      total += q.points;
      if (q.isCorrect) points += q.points;
    });
    return {
      points: points,
      total: total,
      percent: Math.round((points / total) * 100),
    };
  };
  //returns object with {points: , total:, percent:}

  generateMoreRecentActivity = async (days) => {
    if (this.props.lastViewed) {
      var startDate = new Date(
        this.props.lastViewed.getTime() - days * 24 * 60 * 60 * 1000
      );
      await this.props.getGroupAdminData(
        startDate,
        this.props.lastViewed,
        true
      );
      this.props.setLastViewed(startDate);
    } else {
      var startDate = new Date(
        new Date().getTime() - days * 24 * 60 * 60 * 1000
      );
      await this.props.getGroupAdminData(startDate, new Date(), false);
      this.props.setLastViewed(startDate);
    }
  };

  changeState = (e) => {
    const { name, value } = e.target;
    this.setState({ [name]: value });
    if (this.state.settingsList.includes(name))
      this.setState({ changesToSave: true });
  };

  changeStateCheckbox = (e) => {
    const { name, checked } = e.target;
    this.setState({ [name]: checked });
    if (this.state.settingsList.includes(name))
      this.setState({ changesToSave: true });
  };

  saveChanges = () => {
    this.setState({ isLoading: true });
    var updateGroupSettings = pFunctions.httpsCallable("updateGroupSettings");
    updateGroupSettings({
      platformId: this.props.platformId,
      groupId: this.props.groupData.id,
      updates: {
        name: this.state.inputName,
        description: this.state.inputDescription,
        difficulty: Number(this.state.inputDifficulty),
        isPublic: this.state.inputIsPublic,
      },
    })
      .then((res) => {
        if (res.data.isError) {
          this.setState({ isError: true, isLoading: false });
        } else {
          this.setState({ isLoading: false, changesToSave: false });
        }
      })
      .catch((e) => {
        this.setState({ isError: true, isLoading: false });
      });
  };

  savePrivateSettings = () => {
    this.setState({ isLoading: true });
    var updatePrivateGroupSettings = pFunctions.httpsCallable(
      "updatePrivateGroupSettings"
    );
    updatePrivateGroupSettings({
      platformId: this.props.platformId,
      groupId: this.props.groupData.id,
      privateSettings: {
        joinCode: this.state.inputJoinCode,
      },
    })
      .then((res) => {
        if (res.data.isError) {
          this.setState({ isError: true, isLoading: false });
        } else {
          this.setState({ isLoading: false, showSuccess: true });
        }
      })
      .catch((e) => {
        this.setState({ isError: true, isLoading: false });
      });
  };

  promoteUser = () => {
    var userToPromote = this.state.userToPromote;
    this.setState({ userToPromote: null, isLoading: true });
    var promoteGroupUser = pFunctions.httpsCallable("promoteGroupUser");
    promoteGroupUser({
      platformId: this.props.platformId,
      groupId: this.props.groupData.id,
      userToPromote: userToPromote,
    })
      .then((res) => {
        if (res.data.isError) {
          this.setState({ isError: true, isLoading: false });
        } else {
          this.setState({ isLoading: false });
          window.location.reload();
        }
      })
      .catch((e) => {
        this.setState({ isError: true, isLoading: false });
      });
  };

  openStatsPage = async (userId) => {
    this.setState({
      isLoading: true,
      userId: userId,
      lastDocCompletedEvents: -1,
      completedEvents: [],
    });
    var userData = {};
    if (this.state.storedUserGroupData[userId])
      userData = this.state.storedUserGroupData[userId];
    else {
      var userDataDoc = await pFirestore
        .collection("platforms")
        .doc(this.props.platformId)
        .collection("users")
        .doc(userId)
        .collection(this.props.groupData.id)
        .doc("userData")
        .get();
      if (!userDataDoc.exists)
        return this.setState({ isError: true, isLoading: false });
      userData = userDataDoc.data();
      this.setState((prevProps) => {
        var newUserData = { ...prevProps.storedUserGroupData };
        newUserData[userId] = { ...userData };
        return { storedUserGroupData: newUserData };
      });
    }
    return this.setState({
      isLoading: false,
      statsPageData: userData,
      statsUserName: this.context.usersMapping[userId],
    });
  };

  deleteGroup = () => {
    this.setState({ isLoading: true });
    var deleteGroup = pFunctions.httpsCallable("deleteGroup");
    deleteGroup({
      platformId: this.props.platformId,
      groupId: this.props.groupData.id,
    })
      .then((res) => {
        if (res.data.isError) {
          this.setState({ isLoading: false, isError: true });
        } else {
          this.setState({ isLoading: false });
          this.props.setRedirect(`/platform?id=${this.props.platformId}`);
        }
      })
      .catch((e) => {
        this.setState({ isError: true, isLoading: false });
      });
  };

  generateUserCompletedEvents = async (userId, isRefresh) => {
    if (!userId) return;
    var groupId = this.props.groupData.id || "individual";
    var query = pFirestore
      .collection("platforms")
      .doc(this.props.platformId)
      .collection("users")
      .doc(userId)
      .collection(groupId)
      .orderBy("timeSubmitted", "desc");

    var eventsList;
    if (!this.state.lastDocCompletedEvents) {
      return;
    }
    if (this.state.lastDocCompletedEvents === -1 || isRefresh) {
      eventsList = await query.limit(this.props.limit).get();
    } else {
      eventsList = await query
        .startAfter(this.state.lastDocCompletedEvents)
        .limit(this.props.limit)
        .get();
    }
    this.setState((prevState) => {
      var arr = isRefresh ? [] : [...prevState.completedEvents];

      eventsList.docs.forEach((e) => {
        var newObj = { ...e.data() };
        newObj.timeSubmitted = e.data().timeSubmitted.toDate();
        arr.push({ ...newObj, id: e.id });
      });

      return {
        completedEvents: [...arr],
        lastDocCompletedEvents: eventsList.docs[eventsList.docs.length - 1],
      };
    });
  };

  render() {
    return (
      <div id="groupAdmin-container">
        <section id="recent-activity">
          <div className="groupAdmin-header">
            <h3>Recent Activity</h3>
            <p className="last-time-checked-recent-activity">
              {this.props.lastViewed &&
                "Since " + this.props.lastViewed.toString()}
            </p>
          </div>

          <ul>
            {[...this.props.recentActivity].map((a) => {
              var score = this.getScore(a.questions);
              console.log(a);
              return (
                <li className="single-activity" key={a.eventName}>
                  <div className="activity-time">
                    {this.getTimeString(a.time)}
                  </div>
                  <div>{this.context.usersMapping[a.userId]} completed </div>
                  <div className="activity-eventName">{a.eventName}</div>
                  <div>
                    and scored {score.points} out of {score.total}. (
                    {score.percent}%)
                  </div>
                </li>
              );
            })}
            {this.props.recentActivity.length <= 0 && (
              <div className="no-ra-text">No Recent Activity</div>
            )}
            <li className="view-more-recent-activity" key="unique">
              <button onClick={() => this.generateMoreRecentActivity(7)}>
                <i className="fas fa-plus-circle"></i>
                <span>7 Days</span>
              </button>
            </li>
          </ul>
        </section>
        <hr></hr>
        <section>
          <div className="groupAdmin-header">
            <h3>Members</h3>
            <p>All users that are currently in this group</p>
          </div>
          <ul id="groupUsers-list">
            {this.props.allUsers &&
              this.props.allUsers
                .sort((a, b) => {
                  if (!this.props.groupData || !this.props.groupData.admins) {
                    return -1;
                  }

                  if (this.props.groupData.admins.includes(a.id)) return -1;
                  if (this.props.groupData.admins.includes(b.id)) return 1;
                  return 1;
                })
                .map((userId) => {
                  return (
                    <li key={userId}>
                      <div className="li-main">
                        <div className="member-name">
                          <img className="person-icon" src={personIcon} />
                          {this.context.usersMapping[userId]}
                        </div>
                        <div>
                          {this.props.groupData &&
                          this.props.groupData.admins &&
                          this.props.groupData.admins.includes(userId) ? (
                            <span className="admin-label">Admin</span>
                          ) : (
                            <button
                              className="promote-admin"
                              onClick={() =>
                                this.setState({ userToPromote: userId })
                              }
                            >
                              Promote to Admin
                            </button>
                          )}
                        </div>
                        <div>
                          <button
                            className="sb"
                            onClick={() => this.openStatsPage(userId)}
                          >
                            View Stats Page
                          </button>
                        </div>
                      </div>
                      <hr></hr>
                    </li>
                  );
                })}
          </ul>
        </section>
        <hr></hr>
        <section id="group-settings-edit">
          {this.state.changesToSave && (
            <div
              id="save-changes-bar"
              style={{
                position: "static",
                width: "100%",
                marginBottom: "20px",
              }}
            >
              <div>Changes have yet to be saved</div>
              <button
                className="cancel-button"
                style={{ margin: "0px 20px", padding: "5px" }}
                onClick={() => this.setState({ changesToSave: false })}
              >
                Cancel
              </button>
              <button className="sb" onClick={this.saveChanges}>
                Save Changes
              </button>
            </div>
          )}
          <div className="groupAdmin-header">
            <h3>Settings</h3>
            <p>Only you as an admin can change your group's settings</p>
          </div>
          <div className="input-field-container">
            <input
              name="inputName"
              onChange={this.changeState}
              value={this.state.inputName}
              placeholder="Name"
            ></input>
          </div>
          <div className="input-field-container">
            <input
              name="inputDescription"
              onChange={this.changeState}
              value={this.state.inputDescription}
              placeholder="Description"
            ></input>
          </div>

          <div className="input-field-container">
            <p>Publicly Joinable</p>
            <input
              name="inputIsPublic"
              type="checkbox"
              onChange={this.changeStateCheckbox}
              checked={this.state.inputIsPublic}
            ></input>
          </div>
          <div className="input-field-container">
            <p>Difficulty: </p>
            <input
              name="inputDifficulty"
              type="number"
              min="0"
              max="100"
              onChange={this.changeState}
              value={this.state.inputDifficulty}
              placeholder="(0 to 100)"
            ></input>
          </div>
          <div className="input-field-container joinCode">
            <i className="fas fa-lock"></i>
            <p>Join Code:</p>
            <input
              name="inputJoinCode"
              onChange={this.changeState}
              value={this.state.inputJoinCode}
              placeholder="Join Code"
              autoComplete="off"
              style={{ fontSize: "16px", fontWeight: "bolder" }}
            ></input>
            <button className="sb" onClick={this.savePrivateSettings}>
              Update Join Code
            </button>
          </div>
          <div className="danger-zone">
            <p>Danger Zone</p>
            <div>
              <button
                onClick={() => this.setState({ showDeleteGroupPopup: true })}
              >
                Delete This {this.props.groupName}
              </button>
            </div>
          </div>
        </section>

        {this.state.isLoading && (
          <div className="grayed-out-background">
            <div className="popup nsp">
              <Loading />
            </div>
          </div>
        )}

        {this.state.showSuccess && (
          <div className="grayed-out-background">
            <div className="popup nsp">
              Successfully updated!!
              <button
                clasName="submit-button"
                style={{ marginLeft: "10px" }}
                onClick={() => this.setState({ showSuccess: false })}
              >
                Got it!
              </button>
            </div>
          </div>
        )}

        {this.state.isError && (
          <div className="grayed-out-background">
            <div className="popup nsp">
              <h4>An Error Occured</h4>
              <button
                className="cancel-button"
                onClick={() => this.setState({ isError: false })}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {this.state.userToPromote && (
          <div className="grayed-out-background">
            <div className="popup nsp">
              <h4>
                Are you sure you want to promote{" "}
                {this.context.usersMapping[this.state.userToPromote]} to an
                admin?
              </h4>
              <p>Careful, this action CANNOT be undone</p>
              <button className="submit-button" onClick={this.promoteUser}>
                Yes, Promote
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

        {this.state.showDeleteGroupPopup && (
          <div className="grayed-out-background">
            <div className="popup red nsp">
              <h4>
                Are You Sure You Want to Delete This {this.props.groupName}?
              </h4>
              <p>
                This will delete all the records every member had with this{" "}
                {this.props.groupName.toLowerCase()}. Type "confirm" to delete
              </p>
              <input
                className="redinput"
                value={this.state.confirmText}
                name="confirmText"
                onChange={this.changeState}
                placeholder="confirm"
              ></input>
              {this.state.confirmText === "confirm" && (
                <button
                  className="cancel-button"
                  onClick={() => {
                    this.deleteGroup();
                    this.setState({ showDeleteGroupPopup: false });
                  }}
                >
                  Delete This {this.props.groupName}
                </button>
              )}
              <button
                className="cancel-button"
                onClick={() =>
                  this.setState({
                    showDeleteGroupPopup: false,
                    confirmText: "",
                  })
                }
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {this.state.statsPageData && this.props.groupData.id && (
          <div className="grayed-out-background">
            <div className="popup statspopup">
              <MyStats
                userData={this.state.statsPageData}
                groupName={this.props.groupName}
                userName={this.state.statsUserName}
                getCompletedEvents={() =>
                  this.generateUserCompletedEvents(this.state.userId, false)
                }
                completedEvents={this.state.completedEvents}
                refreshCompletedEvents={() =>
                  this.generateUserCompletedEvents(this.state.userId, true)
                }
              />
              <button
                className="cancel-button"
                onClick={() => this.setState({ statsPageData: null })}
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
GroupAdmin.contextType = PContext;

export default GroupAdmin;
