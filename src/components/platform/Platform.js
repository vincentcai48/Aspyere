import { database } from "firebase";
import React from "react";
import {
  fbTimestamp,
  pAuth,
  pFirestore,
  pFunctions,
} from "../../services/config";
import { PContext } from "../../services/context";
import EventsList from "./EventsList";
import GroupAdmin from "./GroupAdmin";
import LobbyPlatform from "./LobbyPlatform";
import MyStats from "./MyStats";
import PlatformAdmin from "./PlatformAdmin";
import personIcon from "../../images/person-icon.png";
import Loading from "../Loading";
import { Redirect } from "react-router";

class Platform extends React.Component {
  constructor() {
    super();
    this.state = {
      isLoadingPlatform: true, //set to false when done loading. Set it when you set isJoined
      //isJoined: false, //just use groupId, if null or not
      isGroupNotExist: false,
      isGroupAdmin: false, //is admin of this group.
      isAdmin: false, //if admin of whole platform
      platformSettings: {},
      groupData: {},
      userData: {},
      myStats: {}, //specific to a group
      menuOption: 2, //0: Platform Admin, 1: Group Admin, 2: Events, 3: My Stats
      doesNotExist: false,
      privateSettings: {},
      privateGroupSettings: {},
      dbMapping: {}, //just for admin, see componentDidMount()
      isUnjoinError: false,
      isUnjoinLoading: false,
      groupMembers: [], //array of all users in this group, only fill out if groupAdmin,
      recentActivity: [],
      lastViewed: new Date(),
      unsubscribe: () => {},

      //for the EventsList:
      isPast: false,
      allEvents: [], //current/upcoming events, add by pagination
      pastEvents: [], //add to this by pagination,
      lastDocAllEvents: -1, //-1 to start from beginning, null to stop pagination. (-1 doesn't represent an index or anything, just there as a placeholder to know when to start)
      lastDocPastEvents: -1, //these both are document refs.
      limit: 3, //how much to at a time. Manually set this.

      //for completed events (in MyStats):
      completedEvents: [],
      lastDocCompletedEvents: -1,

      //platform options:
      showOptions: false,
      platformId: "",
      groupId: null,
    };
  }

  async componentDidMount(isOverride, newPId, newGId) {
    //Step 1: get the url param id and set to a var in state.
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    //check if has a platform id
    var pId = "";
    if (urlParams.has("id")) {
      pId = urlParams.get("id");
      this.setState({ platformId: pId });
    } else {
      return this.setState({
        doesNotExist: true,
        isLoadingPlatform: false,
      });
    }

    //check if has a group id
    var gId;
    if (urlParams.has("group")) {
      gId = urlParams.get("group");
    } else {
      gId = null;
    }
    this.setState({ groupId: gId });

    //Step 2: get all the data from the platform
    var isFirstTime = true;
    try {
      var unsubscribe = pFirestore
        .collection("platforms")
        .doc(pId)
        .onSnapshot(async (doc) => {
          //Here we set all the platform data.
          if (!doc.exists)
            return this.setState({
              doesNotExist: true,
              isLoadingPlatform: false,
            });
          var isAdmin = doc.data().admins.includes(pAuth.currentUser.uid);
          var databases = doc.data().databases;
          this.setState({
            platformSettings: { ...doc.data(), id: doc.id },
            isAdmin: isAdmin,
          });
          this.context.setPlatformName(doc.data().name);

          //Here we get the group and user data (if a group a joined). One-time get this data.
          //first time, get this data just once. Snapshot listener updates when platform settings change. You don't want to do all this everytime the platform admin settings update.
          if (isFirstTime) {
            //Step 3: get user data:
            var userData = await pFirestore
              .collection("platforms")
              .doc(pId)
              .collection("users")
              .doc(pAuth.currentUser.uid)
              .get();
            if (userData.exists) {
              this.setState({ userData: userData.data() });
            }

            //Check if there is a group
            if (gId) {
              //then get the group info
              this.getGroupData(gId);
            } else {
              this.setState({ isLoadingPlatform: false });
            }

            if (isAdmin) this.getPrivateSettings();
            isFirstTime = false;
            //HERE YOU SET THE SECOND STAGE TO FALSE
          }
          //Database Mapping
          if (isAdmin) {
            this.getDatabaseMapping(databases);
          }
        });
      this.setState({ unsubscribe: unsubscribe });
    } catch (e) {
      this.setState({ doesNotExist: true, isLoadingPlatform: false });
    }

    //increment the view count of this platform
    try {
      if (pId) {
        var incrementPlatformViews = pFunctions.httpsCallable(
          "incrementPlatformViews"
        );
        await incrementPlatformViews({ platformId: pId });
      }
    } catch (e) {
      console.error(e);
    }
  }

