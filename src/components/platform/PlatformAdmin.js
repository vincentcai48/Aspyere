import React from "react";
import { pFirestore, pFunctions, pStorageRef } from "../../services/config";
import { PContext } from "../../services/context";
import Loading from "../Loading";
import imageCompression from "browser-image-compression";

//PROPS: Object() platformSettings, Object() privateSettings, Object() dbMapping
class PlatformAdmin extends React.Component {
  constructor() {
    super();
    this.state = {
      /*all settings, public and private, coming from props*/
      showAddGroupOption: false,
      showConnectDB: false,
      inputGroupOptionDescription: "",
      inputGroupOptionDifficulty: 0,
      isLoading: false,
      isError: false,
      settingsChanged: [], //a list of settings that were changed (eg: requireGroup, publicJoin, etc...)
      dbToConnect: "",
      connectDBError: -1,
      forgivePopup: false,
      forgiveId: "",
      forgiveAnswer: "",
      instructionsText: "",

      disconnectDBPopup: false,
      acceptAdminRequestPopup: false,
      userToAccept: "",
    };
  }

  componentDidMount() {
    this.setState({
      ...this.props.platformSettings,
      ...this.props.privateSettings,
    });
    console.log(this.state);
  }

  componentDidUpdate(prevProps) {
    if (prevProps != this.props) {
      this.setState({
        ...this.props.platformSettings,
        ...this.props.privateSettings,
      });
      console.log(this.state);
    }
  }

  changeState = (e) => {
    const { name, value } = e.target;
    this.setState({ [name]: value, isError: false });
    this.addToSettingsChanged(name);
  };

  changeStateCheckbox = (e) => {
    const { name, checked } = e.target;
    this.setState({ [name]: checked });
    this.addToSettingsChanged(name);
  };

  addToSettingsChanged = (setting) => {
    this.setState((prevState) => {
      var newSettingsChanged = prevState.settingsChanged;
      var settingsToIgnore = ["dbToConnect", "forgiveId", "forgiveAnswer"];
      if (
        !newSettingsChanged.includes(setting) &&
        !settingsToIgnore.includes(setting)
      )
        newSettingsChanged.push(setting);
      console.log(newSettingsChanged);

      return { settingsChanged: newSettingsChanged };
    });
  };

  addGroupOption = () => {
    this.setState({ isLoading: true });
    var newGroupOptions = [...this.state.groupOptions];
    newGroupOptions.push({
      description: this.state.inputGroupOptionDescription,
      difficulty: Number(this.state.inputGroupOptionDifficulty),
    });
    var updatePlatformSettings = pFunctions.httpsCallable(
      "updatePlatformSettings"
    );
    console.log({
      platformId: this.context.platform,
      updates: {
        groupOptions: newGroupOptions,
      },
    });
    updatePlatformSettings({
      platformId: this.context.platform,
      updates: {
        groupOptions: newGroupOptions,
      },
    })
      .then(() => {
        this.setState({
          showAddGroupOption: false,
          isLoading: false,
          inputGroupOptionDescription: "",
          inputGroupOptionDifficulty: 0,
        });
      })
      .catch((e) => {
        this.setState({
          isLoading: false,
          isError: true,
          inputGroupOptionDescription: "",
          inputGroupOptionDifficulty: 0,
        });
      });
  };

  deleteGroupOption = (description, difficulty) => {
    this.setState({ isLoading: true });
    var newGroupOptions = [...this.state.groupOptions];
    newGroupOptions = newGroupOptions.filter(
      (e) => e.difficulty != difficulty || e.description != description
    );
    var updatePlatformSettings = pFunctions.httpsCallable(
      "updatePlatformSettings"
    );
    console.log(newGroupOptions);
    updatePlatformSettings({
      platformId: this.context.platform,
      updates: {
        groupOptions: newGroupOptions,
      },
    })
      .then(() => this.setState({ isLoading: false }))
      .catch((e) => {
        this.setState({ isError: true, isLoading: false });
        console.log(e);
      });
  };

