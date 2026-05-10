# 🖐️ Elce

<p align="center">
  <img src="./frontend/public/elce-logo.png" alt="Elce Logo" width="260" />
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
```

---

## 🛠️ Kullanılan Teknolojiler

### Frontend

| Teknoloji | Açıklama |
|---|---|
| React | Kullanıcı arayüzü geliştirme |
| Vite | Hızlı geliştirme ortamı |
| JavaScript | Uygulama mantığı |
| CSS | Arayüz tasarımı |
| MediaPipe Tasks Vision | El, yüz ve poz takibi |

### Backend

| Teknoloji | Açıklama |
|---|---|
| Python | Backend ve model işlemleri |
| FastAPI | API geliştirme |
| scikit-learn | Hareket sınıflandırma modeli |
| NumPy | Sayısal veri işleme |
| JSON | Ders, kullanıcı ve hareket verisi saklama |
| Pickle | Eğitilmiş model dosyasını saklama |

---

## ⚙️ Kurulum ve Çalıştırma

Bu projede **backend** ve **frontend** ayrı terminal pencerelerinde çalıştırılır.

### 1. Projeyi Klonlayın

```bash
git clone https://github.com/Sungurulol/elce.git
cd elce
```

---

## 🖥️ Backend Kurulumu

Proje ana dizinindeyken sanal ortam oluşturun:

```bash
python -m venv .venv
```

Sanal ortamı aktif edin:

```bash
source .venv/bin/activate
```

Gerekli Python paketlerini yükleyin:

```bash
pip install -r requirements.txt
```

Backend sunucusunu başlatın:

```bash
python -m uvicorn backend.main:app --reload
```

Backend şu adreste çalışır:

```txt
http://127.0.0.1:8000
```

API dokümantasyonu:

```txt
http://127.0.0.1:8000/docs
```

Backend’in çalıştığını kontrol etmek için:

```txt
http://127.0.0.1:8000/units
```

---

## 🌐 Frontend Kurulumu

Yeni bir terminal açın ve frontend klasörüne girin:

```bash
cd frontend
```

Gerekli paketleri yükleyin:

```bash
npm install
```

Frontend geliştirme sunucusunu başlatın:

```bash
npm run dev
```

Frontend şu adreste çalışır:

```txt
http://localhost:5173
```

---

## ▶️ Projeyi Çalıştırma Özeti

### Terminal 1 - Backend

```bash
cd ~/Desktop/Elce
source .venv/bin/activate
python -m uvicorn backend.main:app --reload
```

### Terminal 2 - Frontend

```bash
cd ~/Desktop/Elce/frontend
npm run dev
```

### Tarayıcı

```txt
http://localhost:5173
```

---

## 🧪 Kullanım Adımları

1. Backend sunucusunu başlatın.
2. Frontend geliştirme sunucusunu başlatın.
3. Tarayıcıdan `http://localhost:5173` adresine gidin.
4. Kamera iznini verin.
5. Sol menüden **Ünite Yolu** ekranına girin.
6. Bir ders seçin.
7. İşaretin anlatımını inceleyin.
8. Kamera ekranında istenen işareti yapın.
9. **AI ile Kontrol Et** butonuna basın.
10. Sistemden tahmin ve geri bildirim alın.
11. Dersi tamamlayarak XP kazanın.
12. XP kazandıkça yeni seviyelerin ve ünitelerin kilidini açın.

---

## 🧠 Yapay Zekâ ve Hareket Algılama

Elce, kullanıcının kamera karşısında yaptığı hareketi 3 saniyelik sıralı veri olarak toplar. Bu veri, tek bir kare yerine hareketin zaman içindeki akışını temsil eder.

Sistem hareketleri değerlendirirken şu bilgileri kullanır:

