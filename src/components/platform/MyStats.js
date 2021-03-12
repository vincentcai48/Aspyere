import React from "react";
import { PContext } from "../../services/context";
import { displayTime } from "../../services/globalFunctions";
import TextDisplay from "../TextDisplay";

//PROPS: Object() userData (this includes the ID), String groupName, Array[] completedEvents, Function() getCompletedEvents(), Function() refreshCompletedEvents()
class MyStats extends React.Component {
  constructor(props) {
    super();
    this.state = {
      showFeedback: {}, //object of {eventId: Boolean()}, if it is true, then show the feedback. Default is nothing there, so false.
    };
  }

  componentDidMount() {
    if (
      this.props.completedEvents &&
      this.props.getCompletedEvents &&
      this.props.completedEvents.length == 0
    ) {
      this.props.getCompletedEvents();
    }
  }

  toggleViewFeedback = (index) => {
    this.setState((prevState) => {
      var showFeedbackNew = { ...prevState.showFeedback };
      showFeedbackNew[index] = !showFeedbackNew[index];
      return { showFeedback: showFeedbackNew };
    });
  };

  render() {
    var d = this.props.myStats;
    if (!d || (!d.totalPoints && !d.totalEvents && !d.totalPossiblePoints))
      isNoStats = true;
    else {
      var isNoStats = false;
      var weeks = d.startTime
        ? Math.abs(
            (d.startTime.toDate().getTime() - new Date().getTime()) /
              (7 * 24 * 60 * 60 * 1000)
          )
        : 0.9;
    }
    return (
      <div id="user-stats-container">
        <section id="myStats">
          <div className="section-header">
            <h2>
              {this.props.userName
                ? this.props.userName + " Stats"
                : "My Stats"}
            </h2>
            <p>
              Calculated for this {this.props.groupName}, not across the entire
              platform
            </p>
          </div>
          {isNoStats && (
            <section className="center-children">
              <div>
                No stats to show. Complete some events to get your first stats!
              </div>
            </section>
          )}
          {d && d.totalEvents > 0 && (
            <section id="list-of-stats">
              {d.totalPoints && d.totalPoints > 0 ? (
                <div className="single-stat">
                  <p>Total Points: </p>
                  <div className="col-3">{d.totalPoints}</div>
                </div>
              ) : (
                ""
              )}
              {d.totalEvents && (
                <div className="single-stat">
                  <p>Total Events Completed: </p>
                  <div className="col-3">{d.totalEvents}</div>
                </div>
              )}
              {d.totalPoints && d.totalPoints > 0 && weeks >= 1 ? (
                <div className="single-stat">
                  <p>Points Per Week: </p>
                  <div className="col-3">
                    {(d.totalPoints / weeks).toFixed(2)}
                  </div>
                </div>
              ) : (
                ""
              )}

              {d.totalEvents && weeks >= 1 ? (
                <div className="single-stat">
                  <p>Events Per Week: </p>
                  <div className="col-3">
                    {(d.totalEvents / weeks).toFixed(2)}
                  </div>
                </div>
              ) : (
                ""
              )}

              {d.totalPoints && d.totalPossiblePoints ? (
                <div className="single-stat">
                  <p>Average Accuracy:</p>
                  <div className="progress-bar">
                    <div
                      className="cover"
                      style={{
                        width: `${
                          100 -
                          (Number(d.totalPoints) /
                            Number(d.totalPossiblePoints)) *
                            100
                        }%`,
                      }}
                    ></div>
                  </div>
                  <div className="col-3">
                    {Math.round(
                      (Number(d.totalPoints) / Number(d.totalPossiblePoints)) *
                        100
                    ) <= 100
                      ? Math.round(
                          (Number(d.totalPoints) /
                            Number(d.totalPossiblePoints)) *
                            100
                        )
                      : 100}
                    %
                  </div>
                </div>
              ) : (
                ""
              )}
            </section>
          )}
        </section>
        <hr style={{ margin: "10vh 0px" }}></hr>

        <section id="completedEvents">
          <div className="section-header">
            <h2>Completed Events</h2>
            <p>
              Showing recent completed events for{" "}
              {this.props.userName || " you"}
            </p>
          </div>
          <ul>
            {this.props.completedEvents &&
              this.props.completedEvents.map((e) => {
                var correctPts = 0;
                var totalPts = 0;
                if (e.questions) {
                  e.questions.forEach((q) => {
                    totalPts += q.points;
                    if (q.isCorrect) correctPts += q.points;
                  });
                }
                var num = 0;
                return (
                  <li key={e.id} className="single-completedEvent">
                    <div className="row-1">
                      <h4>{e.eventName}</h4>
                      <p>
                        Score: {correctPts}/{totalPts} (
                        {Math.round((correctPts / totalPts) * 100)}%)
                      </p>
                      <p>Completed at {displayTime(e.timeSubmitted)}</p>
                      <button
                        className="bb"
                        onClick={() => this.toggleViewFeedback(e.id)}
                      >
                        {this.state.showFeedback[e.id] ? "Hide" : "Show"} Full
                        Feedback
                      </button>
                    </div>
                    {this.state.showFeedback[e.id] && (
                      <section className="feedback">
                        <div className="first-row">
                          <h2>{e.eventName}</h2>
                          <div className="feedback-text">
                            Feedback <i className="fas fa-check"></i>
                          </div>
                        </div>

                        <p className="event-description">
                          {e.eventDescription}
                        </p>
                        <ul className="liveQuestions-ul">
                          {e.questions.map((q) => {
                            num++;
                            if (q.isError) return <li></li>;
                            return (
                              <li className="single-liveQuestion">
                                <div className="col-1">
                                  <div className="q-number">#{num}</div>
                                </div>
                                <div className="col-2">
                                  <div className="q-text">
                                    {q.text && (
                                      <TextDisplay text={q.text}></TextDisplay>
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
                                          {q.isCorrect
                                            ? "Correct"
                                            : "Incorrect"}
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

                                  <p className="q-points">
                                    {q.points} Point{q.points != 1 && "s"}
                                  </p>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </section>
                    )}

                    <hr></hr>
                  </li>
                );
              })}
          </ul>
          <button
            className="more-events"
            onClick={() => {
              if (this.props.getCompletedEvents) {
                this.props.getCompletedEvents(false);
              }
            }}
          >
            <i className="fas fa-plus-circle"></i>
            <span>Show More Events</span>
          </button>
        </section>
      </div>
    );
  }
}
MyStats.contextType = PContext;

export default MyStats;
