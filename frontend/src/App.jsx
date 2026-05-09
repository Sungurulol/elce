import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

function App() {
  const [lessons, setLessons] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");
  const [speedQuestion, setSpeedQuestion] = useState(null);
  const [speedResult, setSpeedResult] = useState("");

  async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error("Istek basarisiz oldu");
    }

    return response.json();
  }

  async function loadData() {
    try {
      const lessonsData = await fetchJson(`${API_URL}/lessons`);
      const scenariosData = await fetchJson(`${API_URL}/scenarios`);
      const progressData = await fetchJson(`${API_URL}/progress`);

      setLessons(lessonsData);
      setScenarios(scenariosData);
      setProgress(progressData);
      setError("");
    } catch (err) {
      setError("Backend baglantisi basarisiz. Once backend'i calistir.");
    }
  }

  async function completeLesson(lessonId) {
    try {
      const result = await fetchJson(`${API_URL}/complete-lesson/${lessonId}`, {
        method: "POST",
      });

      setProgress(result.progress);
    } catch (err) {
      setError("Ders tamamlama istegi basarisiz oldu.");
    }
  }

  async function completeScenario(scenarioId) {
    try {
      const result = await fetchJson(
        `${API_URL}/complete-scenario/${scenarioId}`,
        {
          method: "POST",
        }
      );

      setProgress(result.progress);
    } catch (err) {
      setError("Senaryo tamamlama istegi basarisiz oldu.");
    }
  }

  function startSpeedTest() {
    if (lessons.length === 0) {
      return;
    }

    const randomIndex = Math.floor(Math.random() * lessons.length);
    setSpeedQuestion(lessons[randomIndex]);
    setSpeedResult("");
  }

  async function answerSpeedTest(option) {
    if (!speedQuestion) {
      return;
    }

    if (option !== speedQuestion.answer) {
      setSpeedResult("Yanlis cevap. Tekrar dene.");
      return;
    }

    try {
      const result = await fetchJson(
        `${API_URL}/complete-speed-test/${speedQuestion.id}`,
        {
          method: "POST",
        }
      );

      setProgress(result.progress);
      setSpeedResult("Dogru cevap. +10 XP kazandin.");
      setSpeedQuestion(null);
    } catch (err) {
      setError("Hiz testi istegi basarisiz oldu.");
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

  const dailyGoals = [
    {
      title: "1 ders tamamla",
      done: progress.completedLessons.length > 0,
    },
    {
      title: "1 senaryo tamamla",
      done: progress.completedScenarios.length > 0,
    },
    {
      title: "1 hiz testi coz",
      done: progress.speedTestsCompleted > 0,
    },
  ];

  return (
    <main className="container">
      <section className="card hero-card">
        <div>
          <p className="eyebrow">Elce MVP</p>
          <h1>Turk Isaret Dili mikro-ogrenme uygulamasi</h1>
          <p className="hero-text">
            Gunluk dersler, senaryo tabanli egitimler, hiz testi ve
            oyunlastirilmis ilerleme sistemi.
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
        <p className="eyebrow">Gunluk Hedef</p>
        <h2>Bugunku gorevler</h2>

        <div className="goal-list">
          {dailyGoals.map((goal) => (
            <div className="goal-item" key={goal.title}>
              <span className={goal.done ? "goal-check done" : "goal-check"}>
                {goal.done ? "✓" : ""}
              </span>
              <p>{goal.title}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="section-header">
          <div>
            <p className="eyebrow">Hiz Testi</p>
            <h2>Bilgini hizli test et</h2>
          </div>

          <span>{progress.speedTestsCompleted} test</span>
        </div>

        {!speedQuestion ? (
          <div className="speed-start">
            <p>
              Rastgele bir ders sorusu gelir. Dogru cevap verirsen +10 XP
              kazanirsin.
            </p>
            <button onClick={startSpeedTest}>Hiz Testi Baslat</button>
            {speedResult && <strong className="speed-result">{speedResult}</strong>}
          </div>
        ) : (
          <div className="speed-question">
            <h3>{speedQuestion.question}</h3>

            <div className="speed-options">
              {speedQuestion.options.map((option) => (
                <button key={option} onClick={() => answerSpeedTest(option)}>
                  {option}
                </button>
              ))}
            </div>

            {speedResult && <strong className="speed-result">{speedResult}</strong>}
          </div>
        )}
      </section>

      <section className="card">
        <div className="section-header">
          <div>
            <p className="eyebrow">Gunluk Dersler</p>
            <h2>Dersler</h2>
          </div>
          <span>{lessons.length} ders</span>
        </div>

        <div className="list">
          {lessons.map((lesson) => {
            const isCompleted = progress.completedLessons.includes(lesson.id);

            return (
              <article className="item" key={lesson.id}>
                <div>
                  <h3>{lesson.title}</h3>
                  <p>{lesson.description}</p>
                  <small>
                    {lesson.category} • {lesson.xp} XP
                  </small>
                </div>

                <button
                  className={isCompleted ? "completed" : ""}
                  disabled={isCompleted}
                  onClick={() => completeLesson(lesson.id)}
                >
                  {isCompleted ? "Tamamlandi" : "Tamamla"}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="card">
        <div className="section-header">
          <div>
            <p className="eyebrow">Gercek Hayat Pratigi</p>
            <h2>Senaryolar</h2>
          </div>
          <span>{scenarios.length} senaryo</span>
        </div>

        <div className="list">
          {scenarios.map((scenario) => {
            const isCompleted = progress.completedScenarios.includes(
              scenario.id
            );

            return (
              <article className="item" key={scenario.id}>
                <div>
                  <h3>{scenario.title}</h3>
                  <p>{scenario.description}</p>
                  <small>{scenario.xp} XP</small>
                </div>

                <button
                  className={isCompleted ? "completed" : ""}
                  disabled={isCompleted}
                  onClick={() => completeScenario(scenario.id)}
                >
                  {isCompleted ? "Tamamlandi" : "Tamamla"}
                </button>
              </article>
            );
          })}
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