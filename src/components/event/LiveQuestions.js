import React from "react";
import { pFunctions } from "../../services/config";
import ReactHtmlParser, {
  processNodes,
  convertNodeToElement,
  htmlparser2,
} from "react-html-parser";
import { Redirect } from "react-router-dom";

class LiveQuestions extends React.Component {
  constructor() {
    super();
    this.state = {
      isLoading: true,
      isError: false,
      errorType: -1, //negative one for unnamed error, probably a 500 server error.
      allQuestions: [],
      redirect: null,
    };
  }

  componentDidMount() {
    var urlParams = new URLSearchParams(window.location.search);
    var platform, eventId;
    if (urlParams.has("platform")) {
      platform = urlParams.get("platform");
    }
    if (urlParams.has("event")) {
      eventId = urlParams.get("event");
    }
    var getLiveQuestions = pFunctions.httpsCallable("getLiveQuestions");
    getLiveQuestions({
      platformId: platform,
      eventId: eventId,
    })
      .then((data) => {
        console.log(data);
        if (data.data.isError) {
          this.setState({
            isError: true,
            errorType: data.data.errorType,
            isLoading: false,
          });
        } else {
          this.setState({
            isLoading: false,
            allQuestions: data.data.finalQuestions || [],
          });
        }
      })
      .catch((e) => {
        console.log("ERROR", e);
        this.setState({ isLoading: false, errorType: -1 });
      });
  }

  getErrorText = (errorType) => {
    switch (errorType) {
      case 1:
        return "You have already completed this event";
        break;
      case 2:
        return "This event was not found";
        break;
      case 3:
        return "This event has not yet started";
      default:
        return "This event is already over";
    }
  };

  render() {
    var num = 0;
    if (this.state.redirect) return <Redirect to={this.state.redirect} />;
    return (
      <div>
        <div id="liveQuestions-container">
          {this.state.isLoading ? (
            <div className="loading-container">Loading your Questions ...</div>
          ) : (
            <div>
              {this.state.isError ? (
                <div className="error-container">
                  {this.getErrorText(this.state.errorType)}
                  <br></br>
                  <button
                    className="sb back-to-platform-button"
                    onClick={() => this.setState({ redirect: "/" })}
                  >
                    Back To Platform
                  </button>
                </div>
              ) : (
                <div>
                  <h2>Live Questions</h2>
                  <ul id="liveQuestions-ul">
                    {this.state.allQuestions.map((q) => {
                      num++;
                      return (
                        <li>
                          <div className="q-number">#{num}</div>
                          <div className="q-text">
                            {ReactHtmlParser(
                              q.text.replaceAll("[&&linebreak]", "<br></br>")
                            )}
                          </div>
                          <ul className="q-images">
                            {q.imageURLs.map((url) => {
                              return (
                                <li>
                                  <img
                                    className="single-qImage"
                                    src={url}
                                  ></img>
                                </li>
                              );
                            })}
                          </ul>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
}

export default LiveQuestions;
