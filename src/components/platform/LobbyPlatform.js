import React from "react";
import { pAuth, pFirestore, pFunctions } from "../../services/config";
import { PContext } from "../../services/context";
import Loading from "../Loading";
import personIcon from "../../images/person-icon.png";
import { Redirect } from "react-router";

//PROPS: Object() userData (the data from the user doc in the platform. Contains the "joinedGroups" Array), String groupName (what to call a "group". Eg: a "class"), Boolean requireGroup, Boolean publicCreateGroup, Boolean groupOptionsOn, Array[] groupOptions, Function() checkJoinedStatus (to use when you join), Function() setMenuOption, Object() privateSettings, Boolean publicJoin, Object() platformSettings.
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
  }

  //can also set "isPulbic" to true if you are rejoining the group, to bypass entering the code.
  joinGroupProxy = (groupId, isPublic) => {
    if (isPublic) this.joinGroup(groupId);
    else {
      this.setState({
        groupToJoin: groupId,
        accessCodeTry: "",
        showAccessError: false,
      });
    }
  };

  joinGroup = async (groupId) => {
    if (groupId == "individual") {
      return this.joinIndividually();
    }
    this.setState({ isLoading: true, showAccessError: false });
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

  joinIndividually = async () => {
    try {
      this.setState({ isLoading: true, showAccessError: false });
      var joinIndividually = pFunctions.httpsCallable("joinIndividually");
      var res = await joinIndividually({
        platformId: this.context.platform,
        tryJoinCode: this.state.accessCodeTry,
      });
      if (res.data.isError) {
        this.setState({ showAccessError: true, isLoading: false }); //Note: this will just show it is an error, won't actually show what type of error.
      } else {
        await this.props.checkJoinedStatus(this.props.requireGroup);
        this.state({ isLoading: false });
      }
    } catch (e) {
      this.setState({ showAccessError: true, isLoading: false });
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
    if (this.state.redirect) return <Redirect to={this.state.redirect} />;
    return (
      <div>
        <section
          className="lobbyPlatform-header"
          style={{
            background: `linear-gradient( rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5) ), url(${this.props.platformSettings.bannerURL}) no-repeat center`,
            backgroundSize: "cover",
          }}
        >
          <span>
            <button
              onClick={() => this.setState({ redirect: "/platformlist" })}
            >
              All Platforms
            </button>
            <i className="fas fa-chevron-right"></i>
            <i className="fas fa-home"></i>Platform Homepage
          </span>
          <h2 id="lobbyHeader-name">{this.props.platformSettings.name}</h2>
        </section>
        <div id="lobbyPlatform-main">
          <div id="platform-info">
            <img
              className="icon-image"
              src={this.props.platformSettings.iconURL}
            ></img>
            <p>{this.props.platformSettings.description}</p>
          </div>
          <div id="first-row-lobby">
            <h2>Join a {this.props.groupName}</h2>
            {!this.props.requireGroup && (
              <button
                id="individual-join"
                className={
                  (this.props.userData &&
                    this.props.userData.joinedGroups &&
                    this.props.userData.joinedGroups.includes("individual")) ||
                  this.props.publicJoin
                    ? "bb"
                    : "sb"
                }
                onClick={() => {
                  if (
                    (this.props.userData &&
                      this.props.userData.joinedGroups &&
                      this.props.userData.joinedGroups.includes(
                        "individual"
                      )) ||
                    this.props.publicJoin
                  ) {
                    this.joinIndividually();
                  } else {
                    this.setState({ groupToJoin: "individual" });
                  }
                }}
              >
                Or Join Individually
              </button>
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
                      if (
                        groupId === "individual" &&
                        !this.props.platformSettings.requireGroup
                      )
                        return (
                          <li
                            key="individual"
                            className="single-group individual"
                          >
                            <h3>Individual Join</h3>
                            <p>
                              Join platform without a {this.props.groupName}
                            </p>
                            <button
                              onClick={() => {
                                this.joinGroupProxy("individual", true);
                              }}
                              className="join-button"
                            >
                              Join Individually
                            </button>
                          </li>
                        );
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
                            {g.admins.slice(0, 3).map((admin) => (
                              <li className="single-admin" key={admin}>
                                <img className="person-icon" src={personIcon} />
                                {this.context.usersMapping[admin]}
                              </li>
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

          {this.state.groupsList.length == 0 &&
            this.props.platformSettings &&
            this.props.platformSettings.admins.includes(
              pAuth.currentUser.uid
            ) && (
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
            {this.state.groupsList
              .sort((a, b) => a.difficulty - b.difficulty)
              .map((g) => {
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
                      {g.admins.slice(0, 3).map((admin) => (
                        <li className="single-admin" key={admin}>
                          <img className="person-icon" src={personIcon} />
                          {this.context.usersMapping[admin]}
                        </li>
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
              <div className="popup nsp joinPopup">
                <h3>Join with Code</h3>
                <p>A code is required to join</p>
                <input
                  value={this.state.accessCodeTry}
                  onChange={this.changeState}
                  placeholder="Join Code"
                  name="accessCodeTry"
                  autoComplete="off"
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
                  className="ssb"
                  onClick={() => this.setState({ groupToJoin: null })}
                >
                  X
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
