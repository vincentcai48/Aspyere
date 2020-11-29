import { database } from "firebase";
import React from "react";
import { pAuth, pFirestore } from "../../services/config";
import { PContext } from "../../services/context";
import EventsList from "./EventsList";
import GroupAdmin from "./GroupAdmin";
import LobbyPlatform from "./LobbyPlatform";
import MyStats from "./MyStats";
import PlatformAdmin from "./PlatformAdmin";

class Platform extends React.Component {
  constructor() {
    super();
    this.state = {
      isJoined: false,
      adminGroups: [], //if admin of a group, empty array if none
      isAdmin: false, //if admin of whole platform
      platformSettings: {},
      userData: {},
      menuOption: 2, //0: Platform Admin, 1: Group Admin, 2: Events, 3: My Stats
      doesNotExist: false,
      privateSettings: {},
      dbMapping: {}, //just for admin, see componentDidMount()
    };
  }

  async componentDidMount() {
    var isFirstTime = true;
    try {
      var unsubscribe = pFirestore
        .collection("platforms")
        .doc(this.context.platform)
        .onSnapshot((doc) => {
          var isAdmin = doc.data().admins.includes(pAuth.currentUser.uid);
          var databases = doc.data().databases;
          this.setState({
            platformSettings: { ...doc.data(), id: doc.id },
            isAdmin: isAdmin,
          });

          //first time, get this data just once
          if (isFirstTime) {
            this.isJoined(doc.data().requireGroup);
            this.accessPrivileges();
            if (isAdmin) this.getPrivateSettings();
            isFirstTime = false;
          }
          //Database Mapping
          if (isAdmin) {
            this.getDatabaseMapping(databases);
          }
        });
      this.setState({ unsubscribe: unsubscribe });
    } catch (e) {
      this.setState({ doesNotExist: true });
    }
  }

  getPrivateSettings = () => {
    //Try to get the private settings
    try {
      pFirestore
        .collection("platforms")
        .doc(this.context.platform)
        .collection("privateSettings")
        .doc("privateSettings")
        .onSnapshot((doc) => {
          this.setState({ privateSettings: doc.data() });
        });
    } catch (e) {
      console.log(e, "Not admin");
    }
  };

  //will only update the mapping if a db is added, so you can call on each snapshot
  getDatabaseMapping = async (databases) => {
    databases.forEach(async (db) => {
      if (!this.state.dbMapping[db]) {
        try {
          var dbData = await pFirestore.collection("databases").doc(db).get();
          console.log(dbData.data().name);
          this.setState((prevState) => {
            var newDBMapping = prevState.dbMapping;
            newDBMapping[db] = dbData.data().name;
            return { dbMapping: newDBMapping };
          });
        } catch (e) {
          console.log("Nonexistent Database Error");
        }
      }
    });
  };

  //returns true or false if the user is in the platform or not
  //ALSO sets usersettings when it calls the database.
  isJoined = async (requireGroup) => {
    console.log(requireGroup);
    var doc = await pFirestore
      .collection("platforms")
      .doc(this.context.platform)
      .collection("users")
      .doc(pAuth.currentUser.uid)
      .get();
    if (!doc.exists) return this.setState({ isJoined: false });
    else {
      console.log(doc.data());
      if (requireGroup) {
        //var userInfo = await pFirestore.collection("users").doc(pAuth.currentUser.uid).get();
        if (!doc.data().currentGroup) return this.setState({ isJoined: false });
        else return this.setState({ isJoined: true, userInfo: doc.data() });
      } else {
        return this.setState({ isJoined: true, userInfo: doc.data() });
      }
    }
    // var isJoined = false;
    // docs.forEach(doc=>{
    //     if(pAuth.currentUser.uid==doc.id) {
    //         this.setState({userData: })
    //         isJoined = true;
    //     }
    // })
    // if(!isJoined) return false;
    // else{
    //     var userInfo = await pFirestore.collection("users").doc(pAuth.currentUser.uid).get();
    //     if(!userInfo.data().group) return false;
    //     else return true;
    // }
  };

  //queries all groups and sees if it is an admin, does NOT see if admin for whole platform, see the
  accessPrivileges = () => {
    pFirestore
      .collection("platforms")
      .doc(this.context.platform)
      .collection("groups")
      .where("admins", "array-contains", pAuth.currentUser.uid)
      .get()
      .then((groups) => {
        var arr = [];
        groups.forEach((g) => {
          arr.push({ ...g.data(), id: g.id });
        });
        this.setState({ adminGroups: arr });
      });
  };

  render() {
    console.log(this.state.dbMapping);
    var accessLevel = 0;
    if (this.state.isJoined) accessLevel += 2;
    if (this.state.adminGroups.length > 0) accessLevel++;
    if (this.state.isAdmin) accessLevel++;
    var mainComponent;
    switch (this.state.menuOption) {
      case 0:
        mainComponent = (
          <PlatformAdmin
            platformSettings={this.state.platformSettings}
            privateSettings={this.state.privateSettings}
          />
        );
        break;
      case 1:
        mainComponent = <GroupAdmin />;
        break;
      case 2:
        mainComponent = (
          <EventsList
            isAdmin={this.state.isAdmin}
            dbMapping={this.state.dbMapping}
          />
        );
        break;
      default:
        mainComponent = <MyStats />;
    }
    if (this.state.doesNotExist)
      return (
        <div>
          <div>This Platform No Longer Exists</div>
        </div>
      );
    return (
      <div id="platform-container">
        <h2>{this.state.platformSettings.name}</h2>
        <p>{this.state.platformSettings.description}</p>
        {this.state.isJoined ? (
          <div>
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
              {this.state.adminGroups.length > 0 && (
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
              groupName={this.state.platformSettings.groupName}
              checkJoinedStatus={this.isJoined}
            />
          </div>
        )}
      </div>
    );
  }
}
Platform.contextType = PContext;

export default Platform;
