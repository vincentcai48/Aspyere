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
            <PlatformList />
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
