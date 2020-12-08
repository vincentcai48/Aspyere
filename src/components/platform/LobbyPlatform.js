import React from "react";
import { pAuth, pFirestore, pFunctions } from "../../services/config";
import { PContext } from "../../services/context";
import Loading from "../Loading";

//PROPS: Object() userData (the data from the user doc in the platform. Contains the "joinedGroups" Array), String groupName (what to call a "group". Eg: a "class"), Boolean requireGroup, Boolean publicCreateGroup, Boolean groupOptionsOn, Array[] groupOptions, Function() checkJoinedStatus (to use when you join), Function() setMenuOption, Object() privateSettings
class LobbyPlatform extends React.Component {
  constructor() {
    super();
    this.state = {
      groupsList: [],
      accessCodeTry: "",
      groupToJoin: null, //group id
      showAccessError: false,
      isLoading: false,
      isCreateError: false,
      showCreateGroupPopup: false,
      tryGroupCreateCode: "",
      selectedGroupOption: null, //just the description.
      inputName: "",
      inputDescription: "",
      inputDifficulty: 50,
      inputIsPublic: false,
      inputJoinCode: "",
      showJoinedBefore: true,
      //storedCreateGroupCode: null, //to use to store the code, after it has been checked
    };
  }

  componentDidMount() {
    pFirestore
      .collection("platforms")
      .doc(this.context.platform)
      .collection("groups")
      .onSnapshot((snap) => {
        var arr = [];
        snap.forEach((doc) => {
          arr.push({ ...doc.data(), id: doc.id });
        });
        this.setState({ groupsList: arr });
      });
    console.log(this.context.usersMapping);
  }

  //can also set "isPulbic" to true if you are rejoining the group, to bypass entering the code.
  joinGroupProxy = (groupId, isPublic) => {
    if (isPublic) this.joinGroup(groupId);
    else {
      this.setState({ groupToJoin: groupId });
    }
  };

  joinGroup = async (groupId) => {
    this.setState({ isLoading: true });
    var cloudJoinGroup = pFunctions.httpsCallable("joinGroup");
    try {
      var isValid = await cloudJoinGroup({
        groupId: groupId,
        accessCodeTry: this.state.accessCodeTry,
        platformId: this.context.platform,
      });
      isValid = isValid.data;
      //continue loading if valid, because still need to await checkJoinedStatus()
      this.setState({ isLoading: isValid, showAccessError: !isValid });
      if (isValid) {
        await this.props.checkJoinedStatus(this.props.requireGroup);
        this.setState({ isLoading: false });
      }
    } catch (e) {
      this.setState({ isLoading: false, showAccessError: true });
    }
  };

  changeState = (e) => {
    const { name, value } = e.target;
    this.setState({ [name]: value, showAccessError: false });
  };

  changeCheckboxState = (e) => {
    const { name, checked } = e.target;
    this.setState({ [name]: checked, showAccessError: false });
  };

  createGroup = () => {
    this.setState({ isLoading: true });
    var createGroup = pFunctions.httpsCallable("createGroup");
    var difficulty = this.state.inputDifficulty;
    if (this.props.groupOptionsOn && this.state.selectedGroupOption) {
      difficulty = this.props.groupOptions
        ? this.props.groupOptions.filter(
            (e) => e.description == this.state.selectedGroupOption
          )[0].difficulty
        : this.state.inputDifficulty;
    }
    createGroup({
      platformId: this.context.platform,
      tryGroupCreateCode: this.state.tryGroupCreateCode,
      groupSettings: {
        name: this.state.inputName,
        description:
          this.state.selectedGroupOption || this.state.inputDescription,
        difficulty: difficulty,
        admins: [pAuth.currentUser.uid],
        isPublic: this.state.inputIsPublic,
      },
    })
      .then((res) => {
        console.log(res);
        this.setState({
          isLoading: false,
          isCreateError: !res.data,
          showCreateGroupPopup: !res.data,
        });
        this.props.checkJoinedStatus(this.props.requireGroup).then(() => {
          this.props.setMenuOption(1);
        });
      })
      .catch((e) => {
        this.setState({ isLoading: false, isCreateError: true });
      });
  };

