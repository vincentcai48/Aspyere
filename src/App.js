import React from "react";
import Home from "./components/Home.js";
import { pAuth, pFirestore, pFunctions } from "./services/config.js";
import { PContext } from "./services/context";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import DBDashboard from "./components/database/DBDashboard.js";
import Header from "./components/Header.js";
import Account from "./components/Account.js";
import DBList from "./components/database/DBList.js";
import Footer from "./components/Footer.js";
import PlatformList from "./components/platform/PlatformList.js";
import LiveQuestions from "./components/event/LiveQuestions.js";
import Auth from "./components/Auth.js";
import Loading from "./components/Loading.js";

class App extends React.Component {
  constructor() {
    super();
    this.state = {
      displayName: null,
      isLoading: false, //loading for joining a platform
      setIsLoading: (a) => this.setState({ isLoading: a }),
      userId: null,
      rootUserData: {},
      currentDB: null,
      setCurrentDB: (db) => this.setState({ currentDB: db }),
      platform: null, //current Platform
      setPlatform: (p) => this.setState({ platform: p }),
      platformName: null,
      setPlatformName: (n) => this.setState({ platformName: n }),
      usersMapping: {},
      loadingStage1: false, //getting the platform
      setLoadingStage1: (a) => this.setState({ loadingStage1: a }),
      isShowPlatformPopup: false,
      setIsShowPlatformPopup: (a) => this.setState({ isShowPlatformPopup: a }),
      allPlatforms: [], //all platforms you need to store, includes platforms to show on homepage and also the users' joined platforms.
      setAllPlatforms: (a) => this.setState({ allPlatforms: a }),
      joinPlatform: this.joinPlatform,
    };
  }

  componentDidMount() {
    pAuth.onAuthStateChanged((user) => {
      if (user) {
        this.setState({
          displayName: user.displayName,
          userId: user.uid,
          loadingStage1: false,
          loadingStage2: false,
        });
        //get the user's current platform, auto set to that platform
        try {
          pFirestore
            .collection("users")
            .doc(user.uid)
            .onSnapshot((doc) => {
              if (doc.exists && doc.data()) {
                console.log(doc.data());
                this.state.setPlatform(doc.data().platform);
                this.setState({ rootUserData: doc.data() });
              }
              this.state.setLoadingStage1(true);
            });
        } catch (e) {
          this.state.setPlatform(null);
          this.state.setLoadingStage1(true);
          //if there's no platform, there can't be a group
          this.state.setLoadingStage2(true);
        }
      } else {
        this.setState({
          displayName: null,
          userId: null,
          loadingStage1: true,
          loadingStage2: true,
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
        console.log(usersMap);
        this.setState({ usersMapping: usersMap });
      });
  }

  joinPlatform = async (platformId) => {
    console.log(platformId);
    this.setState({ isLoading: true });
    var joinPlatformFirebase = pFunctions.httpsCallable("joinPlatform");
    await joinPlatformFirebase({ platformId: platformId })
      .then((res) => {
        this.setState({ isLoading: false });
        if (res.data) {
          if (this.state.platform != platformId)
            this.setState({ platform: platformId });
        } else {
          console.log("error");
        }
      })
      .catch((e) => {
        this.setState({ isLoading: false });
        console.log(e);
      });
  };

  render() {
    console.log(this.state.loadingStage1, this.state.loadingStage2);
    return (
      <PContext.Provider value={this.state}>
        <div className="App">
          <Router>
            <Header />
            <div id="main">
              {this.state.loadingStage1 ? (
                <Switch>
                  <Route path="/" exact>
                    <Home />
                  </Route>
                  {/**If not the homepage, and not logged in, just go to the Auth component*/}
                  {this.state.userId ? (
                    <div>
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
                    </div>
                  ) : (
                    <Auth />
                  )}
                </Switch>
              ) : (
                <Loading />
              )}
            </div>
            <Footer />
          </Router>

          {this.state.isLoading && (
            <div className="grayed-out-background">
              <div className="popup">
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
