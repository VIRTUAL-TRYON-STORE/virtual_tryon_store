/**
 * TryOn.jsx
 *
 * Virtual try-on component using MediaPipe PoseLandmarker on a live webcam.
 *
 * Two patterns are used here and documented below:
 *
 * Pattern 1 - StrictMode double-invocation guard ("alive" flag)
 * -------------------------------------------------------------
 * React 18 StrictMode intentionally runs every useEffect twice in development:
 *   mount -> effect -> unmount (cleanup) -> mount -> effect again.
 * Without a guard this would open two camera streams and two rAF loops.
 *
 * Fix: at the top of the effect we declare `let alive = true`.
 * - Every async continuation checks `if (!alive) return` before touching
 *   any DOM / WebAPI resource.
 * - Every rAF callback checks the same flag before scheduling the next frame.
 * - The cleanup sets `alive = false` first, then stops tracks, cancels the
 *   rAF handle, and closes the landmarker.
 * When StrictMode fires the cleanup between the two mounts the first effect's
 * entire async path sees `alive === false` and exits cleanly, so the second
 * mount always starts from a clean slate.
 *
 * Pattern 2 - useRef for imperative handles
 * -----------------------------------------
 * The video element, canvas 2D context, MediaPipe landmarker instance,
 * current rAF id, and smoothed pose values must NOT trigger re-renders when
 * they change. Putting them in useState would cause unnecessary renders (or,
 * for the rAF id, infinite loops). useRef gives a stable .current slot that
 * persists for the component lifetime without causing re-renders. The cleanup
 * function reaches into these refs to release resources even after the
 * component has been removed from the DOM.
 *
 * Bug fixed in this version
 * -------------------------
 * The previous version placed <video> and <canvas> inside three separate
 * conditional branches (loading / running / error). When React status changed
 * from "loading" to "running" it unmounted the old elements and mounted new
 * ones, but the webcam stream and rAF drawing loop were still attached to the
 * OLD DOM nodes, so the canvas stayed black.
 *
 * Fix: <video> and <canvas> are now rendered ONCE, unconditionally, in a
 * single persistent wrapper. Loading and error messages are absolutely-
 * positioned overlays inside that same wrapper. The video/canvas are hidden
 * with `visibility: hidden` in the error state but are never unmounted.
 *
 * Props
 * -----
 * clothingImage  {string}   URL of the shirt / clothing image to overlay.
 * showControls   {boolean}  When true, renders the three tuning sliders.
 *                           Defaults to false.
 */

import { useEffect, useRef, useState } from "react";
import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";

// ---- Constants ---------------------------------------------------------------

const WASM_BASE =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/" +
  "pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

// 1 = no smoothing (jittery), 0.1 = very smooth (laggy)
const SMOOTHING = 0.35;

const CANVAS_W = 640;
const CANVAS_H = 480;

// ---- Helper ------------------------------------------------------------------

function smoothValue(prev, next) {
  return prev + (next - prev) * SMOOTHING;
}

// ---- Component ---------------------------------------------------------------

