import React from "react";
import { pFunctions } from "../../services/config";
import ReactHtmlParser, {
  processNodes,
  convertNodeToElement,
  htmlparser2,
} from "react-html-parser";
import { Redirect } from "react-router-dom";
import Loading from "../Loading";

//NOTE: this is the component for both Live Questions and Feedback

class LiveQuestions extends React.Component {
  constructor() {
    super();
    this.state = {
      isLoading: true,
      isError: false,
      errorType: -1, //negative one for unnamed error, probably a 500 server error.
      isSubmitLoading: false,
      isSubmitError: false,
      sumbitErrorType: -1,
      allQuestions: [],
      redirect: null,
      answers: [],
      eventId: "",
      platformId: "",
      isFeedback: false,
      eventName: "",
      eventDescription: "",
      showSubmitPopup: false,
      endTime: null,
      countDown: 0,
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
    this.setState({
      platformId: platform,
      eventId: eventId,
    });
    this.getLiveQuestions(platform, eventId);
    this.countDown();
  }

  countDown = () => {
    var x = setInterval(this.updateCountDown, 1000);
  };

  updateCountDown = () => {
    var now = new Date();
    if (this.state.endTime && !this.state.isFeedback) {
      var secsLeft = Math.round(this.state.endTime - now.getTime()) / 1000;
      this.setState((prevState) => {
        return {
          countDown: secsLeft,
        };
      });
      if (secsLeft < 0) {
        this.setState({
          isError: true,
          errorType: 4,
        });
      }
    }
  };

  getLiveQuestions = (platformId, eventId) => {
    var getLiveQuestions = pFunctions.httpsCallable("getLiveQuestions");
    getLiveQuestions({
      platformId: platformId,
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
            eventName: data.data.eventName,
            eventDescription: data.data.eventDescription,
            isFeedback: data.data.isFeedback,
            showSubmitPopup: false,
            isSubmitLoading: false,
            endTime: data.data.endTime,
          });
          this.updateCountDown();
        }
      })
      .catch((e) => {
        console.log("ERROR", e);
        this.setState({ isLoading: false, errorType: -1 });
      });
  };

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
        break;
      case 4:
        return "This event is already over";
        break;
      case 5:
        return "Not registered on this platform";
        break;
      case 6:
        return "Authentication Error. Please Log in";
        break;
      default:
        return "An Error Occured";
    }
  };

  getSubmitErrorText = (errorType) => {
    switch (errorType) {
      case 1:
        return "Submitted Too Late!! Past the event submission deadline.";
        break;
      case 2:
        return "Cannot Submit for this Event, no records of you opening this event.";
        break;
      case 3:
        return "Cannot Submit. Event not found. It may have been deleted.";
        break;
      case 4:
        return "Cannot resumbit. You already have records for this event.";
      default:
        return "Cannot submit. Unknown Error Occurred";
    }
  };

  changeAnswerArrayState = (e) => {
    console.log(e.target);
    const { name, value } = e.target;
    this.setState((prevState) => {
      var newAnswers = [...prevState.answers];
      newAnswers[Number(name)] = value;
      return { answers: newAnswers };
    });
  };

  submitAnswers = () => {
    this.setState({ isSubmitLoading: true });
    var submitAnswers = pFunctions.httpsCallable("submitAnswers");
    submitAnswers({
      eventId: this.state.eventId,
      platformId: this.state.platformId,
      answers: this.state.answers,
    })
      .then((r) => {
        console.log(r);
        if (r.data.isError) {
          console.log(r);
          this.setState({
            showSubmitPopup: false,
            isSubmitError: true,
            sumbitErrorType: r.data.errorType,
            isSubmitLoading: false,
          });
        } else {
          //Then update to show feedback instead of Live Questions
          this.getLiveQuestions(this.state.platformId, this.state.eventId);
        }
      })
      .catch((e) => console.log(e));
  };

  render() {
    var num = 0;
    console.log(this.state.answers);
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
                  {!this.state.isFeedback && this.state.countDown >= 0 && (
                    <div
                      id="countdown-clock"
                      style={{
                        backgroundColor: this.state.countDown <= 11 && "red",
                      }}
                    >
                      <h3>Time Left</h3>
                      <section>
                        {this.state.countDown >= 3600 && (
                          <div>
                            <h5>{Math.floor(this.state.countDown / 3600)}</h5>
                            <span>Hours</span>
                          </div>
                        )}
                        <div>
                          <h5>
                            {Math.floor((this.state.countDown % 3600) / 60)}
                          </h5>
                          <span>Mins</span>
                        </div>
                        <div>
                          <h5>
                            {Math.floor((this.state.countDown % 3600) % 60)}
                          </h5>
                          <span>Secs</span>
                        </div>
                      </section>
                    </div>
                  )}
                  <button
                    className="arrow-button back-button"
                    onClick={() => this.setState({ redirect: "/" })}
                  >
                    <span>{"<<<"}</span>Back to Platform
                  </button>
                  <h2>{this.state.eventName}</h2>
                  <p id="event-description">{this.state.eventDescription}</p>
                  <ul id="liveQuestions-ul">
                    {this.state.allQuestions.map((q) => {
                      num++;
                      if (q.isError) return <li></li>;
                      return (
                        <li className="single-liveQuestion">
                          <div className="col-1">
                            <div className="q-number">#{num}</div>
                          </div>
                          <div className="col-2">
                            <div className="q-text">
                              {q.text &&
                                ReactHtmlParser(
                                  q.text.replaceAll("[&&linebreak]", "<br/>")
                                )}
                            </div>
                            <ul className="q-images">
                              {q.imageURLs &&
                                q.imageURLs.map((url) => {
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
                          </div>
                          <div className="col-3">
                            {this.state.isFeedback ? (
                              <div>
                                <div
                                  className={
                                    q.isCorrect
                                      ? "answer-feedback correct"
                                      : "answer-feedback incorrect"
                                  }
                                >
                                  <div className="isCorrectIcon">
                                    <i
                                      className={
                                        q.isCorrect
                                          ? "fas fa-check"
                                          : "fas fa-times"
                                      }
                                    ></i>
                                  </div>
                                  <div>
                                    <div className="user-answer">
                                      {q.answer || "No Answer"}
                                    </div>
                                    <div className="isCorrect">
                                      {q.isCorrect ? "Correct" : "Incorrect"}
                                    </div>
                                  </div>
                                </div>
                                {q.acceptedAnswers && (
                                  <div className="accepted-answers">
                                    <p>Accepted Answers: </p>

                                    {(() => {
                                      var anss = [];
                                      q.acceptedAnswers.forEach((a) =>
                                        anss.push(<span>{a}</span>)
                                      );
                                      return anss;
                                    })()}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <input
                                className="answer-input"
                                placeholder={`Answer for #${num}`}
                                name={num - 1}
                                autoComplete="off"
                                value={this.state.answers[num - 1] || ""}
                                onChange={this.changeAnswerArrayState}
                              ></input>
                            )}

                            <p className="q-points">
                              {q.points} Point{q.points != 1 && "s"}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="submit-answers-container">
                    {!this.state.isFeedback && (
                      <button
                        className="sb submit-answers-proxy"
                        onClick={() => this.setState({ showSubmitPopup: true })}
                      >
                        Submit Answers
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {this.state.showSubmitPopup && (
          <div className="grayed-out-background">
            <div className="popup submit-answers-popup">
              <h4>Submit Your Answers?</h4>
              {this.state.isSubmitLoading && (
                <div>
                  <Loading />
                </div>
              )}
              <div>
                <button
                  className="submit-answers-final"
                  onClick={this.submitAnswers}
                >
                  SUBMIT
                </button>
                <button
                  className="cancel-button"
                  onClick={() => this.setState({ showSubmitPopup: false })}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {this.state.isSubmitError && (
          <div className="grayed-out-background">
            <div className="popup submitError">
              <div>{this.getSubmitErrorText(this.state.sumbitErrorType)}</div>
              <button
                className="cancel-button"
                onClick={() => this.setState({ isSubmitError: false })}
              >
                OK
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default LiveQuestions;