  //Just gets the group data (and privateData if an admin)
  getGroupData = async (groupId) => {
    await pFirestore
      .collection("platforms")
      .doc(this.state.platformId)
      .collection("groups")
      .doc(groupId)
      .get()
      .then(async (doc) => {
        if (!doc.exists)
          this.setState({ isGroupNotExist: true, isLoadingPlatform: false });
        var isGroupAdmin =
          doc.data().admins &&
          doc.data().admins.includes(pAuth.currentUser.uid);
        this.setState({
          groupData: { ...doc.data(), id: doc.id },
          groupMembers: doc.data()["members"] || [],
          isGroupAdmin: isGroupAdmin,
          menuOption:
            doc.data().admins &&
            doc.data().admins.includes(pAuth.currentUser.uid)
              ? 1
              : 2,
        });

        //Get MySTATS too
        var myStats = await pFirestore
          .collection("platforms")
          .doc(this.state.platformId)
          .collection("users")
          .doc(pAuth.currentUser.uid)
          .collection(groupId)
          .doc("userData")
          .get();
        this.setState({ myStats: myStats.data() });

        if (isGroupAdmin) {
          //then get private group settings (group join code etc...)
          await pFirestore
            .collection("platforms")
            .doc(this.state.platformId)
            .collection("privateSettings")
            .doc(groupId)
            .get()
            .then((pgs) => {
              if (pgs.exists) {
                this.setState({
                  privateGroupSettings: pgs.data(),
                  isLoadingPlatform: false,
                });
              }
            })
            .catch((e) => console.error(e));

          //AND recent activity as well
          this.getLastViewed(doc.id);
        } else {
          //else stop the loading
          this.setState({ isLoadingPlatform: false });
        }
      })
      .catch((e) => {
        //if the group NO Longer exists
        this.setState({ groupId: null, isLoadingPlatform: false });
      });
  };

  // //returns true or false if the user is in the platform or not
  // //ALSO sets usersettings when it calls the database.
  // isJoined = async (requireGroup) => {
  //   var doc = await pFirestore
  //     .collection("platforms")
  //     .doc(this.context.platform)
  //     .collection("users")
  //     .doc(pAuth.currentUser.uid)
  //     .get();
  //   if (!doc.exists) {
  //     return this.setState({ isJoined: false, isLoadingPlatform: false });
  //   } else {
  //     //If never joined a group, just default to the lobby.
  //     if (doc.data().joinedGroups.length < 1) {
  //       return this.setState({
  //         isLoadingPlatform: false,
  //         isJoined: false,
  //         userData: { ...doc.data() },
  //       });
  //     }

  //     //what to immediately redirect to if there is a default group.
  //     var defaultGroup = doc.data().joinedGroups[0];

  //     if (requireGroup) {
  //       await this.getGroupData(defaultGroup);
  //       var userDataInGroup = await doc.ref
  //         .collection(doc.data().currentGroup)
  //         .doc("userData")
  //         .get();
  //       return this.setState({
  //         isLoadingPlatform: false,
  //         isJoined: true,
  //         userData: { ...doc.data(), ...userDataInGroup.data() },
  //       });
  //     } else {
  //       //still need this, because even if you join indiidually, currentGroup is set to "individual", NOT null
  //       if (doc.data().currentGroup !== "individual") {
  //         //only do this if not individual join, or else it will say the group doesn't exists.
  //         await this.getGroupData(doc.data().currentGroup);
  //       } else {
  //         this.setState({ isGroupAdmin: false, menuOption: 2 });
  //       }

  //       //STILL do this for individual join, because there is still userData (aka the stats) for joining individually.
  //       var userDataInGroup = await doc.ref
  //         .collection(doc.data().currentGroup)
  //         .doc("userData")
  //         .get();

  //       return this.setState({
  //         isLoadingPlatform: false,
  //         isJoined: true,
  //         userData: { ...doc.data(), ...userDataInGroup.data() },
  //       });
  //     }
  //   }
  // };

