import React from "react";
import { pFirestore, pFunctions } from "../../services/config";
import { PContext } from "../../services/context";

//PROPS: Object() platformSettings, Object() privateSettings
class PlatformAdmin extends React.Component {
  constructor() {
    super();
    this.state = {
      /*all settings, public and private, coming from props*/
      showAddGroupOption: false,
      inputGroupOptionDescription: "",
      inputGroupOptionDifficulty: 0,
      isLoading: false,
      isError: false,
      settingsChanged: [], //a list of settings that were changed (eg: requireGroup, publicJoin, etc...)
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
      if (!newSettingsChanged.includes(setting))
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

  render() {
    console.log(this.state);
    return (
      <div>
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
          <ul className="platformAdmin-innerList">
            {this.state.admins &&
              this.state.admins.map((a) => {
                return <li>{this.context.usersMapping[a]}</li>;
              })}
          </ul>
          <h3>Databases</h3>
          <ul className="platformAdmin-innerList">
            <li></li>
          </ul>
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
        </div>

        {!this.state.showAddGroupOption && this.state.isLoading && (
          <div className="grayed-out-background">
            <div className="popup">
              <div className="loading">Loading ...</div>
            </div>
          </div>
        )}

        {!this.state.showAddGroupOption && this.state.isError && (
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
              {this.state.isLoading && <div>Loading...</div>}
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
