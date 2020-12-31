import React from "react";
import { pAuth, pFirestore } from "../services/config";
import { PContext } from "../services/context";
import Auth from "./Auth";
import DBList from "./database/DBList";
import Platform from "./platform/Platform";
import PlatformList from "./platform/PlatformList";

class Home extends React.Component {
  constructor() {
    super();
    this.state = {
      // displayOrganizations: false,
      // defaultOrganization: null
      prevIsShowPlatformPopup: false, //just to keep track of what it was previously, and if it's not what it was previously, getPlatforms() again
    };
  }

  componentDidMount() {
    this.setState({
      prevIsShowPlatformPopup: this.context.isShowPlatformPopup,
    });
  }

  getPlatforms = async () => {
    this.setState({
      prevIsShowPlatformPopup: this.context.isShowPlatformPopup,
    });

    if (this.context.rootUserData && this.context.rootUserData.allPlatforms) {
      this.context.rootUserData.allPlatforms.forEach(async (pId) => {
        var withSameId = this.context.allPlatforms.filter((p) => p.id == pId);
        if (withSameId.length > 0) return;
        else {
          var newP = await pFirestore.collection("platforms").doc(pId).get();

          this.context.setAllPlatforms([
            ...this.context.allPlatforms,
            { ...newP.data(), id: newP.id },
          ]);
        }
      });
    }
  };

  render() {
    if (
      this.state.prevIsShowPlatformPopup != this.context.isShowPlatformPopup
    ) {
      this.getPlatforms();
    }
    return (
      <div id="home-container">
        {this.context.userId ? (
          <div>
            {this.context.platform ? (
              <div>
                <Platform />
              </div>
            ) : (
              <PlatformList />
            )}

            {this.context.isShowPlatformPopup && (
              <div className="grayed-out-background">
                <div className="popup platformPopup">
                  <div className="first-row">
                    <h4>Platforms</h4>

                    <button
                      className="x-out-platforms"
                      onClick={() => this.context.setIsShowPlatformPopup(false)}
                    >
                      Close
                    </button>
                  </div>
                  <button
                    className="enp arrow-button"
                    onClick={() => {
                      this.context.setPlatform(null);
                      this.context.setIsShowPlatformPopup(false);
                    }}
                  >
                    Explore New Platforms <span>{">>>"}</span>
                  </button>
                  <ul id="user-allPlatforms">
                    {this.context.rootUserData &&
                      this.context.rootUserData.allPlatforms &&
                      this.context.rootUserData.allPlatforms.map((p) => {
                        var platforms = this.context.allPlatforms.filter(
                          (pl) => pl.id == p
                        );

                        if (!platforms[0]) return "";
                        var pData = platforms[0];
                        if (!pData.name && !pData.description) return "";
                        return (
                          <li className="single-myPlatform" key={pData.id}>
                            <div>
                              {this.context.rootUserData.platform == p ? (
                                <div className="joined-text">Joined</div>
                              ) : (
                                <button
                                  className="join-platform-button"
                                  onClick={async () => {
                                    await this.context.joinPlatform(p);
                                    this.context.setIsShowPlatformPopup(false);
                                    window.location.reload();
                                  }}
                                >
                                  Join
                                </button>
                              )}
                            </div>
                            <div className="platform-nd">
                              <h5>{pData.name}</h5>
                              <p>
                                {pData.description &&
                                pData.description.length > 100
                                  ? pData.description.substr(0, 100) + "..."
                                  : pData.description}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                  </ul>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Auth />
        )}
      </div>
    );
  }
}
Home.contextType = PContext;

export default Home;