  saveChanges = () => {
    this.setState({ isLoading: true });
    var updates = {};
    var privateSettingsUpdates = {};
    this.state.settingsChanged.forEach((setting) => {
      //check to put in public or private settings
      if (setting == "joinCode" || setting == "groupCreateCode") {
        privateSettingsUpdates[setting] = this.state[setting];
      } else {
        updates[setting] = this.state[setting];
      }
    });
    console.log(updates);
    console.log(privateSettingsUpdates);
    //if no properties, set to null, so that the Cloud Function will know not to update any private settings in the database
    if (Object.keys(privateSettingsUpdates).length == 0)
      privateSettingsUpdates = null;
    console.log(privateSettingsUpdates);
    var updatePlatformSettings = pFunctions.httpsCallable(
      "updatePlatformSettings"
    );
    console.log({
      platformId: this.context.platform,
      updates: updates,
      privateSettingsUpdates: privateSettingsUpdates,
    });
    updatePlatformSettings({
      platformId: this.context.platform,
      updates: updates,
      privateSettingsUpdates: privateSettingsUpdates,
    })
      .then(() => this.setState({ isLoading: false, settingsChanged: [] }))
      .catch(() => this.setState({ isError: true, isLoading: false }));
  };

  connectDB = () => {
    this.setState({ isLoading: true });
    var connectDatabaseToPlatform = pFunctions.httpsCallable(
      "connectDatabaseToPlatform"
    );
    console.log({
      platformId: this.context.platform,
      dbId: this.state.dbToConnect,
    });
    connectDatabaseToPlatform({
      platformId: this.context.platform,
      dbId: this.state.dbToConnect,
    })
      .then((res) => {
        if (res.data.isError) {
          this.setState({
            isLoading: false,
            isError: true,
            connectDBError: res.data.errorType,
          });
        } else {
          this.setState({
            isLoading: false,
            showConnectDB: false,
            dbToConnect: "",
          });
        }
      })
      .catch((e) => {
        this.setState({ isError: true, connectDBError: 4, isLoading: false });
      });
  };

  disconnectDB = (dbId) => {
    this.setState({ isLoading: true });
    var disconnectDatabaseToPlatform = pFunctions.httpsCallable(
      "disconnectDatabaseToPlatform"
    );
    disconnectDatabaseToPlatform({
      platformId: this.context.platform,
      dbId: dbId,
    })
      .then(() => {
        this.setState({ isLoading: false });
      })
      .catch({ isError: true });
  };

  uploadBanner = async (e) => {
    var file = e.target.files[0];
    if (!file) return;

    this.setState({ isLoading: true });

    const options = {
      maxSizeMB: 3,
      useWebWorker: true,
    };
    const compressedFile = await imageCompression(file, options);
    const storageRef = await pStorageRef
      .child("platforms/" + this.context.platform + "/bannerImage")
      .put(compressedFile);
    const url = await storageRef.ref.getDownloadURL();
    var updatePlatformSettings = pFunctions.httpsCallable(
      "updatePlatformSettings"
    );
    updatePlatformSettings({
      platformId: this.context.platform,
      updates: {
        bannerURL: url,
      },
      privateSettingsUpdates: null,
    })
      .then((res) => {
        this.setState({ isLoading: false });
      })
      .catch(() => {
        this.setState({ isLoading: false, isError: true });
      });
  };

  uploadIcon = async (e) => {
    var file = e.target.files[0];
    if (!file) return;

    this.setState({ isLoading: true });

    const options = {
      maxSizeMB: 0.06,
      maxWidthOrHeight: 600,
      useWebWorker: true,
    };
    const compressedFile = await imageCompression(file, options);
    const storageRef = await pStorageRef
      .child("platforms/" + this.context.platform + "/iconImage")
      .put(compressedFile);
    const url = await storageRef.ref.getDownloadURL();
    var updatePlatformSettings = pFunctions.httpsCallable(
      "updatePlatformSettings"
    );
    updatePlatformSettings({
      platformId: this.context.platform,
      updates: {
        iconURL: url,
      },
      privateSettingsUpdates: null,
    })
      .then((res) => {
        this.setState({ isLoading: false });
      })
      .catch(() => {
        this.setState({ isLoading: false, isError: true });
      });
  };

