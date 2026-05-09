import { useEffect, useState } from "react";
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

  async function openLesson(lessonId) {
    try {
      const lessonData = await fetchJson(`${API_URL}/lesson-flow/${lessonId}`);

      setSelectedLesson(lessonData);
      setExerciseIndex(0);
      setSelectedOption("");
      setFeedback("");
    } catch (err) {
      setError("Ders akisi yuklenemedi.");
    }
  }

  function closeLesson() {
    setSelectedLesson(null);
    setExerciseIndex(0);
    setSelectedOption("");
    setFeedback("");
  }

  function goNextExercise() {
    if (!selectedLesson) {
      return;
    }

    const isLastExercise = exerciseIndex === selectedLesson.exercises.length - 1;

    if (isLastExercise) {
      completeLessonFlow();
      return;
    }

    setExerciseIndex(exerciseIndex + 1);
    setSelectedOption("");
    setFeedback("");
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

  function completeCameraDemo() {
    setFeedback("Demo kontrol basarili. AI kontrolu sonraki adimda baglanacak.");
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

                <div className="camera-mock">
                  Kamera / AI kontrol alani
                </div>

                <p>
                  Bu bolumde sonraki adimda kamera acilacak ve AI hareketi
                  kontrol edecek.
                </p>

                <button onClick={completeCameraDemo}>
                  Demo olarak dogru kabul et
                </button>

                {feedback && <strong className="feedback">{feedback}</strong>}

                <button
                  onClick={goNextExercise}
                  disabled={!feedback.includes("basarili")}
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
                      className={isCompleted ? "lesson-pill completed" : "lesson-pill"}
                      onClick={() => openLesson(lesson.id)}
                    >
                      <span>{lesson.title}</span>
                      <small>{isCompleted ? "Tamamlandi" : `${lesson.xp} XP`}</small>
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