# 🖐️ Elce

<p align="center">
  <img src="frontend/public/elce-logo.png" alt="Elce Logo" width="260" />
</p>

<p align="center">
  <b>Türk İşaret Dili öğrenimini yapay zekâ destekli, erişilebilir ve etkileşimli hale getiren web tabanlı eğitim platformu.</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-Frontend-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Vite-Development-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-Backend-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/Python-AI%20Model-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/MediaPipe-Vision-FF6F00?style=for-the-badge" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" />
</p>

---

## 📌 Proje Hakkında

**Elce**, Türk İşaret Dili öğrenmek isteyen kullanıcılar için geliştirilmiş yapay zekâ destekli bir eğitim platformudur.

Platform; kamera üzerinden kullanıcının el, yüz, ağız ve üst vücut hareketlerini analiz ederek işaret dili hareketlerini tanımaya çalışır. Kullanıcılar, ünite ve ders yapısı üzerinden ilerleyerek işaretleri önce öğrenir, ardından kamera destekli pratik ekranında hareketi uygulayarak geri bildirim alır.

Elce; işitme engelli bireylerle iletişimi güçlendirmek, Türk İşaret Dili öğrenimini daha erişilebilir hale getirmek ve etkileşimli bir öğrenme deneyimi sunmak amacıyla geliştirilmiştir.

---

## 🎯 Projenin Amacı

Elce’nin temel amacı, Türk İşaret Dili öğrenimini yalnızca metin veya görsel anlatımla sınırlı bırakmadan kamera destekli, yapay zekâ tabanlı ve geri bildirim odaklı bir deneyime dönüştürmektir.

Proje şu hedeflere odaklanır:

- Türk İşaret Dili öğrenimini daha erişilebilir hale getirmek
- Kullanıcının hareketlerini kamera üzerinden analiz etmek
- El, yüz, ağız ve poz verilerini birlikte değerlendirmek
- Ders ve ünite sistemiyle düzenli öğrenme akışı sunmak
- Yapay zekâ destekli hareket tahmini yapmak
- Engelli bireylerle iletişim kurmak isteyen kişilere destek olmak
- Modern, sade ve kullanıcı dostu bir eğitim arayüzü sağlamak

---

## 🚀 Özellikler

- 🧠 Yapay zekâ destekli hareket tahmini
- 📷 Kamera üzerinden canlı hareket algılama
- ✋ El landmark takibi
- 😀 Yüz, ağız ve mimik verisi analizi
- 🧍 Omuz, dirsek ve bilek gibi poz noktalarının takibi
- 🎞️ Video benzeri sıralı hareket verisi işleme
- 📚 Ünite ve ders tabanlı öğrenme sistemi
- 📈 XP, seviye ve ilerleme sistemi
- 🔒 Seviyeye göre açılan ünite yapısı
- 🧪 Developer/User mode ayrımı
- 🎭 Maskot destekli görsel anlatım
- 🎯 Kamera egzersizlerinde doğru/yanlış geri bildirimi
- 💻 Modern web arayüzü

---

## 🧩 Proje Yapısı

```bash
Elce/
│
├── backend/
│   ├── data/
│   │   ├── gesture_sequences.json
│   │   ├── normalized_sequences.json
│   │   ├── units.json
│   │   └── user_progress.json
│   │
│   ├── models/
│   │   ├── gesture_model.pkl
│   │   ├── label_map.json
│   │   └── training_report.json
│   │
│   ├── main.py
│   └── train_model.py
│
├── docs/
│
├── frontend/
│   ├── public/
│   │   ├── elce-logo.png
│   │   ├── elce-mascot.png
│   │   ├── favicon.svg
│   │   ├── icons.svg
│   │   └── gestures/
│   │       ├── merhaba.png
│   │       ├── tesekkurler.png
│   │       ├── evet.png
│   │       ├── hayir.png
│   │       └── lutfen.png
│   │
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
│   │
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.js
│
├── .gitattributes
├── .gitignore
├── README.md
└── requirements.txt