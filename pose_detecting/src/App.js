import React, { useRef, useMemo, useState, useEffect } from "react";
import "./App.css";
import * as tf from "@tensorflow/tfjs";
import * as posenet from "@tensorflow-models/posenet";
import Webcam from "react-webcam";
import { drawKeypoints, drawSkeleton } from "./components/utils";

function App() {
  const interval = useRef();
  const loadPosenet = async () => {
    const net = await posenet.load({
      inputResolution: { width: 640, height: 480 },
    });
    const caller = async () => {
      await detect(net);
      requestAnimationFrame(caller);
    };

    requestAnimationFrame(caller);
  };

  const _webcam = useRef(null);
  const _canvas = useRef(null);

  const detect = async (net) => {
    if (_webcam.current) {
      const video = _webcam.current.video;
      const width = _webcam.current.video.videoWidth;
      const height = _webcam.current.video.videoHeight;

      _webcam.current.video.width = width;
      _webcam.current.video.height = height;

      // Make Detections
      const poses = await net.estimateMultiplePoses(video);
      poses.forEach((pose) => {
        drawCanvas(pose, video, width, height, _canvas);
      });
    }
  };

  const drawCanvas = (pose, video, width, height, canvas) => {
    const ctx = canvas.current.getContext("2d");
    canvas.current.width = width;
    canvas.current.height = height;

    drawKeypoints(pose["keypoints"], 0.7, ctx);
    drawSkeleton(pose["keypoints"], 0.6, ctx);
  };

  return (
    <div className="App">
      <button
        onClick={() => {
          if (interval.current) {
            clearInterval(interval.current);
            interval.current = null;
            const ctx = _canvas.current.getContext("2d");
            ctx.clearRect(0, 0, 640, 480);

            return;
          }
          loadPosenet();
        }}
      >
        Switch
      </button>
      <header className="App-header">
        <Webcam
          ref={_webcam}
          style={{
            position: "absolute",
            marginLeft: "auto",
            marginRight: "auto",
            left: 0,
            right: 0,
            zindex: 9,
            width: 640,
            height: 480,
          }}
        />

        <canvas
          ref={_canvas}
          style={{
            position: "absolute",
            marginLeft: "auto",
            marginRight: "auto",
            left: 0,
            right: 0,
            zindex: 9,
            width: 640,
            height: 480,
          }}
        />
      </header>
    </div>
  );
}

export default App;
