import React from "react";

//PROPS: Boolean isPopup, Boolean isFullCenter
function Loading(props) {
  return (
    <div
      className={
        props.isPopup
          ? "grayed-out-background"
          : props.isFullCenter
          ? "fullCenter"
          : ""
      }
    >
      <div className={props.isPopup ? "popup nsp" : ""}>
        <div className="load-container">
          <div className="load1">
            <div>
              <span>L</span>
              <span>O</span>
              <span>A</span>
              <span>D</span>
              <span>I</span>
              <span>N</span>
              <span>G</span>...
            </div>

            {/* <span>.</span>
            <span>.</span>
            <span>.</span> */}
          </div>
          <div className="load2">
            <span className="single-dot"></span>
            <span className="single-dot"></span>

            <span className="single-dot"></span>
            <span className="single-dot"></span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Loading;