export default function TryOn({ clothingImage, showControls = false }) {
  // Pattern 2: DOM refs populated by ref= on JSX elements.
  // These point to the SAME elements for the entire lifetime of the component
  // because those elements are now rendered unconditionally (no conditionals).
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);

  // Pattern 2: imperative handles - changes here must NOT cause re-renders.
  const landmarkerRef = useRef(null); // MediaPipe PoseLandmarker instance
  const rafRef        = useRef(null); // current requestAnimationFrame id
  const smoothedRef   = useRef(null); // { x, y, w, t, a } smoothed pose
  const streamRef     = useRef(null); // MediaStream from getUserMedia

  // Slider multipliers live in refs so the rAF loop reads the latest value
  // without triggering renders.
  const widthMultRef  = useRef(2);
  const heightMultRef = useRef(1.4);
  const offsetMultRef = useRef(0.12);

  // UI state - these do need to trigger renders.
  const [status,   setStatus]   = useState("loading"); // "loading"|"running"|"error"
  const [errorMsg, setErrorMsg] = useState("");

  // Slider display values (only matter when showControls is true).
  const [widthVal,  setWidthVal]  = useState(2);
  const [heightVal, setHeightVal] = useState(1.4);
  const [offsetVal, setOffsetVal] = useState(0.12);

  // ---- Main effect -----------------------------------------------------------

  useEffect(() => {
    // Pattern 1: alive flag - guards every async continuation and the rAF loop.
    let alive = true;

    // videoRef.current and canvasRef.current are stable here because the
    // elements are always in the DOM (never conditionally rendered).
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");

    // Pre-load the clothing image so drawImage is instant inside the loop.
    const shirt = new Image();
    shirt.src = clothingImage;

    // Convert a normalised landmark to canvas pixels.
    // (1 - x) flips the x-axis to match the CSS-mirrored video.
    function toPixels(p) {
      return {
        x: (1 - p.x) * CANVAS_W,
        y: p.y * CANVAS_H,
      };
    }

    function isVisible(p) {
      return (p.visibility ?? 1) > 0.5;
    }

    // ---- rAF detection loop --------------------------------------------------

    function detectLoop() {
      // Pattern 1: bail out if this effect instance has been cleaned up.
      if (!alive) return;

      const landmarker = landmarkerRef.current;
      if (!landmarker) {
        rafRef.current = requestAnimationFrame(detectLoop);
        return;
      }

      const result = landmarker.detectForVideo(video, performance.now());
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      const lm = result.landmarks && result.landmarks[0];
      const shouldersVisible = lm && isVisible(lm[11]) && isVisible(lm[12]);

      if (!shouldersVisible) {
        // Nobody in frame: hide the shirt and forget the last position so
        // the overlay snaps into place immediately when shoulders reappear.
        smoothedRef.current = null;
        rafRef.current = requestAnimationFrame(detectLoop);
        return;
      }

      // Landmark indices:
      //   11 = left shoulder,  12 = right shoulder
      //   23 = left hip,       24 = right hip
      const leftShoulder  = toPixels(lm[11]);
      const rightShoulder = toPixels(lm[12]);

      const center = {
        x: (leftShoulder.x + rightShoulder.x) / 2,
        y: (leftShoulder.y + rightShoulder.y) / 2,
      };

      const shoulderWidth = Math.hypot(
        leftShoulder.x - rightShoulder.x,
        leftShoulder.y - rightShoulder.y
      );

      // If the hips are visible, measure the torso directly.
      // Otherwise, estimate torso length from the shoulder width.
      let torsoLength = shoulderWidth * 1.5;
      if (isVisible(lm[23]) && isVisible(lm[24])) {
        const leftHip  = toPixels(lm[23]);
        const rightHip = toPixels(lm[24]);
        const hipCenter = {
          x: (leftHip.x + rightHip.x) / 2,
          y: (leftHip.y + rightHip.y) / 2,
        };
        torsoLength = Math.hypot(
          center.x - hipCenter.x,
          center.y - hipCenter.y
        );
      }

      // After mirroring, left shoulder is on the left of the screen,
      // so angle goes left-to-right.
      const angle = Math.atan2(
        rightShoulder.y - leftShoulder.y,
        rightShoulder.x - leftShoulder.x
      );

      // Smooth every value toward its new target (exponential moving average).
      const target = {
        x: center.x,
        y: center.y,
        w: shoulderWidth,
        t: torsoLength,
        a: angle,
      };

      if (!smoothedRef.current) {
        // First frame after shoulders appear: snap directly, no smoothing.
        smoothedRef.current = { ...target };
      } else {
        const s = smoothedRef.current;
        for (const key in target) {
          s[key] = smoothValue(s[key], target[key]);
        }
      }

      const s           = smoothedRef.current;
      const shirtWidth  = s.w * widthMultRef.current;
      const shirtHeight = s.t * heightMultRef.current;

      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.a);
      ctx.drawImage(
        shirt,
        -shirtWidth / 2,
        -shirtHeight * offsetMultRef.current,
        shirtWidth,
        shirtHeight
      );
      ctx.restore();

      rafRef.current = requestAnimationFrame(detectLoop);
    }

    // ---- setup ---------------------------------------------------------------

    async function setup() {
      try {
        // Load the WASM runtime from CDN (same URL as the reference file).
        const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
        if (!alive) return; // cleaned up while awaiting

        // Load the pose landmarker model from CDN.
        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL },
          runningMode: "VIDEO",
        });
        if (!alive) {
          // Cleaned up while the model was downloading - release it now.
          landmarker.close();
          return;
        }
        landmarkerRef.current = landmarker;

        // Request webcam access.
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (!alive) {
          // Cleaned up while getUserMedia was pending.
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        // Store in a ref so the cleanup function can always reach it,
        // even if this effect instance is already "dead".
        streamRef.current = stream;
        video.srcObject = stream;

        video.addEventListener("loadeddata", () => {
          if (!alive) return;
          setStatus("running");
          rafRef.current = requestAnimationFrame(detectLoop);
        });
      } catch (err) {
        if (!alive) return;
        console.error("[TryOn] setup error:", err);
        const isPermission =
          err.name === "NotAllowedError" ||
          err.name === "PermissionDeniedError";
        setErrorMsg(
          isPermission
            ? "Camera access was blocked. Please allow camera permissions in your browser and reload."
            : `Could not start the camera or load the model: ${err.message}`
        );
        setStatus("error");
      }
    }

    setup();

    // ---- Cleanup -------------------------------------------------------------
    // Called on unmount AND by StrictMode between its two development mounts.

    return () => {
      // Pattern 1: mark this effect instance dead so all async continuations
      // and rAF callbacks bail out immediately.
      alive = false;

      // Cancel the animation-frame loop.
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      // Stop webcam tracks via streamRef (reliable even if srcObject was
      // cleared elsewhere, or the stream arrived after cleanup started).
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      // Also clear the video's srcObject so the browser releases the feed.
      if (video.srcObject) {
        video.srcObject = null;
      }

      // Close the MediaPipe landmarker (releases WASM memory).
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
        landmarkerRef.current = null;
      }

      // Reset smoothed pose so the next mount starts fresh.
      smoothedRef.current = null;
    };
  }, [clothingImage]); // re-run only if the clothing image URL changes

  // ---- Render ----------------------------------------------------------------
  //
  // IMPORTANT: <video> and <canvas> are rendered exactly ONCE, unconditionally,
  // inside a single persistent wrapper. They are NEVER moved into or out of a
  // conditional branch. React must see the same element type at the same
  // position in the tree on every render so it reuses the same DOM nodes and
  // the refs remain valid.
  //
  // Loading and error messages are absolutely-positioned overlays layered on
  // top of the video/canvas inside that same wrapper. In the error state the
  // video and canvas are hidden with `visibility: hidden` (they stay in the
  // layout, just invisible) so cleanup can still null out their srcObject.
  //
  // Only the VIDEO is flipped with CSS scaleX(-1) so the user sees a mirror
  // image. The canvas is NOT flipped, so the shirt draws in its natural
  // orientation. The landmark x coordinate is flipped via (1 - x) inside
  // toPixels() so positions stay aligned with the mirrored video.

  const isError   = status === "error";
  const isLoading = status === "loading";

  return (
    <div style={{ fontFamily: "sans-serif" }}>

      {/* Keyframe for the spinner - injected once, harmless on re-render */}
      <style>{`@keyframes tryon-spin { to { transform: rotate(360deg); } }`}</style>

      {/*
        THE ONE AND ONLY wrapper for video + canvas.
        Never conditional. Never moved. Always the same DOM node.
      */}
      <div style={st.viewport}>

        {/* Camera feed - mirrored with CSS only */}
        <video
          ref={videoRef}
          width={CANVAS_W}
          height={CANVAS_H}
          autoPlay
          playsInline
          muted
          style={{
            ...st.video,
            visibility: isError ? "hidden" : "visible",
          }}
        />

        {/* Overlay canvas - NOT mirrored, shirt draws in natural orientation */}
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{
            ...st.canvas,
            visibility: isError ? "hidden" : "visible",
          }}
        />

        {/* Loading overlay - absolutely positioned on top of the video */}
        {isLoading && (
          <div style={st.loadingOverlay}>
            <div style={st.spinner} />
            <p style={st.overlayText}>Loading model…</p>
          </div>
        )}

        {/* Error overlay - absolutely positioned on top of the (hidden) video */}
        {isError && (
          <div style={st.errorOverlay}>
            <span style={{ fontSize: 28, lineHeight: 1 }}>⚠️</span>
            <p style={st.errorText}>{errorMsg}</p>
          </div>
        )}

      </div>

      {/* Optional tuning sliders */}
      {showControls && (
        <div style={st.controls}>
          <label style={st.label}>
            Shirt width: {widthVal.toFixed(2)}
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={widthVal}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                widthMultRef.current = v;
                setWidthVal(v);
              }}
              style={st.slider}
            />
          </label>

          <label style={st.label}>
            Shirt height: {heightVal.toFixed(2)}
            <input
              type="range"
              min="0.8"
              max="2.5"
              step="0.05"
              value={heightVal}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                heightMultRef.current = v;
                setHeightVal(v);
              }}
              style={st.slider}
            />
          </label>

          <label style={st.label}>
            Move shirt up/down: {offsetVal.toFixed(2)}
            <input
              type="range"
              min="-0.3"
              max="0.4"
              step="0.01"
              value={offsetVal}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                offsetMultRef.current = v;
                setOffsetVal(v);
              }}
              style={st.slider}
            />
          </label>
        </div>
      )}
    </div>
  );
}

