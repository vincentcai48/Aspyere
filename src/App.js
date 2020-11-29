import React from "react";
import Home from "./components/Home.js";
import { pAuth, pFirestore } from "./services/config.js";
import { PContext } from "./services/context";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import DBDashboard from "./components/database/DBDashboard.js";
import Header from "./components/Header.js";
import Account from "./components/Account.js";
import DBList from "./components/database/DBList.js";
import Footer from "./components/Footer.js";
import PlatformList from "./components/platform/PlatformList.js";
import LiveQuestions from "./components/event/LiveQuestions.js";

class App extends React.Component {
  constructor() {
    super();
    this.state = {
      displayName: null,
      currentDB: null,
      setCurrentDB: (db) => this.setState({ currentDB: db }),
      platform: null, //current Platform
      setPlatform: (p) => this.setState({ platform: p }),
      usersMapping: {},
    };
  }

  componentDidMount() {
    pAuth.onAuthStateChanged((user) => {
      if (user) {
        this.setState({ displayName: user.displayName });
        //get the user's current platform, auto set to that platform
        pFirestore
          .collection("users")
          .doc(user.uid)
          .get()
          .then((doc) => {
            this.state.setPlatform(doc.data().platform);
          });
      } else {
        this.setState({ displayName: null });
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

  render() {
    return (
      <PContext.Provider value={this.state}>
        <div className="App">
          <Router>
            <Header />
            <div id="main">
              <Switch>
                <Route path="/" exact>
                  <Home />
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
              </Switch>
            </div>
            <Footer />
          </Router>
        </div>
      </PContext.Provider>
    );
  }
}

export default App;
