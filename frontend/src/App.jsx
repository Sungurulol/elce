import { useEffect, useRef, useState } from "react";
import {
  FilesetResolver,
  HandLandmarker,
  FaceLandmarker,
  PoseLandmarker,
} from "@mediapipe/tasks-vision";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

const POSE_VISIBILITY_THRESHOLD = 0.55;

const MOUTH_LANDMARK_INDICES = [
  0, 13, 14, 17, 37, 39, 40, 61, 78, 81, 82, 84, 87, 88, 91, 95,
  146, 178, 181, 185, 191, 267, 269, 270, 291, 308, 310, 311, 312,
  314, 317, 318, 321, 324, 375, 402, 405, 409, 415,
];

const POSE_LANDMARK_INDICES = {
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
};

function App() {
  const [units, setUnits] = useState([]);
  const [progress, setProgress] = useState(null);
  const [datasetSummary, setDatasetSummary] = useState(null);

  const [selectedLesson, setSelectedLesson] = useState(null);
  const [freePracticeActive, setFreePracticeActive] = useState(false);
  const [activeHomePanel, setActiveHomePanel] = useState("dashboard");
  const [developerMode, setDeveloperMode] = useState(false);

  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState("");
  const [selectedVariantLabel, setSelectedVariantLabel] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStatus, setCameraStatus] = useState("");
  const [sequenceStatus, setSequenceStatus] = useState("");
  const [practiceStatus, setPracticeStatus] = useState("");
  const [practiceResult, setPracticeResult] = useState(null);
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

  const [poseStatus, setPoseStatus] = useState({
    ready: false,
    detected: false,
    landmarkCount: 0,
    leftShoulder: false,
    rightShoulder: false,
    leftElbow: false,
    rightElbow: false,
    leftWrist: false,
    rightWrist: false,
  });

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const handLandmarkerRef = useRef(null);
  const faceLandmarkerRef = useRef(null);
  const poseLandmarkerRef = useRef(null);
  const animationFrameRef = useRef(null);

  const latestHandsRef = useRef([]);
  const latestFaceRef = useRef(null);
  const latestPoseRef = useRef(null);

  const sequenceFramesRef = useRef([]);
  const isRecordingSequenceRef = useRef(false);
  const sequenceStartTimeRef = useRef(null);

  async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);

    if (!response.ok) {
      let detail = "İstek başarısız oldu.";

      try {
        const errorData = await response.json();
        detail = errorData.detail || detail;
      } catch (err) {
        detail = "İstek başarısız oldu.";
      }

      throw new Error(detail);
    }

    return response.json();
  }

  async function loadDatasetSummary() {
    const summaryData = await fetchJson(`${API_URL}/dataset-summary`);
    setDatasetSummary(summaryData);
  }

  async function loadData() {
    try {
      const unitsData = await fetchJson(`${API_URL}/units`);
      const progressData = await fetchJson(`${API_URL}/progress`);
      const summaryData = await fetchJson(`${API_URL}/dataset-summary`);

      setUnits(unitsData);
      setProgress(progressData);
      setDatasetSummary(summaryData);
      setError("");
    } catch (err) {
      setError("Backend bağlantısı başarısız. Önce backend'i çalıştır.");
    }
  }

  function openGithub() {
    window.open("https://github.com/Sungurulol/elce", "_blank", "noreferrer");
  }

  function getExerciseVariants(exercise) {
    if (!exercise || exercise.type !== "camera") {
      return [];
    }

    if (exercise.acceptedVariants && exercise.acceptedVariants.length > 0) {
      return exercise.acceptedVariants;
    }

    return [
      {
        id: `${exercise.expectedGesture}_v1`,
        title: `${exercise.expectedGesture} - Varyant 1`,
      },
    ];
  }

  function getActiveVariantLabel(exercise) {
    const variants = getExerciseVariants(exercise);

    if (selectedVariantLabel) {
      return selectedVariantLabel;
    }

    if (variants.length > 0) {
      return variants[0].id;
    }

    return `${exercise.expectedGesture}_v1`;
  }

  function getActiveVariantTitle(exercise) {
    const variants = getExerciseVariants(exercise);
    const activeVariantLabel = getActiveVariantLabel(exercise);
    const activeVariant = variants.find((variant) => variant.id === activeVariantLabel);

    if (activeVariant) {
      return activeVariant.title;
    }

    return activeVariantLabel;
  }

  function getBaseGestureLabel(label) {
    if (!label) {
      return "";
    }

    if (label.includes("_v")) {
      return label.split("_v")[0];
    }

    return label;
  }

  function findExpectedScore(scores, expectedGesture) {
    if (!scores || scores.length === 0) {
      return null;
    }

    return scores.find((score) => {
      return getBaseGestureLabel(score.label) === expectedGesture;
    });
  }

  function getContextBonus(rawScore) {
    if (rawScore >= 0.2) {
      return 0.2;
    }

    if (rawScore >= 0.1) {
      return 0.15;
    }

    return 0;
  }

  function validateRecordedFrames(frames, currentExercise) {
    const expectedHands = currentExercise.expectedHands || 1;
    const minLandmarksPerHand = currentExercise.minLandmarksPerHand || 21;

    if (!frames || frames.length === 0) {
      return {
        passed: false,
        message: "Hareket kaydı alınamadı. Tekrar dene.",
        framesWithRequiredHands: 0,
        requiredFrameCount: 0,
      };
    }

    const framesWithRequiredHands = frames.filter((frame) => {
      if ((frame.handCount || 0) < expectedHands) {
        return false;
      }

      const usableHands = (frame.hands || []).filter((hand) => {
        return (hand.landmarkCount || 0) >= minLandmarksPerHand;
      });

      return usableHands.length >= expectedHands;
    }).length;

    const requiredFrameCount = Math.max(5, Math.floor(frames.length * 0.25));

    if (framesWithRequiredHands < requiredFrameCount) {
      return {
        passed: false,
        message: `Hareket yeterince net alınamadı. ${expectedHands} el bekleniyor. El görünen frame: ${framesWithRequiredHands}/${frames.length}`,
        framesWithRequiredHands,
        requiredFrameCount,
      };
    }

    return {
      passed: true,
      message: `Kamera kontrolü başarılı. El görünen frame: ${framesWithRequiredHands}/${frames.length}`,
      framesWithRequiredHands,
      requiredFrameCount,
    };
  }

  function evaluateLessonPrediction(prediction, currentExercise, frameValidation) {
    const expectedGesture = currentExercise.expectedGesture;
    const scores = prediction?.scores || [];
    const expectedScore = findExpectedScore(scores, expectedGesture);

    if (!expectedScore) {
      return {
        mode: "basic",
        passed: frameValidation.passed,
        expectedGesture,
        expectedRawScore: 0,
        contextBonus: 0,
        adjustedScore: 0,
        message: frameValidation.passed
          ? "Bu işaret için AI modeli henüz hazır değil. Temel kamera kontrolü başarılı."
          : frameValidation.message,
      };
    }

    const expectedRawScore = expectedScore.confidence || 0;
    const contextBonus = getContextBonus(expectedRawScore);
    const adjustedScore = expectedRawScore + contextBonus;
    const passed = adjustedScore >= 0.4;

    if (passed) {
      return {
        mode: "ai",
        passed: true,
        expectedGesture,
        expectedRawScore,
        contextBonus,
        adjustedScore,
        message: `Doğru! ${currentExercise.title} başarıyla algılandı.`,
      };
    }

    const topPrediction = scores[0];

    return {
      mode: "ai",
      passed: false,
      expectedGesture,
      expectedRawScore,
      contextBonus,
      adjustedScore,
      message: `Tekrar dene. Model en çok "${topPrediction?.displayLabel || "bilinmeyen"}" hareketine benzetti.`,
    };
  }

  function getCompletedLessonCount(unit) {
    return unit.lessons.filter((lesson) =>
      progress.completedUnitLessons.includes(lesson.id)
    ).length;
  }

  function getUnitTotalXp(unit) {
    return unit.lessons.reduce((total, lesson) => total + (lesson.xp || 0), 0);
  }

  function getUnitRequiredXp(unit) {
    return Math.ceil(getUnitTotalXp(unit) * 0.6);
  }

  function getUnitEarnedXp(unit) {
    return unit.lessons.reduce((total, lesson) => {
      const isCompleted = progress.completedUnitLessons.includes(lesson.id);

      if (!isCompleted) {
        return total;
      }

      return total + (lesson.xp || 0);
    }, 0);
  }

  function getRequiredXpForLevel(level) {
    if (level <= 1) {
      return 0;
    }

    let requiredXp = 0;

    for (let i = 0; i < level - 1; i++) {
      const unit = units[i];

      if (!unit) {
        break;
      }

      requiredXp += getUnitRequiredXp(unit);
    }

    return requiredXp;
  }

  function getUserLevel() {
    if (!units || units.length === 0) {
      return 1;
    }

    let level = 1;

    for (let nextLevel = 2; nextLevel <= units.length; nextLevel++) {
      const requiredXp = getRequiredXpForLevel(nextLevel);

      if (progress.xp >= requiredXp) {
        level = nextLevel;
      }
    }

    return level;
  }

  function getNextLevelInfo() {
    const currentLevel = getUserLevel();
    const nextLevel = currentLevel + 1;

    if (nextLevel > units.length) {
      return {
        hasNextLevel: false,
        currentLevel,
        nextLevel,
        requiredXp: progress.xp,
        remainingXp: 0,
        progressPercent: 100,
      };
    }

    const currentLevelXp = getRequiredXpForLevel(currentLevel);
    const nextLevelXp = getRequiredXpForLevel(nextLevel);
    const levelRange = Math.max(1, nextLevelXp - currentLevelXp);
    const earnedInLevel = Math.max(0, progress.xp - currentLevelXp);

    return {
      hasNextLevel: true,
      currentLevel,
      nextLevel,
      requiredXp: nextLevelXp,
      remainingXp: Math.max(0, nextLevelXp - progress.xp),
      progressPercent: Math.min(100, Math.round((earnedInLevel / levelRange) * 100)),
    };
  }

  function getUnitProgressPercent(unit) {
    const earnedXp = getUnitEarnedXp(unit);
    const totalXp = getUnitTotalXp(unit);

    if (totalXp === 0) {
      return 0;
    }

    return Math.round((earnedXp / totalXp) * 100);
  }

  function isUnitUnlocked(unitIndex) {
    const userLevel = getUserLevel();
    return unitIndex + 1 <= userLevel;
  }

  function getUnitLockMessage(unitIndex) {
    const requiredLevel = unitIndex + 1;
    const requiredXp = getRequiredXpForLevel(requiredLevel);
    const remainingXp = Math.max(0, requiredXp - progress.xp);

    return `Bu ünite Seviye ${requiredLevel} ile açılır. Gerekli XP: ${requiredXp}. Kalan XP: ${remainingXp}.`;
  }

  function getLessonState(unitUnlocked, lesson) {
    const isCompleted = progress.completedUnitLessons.includes(lesson.id);

    if (isCompleted) {
      return "completed";
    }

    if (unitUnlocked) {
      return "open";
    }

    return "locked";
  }

  function getLessonStateText(state) {
    if (state === "completed") {
      return "Tamamlandı";
    }

    if (state === "open") {
      return "Açık";
    }

    return "Kilitli";
  }

  async function setupHandLandmarker() {
    if (handLandmarkerRef.current) {
      return;
    }

    setCameraStatus("El algılama modeli yükleniyor...");

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

    setCameraStatus("El algılama modeli hazır.");
  }

  async function setupFaceLandmarker() {
    if (faceLandmarkerRef.current) {
      return;
    }

    setCameraStatus("Yüz algılama modeli yükleniyor...");

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

    setCameraStatus("Yüz algılama modeli hazır.");
  }

  async function setupPoseLandmarker() {
    if (poseLandmarkerRef.current) {
      return;
    }

    setCameraStatus("Pose algılama modeli yükleniyor...");

    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    poseLandmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numPoses: 1,
    });

    setPoseStatus((prev) => ({
      ...prev,
      ready: true,
    }));

    setCameraStatus("Pose algılama modeli hazır.");
  }

  async function openLesson(lessonId) {
    try {
      const lessonData = await fetchJson(`${API_URL}/lesson-flow/${lessonId}`);

      const filteredLessonData = {
        ...lessonData,
        exercises: lessonData.exercises.filter((exercise) => {
          return exercise.type !== "multiple_choice";
        }),
      };

      setFreePracticeActive(false);
      setActiveHomePanel("dashboard");
      setSelectedLesson(filteredLessonData);
      setExerciseIndex(0);
      setSelectedOption("");
      setSelectedVariantLabel("");
      setFeedback("");
      setCameraStatus("");
      setSequenceStatus("");
      setPracticeStatus("");
      setPracticeResult(null);
      resetGestureCheck();
      resetHandStatus();
      resetFaceStatus();
      resetPoseStatus();
      stopCamera();
    } catch (err) {
      setError("Ders akışı yüklenemedi.");
    }
  }

  function openFreePractice() {
    stopCamera();
    setSelectedLesson(null);
    setFreePracticeActive(true);
    setActiveHomePanel("practice");
    setExerciseIndex(0);
    setSelectedOption("");
    setSelectedVariantLabel("");
    setFeedback("");
    setCameraStatus("");
    setSequenceStatus("");
    setPracticeStatus("");
    setPracticeResult(null);
    resetGestureCheck();
    resetHandStatus();
    resetFaceStatus();
    resetPoseStatus();
  }

  function goHome() {
    stopCamera();
    setSelectedLesson(null);
    setFreePracticeActive(false);
    setActiveHomePanel("dashboard");
    setExerciseIndex(0);
    setSelectedOption("");
    setSelectedVariantLabel("");
    setFeedback("");
    setCameraStatus("");
    setSequenceStatus("");
    setPracticeStatus("");
    setPracticeResult(null);
    resetGestureCheck();
    resetHandStatus();
    resetFaceStatus();
    resetPoseStatus();
  }

  function closeLesson() {
    goHome();
  }

  function closeFreePractice() {
    goHome();
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
    setSelectedVariantLabel("");
    setFeedback("");
    setCameraStatus("");
    setSequenceStatus("");
    setPracticeStatus("");
    setPracticeResult(null);
    resetGestureCheck();
    resetHandStatus();
    resetFaceStatus();
    resetPoseStatus();
  }

  function checkMultipleChoice(option) {
    const currentExercise = selectedLesson.exercises[exerciseIndex];

    setSelectedOption(option);

    if (option === currentExercise.answer) {
      setFeedback("Doğru cevap. Devam edebilirsin.");
    } else {
      setFeedback("Yanlış cevap. Tekrar dene.");
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

  function resetPoseStatus() {
    latestPoseRef.current = null;

    setPoseStatus({
      ready: Boolean(poseLandmarkerRef.current),
      detected: false,
      landmarkCount: 0,
      leftShoulder: false,
      rightShoulder: false,
      leftElbow: false,
      rightElbow: false,
      leftWrist: false,
      rightWrist: false,
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
      await setupPoseLandmarker();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        videoRef.current.onloadeddata = () => {
          setCameraActive(true);
          setCameraStatus("Kamera açıldı. Elini, yüzünü ve üst gövdeni kameraya net göster.");
          setSequenceStatus("");
          setPracticeStatus("");
          setPracticeResult(null);
          resetGestureCheck();
          startDetectionLoop();
        };
      }
    } catch (err) {
      setCameraStatus("Kamera veya algılama modelleri başlatılamadı.");
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

  function posePointToData(point) {
    if (!point) {
      return null;
    }

    return {
      x: point.x,
      y: point.y,
      z: point.z,
      visibility: point.visibility ?? 0,
    };
  }

  function isVisiblePosePoint(point) {
    return Boolean(point && point.visibility >= POSE_VISIBILITY_THRESHOLD);
  }

  function getPoseData(video, nowInMs) {
    let poseData = {
      detected: false,
      landmarkCount: 0,
      upperBody: {
        leftShoulder: null,
        rightShoulder: null,
        leftElbow: null,
        rightElbow: null,
        leftWrist: null,
        rightWrist: null,
      },
    };

    if (!poseLandmarkerRef.current) {
      return poseData;
    }

    const poseResults = poseLandmarkerRef.current.detectForVideo(video, nowInMs);

    if (poseResults.landmarks && poseResults.landmarks.length > 0) {
      const poseLandmarks = poseResults.landmarks[0];

      poseData = {
        detected: true,
        landmarkCount: poseLandmarks.length,
        upperBody: {
          leftShoulder: posePointToData(poseLandmarks[POSE_LANDMARK_INDICES.leftShoulder]),
          rightShoulder: posePointToData(poseLandmarks[POSE_LANDMARK_INDICES.rightShoulder]),
          leftElbow: posePointToData(poseLandmarks[POSE_LANDMARK_INDICES.leftElbow]),
          rightElbow: posePointToData(poseLandmarks[POSE_LANDMARK_INDICES.rightElbow]),
          leftWrist: posePointToData(poseLandmarks[POSE_LANDMARK_INDICES.leftWrist]),
          rightWrist: posePointToData(poseLandmarks[POSE_LANDMARK_INDICES.rightWrist]),
        },
      };
    }

    return poseData;
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
      const poseData = getPoseData(video, nowInMs);

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
      latestPoseRef.current = poseData;

      if (isRecordingSequenceRef.current && sequenceStartTimeRef.current !== null) {
        sequenceFramesRef.current.push({
          timestampMs: Math.round(performance.now() - sequenceStartTimeRef.current),
          handCount,
          hands,
          face: faceData,
          pose: poseData,
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

      setPoseStatus({
        ready: Boolean(poseLandmarkerRef.current),
        detected: poseData.detected,
        landmarkCount: poseData.landmarkCount,
        leftShoulder: isVisiblePosePoint(poseData.upperBody.leftShoulder),
        rightShoulder: isVisiblePosePoint(poseData.upperBody.rightShoulder),
        leftElbow: isVisiblePosePoint(poseData.upperBody.leftElbow),
        rightElbow: isVisiblePosePoint(poseData.upperBody.rightElbow),
        leftWrist: isVisiblePosePoint(poseData.upperBody.leftWrist),
        rightWrist: isVisiblePosePoint(poseData.upperBody.rightWrist),
      });

      animationFrameRef.current = requestAnimationFrame(detectFrame);
    };

    detectFrame();
  }

  async function checkGestureExercise(currentExercise) {
    if (!cameraActive) {
      setFeedback("Önce kamerayı aç.");
      setCameraStatus("Kamera kapalı.");
      return;
    }

    if (isRecordingSequenceRef.current) {
      setFeedback("Kontrol kaydı zaten devam ediyor.");
      return;
    }

    const durationMs = 3000;

    sequenceFramesRef.current = [];
    sequenceStartTimeRef.current = performance.now();
    isRecordingSequenceRef.current = true;

    setIsRecordingSequence(true);
    setFeedback("");
    setGestureCheck({
      checked: false,
      passed: false,
      message: "",
    });
    setCameraStatus("AI kontrolü başladı. Hareketi 3 saniye boyunca yap.");

    setTimeout(async () => {
      isRecordingSequenceRef.current = false;
      setIsRecordingSequence(false);

      const frames = sequenceFramesRef.current;
      const frameValidation = validateRecordedFrames(frames, currentExercise);

      if (!frameValidation.passed) {
        setGestureCheck({
          checked: true,
          passed: false,
          message: frameValidation.message,
          frameValidation,
        });

        setFeedback(frameValidation.message);
        setCameraStatus("Hareket yeterince net alınamadı.");
        return;
      }

      try {
        setCameraStatus("Hareket alındı. Model tahmini yapılıyor...");

        const prediction = await fetchJson(`${API_URL}/predict-gesture`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            durationMs,
            frameCount: frames.length,
            frames,
          }),
        });

        const evaluation = evaluateLessonPrediction(
          prediction,
          currentExercise,
          frameValidation
        );

        setGestureCheck({
          checked: true,
          passed: evaluation.passed,
          message: evaluation.message,
          prediction,
          evaluation,
          frameValidation,
        });

        if (evaluation.passed) {
          setFeedback("Doğru! Dersi bitirebilirsin.");
          setCameraStatus("AI kontrolü başarılı.");
        } else {
          setFeedback(evaluation.message);
          setCameraStatus("AI kontrolü başarısız. Tekrar dene.");
        }
      } catch (err) {
        setGestureCheck({
          checked: true,
          passed: false,
          message: `Model tahmini alınamadı: ${err.message}`,
          frameValidation,
        });

        setFeedback(`Model tahmini alınamadı: ${err.message}`);
        setCameraStatus("AI kontrolü sırasında hata oluştu.");
      }
    }, durationMs);
  }

  async function saveGestureSequence(currentExercise) {
    if (!cameraActive) {
      setSequenceStatus("Önce kamerayı aç.");
      return;
    }

    if (isRecordingSequenceRef.current) {
      setSequenceStatus("Sequence kaydı zaten devam ediyor.");
      return;
    }

    const durationMs = 3000;

    sequenceFramesRef.current = [];
    sequenceStartTimeRef.current = performance.now();
    isRecordingSequenceRef.current = true;

    setIsRecordingSequence(true);
    setSequenceStatus("3 saniyelik sequence kaydı başladı. Hareketi yap.");

    setTimeout(async () => {
      isRecordingSequenceRef.current = false;
      setIsRecordingSequence(false);

      const frames = sequenceFramesRef.current;

      if (frames.length === 0) {
        setSequenceStatus("Sequence kaydedilemedi. Frame bulunamadı.");
        return;
      }

      try {
        const variantLabel = getActiveVariantLabel(currentExercise);
        const variantTitle = getActiveVariantTitle(currentExercise);

        const payload = {
          label: currentExercise.expectedGesture,
          variantLabel,
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

        await loadDatasetSummary();

        setSequenceStatus(
          `${variantTitle} için 3 sn sequence kaydedildi. Frame: ${frames.length}. Toplam sequence: ${result.count}`
        );
      } catch (err) {
        setSequenceStatus("Sequence kaydedilemedi. Backend endpointini kontrol et.");
      }
    }, durationMs);
  }

  async function analyzeFreePracticeMovement() {
    if (!cameraActive) {
      setPracticeStatus("Önce kamerayı aç.");
      return;
    }

    if (isRecordingSequenceRef.current) {
      setPracticeStatus("Analiz kaydı zaten devam ediyor.");
      return;
    }

    const durationMs = 3000;

    sequenceFramesRef.current = [];
    sequenceStartTimeRef.current = performance.now();
    isRecordingSequenceRef.current = true;

    setIsRecordingSequence(true);
    setPracticeResult(null);
    setPracticeStatus("3 saniyelik serbest hareket alınıyor. Hareketi yap.");

    setTimeout(async () => {
      isRecordingSequenceRef.current = false;
      setIsRecordingSequence(false);

      const frames = sequenceFramesRef.current;

      if (frames.length === 0) {
        setPracticeStatus("Hareket alınamadı. Frame bulunamadı.");
        setPracticeResult(null);
        return;
      }

      const framesWithHands = frames.filter((frame) => frame.handCount > 0).length;
      const framesWithFace = frames.filter((frame) => frame.face?.detected).length;
      const framesWithPose = frames.filter((frame) => frame.pose?.detected).length;

      const maxHandCount = frames.reduce((maxValue, frame) => {
        return Math.max(maxValue, frame.handCount || 0);
      }, 0);

      const hasVisibleUpperBody = frames.some((frame) => {
        const upperBody = frame.pose?.upperBody;

        if (!upperBody) {
          return false;
        }

        return Boolean(
          isVisiblePosePoint(upperBody.leftShoulder) ||
            isVisiblePosePoint(upperBody.rightShoulder) ||
            isVisiblePosePoint(upperBody.leftElbow) ||
            isVisiblePosePoint(upperBody.rightElbow) ||
            isVisiblePosePoint(upperBody.leftWrist) ||
            isVisiblePosePoint(upperBody.rightWrist)
        );
      });

      setPracticeStatus("Hareket alındı. Model tahmini isteniyor...");

      try {
        const prediction = await fetchJson(`${API_URL}/predict-gesture`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            durationMs,
            frameCount: frames.length,
            frames,
          }),
        });

        setPracticeResult({
          frameCount: frames.length,
          durationMs,
          framesWithHands,
          framesWithFace,
          framesWithPose,
          maxHandCount,
          hasVisibleUpperBody,
          modelConnected: true,
          prediction,
        });

        setPracticeStatus(
          `Tahmin tamamlandı: ${prediction.displayLabel} (${Math.round(
            prediction.confidence * 100
          )}%)`
        );
      } catch (err) {
        setPracticeResult({
          frameCount: frames.length,
          durationMs,
          framesWithHands,
          framesWithFace,
          framesWithPose,
          maxHandCount,
          hasVisibleUpperBody,
          modelConnected: false,
          predictionError: err.message,
        });

        setPracticeStatus(`Model tahmini alınamadı: ${err.message}`);
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
      setFeedback("Ders tamamlandı. XP kazandın.");

      setTimeout(() => {
        goHome();
      }, 700);
    } catch (err) {
      setError("Ders tamamlama isteği başarısız oldu.");
    }
  }

  useEffect(() => {
    loadData();

    return () => {
      stopCamera();
    };
  }, []);

  function renderSidebar() {
    return (
      <aside className="app-sidebar">
        <div className="brand-block brand-image-block" onClick={goHome}>
          <img src="/elce-logo.png" alt="Elce" className="sidebar-logo-image" />
        </div>

        <nav className="sidebar-nav">
          <button
            className={!selectedLesson && !freePracticeActive && activeHomePanel === "dashboard" ? "active" : ""}
            onClick={goHome}
          >
            <span>⌂</span>
            Ana Sayfa
          </button>

          <button
            className={activeHomePanel === "path" ? "active" : ""}
            onClick={() => {
              stopCamera();
              setActiveHomePanel("path");
              setSelectedLesson(null);
              setFreePracticeActive(false);
            }}
          >
            <span>●</span>
            Ünite Yolu
          </button>

          <button
            className={freePracticeActive ? "active" : ""}
            onClick={openFreePractice}
          >
            <span>◉</span>
            Serbest Pratik
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="mode-switch-card">
            <span>Mod</span>
            <button
              className={developerMode ? "developer-on" : ""}
              onClick={() => setDeveloperMode(!developerMode)}
            >
              {developerMode ? "Developer" : "User"}
            </button>
          </div>

          <button className="github-button" onClick={openGithub}>
            GitHub
          </button>
        </div>
      </aside>
    );
  }

  function renderAiStatusPanel() {
    if (!developerMode) {
      return null;
    }

    return (
      <div className="ai-status-box">
        <p className="eyebrow">Developer AI Durumu</p>

        <h3>
          {handStatus.detected
            ? "El algılandı. Hareket analizi için hazır."
            : "El bekleniyor."}
        </h3>

        <div className="hand-debug-grid">
          <div>
            <span>El Modeli</span>
            <strong>{handStatus.ready ? "Hazır" : "Yüklenmedi"}</strong>
          </div>

          <div>
            <span>El</span>
            <strong>{handStatus.detected ? "Var" : "Yok"}</strong>
          </div>

          <div>
            <span>El sayısı</span>
            <strong>{handStatus.handCount}</strong>
          </div>
        </div>

        <div className="face-debug-grid">
          <div>
            <span>Yüz Modeli</span>
            <strong>{faceStatus.ready ? "Hazır" : "Yüklenmedi"}</strong>
          </div>

          <div>
            <span>Yüz</span>
            <strong>{faceStatus.detected ? "Var" : "Yok"}</strong>
          </div>

          <div>
            <span>Yüz Landmark</span>
            <strong>{faceStatus.landmarkCount}</strong>
          </div>

          <div>
            <span>Ağız Noktası</span>
            <strong>{faceStatus.mouthLandmarkCount}</strong>
          </div>

          <div>
            <span>Mimik Verisi</span>
            <strong>{faceStatus.blendshapes.length}</strong>
          </div>
        </div>

        <div className="pose-debug-grid">
          <div>
            <span>Pose Modeli</span>
            <strong>{poseStatus.ready ? "Hazır" : "Yüklenmedi"}</strong>
          </div>

          <div>
            <span>Pose</span>
            <strong>{poseStatus.detected ? "Var" : "Yok"}</strong>
          </div>

          <div>
            <span>Sol Omuz</span>
            <strong>{poseStatus.leftShoulder ? "Var" : "Yok"}</strong>
          </div>

          <div>
            <span>Sağ Omuz</span>
            <strong>{poseStatus.rightShoulder ? "Var" : "Yok"}</strong>
          </div>

          <div>
            <span>Sol Dirsek</span>
            <strong>{poseStatus.leftElbow ? "Var" : "Yok"}</strong>
          </div>

          <div>
            <span>Sağ Dirsek</span>
            <strong>{poseStatus.rightElbow ? "Var" : "Yok"}</strong>
          </div>

          <div>
            <span>Sol Bilek</span>
            <strong>{poseStatus.leftWrist ? "Var" : "Yok"}</strong>
          </div>

          <div>
            <span>Sağ Bilek</span>
            <strong>{poseStatus.rightWrist ? "Var" : "Yok"}</strong>
          </div>
        </div>
      </div>
    );
  }

  function renderProfileCard() {
    const levelInfo = getNextLevelInfo();

    return (
      <section className="profile-stats-card">
        <div className="profile-header">
          <div className="profile-avatar">E</div>

          <div>
            <p className="eyebrow">Profil</p>
            <h2>Öğrenci Profili</h2>
          </div>
        </div>

        <div className="profile-level-box">
          <span>Seviye</span>
          <strong>{getUserLevel()}</strong>
          <small>
            {levelInfo.hasNextLevel
              ? `Seviye ${levelInfo.nextLevel} için ${levelInfo.remainingXp} XP kaldı`
              : "Maksimum seviyedesin"}
          </small>
        </div>

        <div className="profile-level-track">
          <div
            className="profile-level-track-fill"
            style={{ width: `${levelInfo.progressPercent}%` }}
          />
        </div>

        <div className="profile-stat-grid">
          <div>
            <span>XP</span>
            <strong>{progress.xp}</strong>
          </div>

          <div>
            <span>Streak</span>
            <strong>{progress.streak}</strong>
          </div>

          <div>
            <span>Rozet</span>
            <strong>{progress.badges.length}</strong>
          </div>
        </div>
      </section>
    );
  }

  function renderLearningPath() {
    return (
      <section className="learning-path-card">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Ders Yolu</p>
            <h2>Ünite Yolu</h2>
          </div>

          <span className="section-chip">Seviye {getUserLevel()}</span>
        </div>

        <p className="path-description">
          XP kazanarak seviye atla. Seviye 2, Ünite 2'yi; Seviye 3, Ünite 3'ü açar.
        </p>

        <div className="learning-path">
          {units.map((unit, unitIndex) => {
            const unitUnlocked = isUnitUnlocked(unitIndex);
            const progressPercent = getUnitProgressPercent(unit);

            return (
              <article
                className={
                  unitUnlocked
                    ? "path-unit-card"
                    : "path-unit-card locked-unit-card"
                }
                key={unit.id}
              >
                <div className="path-unit-header">
                  <div>
                    <p className="eyebrow">Ünite {unit.id}</p>
                    <h3>{unit.title}</h3>
                    <p>{unit.description}</p>
                  </div>

                  <div className="unit-progress-summary">
                    <strong>{progressPercent}%</strong>
                    <span>
                      {getUnitEarnedXp(unit)}/{getUnitTotalXp(unit)} XP
                    </span>
                  </div>
                </div>

                <div className="unit-progress-track">
                  <div
                    className="unit-progress-track-fill"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <div className="unit-unlock-rule">
                  {unitUnlocked ? (
                    <span>Bu ünite açık. Derslerden istediğini seçebilirsin.</span>
                  ) : (
                    <span>{getUnitLockMessage(unitIndex)}</span>
                  )}
                </div>

                <div className="duo-path">
                  {unit.lessons.map((lesson, lessonIndex) => {
                    const lessonState = getLessonState(unitUnlocked, lesson);
                    const isDisabled = lessonState === "locked";
                    const isLeft = lessonIndex % 2 === 0;

                    return (
                      <div
                        className={
                          isLeft
                            ? "duo-path-row duo-path-row-left"
                            : "duo-path-row duo-path-row-right"
                        }
                        key={lesson.id}
                      >
                        <button
                          className={`duo-lesson-node ${lessonState}`}
                          onClick={() => openLesson(lesson.id)}
                          disabled={isDisabled}
                        >
                          <span className="duo-node-icon">
                            {lessonState === "completed"
                              ? "✓"
                              : lessonState === "open"
                                ? "☂"
                                : "🔒"}
                          </span>
                        </button>

                        <div className="duo-lesson-info">
                          <strong>{lesson.title}</strong>
                          <span>{getLessonStateText(lessonState)}</span>
                          <small>{lesson.xp} XP</small>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <div className="app-shell">
        {renderSidebar()}

        <main className="app-main">
          <section className="error-card">
            <h1>Bağlantı hatası</h1>
            <p>{error}</p>
            <code>python -m uvicorn backend.main:app --reload</code>
          </section>
        </main>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="app-shell">
        <aside className="app-sidebar">
          <div className="brand-block">
            <div className="brand-logo">E</div>
            <div>
              <strong>Elce</strong>
              <span>Yükleniyor</span>
            </div>
          </div>
        </aside>

        <main className="app-main">
          <section className="loading-card">
            <h1>Elce yükleniyor...</h1>
          </section>
        </main>
      </div>
    );
  }

  if (freePracticeActive) {
    const prediction = practiceResult?.prediction;

    return (
      <div className="app-shell">
        {renderSidebar()}

        <main className="app-main">
          <section className="practice-layout">
            <div className="camera-phone-frame">
              <video ref={videoRef} autoPlay playsInline muted />

              {!cameraActive && (
                <div className="camera-overlay">
                  Kamera görüntüsü burada görünecek.
                </div>
              )}
            </div>

            <aside className="study-side-panel">
              <button className="ghost-button" onClick={closeFreePractice}>
                Geri
              </button>

              <p className="eyebrow">Serbest AI Pratik</p>
              <h1>Hareketi kamerada yap</h1>
              <p>
                Sistem 3 saniyelik hareketi alır ve eğitilen model ile tahmin eder.
              </p>

              <div className="study-actions">
                <button onClick={startCamera}>Kamerayı Aç</button>
                <button className="secondary-button" onClick={stopCamera}>
                  Kamerayı Kapat
                </button>
                <button
                  className="sequence-button"
                  onClick={analyzeFreePracticeMovement}
                  disabled={isRecordingSequence}
                >
                  {isRecordingSequence ? "Analiz ediliyor..." : "3 sn Tahmin Et"}
                </button>
              </div>

              {cameraStatus && <strong className="feedback">{cameraStatus}</strong>}
              {practiceStatus && <strong className="sequence-feedback">{practiceStatus}</strong>}

              {practiceResult && (
                <div className="practice-result-card">
                  <p className="eyebrow">AI Tahmin Sonucu</p>

                  {prediction ? (
                    <>
                      <div className="prediction-hero">
                        <span>Tahmin</span>
                        <strong>{prediction.displayLabel}</strong>
                        <small>Model etiketi: {prediction.prediction}</small>
                      </div>

                      <div className="confidence-bar">
                        <div
                          className="confidence-bar-fill"
                          style={{ width: `${Math.round(prediction.confidence * 100)}%` }}
                        />
                      </div>

                      <p>
                        Güven: <strong>{Math.round(prediction.confidence * 100)}%</strong>
                      </p>
                    </>
                  ) : (
                    <>
                      <h2>Model tahmini alınamadı</h2>
                      <p>{practiceResult.predictionError || "Bilinmeyen hata"}</p>
                    </>
                  )}

                  {prediction?.scores && prediction.scores.length > 0 && (
                    <div className="score-list">
                      <p className="eyebrow">Diğer ihtimaller</p>

                      {prediction.scores.slice(0, 6).map((score) => (
                        <div className="score-row" key={score.label}>
                          <span>{score.displayLabel}</span>
                          <strong>{Math.round(score.confidence * 100)}%</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {renderAiStatusPanel()}
            </aside>
          </section>
        </main>
      </div>
    );
  }

  if (selectedLesson) {
    const currentExercise = selectedLesson.exercises[exerciseIndex];
    const totalExercises = selectedLesson.exercises.length;
    const progressPercent = ((exerciseIndex + 1) / totalExercises) * 100;
    const variants = getExerciseVariants(currentExercise);
    const activeVariantLabel = getActiveVariantLabel(currentExercise);

    if (currentExercise.type === "camera") {
      return (
        <div className="app-shell">
          {renderSidebar()}

          <main className="app-main">
            <section className="practice-layout">
              <div className="camera-phone-frame">
                <video ref={videoRef} autoPlay playsInline muted />

                {!cameraActive && (
                  <div className="camera-overlay">
                    Kamera görüntüsü burada görünecek.
                  </div>
                )}
              </div>

              <aside className="study-side-panel">
                <button className="ghost-button" onClick={closeLesson}>
                  Çık
                </button>

                <div className="lesson-progress compact">
                  <div
                    className="lesson-progress-fill"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <span className="step-label">
                  {exerciseIndex + 1}/{totalExercises}
                </span>

                <p className="eyebrow">{selectedLesson.title}</p>
                <h1>{currentExercise.title}</h1>
                <p>{currentExercise.prompt}</p>

                <div className="question-card">
                  <span>Beklenen hareket</span>
                  <strong>{currentExercise.expectedGesture}</strong>
                  <small>Kamera karşısında bu işareti yap.</small>
                </div>

                {developerMode && (
                  <div className="variant-select-box">
                    <label htmlFor="variant-select">Kaydedilecek varyant</label>
                    <select
                      id="variant-select"
                      value={activeVariantLabel}
                      onChange={(event) => setSelectedVariantLabel(event.target.value)}
                      disabled={isRecordingSequence}
                    >
                      {variants.map((variant) => (
                        <option key={variant.id} value={variant.id}>
                          {variant.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="study-actions">
                  <button onClick={startCamera}>Kamerayı Aç</button>

                  <button className="secondary-button" onClick={stopCamera}>
                    Kamerayı Kapat
                  </button>

                  <button
                    className="success-button"
                    onClick={() => checkGestureExercise(currentExercise)}
                    disabled={isRecordingSequence}
                  >
                    {isRecordingSequence ? "AI kontrol ediyor..." : "AI ile Kontrol Et"}
                  </button>

                  {developerMode && (
                    <button
                      className="sequence-button"
                      onClick={() => saveGestureSequence(currentExercise)}
                      disabled={isRecordingSequence}
                    >
                      {isRecordingSequence ? "Kaydediliyor..." : "3 sn Sequence Kaydet"}
                    </button>
                  )}
                </div>

                {cameraStatus && <strong className="feedback">{cameraStatus}</strong>}
                {feedback && <strong className="feedback">{feedback}</strong>}
                {sequenceStatus && <strong className="sequence-feedback">{sequenceStatus}</strong>}

                {gestureCheck.checked && (
                  <div
                    className={
                      gestureCheck.passed
                        ? "gesture-check-result success"
                        : "gesture-check-result failed"
                    }
                  >
                    <strong>{gestureCheck.message}</strong>

                    {gestureCheck.evaluation && (
                      <div className="lesson-ai-result">
                        <div>
                          <span>Mod</span>
                          <strong>
                            {gestureCheck.evaluation.mode === "ai"
                              ? "AI"
                              : "Temel"}
                          </strong>
                        </div>

                        <div>
                          <span>Ham</span>
                          <strong>
                            {Math.round(gestureCheck.evaluation.expectedRawScore * 100)}%
                          </strong>
                        </div>

                        <div>
                          <span>Bonus</span>
                          <strong>
                            +{Math.round(gestureCheck.evaluation.contextBonus * 100)}%
                          </strong>
                        </div>

                        <div>
                          <span>Final</span>
                          <strong>
                            {Math.round(gestureCheck.evaluation.adjustedScore * 100)}%
                          </strong>
                        </div>
                      </div>
                    )}

                    {developerMode && gestureCheck.prediction?.scores && (
                      <div className="lesson-score-list">
                        {gestureCheck.prediction.scores.slice(0, 5).map((score) => (
                          <div className="lesson-score-row" key={score.label}>
                            <span>{score.displayLabel}</span>
                            <strong>{Math.round(score.confidence * 100)}%</strong>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <button onClick={goNextExercise} disabled={!gestureCheck.passed}>
                  Dersi Bitir
                </button>

                {renderAiStatusPanel()}
              </aside>
            </section>
          </main>
        </div>
      );
    }

    return (
      <div className="app-shell">
        {renderSidebar()}

        <main className="app-main">
          <section className="lesson-learn-layout">
            <button className="ghost-button" onClick={closeLesson}>
              Çık
            </button>

            <div className="lesson-progress compact">
              <div
                className="lesson-progress-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <span className="step-label">
              {exerciseIndex + 1}/{totalExercises}
            </span>

            <p className="eyebrow">{selectedLesson.title}</p>
            <h1>{currentExercise.title}</h1>

            <div className="learn-content-panel">
              <h2>{currentExercise.prompt}</h2>
              <p>{currentExercise.content}</p>
            </div>

            <button onClick={goNextExercise}>Devam</button>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {renderSidebar()}

      <main className="app-main">
        {activeHomePanel === "path" ? (
          <section className="path-page-layout">
            <div className="path-page-main">
              {renderLearningPath()}
            </div>

            <aside className="path-mascot-panel">
              <img
                src="/elce-mascot.png"
                alt="Elce maskotu"
                className="path-mascot-image"
              />
            </aside>
          </section>
        ) : (
          <section className="home-dashboard">
            <div className="home-hero-panel">
              <div>
                <p className="eyebrow">Elce MVP</p>
                <h1>Türk İşaret Dili öğrenme yolun</h1>
                <p>
                  Üniteleri tamamla, XP kazan, seviye atla ve kamera destekli
                  pratiklerle işaretleri çalış.
                </p>

                <div className="home-action-row">
                  <button
                    onClick={() => {
                      setActiveHomePanel("path");
                      setSelectedLesson(null);
                      setFreePracticeActive(false);
                    }}
                  >
                    Ünite Yoluna Git
                  </button>

                  <button className="secondary-button" onClick={openFreePractice}>
                    Serbest Pratik
                  </button>
                </div>
              </div>
            </div>

            <div className="home-info-grid">
              <section className="home-info-card">
                <p className="eyebrow">Seviye</p>
                <h2>Seviye {getUserLevel()}</h2>
                <p>
                  Yeni üniteler XP kazanarak açılır. Seviye 2, Ünite 2'yi;
                  Seviye 3, Ünite 3'ü açar.
                </p>
              </section>

              <section className="home-info-card">
                <p className="eyebrow">XP</p>
                <h2>{progress.xp} XP</h2>
                <p>
                  Dersleri bitirdikçe XP kazanırsın. XP, ünite ilerlemesini ve
                  seviye kilitlerini belirler.
                </p>
              </section>

              <section className="home-info-card">
                <p className="eyebrow">Pratik</p>
                <h2>AI Kamera</h2>
                <p>
                  Kamera egzersizlerinde işareti yaparsın, model hareketini
                  analiz eder ve sonucu gösterir.
                </p>
              </section>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;