  render() {
    console.log(this.state.selectedGroupOption);

    return (
      <div>
        <div>
          <div id="first-row-lobby">
            <h2>Join a {this.props.groupName}</h2>
            {!this.props.requireGroup && (
              <button id="individual-join">Or Join Individually</button>
            )}
            <button
              onClick={() =>
                this.setState({
                  showCreateGroupPopup: true,
                  inputName: "",
                  inputDifficulty: "",
                  inputDifficulty: 10,
                  selectedGroupOption: null,
                  inputIsPublic: false,
                  tryGroupCreateCode: "",
                  isLoading: false,
                  isCreateError: false,
                })
              }
              className="create-button"
            >
              Create a {this.props.groupName}
              <div className="plus fas fa-plus-circle"></div>
            </button>
          </div>

          {this.props.userData &&
            this.props.userData.joinedGroups &&
            this.props.userData.joinedGroups.length > 0 && (
              <div>
                <h3 className="your-groups-text">Joined Before</h3>
                <ul id="joined-groups">
                  {this.props.userData.joinedGroups &&
                    this.props.userData.joinedGroups.map((groupId) => {
                      var g = this.state.groupsList.filter(
                        (e) => e.id == groupId
                      );
                      if (g.length < 1) return;
                      g = g[0];
                      return (
                        <li key={groupId} className="single-group">
                          <h3>{g.name}</h3>
                          <p>{g.description}</p>
                          <ul>
                            {g.admins.map((admin) => (
                              <li>{this.context.usersMapping[admin]}</li>
                            ))}
                          </ul>
                          <button
                            onClick={() => {
                              this.joinGroupProxy(g.id, true);
                            }}
                            className="join-button"
                          >
                            Rejoin
                          </button>
                        </li>
                      );
                    })}
                </ul>
              </div>
            )}

          {this.state.groupsList.length == 0 && (
            <div>
              <h3>You Haven't Created a {this.props.groupName} Yet!</h3>
              <div>
                {this.props.privateSettings.groupCreateCode &&
                  `Create a ${this.props.groupName} with the code: ${this.props.privateSettings.groupCreateCode}`}
              </div>
              <div>
                {this.props.privateSettings.joinCode &&
                  `Join individually with the code: ${this.props.privateSettings.joinCode}`}
              </div>
            </div>
          )}

          <ul id="groups-list">
            {this.state.groupsList.map((g) => {
              if (
                this.props.userData &&
                this.props.userData.joinedGroups &&
                this.props.userData.joinedGroups.includes(g.id)
              )
                return;
              return (
                <li key={g.id} className="single-group">
                  <h3>{g.name}</h3>
                  <p>{g.description}</p>
                  <ul>
                    {g.admins.map((admin) => (
                      <li>{this.context.usersMapping[admin]}</li>
                    ))}
                  </ul>
                  <button
                    onClick={() => {
                      this.joinGroupProxy(g.id, g.isPublic);
                    }}
                    className="join-button"
                  >
                    Join
                  </button>
                </li>
              );
            })}
          </ul>

          {this.state.showCreateGroupPopup && (
            <div className="grayed-out-background">
              <div className="popup" id="create-group-popup">
                <h3>Create a {this.props.groupName}</h3>
                {!this.props.publicCreateGroup && (
                  <div id="createGroupCode-container">
                    <input
                      type="password"
                      autoComplete="off"
                      className="i2"
                      placeholder="Create Group Code"
                      onChange={this.changeState}
                      name="tryGroupCreateCode"
                      value={this.state.tryGroupCreateCode}
                    ></input>
                  </div>
                )}
                <input
                  name="inputName"
                  autoComplete="off"
                  value={this.state.inputName}
                  onChange={this.changeState}
                  placeholder={`${this.props.groupName} Name`}
                ></input>
                <br />
                {this.props.groupOptions && this.props.groupOptionsOn ? (
                  <select
                    value={this.props.selectedGroupOption}
                    onChange={this.changeState}
                    name="selectedGroupOption"
                  >
                    <option selected value={null}>
                      --Select a Level--
                    </option>
                    {this.props.groupOptions
                      .sort((a, b) => a.difficulty < b.difficulty)
                      .map((op) => (
                        <option value={op.description}>{op.description}</option>
                      ))}
                  </select>
                ) : (
                  <div>
                    <div className="create-group-field">
                      <p>Description: </p>
                      <input
                        placeholder="Write a Description"
                        onChange={this.changeState}
                        name="inputDescription"
                        value={this.state.inputDescription}
                      ></input>
                    </div>
                    <div className="create-group-field">
                      <p>Difficulty:</p>
                      <input
                        placeholder="(0 to 100)"
                        type="number"
                        onChange={this.changeState}
                        name="inputDifficulty"
                        value={this.state.inputDifficulty}
                      ></input>
                    </div>
                  </div>
                )}
                <div className="create-group-field">
                  <p>Publicly Joinable</p>
                  <input
                    type="checkbox"
                    onChange={this.changeCheckboxState}
                    name="inputIsPublic"
                    checked={this.state.inputIsPublic}
                  ></input>
                </div>
                {/* <div className="create-group-field">
                  <p>Join Code: </p>
                  <input
                    placeholder="(Leave blank to auto-generate)"
                    onChange={this.changeState}
                    name="inputJoinCode"
                    value={this.state.inputJoinCode}
                  ></input>
                </div> */}
                {this.state.isLoading && (
                  <div>
                    <Loading />
                  </div>
                )}
                {this.state.isCreateError && (
                  <div>Error creating class. Make sure code is correct.</div>
                )}
                <button className="submit-button" onClick={this.createGroup}>
                  Create
                </button>
                <button
                  className="cancel-button"
                  onClick={() => this.setState({ showCreateGroupPopup: false })}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {this.state.isLoading &&
            !this.state.groupToJoin &&
            !this.state.showCreateGroupPopup && (
              <div className="grayed-out-background">
                <div className="popup nsp">
                  <Loading />
                </div>
              </div>
            )}

          {this.state.groupToJoin && (
            <div className="grayed-out-background">
              <div className="popup nsp">
                <h3>Join with Code</h3>
                <input
                  value={this.state.accessCodeTry}
                  onChange={this.changeState}
                  placeholder="Join Code"
                  name="accessCodeTry"
                ></input>
                <button
                  className="sb"
                  onClick={() => this.joinGroup(this.state.groupToJoin)}
                >
                  Join
                </button>
                <br></br>
                {this.state.isLoading && (
                  <div>
                    <Loading />
                  </div>
                )}
                {this.state.showAccessError && (
                  <div className="access-error-text">Access Error</div>
                )}
                <button
                  className="cancel-button"
                  onClick={() => this.setState({ groupToJoin: null })}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
}
LobbyPlatform.contextType = PContext;

export default LobbyPlatform;
