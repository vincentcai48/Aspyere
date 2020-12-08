import React from "react";
import { pFirestore, pFunctions } from "../../services/config";
import { PContext } from "../../services/context";

//allPlatforms are in context, but only get filled out when
class PlatformList extends React.Component {
  constructor(props) {
    super();
    this.state = {
      showCreate: false,
      inputName: "",
      inputDescription: "",
    };
  }

  componentDidMount() {
    pFirestore
      .collection("platforms")
      .get()
      .then((platforms) => {
        var arr = [];
        platforms.docs.forEach((p) => {
          arr.push({ ...p.data(), id: p.id });
        });
        this.context.setAllPlatforms(arr);
        console.log(arr);
      });
  }

  joinPlatform = (id) => {
    this.context.joinPlatform(id);
  };

  changeState = (e) => {
    const { name, value } = e.target;
    this.setState({ [name]: value });
  };

  createPlatform = () => {
    this.context.setIsLoading(true);
    var createPlatform = pFunctions.httpsCallable("createPlatform");
    createPlatform({
      name: this.state.inputName,
      description: this.state.inputDescription,
    })
      .then((res) => {
        this.context.setIsLoading(false);
        console.log(res.data);
      })
      .catch((e) => {
        console.log(e);
        this.context.setIsLoading(false);
      });
  };

  render() {
    return (
      <div id="platformList-container">
        <h2>Plaforms</h2>
        <p>
          Aspyere Platforms are the best way to host live quiz rounds online.
          Choose an existing platform or create one yourself
        </p>
        <div id="platformList-searchBar"></div>
        <button
          onClick={() => this.setState({ showCreate: true })}
          className="create-button"
        >
          Create a New Platform
          <i className="plus fas fa-plus-circle"></i>
        </button>
        <ul id="platformList-ul">
          {this.context.allPlatforms.map((p) => {
            return (
              <li className="single-platform" key={p.id}>
                <h3>{p.name}</h3>
                <p>{p.description}</p>
                <div className="platform-id">ID: {p.id}</div>
                {p.id != this.context.rootUserData.platform ? (
                  <button
                    className="join-button"
                    onClick={() => {
                      this.joinPlatform(p.id);
                    }}
                  >
                    Join
                  </button>
                ) : (
                  <div>Joined</div>
                )}
              </li>
            );
          })}
        </ul>

        {this.state.showCreate && (
          <div className="grayed-out-background">
            <div className="popup nsp create-platform">
              <h4>Create a New Platform</h4>
              <input
                name="inputName"
                placeholder="Platform Name"
                onChange={this.changeState}
                value={this.state.inputName}
                autoComplete="off"
              ></input>
              <textarea
                name="inputDescription"
                placeholder="Description of Platform"
                onChange={this.changeState}
                value={this.state.inputDescription}
              ></textarea>
              <button
                className="submit-button"
                onClick={() => {
                  this.setState({ showCreate: false });
                  this.createPlatform();
                }}
              >
                Create
              </button>
              <button
                className="cancel-button"
                onClick={() => this.setState({ showCreate: false })}
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
PlatformList.contextType = PContext;

export default PlatformList;
