import React from "react";
import { PContext } from "../../services/context";

//PROPS: Object() userData (this includes the ID)
class MyStats extends React.Component {
  constructor() {
    super();
    this.state = {};
  }

  render() {
    console.log(this.props.userData);
    var d = this.props.userData;
    var isNoStats = false;
    var weeks = d.startTime
      ? Math.abs(
          (d.startTime.toDate().getTime() - new Date().getTime()) /
            (7 * 24 * 60 * 60 * 1000)
        )
      : 0.9;
    if (!d || (!d.totalPoints && !d.totalEvents && !d.totalPossiblePoints))
      isNoStats = true;
    return (
      <div id="user-stats-container">
        <div className="section-header">
          <h2>
            {this.props.userName ? this.props.userName + " Stats" : "My Stats"}
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
            {d.totalPoints && (
              <div className="single-stat">
                <p>Total Points: </p>
                <div className="col-3">{d.totalPoints}</div>
              </div>
            )}
            {d.totalEvents && (
              <div className="single-stat">
                <p>Total Events Completed: </p>
                <div className="col-3">{d.totalEvents}</div>
              </div>
            )}
            {d.totalPoints && weeks >= 1 && (
              <div className="single-stat">
                <p>Points Per Week: </p>
                <div className="col-3">
                  {(d.totalPoints / weeks).toFixed(2)}
                </div>
              </div>
            )}

            {d.totalEvents && weeks >= 1 && (
              <div className="single-stat">
                <p>Events Per Week: </p>
                <div className="col-3">
                  {(d.totalEvents / weeks).toFixed(2)}
                </div>
              </div>
            )}

            {d.totalPoints && d.totalPossiblePoints && (
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
            )}
          </section>
        )}
      </div>
    );
  }
}
MyStats.contextType = PContext;

export default MyStats;