- El landmark noktaları
- Sağ/sol el bilgisi
- Yüz landmark verileri
- Ağız ve mimik verileri
- Omuz, dirsek ve bilek poz noktaları
- Hareketin zaman içindeki değişimi
- Normalize edilmiş sabit uzunluklu frame dizileri

Bu yapı sayesinde sistem, işaretleri yalnızca statik pozlar olarak değil, hareket dizisi olarak değerlendirmeyi hedefler.

---

## 📚 Ders ve Ünite Sistemi

Elce, kullanıcıya oyunlaştırılmış bir öğrenme yolu sunar.

Kullanıcı:

- Ünite yolundan ders seçebilir
- Her derste önce işareti öğrenir
- Maskot destekli görsel anlatımları inceleyebilir
- Kamera karşısında hareketi uygular
- AI kontrolü ile geri bildirim alır
- Ders tamamladıkça XP kazanır
- XP kazandıkça seviye atlar
- Yeni ünitelerin kilidini açar

Mevcut ünite yapısı:

```txt
1. Ünite: Temeller
   - Merhaba
   - Teşekkürler
   - Evet
   - Hayır
   - Lütfen

2. Ünite: Ailem
   - Aile
   - Anne
   - Baba
   - Kardeş
   - Bebek

3. Ünite: Ekstralar
   - Yardım
   - Hastane
```

---

## 📈 XP ve Seviye Sistemi

Elce’de ilerleme XP ve seviye sistemiyle takip edilir.

- **Seviye 1:** Başlangıç seviyesi
- **Seviye 2:** Ünite 2 kilidini açar
- **Seviye 3:** Ünite 3 kilidini açar

Sistem, önceki ünitelerde belirli oranda XP kazanılmasını bekler. Böylece kullanıcı tüm içerikleri rastgele geçmek yerine kademeli şekilde ilerler.

---

## 🧪 Developer/User Mode

Elce’de iki farklı kullanım modu bulunur.

### User Mode

Normal kullanıcı deneyimi için sadeleştirilmiş arayüzdür.

- Kamera pratiği
- AI kontrol sonucu
- Ders tamamlama
- XP ve seviye takibi

### Developer Mode

Test ve hata analizi için teknik detayları gösterir.

- Model tahmin skorları
- Ham skor ve context bonus bilgisi
- Algılanan el sayısı
- Yüz, ağız ve poz takip durumu
- Sequence kayıt butonu
- Teknik debug alanları

Bu ayrım sayesinde uygulama kullanıcı tarafında sade kalırken, geliştirici tarafında test ve iyileştirme yapılabilir.

---

## 🎭 Maskot ve Görsel Anlatım

Projede Elce maskotu, öğrenme deneyimini daha anlaşılır ve ilgi çekici hale getirmek için kullanılır.

Maskot sistemi:

- Ana ekranda uygulama kimliğini güçlendirir
- Ünite yolunda görsel destek sağlar
- İlk ünitedeki temel işaretlerin nasıl yapılacağını görselleştirir
- Öğrenme ekranlarını daha anlaşılır hale getirir

İlk ünitede kullanılan görsel anlatım dosyaları:

```txt
frontend/public/gestures/merhaba.png
frontend/public/gestures/tesekkurler.png
frontend/public/gestures/evet.png
frontend/public/gestures/hayir.png
frontend/public/gestures/lutfen.png
```

---

## 📊 Veri Seti Yapısı

Projede hareket verileri video benzeri sıralı veri mantığıyla saklanır.

Her hareket örneği şu bilgileri içerebilir:

- Hareket etiketi
- Varyant etiketi
- Ders ID bilgisi
- Beklenen el sayısı
- Süre bilgisi
- Frame sayısı
- El landmark verileri
- Yüz ve ağız verileri
- Poz noktaları
- Normalize edilmiş özellik vektörleri

Örnek veri mantığı:

```json
{
  "label": "merhaba",
  "variantLabel": "merhaba_v1",
  "lessonId": 101,
  "expectedHands": 1,
  "targetFrameCount": 60
}
```

