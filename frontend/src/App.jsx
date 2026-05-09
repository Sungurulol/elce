import { useEffect, useRef, useState } from "react";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

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

  const [handStatus, setHandStatus] = useState({
    ready: false,
    detected: false,
    handCount: 0,
    hands: [],
  });

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const handLandmarkerRef = useRef(null);
  const animationFrameRef = useRef(null);

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

  async function openLesson(lessonId) {
    try {
      const lessonData = await fetchJson(`${API_URL}/lesson-flow/${lessonId}`);

      setSelectedLesson(lessonData);
      setExerciseIndex(0);
      setSelectedOption("");
      setFeedback("");
      setCameraStatus("");
      resetHandStatus();
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
    resetHandStatus();
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
    resetHandStatus();
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
    setHandStatus({
      ready: Boolean(handLandmarkerRef.current),
      detected: false,
      handCount: 0,
      hands: [],
    });
  }

  async function startCamera() {
    try {
      await setupHandLandmarker();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        videoRef.current.onloadeddata = () => {
          setCameraActive(true);
          setCameraStatus("Kamera acildi. Elini kameraya net sekilde goster.");
          startHandDetectionLoop();
        };
      }
    } catch (err) {
      setCameraStatus("Kamera veya el algilama baslatilamadi.");
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

    setCameraActive(false);
  }

  function startHandDetectionLoop() {
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
      const results = handLandmarker.detectForVideo(video, nowInMs);

      const handCount = results.landmarks ? results.landmarks.length : 0;
      const hands = [];

      for (let i = 0; i < handCount; i++) {
        let handedness = "-";
        let score = 0;

        if (
          results.handedness &&
          results.handedness[i] &&
          results.handedness[i].length > 0
        ) {
          handedness = results.handedness[i][0].categoryName;
          score = results.handedness[i][0].score;
        }

        hands.push({
          index: i + 1,
          handedness,
          score,
          landmarkCount: results.landmarks[i].length,
        });
      }

      setHandStatus({
        ready: true,
        detected: handCount > 0,
        handCount,
        hands,
      });

      animationFrameRef.current = requestAnimationFrame(detectFrame);
    };

    detectFrame();
  }

  function acceptCameraExercise() {
    if (!handStatus.detected) {
      setFeedback("El algilanmadi. Elini kameraya daha net goster.");
      return;
    }

    setFeedback("El algilandi. AI hareket siniflandirma sonraki adimda.");
    setCameraStatus("Kamera egzersizi tamamlandi.");
    stopCamera();
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
                      ? "El algilandi. Landmark takibi calisiyor."
                      : "El bekleniyor."}
                  </h3>

                  <div className="hand-debug-grid">
                    <div>
                      <span>Model</span>
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

                  <p>
                    Beklenen hareket:{" "}
                    <strong>{currentExercise.expectedGesture}</strong>
                  </p>
                </div>

                <div className="camera-action-row">
                  <button onClick={startCamera}>Kamerayi Ac</button>

                  <button className="secondary-button" onClick={stopCamera}>
                    Kamerayi Kapat
                  </button>

                  <button className="success-button" onClick={acceptCameraExercise}>
                    Hareketi Kontrol Et
                  </button>
                </div>

                {cameraStatus && (
                  <strong className="feedback">{cameraStatus}</strong>
                )}

                {feedback && <strong className="feedback">{feedback}</strong>}

                <button
                  onClick={goNextExercise}
                  disabled={!feedback.includes("El algilandi")}
                >
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