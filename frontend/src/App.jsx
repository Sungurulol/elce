import { useEffect, useRef, useState } from "react";
import {
  FilesetResolver,
  HandLandmarker,
  FaceLandmarker,
} from "@mediapipe/tasks-vision";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

const MOUTH_LANDMARK_INDICES = [
  0, 13, 14, 17, 37, 39, 40, 61, 78, 81, 82, 84, 87, 88, 91, 95,
  146, 178, 181, 185, 191, 267, 269, 270, 291, 308, 310, 311, 312,
  314, 317, 318, 321, 324, 375, 402, 405, 409, 415,
];

function App() {
  const [units, setUnits] = useState([]);
  const [progress, setProgress] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStatus, setCameraStatus] = useState("");
  const [sequenceStatus, setSequenceStatus] = useState("");
  const [isRecordingSequence, setIsRecordingSequence] = useState(false);

  const [gestureCheck, setGestureCheck] = useState({
    checked: false,
    passed: false,
    message: "",
  });

  const [handStatus, setHandStatus] = useState({
    ready: false,
    detected: false,
    handCount: 0,
    hands: [],
  });

  const [faceStatus, setFaceStatus] = useState({
    ready: false,
    detected: false,
    landmarkCount: 0,
    mouthLandmarkCount: 0,
    blendshapes: [],
  });

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const handLandmarkerRef = useRef(null);
  const faceLandmarkerRef = useRef(null);
  const animationFrameRef = useRef(null);

  const latestHandsRef = useRef([]);
  const latestFaceRef = useRef(null);

  const sequenceFramesRef = useRef([]);
  const isRecordingSequenceRef = useRef(false);
  const sequenceStartTimeRef = useRef(null);

  async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error("Istek basarisiz oldu");
    }

    return response.json();
  }

  async function loadData() {
    try {
      const unitsData = await fetchJson(`${API_URL}/units`);
      const progressData = await fetchJson(`${API_URL}/progress`);

      setUnits(unitsData);
      setProgress(progressData);
      setError("");
    } catch (err) {
      setError("Backend baglantisi basarisiz. Once backend'i calistir.");
    }
  }

  async function setupHandLandmarker() {
    if (handLandmarkerRef.current) {
      return;
    }

    setCameraStatus("El algilama modeli yukleniyor...");

    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numHands: 2,
    });

    setHandStatus((prev) => ({
      ...prev,
      ready: true,
    }));

    setCameraStatus("El algilama modeli hazir.");
  }

  async function setupFaceLandmarker() {
    if (faceLandmarkerRef.current) {
      return;
    }

    setCameraStatus("Yuz algilama modeli yukleniyor...");

    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numFaces: 1,
      outputFaceBlendshapes: true,
    });

    setFaceStatus((prev) => ({
      ...prev,
      ready: true,
    }));

    setCameraStatus("Yuz algilama modeli hazir.");
  }

  async function openLesson(lessonId) {
    try {
      const lessonData = await fetchJson(`${API_URL}/lesson-flow/${lessonId}`);

      setSelectedLesson(lessonData);
      setExerciseIndex(0);
      setSelectedOption("");
      setFeedback("");
      setCameraStatus("");
      setSequenceStatus("");
      resetGestureCheck();
      resetHandStatus();
      resetFaceStatus();
      stopCamera();
    } catch (err) {
      setError("Ders akisi yuklenemedi.");
    }
  }

  function closeLesson() {
    stopCamera();
    setSelectedLesson(null);
    setExerciseIndex(0);
    setSelectedOption("");
    setFeedback("");
    setCameraStatus("");
    setSequenceStatus("");
    resetGestureCheck();
    resetHandStatus();
    resetFaceStatus();
  }

  function goNextExercise() {
    if (!selectedLesson) {
      return;
    }

    stopCamera();

    const isLastExercise = exerciseIndex === selectedLesson.exercises.length - 1;

    if (isLastExercise) {
      completeLessonFlow();
      return;
    }

    setExerciseIndex(exerciseIndex + 1);
    setSelectedOption("");
    setFeedback("");
    setCameraStatus("");
    setSequenceStatus("");
    resetGestureCheck();
    resetHandStatus();
    resetFaceStatus();
  }

  function checkMultipleChoice(option) {
    const currentExercise = selectedLesson.exercises[exerciseIndex];

    setSelectedOption(option);

    if (option === currentExercise.answer) {
      setFeedback("Dogru cevap. Devam edebilirsin.");
    } else {
      setFeedback("Yanlis cevap. Tekrar dene.");
    }
  }

  function resetHandStatus() {
    latestHandsRef.current = [];
    sequenceFramesRef.current = [];
    sequenceStartTimeRef.current = null;
    isRecordingSequenceRef.current = false;
    setIsRecordingSequence(false);

    setHandStatus({
      ready: Boolean(handLandmarkerRef.current),
      detected: false,
      handCount: 0,
      hands: [],
    });
  }

  function resetFaceStatus() {
    latestFaceRef.current = null;

    setFaceStatus({
      ready: Boolean(faceLandmarkerRef.current),
      detected: false,
      landmarkCount: 0,
      mouthLandmarkCount: 0,
      blendshapes: [],
    });
  }

  function resetGestureCheck() {
    setGestureCheck({
      checked: false,
      passed: false,
      message: "",
    });
  }

  async function startCamera() {
    try {
      await setupHandLandmarker();
      await setupFaceLandmarker();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        videoRef.current.onloadeddata = () => {
          setCameraActive(true);
          setCameraStatus("Kamera acildi. Elini ve yuzunu kameraya net goster.");
          setSequenceStatus("");
          resetGestureCheck();
          startDetectionLoop();
        };
      }
    } catch (err) {
      setCameraStatus("Kamera veya algilama modelleri baslatilamadi.");
    }
  }

  function stopCamera() {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    isRecordingSequenceRef.current = false;
    setIsRecordingSequence(false);
    setCameraActive(false);
  }

  function getFaceData(video, nowInMs) {
    let faceData = {
      detected: false,
      landmarkCount: 0,
      mouthLandmarks: [],
      blendshapes: [],
    };

    if (!faceLandmarkerRef.current) {
      return faceData;
    }

    const faceResults = faceLandmarkerRef.current.detectForVideo(video, nowInMs);

    if (faceResults.faceLandmarks && faceResults.faceLandmarks.length > 0) {
      const faceLandmarks = faceResults.faceLandmarks[0];

      const mouthLandmarks = MOUTH_LANDMARK_INDICES
        .filter((index) => faceLandmarks[index])
        .map((index) => ({
          index,
          x: faceLandmarks[index].x,
          y: faceLandmarks[index].y,
          z: faceLandmarks[index].z,
        }));

      let blendshapes = [];

      if (
        faceResults.faceBlendshapes &&
        faceResults.faceBlendshapes.length > 0 &&
        faceResults.faceBlendshapes[0].categories
      ) {
        blendshapes = faceResults.faceBlendshapes[0].categories
          .map((item) => ({
            name: item.categoryName,
            score: item.score,
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 10);
      }

      faceData = {
        detected: true,
        landmarkCount: faceLandmarks.length,
        mouthLandmarks,
        blendshapes,
      };
    }

    return faceData;
  }

  function startDetectionLoop() {
    if (!videoRef.current || !handLandmarkerRef.current) {
      return;
    }

    const detectFrame = () => {
      const video = videoRef.current;
      const handLandmarker = handLandmarkerRef.current;

      if (!video || !handLandmarker || video.readyState < 2) {
        animationFrameRef.current = requestAnimationFrame(detectFrame);
        return;
      }

      const nowInMs = performance.now();

      const handResults = handLandmarker.detectForVideo(video, nowInMs);
      const faceData = getFaceData(video, nowInMs);

      const handCount = handResults.landmarks ? handResults.landmarks.length : 0;
      const hands = [];

      for (let i = 0; i < handCount; i++) {
        let handedness = "-";
        let score = 0;

        if (
          handResults.handedness &&
          handResults.handedness[i] &&
          handResults.handedness[i].length > 0
        ) {
          handedness = handResults.handedness[i][0].categoryName;
          score = handResults.handedness[i][0].score;
        }

        hands.push({
          index: i + 1,
          handedness,
          score,
          landmarkCount: handResults.landmarks[i].length,
          landmarks: handResults.landmarks[i].map((point) => ({
            x: point.x,
            y: point.y,
            z: point.z,
          })),
        });
      }

      latestHandsRef.current = hands;
      latestFaceRef.current = faceData;

      if (isRecordingSequenceRef.current && sequenceStartTimeRef.current !== null) {
        sequenceFramesRef.current.push({
          timestampMs: Math.round(performance.now() - sequenceStartTimeRef.current),
          handCount,
          hands,
          face: faceData,
        });
      }

      setHandStatus({
        ready: true,
        detected: handCount > 0,
        handCount,
        hands,
      });

      setFaceStatus({
        ready: Boolean(faceLandmarkerRef.current),
        detected: faceData.detected,
        landmarkCount: faceData.landmarkCount,
        mouthLandmarkCount: faceData.mouthLandmarks.length,
        blendshapes: faceData.blendshapes,
      });

      animationFrameRef.current = requestAnimationFrame(detectFrame);
    };

    detectFrame();
  }

  function validateGestureRequirements(currentExercise) {
    const expectedHands = currentExercise.expectedHands || 1;
    const minLandmarksPerHand = currentExercise.minLandmarksPerHand || 21;

    if (!handStatus.detected) {
      return {
        passed: false,
        message: "El algilanmadi. Elini kameraya daha net goster.",
      };
    }

    if (handStatus.handCount < expectedHands) {
      return {
        passed: false,
        message: `Bu hareket icin ${expectedHands} el bekleniyor. Su an ${handStatus.handCount} el algilandi.`,
      };
    }

    const usableHands = handStatus.hands.filter(
      (hand) => hand.landmarkCount >= minLandmarksPerHand
    );

    if (usableHands.length < expectedHands) {
      return {
        passed: false,
        message: `El landmarklari yetersiz. Her el icin en az ${minLandmarksPerHand} landmark bekleniyor.`,
      };
    }

    return {
      passed: true,
      message: `Temel kontrol basarili. ${currentExercise.expectedGesture} egzersizi icin ${expectedHands} el algilandi.`,
    };
  }

  function checkGestureExercise(currentExercise) {
    const result = validateGestureRequirements(currentExercise);

    setGestureCheck({
      checked: true,
      passed: result.passed,
      message: result.message,
    });

    if (result.passed) {
      setFeedback("Temel hareket kontrolu basarili. Dersi bitirebilirsin.");
      setCameraStatus("Kamera egzersizi tamamlandi.");
      stopCamera();
    } else {
      setFeedback(result.message);
    }
  }

  async function saveGestureSequence(currentExercise) {
    if (!cameraActive) {
      setSequenceStatus("Once kamerayi ac.");
      return;
    }

    if (isRecordingSequenceRef.current) {
      setSequenceStatus("Sequence kaydi zaten devam ediyor.");
      return;
    }

    const durationMs = 3000;

    sequenceFramesRef.current = [];
    sequenceStartTimeRef.current = performance.now();
    isRecordingSequenceRef.current = true;

    setIsRecordingSequence(true);
    setSequenceStatus("3 saniyelik sequence kaydi basladi. Hareketi yap.");

    setTimeout(async () => {
      isRecordingSequenceRef.current = false;
      setIsRecordingSequence(false);

      const frames = sequenceFramesRef.current;

      if (frames.length === 0) {
        setSequenceStatus("Sequence kaydedilemedi. Frame bulunamadi.");
        return;
      }

      try {
        const payload = {
          label: currentExercise.expectedGesture,
          lessonId: selectedLesson.id,
          expectedHands: currentExercise.expectedHands || 1,
          durationMs,
          frameCount: frames.length,
          frames,
        };

        const result = await fetchJson(`${API_URL}/gesture-sequences`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        setSequenceStatus(
          `${currentExercise.expectedGesture} icin 3 sn sequence kaydedildi. Frame: ${frames.length}. Toplam sequence: ${result.count}`
        );
      } catch (err) {
        setSequenceStatus("Sequence kaydedilemedi. Backend endpointini kontrol et.");
      }
    }, durationMs);
  }

  async function completeLessonFlow() {
    try {
      const result = await fetchJson(
        `${API_URL}/complete-lesson-flow/${selectedLesson.id}`,
        {
          method: "POST",
        }
      );

      setProgress(result.progress);
      setFeedback("Ders tamamlandi. XP kazandin.");

      setTimeout(() => {
        closeLesson();
      }, 700);
    } catch (err) {
      setError("Ders tamamlama istegi basarisiz oldu.");
    }
  }

  useEffect(() => {
    loadData();

    return () => {
      stopCamera();
    };
  }, []);

  if (error) {
    return (
      <main className="container">
        <section className="card error-card">
          <h1>Baglanti hatasi</h1>
          <p>{error}</p>
          <code>python -m uvicorn backend.main:app --reload</code>
        </section>
      </main>
    );
  }

  if (!progress) {
    return (
      <main className="container">
        <section className="card">
          <h1>Elce yukleniyor...</h1>
        </section>
      </main>
    );
  }

  if (selectedLesson) {
    const currentExercise = selectedLesson.exercises[exerciseIndex];
    const totalExercises = selectedLesson.exercises.length;
    const progressPercent = ((exerciseIndex + 1) / totalExercises) * 100;

    return (
      <main className="container lesson-page">
        <section className="card lesson-shell">
          <div className="lesson-topbar">
            <button className="ghost-button" onClick={closeLesson}>
              Cik
            </button>

            <div className="lesson-progress">
              <div
                className="lesson-progress-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <span>
              {exerciseIndex + 1}/{totalExercises}
            </span>
          </div>

          <div className="lesson-content">
            <p className="eyebrow">{selectedLesson.title}</p>
            <h1>{currentExercise.title}</h1>

            {currentExercise.type === "learn" && (
              <div className="exercise-box">
                <h2>{currentExercise.prompt}</h2>
                <p>{currentExercise.content}</p>

                <div className="gesture-preview">
                  Isaret gorseli / video alani
                </div>

                <button onClick={goNextExercise}>Devam</button>
              </div>
            )}

            {currentExercise.type === "multiple_choice" && (
              <div className="exercise-box">
                <h2>{currentExercise.question}</h2>

                <div className="option-grid">
                  {currentExercise.options.map((option) => {
                    const isSelected = selectedOption === option;
                    const isCorrect = option === currentExercise.answer;

                    let className = "option-button";

                    if (isSelected && isCorrect) {
                      className += " correct";
                    }

                    if (isSelected && !isCorrect) {
                      className += " wrong";
                    }

                    return (
                      <button
                        key={option}
                        className={className}
                        onClick={() => checkMultipleChoice(option)}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>

                {feedback && <strong className="feedback">{feedback}</strong>}

                <button
                  onClick={goNextExercise}
                  disabled={selectedOption !== currentExercise.answer}
                >
                  Devam
                </button>
              </div>
            )}

            {currentExercise.type === "camera" && (
              <div className="exercise-box">
                <h2>{currentExercise.prompt}</h2>

                <div className="camera-live-box">
                  <video ref={videoRef} autoPlay playsInline muted />

                  {!cameraActive && (
                    <div className="camera-overlay">
                      Kamera goruntusu burada gorunecek.
                    </div>
                  )}
                </div>

                <div className="ai-status-box">
                  <p className="eyebrow">AI Durumu</p>

                  <h3>
                    {handStatus.detected
                      ? "El algilandi. Temel kontrol yapilabilir."
                      : "El bekleniyor."}
                  </h3>

                  <div className="gesture-requirement-box">
                    <div>
                      <span>Beklenen hareket</span>
                      <strong>{currentExercise.expectedGesture}</strong>
                    </div>
                    <div>
                      <span>Gerekli el sayisi</span>
                      <strong>{currentExercise.expectedHands || 1}</strong>
                    </div>
                    <div>
                      <span>Minimum landmark</span>
                      <strong>{currentExercise.minLandmarksPerHand || 21}</strong>
                    </div>
                  </div>

                  <div className="hand-debug-grid">
                    <div>
                      <span>El Modeli</span>
                      <strong>{handStatus.ready ? "Hazir" : "Yuklenmedi"}</strong>
                    </div>

                    <div>
                      <span>El</span>
                      <strong>{handStatus.detected ? "Var" : "Yok"}</strong>
                    </div>

                    <div>
                      <span>El sayisi</span>
                      <strong>{handStatus.handCount}</strong>
                    </div>
                  </div>

                  <div className="face-debug-grid">
                    <div>
                      <span>Yuz Modeli</span>
                      <strong>{faceStatus.ready ? "Hazir" : "Yuklenmedi"}</strong>
                    </div>

                    <div>
                      <span>Yuz</span>
                      <strong>{faceStatus.detected ? "Var" : "Yok"}</strong>
                    </div>

                    <div>
                      <span>Yuz Landmark</span>
                      <strong>{faceStatus.landmarkCount}</strong>
                    </div>

                    <div>
                      <span>Agiz Noktasi</span>
                      <strong>{faceStatus.mouthLandmarkCount}</strong>
                    </div>

                    <div>
                      <span>Mimik Verisi</span>
                      <strong>{faceStatus.blendshapes.length}</strong>
                    </div>
                  </div>

                  <div className="blendshape-list">
                    {faceStatus.blendshapes.length === 0 ? (
                      <p>Henuz mimik verisi yok.</p>
                    ) : (
                      faceStatus.blendshapes.slice(0, 5).map((shape) => (
                        <div className="blendshape-row" key={shape.name}>
                          <span>{shape.name}</span>
                          <strong>{shape.score.toFixed(3)}</strong>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="hand-list">
                    {handStatus.hands.length === 0 ? (
                      <p>Henuz el algilanmadi.</p>
                    ) : (
                      handStatus.hands.map((hand) => (
                        <div className="hand-card" key={hand.index}>
                          <p className="eyebrow">El {hand.index}</p>

                          <div className="hand-card-row">
                            <span>Sag/Sol</span>
                            <strong>{hand.handedness}</strong>
                          </div>

                          <div className="hand-card-row">
                            <span>Landmark</span>
                            <strong>{hand.landmarkCount}</strong>
                          </div>

                          <div className="hand-card-row">
                            <span>Guven</span>
                            <strong>{Math.round(hand.score * 100)}%</strong>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {gestureCheck.checked && (
                    <div
                      className={
                        gestureCheck.passed
                          ? "gesture-check-result success"
                          : "gesture-check-result failed"
                      }
                    >
                      {gestureCheck.message}
                    </div>
                  )}
                </div>

                <div className="camera-action-row">
                  <button onClick={startCamera}>Kamerayi Ac</button>

                  <button className="secondary-button" onClick={stopCamera}>
                    Kamerayi Kapat
                  </button>

                  <button
                    className="success-button"
                    onClick={() => checkGestureExercise(currentExercise)}
                  >
                    Hareketi Kontrol Et
                  </button>

                  <button
                    className="sequence-button"
                    onClick={() => saveGestureSequence(currentExercise)}
                    disabled={isRecordingSequence}
                  >
                    {isRecordingSequence ? "Kaydediliyor..." : "3 sn Sequence Kaydet"}
                  </button>
                </div>

                {cameraStatus && (
                  <strong className="feedback">{cameraStatus}</strong>
                )}

                {feedback && <strong className="feedback">{feedback}</strong>}

                {sequenceStatus && (
                  <strong className="sequence-feedback">{sequenceStatus}</strong>
                )}

                <button onClick={goNextExercise} disabled={!gestureCheck.passed}>
                  Dersi Bitir
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="container">
      <section className="card hero-card">
        <div>
          <p className="eyebrow">Elce MVP</p>
          <h1>Unite tabanli Turk Isaret Dili egitimi</h1>
          <p className="hero-text">
            Gunluk dersler, unite ilerlemesi, kamera pratigi ve oyunlastirilmis
            XP sistemi.
          </p>
        </div>

        <div className="stats">
          <div className="stat-box">
            <span>XP</span>
            <strong>{progress.xp}</strong>
          </div>

          <div className="stat-box">
            <span>Streak</span>
            <strong>{progress.streak}</strong>
          </div>

          <div className="stat-box">
            <span>Rozet</span>
            <strong>{progress.badges.length}</strong>
          </div>
        </div>
      </section>

      <section className="card">
        <p className="eyebrow">Ders Yolu</p>
        <h2>Uniteler</h2>

        <div className="unit-list">
          {units.map((unit) => (
            <article className="unit-card" key={unit.id}>
              <div>
                <p className="eyebrow">Unite {unit.id}</p>
                <h3>{unit.title}</h3>
                <p>{unit.description}</p>
              </div>

              <div className="lesson-list">
                {unit.lessons.map((lesson) => {
                  const isCompleted = progress.completedUnitLessons.includes(
                    lesson.id
                  );

                  return (
                    <button
                      key={lesson.id}
                      className={
                        isCompleted ? "lesson-pill completed" : "lesson-pill"
                      }
                      onClick={() => openLesson(lesson.id)}
                    >
                      <span>{lesson.title}</span>
                      <small>
                        {isCompleted ? "Tamamlandi" : `${lesson.xp} XP`}
                      </small>
                    </button>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="card">
        <p className="eyebrow">Basarilar</p>
        <h2>Rozetler</h2>

        <div className="badges">
          {progress.badges.length === 0 ? (
            <p>Henuz rozet kazanilmadi.</p>
          ) : (
            progress.badges.map((badge) => (
              <span className="badge" key={badge}>
                {badge}
              </span>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

export default App;