Model eğitimi için normalize edilmiş hareket dizileri kullanılır. Bu sayede farklı uzunluktaki kayıtlar sabit frame sayısına getirilerek model tarafından işlenebilir hale gelir.

---

## 🔁 Model Eğitimi

Hareket verileri güncellendikten sonra model yeniden eğitilebilir.

```bash
source .venv/bin/activate
python backend/train_model.py
```

Eğitim sonrası oluşan dosyalar:

```txt
backend/models/gesture_model.pkl
backend/models/label_map.json
backend/models/training_report.json
```

---

## 🧰 Geliştirici Komutları

Dataset özetini görmek için:

```txt
http://127.0.0.1:8000/dataset-summary
```

Normalize işlemi için:

```txt
http://127.0.0.1:8000/docs
```

Ardından Swagger üzerinden:

```txt
POST /normalize-sequences
```

Git durumunu kontrol etmek için:

```bash
git status
```

Değişiklikleri commit etmek için:

```bash
git add .
git commit -m "Update project"
git push
```

---

## 📈 Projenin Engelli Bireylerin Hayatına Katkısı

Elce, işitme engelli bireylerle iletişimi güçlendirmeyi hedefleyen bir eğitim aracıdır.

Projenin sağlayabileceği katkılar:

- Türk İşaret Dili öğrenimini yaygınlaştırmak
- İşitme engelli bireylerle temel iletişimi artırmak
- Günlük ifadelerin daha kolay öğrenilmesini sağlamak
- Görsel ve uygulamalı eğitim deneyimi sunmak
- Eğitimde erişilebilirlik ve kapsayıcılığı desteklemek
- Toplumsal farkındalık oluşturmak

---

## 🧭 Gelecek Geliştirmeler

Projenin ilerleyen aşamalarında şu geliştirmeler hedeflenmektedir:

- Daha büyük ve çeşitli Türk İşaret Dili veri seti
- Daha fazla ünite ve hareket
- Daha hassas AI doğrulama sistemi
- Kullanıcı seviyesine göre dinamik ders zorluğu
- Daha gelişmiş rozet ve başarı sistemi
- Mobil uyumluluk iyileştirmeleri
- Daha fazla maskot destekli hareket anlatımı
- Gerçek zamanlı hareket düzeltme önerileri
- Kullanıcı profili ve kişiselleştirilmiş öğrenme planı

---

## 🤝 Katkıda Bulunma

Katkıda bulunmak isterseniz aşağıdaki adımları takip edebilirsiniz:

1. Bu repoyu fork edin.
2. Yeni bir branch oluşturun.

```bash
git checkout -b feature/yeni-ozellik
```

3. Değişikliklerinizi commit edin.

```bash
git commit -m "Yeni özellik eklendi"
```

4. Branch’i pushlayın.

```bash
git push origin feature/yeni-ozellik
```

5. Pull Request oluşturun.

---

## 🧑‍💻 Geliştirici

**Proje Sahibi:** Ömer Sunguralp Bektaş  
**Proje Adı:** Elce  
**Alan:** Yapay Zekâ Destekli Türk İşaret Dili Eğitim Platformu

---

## 📄 Lisans

Bu proje **MIT Lisansı** ile lisanslanmıştır.

```txt
MIT License

Copyright (c) 2026 Ömer Sunguralp Bektaş

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files, to deal in the Software
without restriction, including without limitation the rights to use, copy,
modify, merge, publish, distribute, sublicense, and/or sell copies of the
Software, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## ⭐ Proje Durumu

```txt
Durum: Teslime Hazır / Geliştirilmeye Açık
Sürüm: v1.0.0
Son Güncelleme: 2026
```

---

<p align="center">
  <b>Elce ile Türk İşaret Dili öğrenimi daha erişilebilir, etkileşimli ve güçlü hale gelir.</b>
</p>