  forgive = async () => {
    this.setState({ forgivePopup: false, isLoading: true });
    console.log(this.state.forgiveId, this.state.forgiveAnswer);
    var forgive = pFunctions.httpsCallable("forgive");
    forgive({
      platformId: this.context.platform,
      questionId: this.state.forgiveId,
      forgiveAnswer: this.state.forgiveAnswer,
    })
      .then((res) => {
        if (res.data.isError) {
          this.setState({ isError: true, isLoading: false });
          console.log(res.data);
        } else {
          this.setState({ isLoading: false });
          console.log(res.data);
        }
      })
      .catch((e) => {
        this.setState({ isError: true, isLoading: false });
        console.log(e);
      });
  };

  //uses the "userToAccept" property in state as the userId
  acceptAdminRequest = async () => {
    this.setState({ isLoading: true, acceptAdminRequestPopup: false });
    try {
      var acceptAdminRequest = pFunctions.httpsCallable("acceptAdminRequest");
      var res = await acceptAdminRequest({
        platformId: this.context.platform,
        userId: this.state.userToAccept,
      });
      if (res.data.isError) {
        console.log(res.data);
        this.setState({ isError: true, isLoading: false });
      } else {
        this.setState({ isError: false, isLoading: false });
      }
    } catch (e) {
      this.setState({ isError: true, isLoading: false });
    }
  };

  rejectAdminRequest = async (userId) => {
    console.log("REJECTING", userId);
    this.setState({ isLoading: true });
    try {
      var rejectAdminRequest = pFunctions.httpsCallable("rejectAdminRequest");
      var res = await rejectAdminRequest({
        platformId: this.context.platform,
        userId: userId,
      });
      if (res.data.isError) {
        console.log(res.data);
        this.setState({ isError: true, isLaoding: false });
      } else {
        this.setState({ isError: false, isLoading: false });
      }
    } catch (e) {
      this.setState({ isError: true, isLaoding: false });
    }
  };

