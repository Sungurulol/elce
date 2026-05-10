# 🖐️ Elce

<p align="center">
  <img src="frontend/public/logo.png" alt="Elce Logo" width="180" />
</p>

<p align="center">
  <b>Türk İşaret Dili öğrenimini yapay zekâ destekli, erişilebilir ve etkileşimli hale getiren web tabanlı eğitim platformu.</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-Frontend-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/FastAPI-Backend-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/Python-AI%20Model-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" />
</p>

---

## 📌 Proje Hakkında

**Elce**, Türk İşaret Dili öğrenmek isteyen kullanıcılar için geliştirilmiş yapay zekâ destekli bir eğitim platformudur.

Platform; kamera üzerinden kullanıcının el, yüz, ağız ve vücut hareketlerini analiz ederek işaret dili hareketlerini tanımaya çalışır. Kullanıcılar, dersler ve üniteler üzerinden ilerleyerek Türk İşaret Dili hareketlerini uygulamalı şekilde öğrenebilir.

Bu proje, özellikle işitme engelli bireylerle iletişimi güçlendirmek ve işaret dili öğrenimini daha erişilebilir hale getirmek amacıyla geliştirilmiştir.

---

## 🎯 Projenin Amacı

Elce’nin temel amacı, Türk İşaret Dili öğrenimini yalnızca görsel anlatımlarla sınırlı bırakmayıp kamera destekli, etkileşimli ve geri bildirim odaklı bir öğrenme deneyimine dönüştürmektir.

Proje şu hedeflere odaklanır:

- Türk İşaret Dili öğrenimini kolaylaştırmak
- Kullanıcının hareketlerini kamera ile analiz etmek
- Ders ve ünite sistemiyle düzenli öğrenme sağlamak
- Yapay zekâ destekli hareket tahmini yapmak
- Engelli bireylerle iletişim kurmak isteyen kişilere destek olmak
- Erişilebilir ve modern bir eğitim arayüzü sunmak

---

## 🚀 Özellikler

- 🧠 Yapay zekâ destekli hareket tahmini
- 📷 Kamera üzerinden canlı hareket algılama
- ✋ El hareketi takibi
- 😀 Yüz ve ağız hareketi analizi
- 🧍 Omuz, dirsek ve bilek gibi poz noktalarının takibi
- 📚 Ünite ve ders tabanlı öğrenme sistemi
- 📈 Kullanıcı ilerleme takibi
- 🧪 Geliştirici modu
- 🎭 Maskot destekli görsel anlatım
- 🎯 Derslerde doğru / yanlış hareket geri bildirimi
- 💻 Modern ve kullanıcı dostu web arayüzü

---

## 🧩 Proje Yapısı

```bash
Elce/
│
├── backend/
│   ├── main.py
│   ├── models/
│   ├── data/
│   └── requirements.txt
│
├── frontend/
│   ├── public/
│   │   ├── logo.png
│   │   └── mascot/
│   │
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
│   │
│   ├── package.json
│   └── vite.config.js
│
├── local_dataset_backup/
│   └── gesture_sequences.json
│
├── README.md
└── .gitignore
```

---

## 🛠️ Kullanılan Teknolojiler

### Frontend

| Teknoloji | Açıklama |
|---|---|
| React | Kullanıcı arayüzü geliştirme |
| Vite | Hızlı frontend geliştirme ortamı |
| JavaScript | Uygulama mantığı |
| CSS | Arayüz tasarımı |
| MediaPipe | El, yüz ve poz takibi |

### Backend

| Teknoloji | Açıklama |
|---|---|
| Python | Backend ve model işlemleri |
| FastAPI | API geliştirme |
| JSON | Veri saklama ve örnek kayıtları |
| Yapay Zekâ Modeli | Hareket tahmini ve sınıflandırma |

---

## 🧠 Yapay Zekâ ve Hareket Algılama

Elce, kullanıcının kamera karşısında yaptığı hareketleri analiz ederek işaret dili hareketini tahmin etmeye çalışır.

Sistem hareketleri değerlendirirken yalnızca el konumuna değil, aynı zamanda şu verilere de dikkat eder:

- El landmark noktaları
- Sağ ve sol el bilgisi
- Ağız ve yüz hareketleri
- Omuz, dirsek ve bilek konumları
- Hareketin zaman içindeki akışı
- Video benzeri sıralı veri yapısı

Bu yapı sayesinde sistem, tek bir kareye bakmak yerine hareketin tamamını değerlendirmeyi hedefler.

---

## 📚 Ders ve Ünite Sistemi

Elce, kullanıcıya Duolingo benzeri bir öğrenme deneyimi sunacak şekilde tasarlanmıştır.

