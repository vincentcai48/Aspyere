import React from "react";
import Home from "./components/Home.js";
import { pAuth, pFirestore, pFunctions } from "./services/config.js";
import { PContext } from "./services/context";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Redirect,
} from "react-router-dom";
import DBDashboard from "./components/database/DBDashboard.js";
import Header from "./components/Header.js";
import Account from "./components/Account.js";
import DBList from "./components/database/DBList.js";
import Footer from "./components/Footer.js";
import PlatformList from "./components/platform/PlatformList.js";
import LiveQuestions from "./components/event/LiveQuestions.js";
import Auth from "./components/Auth.js";
import Loading from "./components/Loading.js";
import "katex/dist/katex.min.css";
import Contact from "./components/Contact.js";
import Docs from "./components/docs/Docs.js";
import PrivacyPolicy from "./components/legal/PrivacyPolicy.js";
import Platform from "./components/platform/Platform.js";

class App extends React.Component {
  constructor() {
    super();
    this.state = {
      displayName: null,
      isLoading: false, //loading for joining a platform
      isLoadingSite: true, //loading the initial page of the site (whatever that may be, the joined platforms, the platforms homepage, etc...)
      setIsLoading: (a) => this.setState({ isLoading: a }),
      userId: null,
      rootUserData: {},
      currentDB: null,
      setCurrentDB: (db) => this.setState({ currentDB: db }),
      platform: null, //current Platform
      setPlatform: (p) =>
        this.setState({ platform: p, redirect: `/platform?id=${p}` }),
      platformName: null,
      setPlatformName: (n) => this.setState({ platformName: n }),
      usersMapping: {},
      isShowPlatformPopup: false,
      setIsShowPlatformPopup: (a) => this.setState({ isShowPlatformPopup: a }),
      allPlatforms: [], //all platforms you need to store, includes platforms to show on homepage and also the users' joined platforms.
      setAllPlatforms: (a) => this.setState({ allPlatforms: a }),
      joinPlatform: this.joinPlatform,
      isMobile: false,
      appSettings: {},
      redirect: null,
    };
  }

  componentDidMount() {
    this.setState({ isMobile: window.innerWidth > 576 ? false : true });
    pAuth.onAuthStateChanged((user) => {
      if (user) {
        this.setState({
          displayName: user.displayName,
          userId: user.uid,
          isLoadingSite: true,
        });
        //get the user's current platform, auto set to that platform
        try {
          pFirestore
            .collection("users")
            .doc(user.uid)
            .onSnapshot((doc) => {
              if (doc.exists && doc.data()) {
                this.state.setPlatform(doc.data().platform);
                this.setState({
                  rootUserData: doc.data(),
                  isLoadingSite: false,
                });
              }
            });
        } catch (e) {
          this.state.setPlatform(null);
          //if there's no platform, there can't be a group
          this.setState({ isLoadingSite: false });
        }
      } else {
        this.setState({
          displayName: null,
          userId: null,
          isLoadingSite: false,
        });
      }
    });

    //Get users mapping
    pFirestore
      .collection("settings")
      .doc("usersMapping")
      .get()
      .then((doc) => {
        var usersMap = {};
        var dataObj = { ...doc.data() };
        var keys = Object.keys(dataObj);
        keys.forEach((userId) => {
          usersMap[userId] = dataObj[userId]["displayName"];
        });

        this.setState({ usersMapping: usersMap });
      });

    //get settings, like the featured platforms:
    pFirestore
      .collection("settings")
      .doc("settings")
      .get()
      .then((doc) => {
        this.setState({ appSettings: doc.data() });
      });
  }

  joinPlatform = async (platformId) => {
    this.setState({ isLoading: true });
    var joinPlatformFirebase = pFunctions.httpsCallable("joinPlatform");
    try {
      var res = await joinPlatformFirebase({ platformId: platformId });

      this.setState({ isLoading: false });
      if (res.data) {
        if (this.state.platform != platformId)
          this.setState({
            platform: platformId,
          });
      } else {
        console.log("error");
      }
    } catch (e) {
      this.setState({ isLoading: false });
      console.error(e);
    }
  };

  render() {
    return (
      <PContext.Provider value={this.state}>
        <div className="App">
          <Router>
            <Header />
            <main id="main">
              {this.state.isLoadingSite ? (
                <Loading isFullCenter={true} />
              ) : (
                <div id="site-afterLoading">
                  {this.state.userId ? (
                    <Switch>
                      <Route path="/" exact>
                        <Home></Home>
                      </Route>
                      <Route path="/platform">
                        <Platform />
                      </Route>
                      <Route path="/questions">
                        <LiveQuestions />
                      </Route>
                      <Route path="/platformlist">
                        <PlatformList />
                      </Route>
                      <Route path="/dblist">
                        <DBList />
                      </Route>
                      <Route path="/dbdashboard">
                        <DBDashboard />
                      </Route>
                      <Route path="/account">
                        <Account />
                      </Route>
                      <Route path="/docs">
                        <Docs />
                      </Route>
                      <Route path="/privacypolicy">
                        <PrivacyPolicy />
                      </Route>
                    </Switch>
                  ) : (
                    // If NOT logged in:
                    <Switch>
                      <Route path="/privacypolicy">
                        <PrivacyPolicy />
                      </Route>
                      <Route path="/*">
                        <Auth />
                      </Route>
                    </Switch>
                  )}
                </div>
              )}
            </main>
            <Footer />
          </Router>

          {this.state.isLoading && (
            <div className="grayed-out-background">
              <div className="popup nsp">
                <Loading />
              </div>
            </div>
          )}
        </div>
      </PContext.Provider>
    );
  }
}

export default App;