  render() {
    return (
      <div id="platformAdmin">
        {this.state.settingsChanged.length > 0 && (
          <div id="save-changes-bar">
            <div>Changes have yet to be saved</div>
            <button className="sb" onClick={this.saveChanges}>
              Save Changes
            </button>
          </div>
        )}
        <div id="platformAdmin-form">
          <input
            id="platformNameInput"
            placeholder="Platform Name"
            autoComplete="off"
            value={this.state.name}
            name="name"
            onChange={this.changeState}
          ></input>
          <textarea
            id="platformDescriptionInput"
            placeholder="Platform Description"
            value={this.state.description}
            onChange={this.changeState}
            name="description"
          ></textarea>
          <h3>Admins</h3>
          <ul className="platformAdmin-innerList admins">
            {this.state.admins &&
              this.state.admins.map((a) => {
                return (
                  <li>
                    <i className="fas fa-user-cog"></i>
                    {this.context.usersMapping[a]}
                  </li>
                );
              })}
          </ul>
          {this.state.adminRequests && this.state.adminRequests.length > 0 && (
            <h4 className="admin-request-text">Admin Requests:</h4>
          )}
          <ul className="platformAdmin-innerList admins requests">
            {this.state.adminRequests &&
              this.state.adminRequests.map((a) => {
                return (
                  <li>
                    <i className="fas fa-user"></i>
                    {this.context.usersMapping[a]}
                    <button
                      className="accept-button"
                      onClick={() =>
                        this.setState({
                          userToAccept: a,
                          acceptAdminRequestPopup: true,
                        })
                      }
                    >
                      Accept
                    </button>
                    <button
                      className="reject-button"
                      onClick={() => this.rejectAdminRequest(a)}
                    >
                      Reject
                    </button>
                  </li>
                );
              })}
          </ul>
          <h3>Databases</h3>
          <button
            className="sb"
            onClick={() =>
              this.setState({ showConnectDB: true, dbToConnect: "" })
            }
          >
            Connect a Database
          </button>
          <ul className="platformAdmin-innerList">
            {this.props.platformSettings.databases.map((db) => {
              return (
                <li className="single-db-platformAdmin" key={db}>
                  <i className="fas fa-database"></i>
                  {this.props.dbMapping[db]}
                  <button onClick={() => this.disconnectDB(db)}>
                    Disconnect
                  </button>
                </li>
              );
            })}
          </ul>

          <h3>Photos</h3>
          <div>
            <div className="single-setting">
              <div>
                <h6>Banner Image</h6>
                <p>Large display over the platform</p>
              </div>
              {this.state.bannerURL ? (
                <img
                  className="platformAdmin-image-preview"
                  src={this.state.bannerURL}
                ></img>
              ) : (
                <div className="none-text">None</div>
              )}
              <input
                type="file"
                accept="image/png, image/jpeg"
                onChange={this.uploadBanner}
              ></input>
            </div>
            <div className="single-setting" style={{ marginTop: "30px" }}>
              <div>
                <h6>Icon Image</h6>

                <p>Small display as a platform icon</p>
              </div>

              <div>
                {this.state.iconURL ? (
                  <img
                    className="platformAdmin-image-preview"
                    src={this.state.iconURL}
                  ></img>
                ) : (
                  <div className="none-text">None</div>
                )}
              </div>

              <input
                type="file"
                accept="image/png, image/jpeg"
                onChange={this.uploadIcon}
              ></input>
            </div>
          </div>
          <h3>Instructions Text</h3>
          <div className="textarea-container">
            <div className="tac-head">
              <div>On the Questions Page</div>
              <p>Instructions for how to submit answers</p>
            </div>
            <textarea
              onChange={this.changeState}
              value={this.state.instructionsText}
              name="instructionsText"
              placeholder="Write some instructions..."
            ></textarea>
          </div>
          <h3>Settings</h3>
          <div className="toggle-container">
            <input
              type="checkbox"
              checked={this.state.publicCreateGroup}
              name="publicCreateGroup"
              onChange={this.changeStateCheckbox}
            ></input>
            <div>
              <div>Publicly create group</div>
              <p>Let anyone can create a group</p>
            </div>
          </div>
          {!this.state.publicCreateGroup && (
            <div className="edit-code-container">
              <p>Create Group Code: </p>
              <input
                value={this.state.groupCreateCode}
                name="groupCreateCode"
                onChange={this.changeState}
              ></input>
            </div>
          )}
          <div className="toggle-container">
            <input
              type="checkbox"
              checked={this.state.publicJoin}
              name="publicJoin"
              onChange={this.changeStateCheckbox}
            ></input>
            <div>
              <div>Publicly join platform</div>
              <p>Let anyone join the platform</p>
            </div>
          </div>
          {!this.state.publicJoin && (
            <div className="edit-code-container">
              <p>Join Code: </p>
              <input
                value={this.state.joinCode}
                name="joinCode"
                onChange={this.changeState}
              ></input>
            </div>
          )}
          <div className="toggle-container">
            <input
              type="checkbox"
              checked={this.state.requireGroup}
              name="requireGroup"
              onChange={this.changeStateCheckbox}
            ></input>
            <div>
              <div>Require Group to Join</div>
              <p>Members must be in a group to be in the platform</p>
            </div>
          </div>
          <div className="toggle-container">
            <input
              type="checkbox"
              checked={this.state.groupOptionsOn}
              name="groupOptionsOn"
              onChange={this.changeStateCheckbox}
            ></input>
            <div>
              <div>Group Options</div>
              <p>Give group leaders options to choose from to create a group</p>
            </div>
          </div>
          <h3>Group Options</h3>
          <button
            className="sb"
            onClick={() => this.setState({ showAddGroupOption: true })}
          >
            Add a Group Option
          </button>
          <ul className="platformAdmin-innerList">
            {this.state.groupOptions &&
              this.state.groupOptions
                .sort((a, b) => a.difficulty - b.difficulty)
                .map((g) => {
                  return (
                    <li className="single-groupOption">
                      <div>
                        <h5>{g.description}</h5>
                        <p>Difficulty: {g.difficulty}</p>
                      </div>
                      <button
                        className="x-out"
                        onClick={() =>
                          this.deleteGroupOption(g.description, g.difficulty)
                        }
                      >
                        X
                      </button>
                    </li>
                  );
                })}
          </ul>
          <h3>Forgives</h3>
          <button
            className="sb"
            onClick={() => {
              this.setState({
                forgivePopup: true,
                forgiveId: "",
                forgiveAnswer: "",
              });
            }}
          >
            Perform a Forgive
          </button>
          <div>
            <h3>Deleting a Platform</h3>
            <p>Please contact the Aspyere Team to get a platform deleted.</p>
          </div>
        </div>

        {this.state.showConnectDB && (
          <div className="grayed-out-background">
            <div className="popup nsp connectDB">
              <h4>Connect A Database</h4>
              <p>
                Use a database's public ID to connect it to this platform. NOTE:
                you must administer this database to connect it
              </p>
              <input
                value={this.state.dbToConnect}
                name="dbToConnect"
                onChange={this.changeState}
                placeholder="Database Public ID"
              ></input>
              {this.state.isLoading && (
                <div>
                  <Loading />
                </div>
              )}

              {this.state.isError && (
                <div>
                  {(() => {
                    switch (this.state.connectDBError) {
                      case 1:
                        return "Invalid Database Public ID";
                        break;
                      case 2:
                        return "Not an admin of this platform";
                        break;
                      case 3:
                        return "Server Error";
                        break;
                      case 4:
                        return "Not an admin of this Database";
                        break;
                      default:
                        return "Unknown Error";
                    }
                  })()}
                </div>
              )}
              <button className="submit-button" onClick={this.connectDB}>
                Connect
              </button>
              <button
                className="cancel-button"
                onClick={() => this.setState({ showConnectDB: false })}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {this.state.forgivePopup && (
          <div className="grayed-out-background">
            <div className="popup nsp forgive">
              <h4>Perform a Forgive</h4>
              <p>Forgive a question across the platform</p>
              <input
                name="forgiveId"
                placeholder="Question ID"
                value={this.state.forgiveId}
                onChange={this.changeState}
              ></input>
              <input
                name="forgiveAnswer"
                placeholder="Forgiven Answer"
                value={this.state.forgiveAnswer}
                onChange={this.changeState}
              ></input>
              <button className="submit-button" onClick={this.forgive}>
                Forgive
              </button>
              <button
                className="cancel-button"
                onClick={() =>
                  this.setState({
                    forgivePopup: false,
                    forgiveAnswer: "",
                    forgiveId: "",
                  })
                }
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {!this.state.showAddGroupOption &&
          !this.state.showConnectDB &&
          this.state.isLoading && <Loading isPopup={true} />}

        {!this.state.showAddGroupOption &&
          !this.state.showConnectDB &&
          this.state.isLoading && <Loading isPopup={true} />}

        {!this.state.showAddGroupOption &&
          !this.state.showConnectDB &&
          this.state.isError && (
            <div className="grayed-out-background">
              <div className="popup">
                <div>An Error Occurred</div>
                <br></br>
                <button
                  className="cancel-button"
                  onClick={() => this.setState({ isError: false })}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

        {this.state.acceptAdminRequestPopup && (
          <div className="grayed-out-background">
            <div className="popup nsp">
              <h4>
                Are you sure you want to make this user an admin? This action
                CANNOT be undone.
              </h4>
              <button
                className="submit-button"
                onClick={this.acceptAdminRequest}
              >
                Accept Request
              </button>
              <button
                className="cancel-button"
                onClick={() =>
                  this.setState({ acceptAdminRequestPopup: false })
                }
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {this.state.showAddGroupOption && (
          <div className="grayed-out-background">
            <div className="popup add-groupOption">
              <h3>Add a Group Option</h3>
              <input
                placeholder="Option Description"
                value={this.state.inputGroupOptionDescription}
                name="inputGroupOptionDescription"
                onChange={this.changeState}
              ></input>
              <br></br>
              <input
                className="numberInputLong"
                type="number"
                min="0"
                max="100"
                placeholder="Difficulty (0 to 100)"
                value={this.state.inputGroupOptionDifficulty}
                name="inputGroupOptionDifficulty"
                onChange={this.changeState}
              ></input>
              <br></br>
              {this.state.isError && <div>An Error Occurred.</div>}
              {this.state.isLoading && (
                <div>
                  <Loading />
                </div>
              )}
              <button className="submit-button" onClick={this.addGroupOption}>
                Create
              </button>
              <button
                className="cancel-button"
                onClick={() =>
                  this.setState({ showAddGroupOption: false, isError: false })
                }
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
PlatformAdmin.contextType = PContext;

export default PlatformAdmin;