Kullanıcılar:

- Üniteler arasında ilerleyebilir
- Dersleri tamamlayabilir
- Gösterilen hareketi tekrar edebilir
- Kamera ile hareket doğrulaması yapabilir
- İlerleme durumunu takip edebilir

Örnek ünite yapısı:

```txt
1. Ünite: Temel Selamlaşma
   - Merhaba
   - Evet
   - Hayır
   - Teşekkürler

2. Ünite: Günlük İhtiyaçlar
   - Yardım
   - Hastane
   - Su
   - Yemek
```

---

## 🖼️ Maskot ve Görsel Anlatım

Projede kullanıcı deneyimini daha eğlenceli ve anlaşılır hale getirmek için maskot destekli görsel anlatım kullanılmıştır.

Maskot sistemi:

- Hareketlerin nasıl yapılacağını gösterir
- Ders ekranlarını daha canlı hale getirir
- Kullanıcıya görsel yönlendirme sağlar
- Öğrenme sürecini daha samimi ve motive edici yapar

---

## ⚙️ Kurulum

### 1. Projeyi Klonlayın

```bash
git clone https://github.com/kullanici-adi/elce.git
cd elce
```

> Not: `kullanici-adi` kısmını kendi GitHub kullanıcı adınızla değiştirin.

---

## 🖥️ Backend Kurulumu

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python main.py
```

Backend varsayılan olarak şu adreste çalışır:

```txt
http://localhost:8000
```

---

## 🌐 Frontend Kurulumu

Yeni bir terminal açarak:

```bash
cd frontend
npm install
npm run dev
```

Frontend varsayılan olarak şu adreste çalışır:

```txt
http://localhost:5173
```

---

## ▶️ Kullanım

1. Backend sunucusunu başlatın.
2. Frontend geliştirme sunucusunu başlatın.
3. Tarayıcıdan `http://localhost:5173` adresine gidin.
4. Kamera iznini verin.
5. Ders veya pratik ekranına girin.
6. Gösterilen işaret dili hareketini kamera karşısında uygulayın.
7. Sistemden tahmin ve geri bildirim alın.

---

## 📊 Veri Seti Yapısı

Projede hareket verileri video benzeri sıralı veri mantığıyla saklanır.

Her örnek veri şu bilgileri içerebilir:

- Hareket etiketi
- Varyant adı
- Ders ID bilgisi
- Beklenen el sayısı
- Kare sayısı
- El landmark verileri
- Yüz ve ağız verileri
- Poz noktaları
- Modelin kullanacağı özellik vektörleri

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

---

## 🧪 Geliştirici Modu

Projede geliştirici modu sayesinde teknik detaylar görüntülenebilir.

Geliştirici modunda görülebilecek bazı bilgiler:

- Model tahmin sonucu
- Güven skoru
- Algılanan el sayısı
- Poz takip bilgileri
- Yüz ve ağız skoru
- Ders / hareket eşleşme durumu
- Teknik hata analizleri

Bu mod, normal kullanıcı deneyimini sade tutarken geliştiriciye test ve hata ayıklama kolaylığı sağlar.

---

## 📈 Projenin Engelli Bireylerin Hayatına Katkısı

Elce, doğrudan işitme engelli bireylere yönelik bir iletişim köprüsü kurmayı hedefler.

Projenin sağlayabileceği katkılar:

- İşaret dili öğrenimini yaygınlaştırmak
- İşitme engelli bireylerle iletişimi artırmak
- Temel günlük ifadelerin öğrenilmesini kolaylaştırmak
- Eğitim sürecini daha erişilebilir hale getirmek
- Toplumsal farkındalık oluşturmak
- Dijital eğitimde kapsayıcılığı desteklemek

---

## 🧭 Gelecek Geliştirmeler

Projenin ilerleyen aşamalarında şu geliştirmeler hedeflenmektedir:

- Daha büyük ve çeşitli Türk İşaret Dili veri seti
- Daha gelişmiş yapay zekâ doğrulama sistemi
- Kullanıcı seviyesine göre ders zorluğu ayarlama
- Daha fazla ünite ve hareket ekleme
- Mobil uyumluluk geliştirmeleri
- Daha detaylı istatistik ve başarı sistemi
- Gerçek zamanlı daha hassas hareket analizi
- Kullanıcı profili ve kişiselleştirilmiş öğrenme planı

---

## 📸 Ekran Görüntüleri

> Bu bölüme proje ekran görüntüleri eklenebilir.

```markdown
![Ana Menü](frontend/public/screenshots/main-menu.png)
![Ünite Yolu](frontend/public/screenshots/unit-road.png)
![Pratik Ekranı](frontend/public/screenshots/practice.png)
```

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