// ---- Styles ------------------------------------------------------------------

const st = {
  // The single persistent wrapper - position:relative so overlays can be
  // positioned absolutely inside it.
  viewport: {
    position: "relative",
    width: CANVAS_W,
    height: CANVAS_H,
    background: "#111",
    overflow: "hidden",
  },
  video: {
    position: "absolute",
    top: 0,
    left: 0,
    // Only the video is mirrored; the canvas is NOT flipped.
    transform: "scaleX(-1)",
  },
  canvas: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  // Shared base for both overlays
  overlayBase: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    zIndex: 10,
    gap: 14,
  },
  loadingOverlay: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.72)",
    zIndex: 10,
    gap: 14,
  },
  errorOverlay: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "#fff0f0",
    zIndex: 10,
    gap: 12,
    padding: "20px 24px",
    boxSizing: "border-box",
    textAlign: "center",
  },
  overlayText: {
    color: "#fff",
    fontSize: 18,
    margin: 0,
  },
  spinner: {
    width: 48,
    height: 48,
    border: "5px solid rgba(255,255,255,0.2)",
    borderTopColor: "#fff",
    borderRadius: "50%",
    animation: "tryon-spin 0.9s linear infinite",
  },
  errorText: {
    margin: 0,
    color: "#721c24",
    lineHeight: 1.5,
    maxWidth: 480,
  },
  controls: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    marginTop: 14,
    width: CANVAS_W,
    fontFamily: "sans-serif",
    fontSize: 14,
    lineHeight: 2,
  },
  label: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  slider: {
    flex: 1,
  },
};