  componentWillUnmount() {
    this.state.unsubscribe();
  }

  //where you update the group users by using the last "true" parameter in getGroupAdminData
  getLastViewed = async (groupId) => {
    var fieldName = "lastViewedGroupAdmin" + groupId;
    var lastViewed = this.state.userData[fieldName]
      ? this.state.userData[fieldName].toDate()
      : new Date();
    this.setState({
      lastViewed: lastViewed,
    });
    await this.getGroupAdminData(lastViewed, new Date(), true);
    var updateUserViewTime = pFunctions.httpsCallable("updateUserViewTime");
    updateUserViewTime({
      platformId: this.state.platformId,
      fieldName: fieldName,
    })
      .then(() => {})
      .catch((e) => console.error(e));
  };

  //NO NEED FOR THIS ANYMORE, just use the "members" array on the group doc.
  // //only for Group Admin.
  // getAllGroupUsers = async () => {
  //   var allUsers = await pFirestore
  //     .collection("platforms")
  //     .doc(this.context.platform)
  //     .collection("users")
  //     .where("currentGroup", "==", this.state.groupData.id)
  //     .get();
  //   var arr = [];
  //   allUsers.docs.forEach((user) => {
  //     arr.push({ id: user.id, data: user.data() });
  //   });
  //   this.setState({ allGroupUsers: arr });
  //   return arr;
  // };

  //A bit of a misnomer, should be "GET RECENT ACTIVITY"
  //pass in a date object to get all records after that. Call everytime you want to add 7 days. (or however many days)
  getGroupAdminData = async (startDate, endDate, isRefresh) => {
    var start = fbTimestamp.fromDate(startDate);
    var end = fbTimestamp.fromDate(endDate);
    var users = [...this.state.groupMembers];
    var allRecords = [];
    users.forEach((user) => {
      allRecords.push(
        pFirestore
          .collection("platforms")
          .doc(this.state.platformId)
          .collection("users")
          .doc(user)
          .collection(this.state.groupData.id)
          .where("timeSubmitted", ">=", start)
          .where("timeSubmitted", "<=", end)
          .get()
      );
    });
    var index = 0; //to match the record to the user.
    Promise.all(allRecords).then((allRecordsResolved) => {
      var recentActivity = [];
      allRecordsResolved.forEach((list) => {
        list.docs.forEach((e) => {
          var newE = { ...e.data() };
          newE.time = newE.timeSubmitted.toDate();
          newE.userId = users[index]["id"];
          delete newE.timeSubmitted;
          recentActivity.push(newE);
        });
        index++;
      });

      var newArr = [...this.state.recentActivity];
      //if (isRefresh) newArr = [];
      //to ensure no duplicates
      recentActivity.forEach((a) => {
        if (!newArr.includes(a)) {
          newArr.push(a);
        }
      });
      //Sort DESCENDING time, so most recent first. REMEMBER: return an NUMBER (positive/negative) NOT a BOOLEAN!!!! This did not work if you return a comparison of times.
      newArr.sort((a, b) => b.time.getTime() - a.time.getTime());
      this.setState({ recentActivity: newArr });
    });
  };

  getPrivateSettings = () => {
    //Try to get the private settings
    try {
      pFirestore
        .collection("platforms")
        .doc(this.state.platformId)
        .collection("privateSettings")
        .doc("privateSettings")
        .onSnapshot((doc) => {
          this.setState({ privateSettings: doc.data() });
        });
    } catch (e) {
      console.error(e, "Not admin");
    }
  };

  //will only update the mapping if a db is added, so you can call on each snapshot
  getDatabaseMapping = async (databases) => {
    databases.forEach(async (db) => {
      if (!this.state.dbMapping[db]) {
        try {
          var dbData = await pFirestore.collection("databases").doc(db).get();
          if (dbData.exists) {
            this.setState((prevState) => {
              var newDBMapping = prevState.dbMapping;
              newDBMapping[db] = dbData.data().name;
              return { dbMapping: newDBMapping };
            });
          }
        } catch (e) {
          console.log("Nonexistent Database Error");
        }
      }
    });
  };

