import React from "react";
import { pFirestore, pFunctions } from "../../services/config";
import { PContext } from "../../services/context";
import pJumbo1 from "../../images/pJumbo1.jpg";
import { Link, Redirect } from "react-router-dom";

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

  // joinPlatform = (id) => {
  //   if (
  //     this.context.rootUserData.platform &&
  //     this.context.rootUserData.allPlatforms &&
  //     this.context.rootUserData.allPlatforms.includes(id)
  //   ) {
  //     this.context.joinPlatform(id);
  //   } else {
  //     this.context.setPlatform(id);
  //   }
  //   this.setState({ redirect: `/platform?id=${id}` });
  // };

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
      })
      .catch((e) => {
        console.error(e);
        this.context.setIsLoading(false);
      });
  };

  render() {
    if (this.state.redirect) return <Redirect to={this.state.redirect} />;
    return (
      <div id="platformList-container">
        <div
          className="jumbotron platform"
          style={{ backgroundImage: pJumbo1 }}
        >
          <div className="jumbotron-content">
            <h2>Platforms</h2>
            <p>The central piece of Aspyere, where great things happen</p>
            <div id="platformList-searchBar"></div>
            <Link to="/docs" className="learn-more-tab arrow-button">
              Learn More <span>{">>>"}</span>
            </Link>
            <button
              onClick={() => this.setState({ showCreate: true })}
              className="create-button"
            >
              Create a New Platform
              <i className="plus fas fa-plus-circle"></i>
            </button>
          </div>
        </div>

        <ul id="featured-platformList">
          <h3>Featured Platforms</h3>
          {this.context.appSettings &&
            this.context.appSettings.featuredPlatforms &&
            this.context.appSettings.featuredPlatforms.map((pId) => {
              if (!this.context.allPlatforms) return;
              var p = this.context.allPlatforms.filter((pl) => pl.id == pId)[0];
              if (!p) return;
              return (
                <li className="single-platform" key={p.id}>
                  <div>
                    {p.iconURL ? (
                      <img src={p.iconURL} className="p-Icon-inList"></img>
                    ) : (
                      <div className="p-Icon-inList"></div>
                    )}
                  </div>
                  <div>
                    <h3>{p.name}</h3>
                    <p>
                      {p.description && p.description.length > 120
                        ? p.description.substr(0, 120) + "..."
                        : p.description}
                    </p>
                    <div className="platform-Views">
                      {p.views}
                      <i className="far fa-eye"></i>
                    </div>
                    {/* <div className="platform-id">ID: {p.id}</div> */}
                    {this.context.rootUserData.allPlatforms&&this.context.rootUserData.allPlatforms.includes(p.id) ? (
                      <button
                        className="join-button"
                        onClick={() =>
                          this.setState({ redirect: `/platform?id=${p.id}` })
                        }
                      >
                        Joined
                      </button>
                    ) : (
                      <button
                        className="bb"
                        style={{ display: "block" }}
                        onClick={() =>
                          this.setState({ redirect: `/platform?id=${p.id}` })
                        }
                      >
                        View this Platform
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
        </ul>

        <ul id="platformList-ul">
          <h3>All Platforms</h3>
          {this.context.allPlatforms.map((p) => {
            if (!p.name && !p.description) return;
            if (
              this.context.appSettings &&
              this.context.appSettings.featuredPlatforms &&
              this.context.appSettings.featuredPlatforms.includes(p.id)
            )
              return;
            return (
              <li className="single-platform" key={p.id}>
                <div>
                  {p.iconURL ? (
                    <img src={p.iconURL} className="p-Icon-inList"></img>
                  ) : (
                    <div className="p-Icon-inList"></div>
                  )}
                </div>
                <div>
                  <h3>{p.name}</h3>
                  <p>
                    {p.description && p.description.length > 120
                      ? p.description.substr(0, 120) + "..."
                      : p.description}
                  </p>
                  <div className="platform-Views">
                    {p.views}
                    <i className="far fa-eye"></i>
                  </div>
                  {/* <div className="platform-id">ID: {p.id}</div> */}
                  {this.context.rootUserData.allPlatforms.includes(p.id) ? (
                    <button
                      className="join-button"
                      onClick={() =>
                        this.setState({ redirect: `/platform?id=${p.id}` })
                      }
                    >
                      Joined
                    </button>
                  ) : (
                    <button
                      className="bb"
                      style={{ display: "block" }}
                      onClick={() =>
                        this.setState({ redirect: `/platform?id=${p.id}` })
                      }
                    >
                      View this Platform
                    </button>
                  )}
                </div>
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