  //gets all current events
  //call this first time AND also EVERY pagination.
  getAllEvents = async (isRefresh) => {
    var nowTime = fbTimestamp.fromDate(new Date());
    //first get the current events
    var allEvents;
    var query = pFirestore
      .collection("platforms")
      .doc(this.state.platformId)
      .collection("events")
      .where("endTime", ">=", nowTime)
      .orderBy("endTime", "asc");
    if (!this.state.lastDocAllEvents) return;
    if (this.state.lastDocAllEvents === -1 || isRefresh) {
      allEvents = await query.limit(this.state.limit).get();
    } else {
      allEvents = await query
        .startAfter(this.state.lastDocAllEvents)
        .limit(this.state.limit)
        .get();
    }
    this.setState((prevState) => {
      var arr = isRefresh ? [] : [...prevState.allEvents];
      allEvents.docs.forEach((e) => {
        var newData = { ...e.data() };
        newData.startTime = newData.startTime.toDate();
        newData.endTime = newData.endTime.toDate();
        arr.push({ ...newData, id: e.id });
      });
      return {
        allEvents: arr,
        lastDocAllEvents: allEvents.docs[allEvents.docs.length - 1],
      };
    });
  };

  getPastEvents = async (isRefresh) => {
    var nowTime = fbTimestamp.fromDate(new Date());
    //first get the current events
    var allEvents;
    var query = pFirestore
      .collection("platforms")
      .doc(this.state.platformId)
      .collection("events")
      .where("endTime", "<", nowTime)
      .orderBy("endTime", "desc");
    if (!this.state.lastDocPastEvents) return;
    if (this.state.lastDocPastEvents === -1 || isRefresh) {
      allEvents = await query.limit(this.state.limit).get();
    } else {
      allEvents = await query
        .startAfter(this.state.lastDocPastEvents)
        .limit(this.state.limit)
        .get();
    }
    this.setState((prevState) => {
      var arr = isRefresh ? [] : [...prevState.pastEvents];
      allEvents.docs.forEach((e) => {
        var newData = { ...e.data() };

        newData.startTime = newData.startTime.toDate();
        newData.endTime = newData.endTime.toDate();
        arr.push({ ...newData, id: e.id });
      });
      return {
        pastEvents: arr,
        lastDocPastEvents: allEvents.docs[allEvents.docs.length - 1],
      };
    });
  };

  //get from the actual user records of events (including what they got right or wrong), NOT from the platform level "events" collection.
  getCompletedEvents = async (isRefresh) => {
    var groupId = this.state.groupData.id || "individual";

    var query = pFirestore
      .collection("platforms")
      .doc(this.state.platformId)
      .collection("users")
      .doc(pAuth.currentUser.uid)
      .collection(groupId)
      .orderBy("timeSubmitted", "desc");
    var eventsList;
    if (!this.state.lastDocCompletedEvents) {
      return;
    }
    if (this.state.lastDocCompletedEvents === -1 || isRefresh) {
      eventsList = await query.limit(this.state.limit).get();
    } else {
      eventsList = await query
        .startAfter(this.state.lastDocCompletedEvents)
        .limit(this.state.limit)
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

  //actually just refreshing current events
  refreshAllEvents = async () => {
    this.setState({ lastDocAllEvents: -1 });
    await this.getAllEvents(true);
  };

  refreshPastEvents = async () => {
    this.setState({ lastDocPastEvents: -1 });
    await this.getPastEvents(true);
  };

  refreshCompletedEvents = async () => {
    this.setState({ lastDocCompletedEvents: -1 });
    await this.getCompletedEvents(true);
  };

  unjoin = () => {
    this.setState({ isUnjoinLoading: true });
    var unjoinGroup = pFunctions.httpsCallable("unjoinGroup");
    unjoinGroup({ platformId: this.state.platformId })
      .then(() => {
        this.setState({
          isUnjoinLoading: false,
          groupId: null,
          groupData: {},
          isGroupNotExist: false,
        });
      })
      .catch((e) =>
        this.setState({ isUnjoinError: true, isUnjoinLoading: false })
      );
  };

  sendAdminRequest = async () => {
    try {
      var sendPlatformAdminRequest = pFunctions.httpsCallable(
        "sendPlatformAdminRequest"
      );
      var res = await sendPlatformAdminRequest({
        platformId: this.state.platformSettings.id,
      });
      this.setState({ showOptions: false });
      if (res.data.isError) {
      }
    } catch (e) {
      console.error(e);
    }
  };

  redirectWithRefresh = (redirect) => {
    window.location = redirect;
  };

  render() {
    console.log(this.state.groupId);
    if (this.state.redirect) {
      return <Redirect to={this.state.redirect} />;
    }
    if (this.state.isLoadingPlatform)
      return (
        <div>
          <Loading isFullCenter={true} />
        </div>
      );
    var accessLevel = 0;
    if (this.state.groupId) accessLevel += 2;
    if (this.state.isGroupAdmin) accessLevel++;
    if (this.state.isAdmin) accessLevel++;
    var mainComponent;
    switch (this.state.menuOption) {
      case 0:
        mainComponent = (
          <PlatformAdmin
            platformSettings={this.state.platformSettings}
            privateSettings={this.state.privateSettings}
            dbMapping={this.state.dbMapping}
          />
        );
        break;
      case 1:
        mainComponent = (
          <GroupAdmin
            groupData={this.state.groupData}
            getGroupAdminData={this.getGroupAdminData}
            recentActivity={this.state.recentActivity}
            allUsers={this.state.groupMembers}
            lastViewed={this.state.lastViewed}
            setLastViewed={(v) => this.setState({ lastViewed: v })}
            privateGroupSettings={this.state.privateGroupSettings}
            groupName={this.state.platformSettings.groupName}
            limit={this.state.limit}
            getLastViewed={this.getLastViewed}
          />
        );
        break;
      case 2:
        mainComponent = (
          <EventsList
            isAdmin={this.state.isAdmin}
            dbMapping={this.state.dbMapping}
            userData={this.state.userData}
            getAllEvents={this.getAllEvents}
            getPastEvents={this.getPastEvents}
            allEvents={this.state.allEvents}
            pastEvents={this.state.pastEvents}
            refreshAllEvents={this.refreshAllEvents}
            refreshPastEvents={this.refreshPastEvents}
            platformId={this.state.platformId}
            groupId={this.state.groupId}
          />
        );
        break;
      case 3:
        mainComponent = (
          <MyStats
            myStats={this.state.myStats}
            groupName={this.state.platformSettings.groupName}
            completedEvents={this.state.completedEvents}
            getCompletedEvents={this.getCompletedEvents}
            refreshCompletedEvents={this.refreshCompletedEvents}
          />
        );
        break;
      default:
        mainComponent = (
          <MyStats
            userData={this.state.userData}
            groupName={this.state.platformSettings.groupName}
            completedEvents={this.state.completedEvents}
            getCompletedEvents={this.getCompletedEvents}
            refreshCompletedEvents={this.refreshCompletedEvents}
          />
        );
    }
    if (this.state.doesNotExist)
      return (
        <div className="grayed-out-background">
          <div className="popup nsp">
            This Platform No Longer Exists
            <button
              className="sb"
              onClick={() => this.setState({ redirect: `/platformlist` })}
            >
              Explore New Platforms
            </button>
          </div>
        </div>
      );
    if (this.state.isGroupNotExist) {
      return (
        <div className="grayed-out-background">
          <div className="popup nsp">
            This {this.state.platformSettings.groupName} No Longer Exists
            {this.state.isUnjoinLoading ? (
              <Loading />
            ) : (
              <button className="sb" onClick={this.unjoin}>
                Join Another {this.state.platformSettings.groupName}
              </button>
            )}
          </div>
        </div>
      );
    }
    return (
      <div id="platform-container">
        {this.state.isUnjoinLoading && (
          <div className="grayed-out-background">
            <div className="popup nsp">
              <Loading />
            </div>
          </div>
        )}
        {this.state.isUnjoinError && (
          <div className="grayed-out-background">
            <div className="popup nsp">
              <h5>Error Unjoining</h5>
              <button
                className="cancel-button"
                onClick={() => this.setState({ isUnjoinError: false })}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* IF THERE IS A GROUP-ID (aka you joined a group), show the pages. Otherwise, show the lobby */}
        {this.state.groupId ? (
          <div id="joined-platform">
            <div
              id="group-header"
              style={{
                background: `linear-gradient( rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5) ), url(${this.state.platformSettings.bannerURL}) no-repeat center`,
                backgroundSize: "cover",
              }}
            >
              {/* {this.state.platformSettings.bannerURL && (
                <img src={this.state.platformSettings.bannerURL}></img>
              )} */}
              <h2 id="group-name">
                {this.state.groupData.name || "Individual Join"}
              </h2>
              <p id="group-description">
                {this.state.groupData.description ||
                  `Joined this platform without joining a ${this.state.platformSettings.groupName}`}
              </p>
              <ul id="group-admins">
                {this.state.groupData.admins &&
                  this.state.groupData.admins.map((a) => (
                    <li>
                      <img className="person-icon" src={personIcon} />
                      {this.context.usersMapping[a]}
                    </li>
                  ))}
              </ul>
              <div className="last-row">
                <button
                  className="sb unjoin-button"
                  onClick={() =>
                    this.redirectWithRefresh(
                      `/platform?id=${this.state.platformId}`
                    )
                  }
                >
                  Switch{" "}
                  {this.state.groupData && this.state.groupData.groupName}
                </button>
                <button
                  className="fas fa-info-circle platform-more"
                  onClick={() => this.setState({ showOptions: true })}
                ></button>
              </div>
            </div>

            <div
              className="switch-menu"
              id="platform-switch-menu"
              style={{ gridTemplateColumns: `repeat(${accessLevel},1fr)` }}
            >
              {this.state.isAdmin && (
                <button
                  onClick={() => {
                    this.setState({ menuOption: 0 });
                  }}
                  className={this.state.menuOption == 0 ? "selected" : ""}
                >
                  <div>Platform Admin</div>
                  <span></span>
                </button>
              )}
              {this.state.isGroupAdmin > 0 && (
                <button
                  onClick={() => {
                    this.setState({ menuOption: 1 });
                  }}
                  className={this.state.menuOption == 1 ? "selected" : ""}
                >
                  <div>{this.state.platformSettings.groupName} Admin</div>
                  <span></span>
                </button>
              )}
              <button
                onClick={() => {
                  this.setState({ menuOption: 2 });
                }}
                className={this.state.menuOption == 2 ? "selected" : ""}
              >
                <div>Events</div>
                <span></span>
              </button>
              <button
                onClick={() => {
                  this.setState({ menuOption: 3 });
                }}
                className={this.state.menuOption == 3 ? "selected" : ""}
              >
                <div>My Stats</div>
                <span></span>
              </button>
            </div>
            <div id="platform-main">{mainComponent}</div>
          </div>
        ) : (
          <div>
            <LobbyPlatform
              requireGroup={this.state.platformSettings.requireGroup}
              publicCreateGroup={this.state.platformSettings.publicCreateGroup}
              groupOptions={this.state.platformSettings.groupOptions}
              groupOptionsOn={this.state.platformSettings.groupOptionsOn}
              groupName={this.state.platformSettings.groupName}
              setMenuOption={(a) => this.setState({ menuOption: a })}
              checkJoinedStatus={() => (this.state.groupId ? true : false)}
              userData={this.state.userData}
              privateSettings={this.state.privateSettings}
              publicJoin={this.state.platformSettings.publicJoin}
              platformSettings={this.state.platformSettings}
              dbMapping={this.state.dbMapping}
              redirectWithRefresh={this.redirectWithRefresh}
            />
          </div>
        )}

        {this.state.showOptions && (
          <div className="grayed-out-background">
            <div className="popup nsp platformOptions">
              <button
                className="cancel-button"
                onClick={() => this.setState({ showOptions: false })}
              >
                Close
              </button>
              <h3>Platform Options</h3>
              <ul>
                {this.state.platformSettings.admins &&
                  !this.state.platformSettings.admins.includes(
                    pAuth.currentUser.uid
                  ) && (
                    <li className="single-platform-option">
                      <h6>Admin Request</h6>
                      <p>Request to become an admin of this platform</p>
                      <div className="platform-option-body">
                        {this.state.platformSettings.adminRequests &&
                        this.state.platformSettings.adminRequests.includes(
                          pAuth.currentUser.uid
                        ) ? (
                          <div>Already sent a request</div>
                        ) : (
                          <button
                            className="sb"
                            onClick={this.sendAdminRequest}
                          >
                            Send a Request
                          </button>
                        )}
                      </div>
                    </li>
                  )}
              </ul>
            </div>
          </div>
        )}
      </div>
    );
  }
}
Platform.contextType = PContext;

export default Platform;
