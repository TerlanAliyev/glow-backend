# Lyra Backend

Lyra, real-zamanlı, məkan-əsaslı bir sosial kəşf tətbiqidir. Bu repozitori, tətbiqin bütün backend məntiqini, API endpoint-lərini və real-zamanlı (WebSocket) infrastrukturunu ehtiva edir. Əsas məqsəd, insanların olduqları fiziki məkanda (kafe, bar, tədbir və s.) bir-birlərini tapıb ünsiyyətə başlamasına kömək edən dayanıqlı və miqyaslana bilən bir sistem qurmaqdır.

## 🚀 Əsas Funksionallıqlar (Key Features)

### Core Sosial Axın
- **Ağıllı Check-in:** İstifadəçinin olduğu yerə əsasən yaxınlıqdakı məkanları analiz edir. Tək məkan varsa avtomatik, çox məkan varsa istifadəçiyə seçim təqdim edərək check-in edir.
- **Real-Zamanlı Kompas:** Məkandakı digər istifadəçiləri anında göstərən WebSocket-əsaslı sistem.
- **Uyğunluq Xalı:** Ortaq maraqlar və universitet kimi parametrlərə əsasən istifadəçilər arasında uyğunluq xalı hesablayır.
- **Dərin Filtrləmə:** Kompası yaş aralığı və maraqlara görə filtrləmə imkanı.

### İnteraktiv Ünsiyyət
- **Siqnal & Match Sistemi:** Qarşılıqlı "Siqnal" göndərildikdə avtomatik olaraq "match" yaradan sistem.
- **Şəxsi və Qrup Söhbətləri:** Həm "match" olan istifadəçilər arasında şəxsi, həm də məkandakı bütün istifadəçilər üçün ümumi qrup söhbəti.
- **Canlı Söhbət Özəllikləri:** "Yazır...", "Oxundu", şəkil, səsli və video mesaj göndərmə, mesajlara emoji ilə reaksiya vermə imkanları.
- **"Buz Sındıran" Suallar:** Yeni başlayan söhbətlərdə istifadəçilərə söhbətə başlamaq üçün API-dən gələn təsadüfi sual təklifləri.
- **Lyra Botu:** Sakitləşən qrup söhbətlərini canlandırmaq üçün avtomatik mesajlar göndərən və nalayiq ifadələri moderatorasiya edən ağıllı köməkçi.

### Premium & Monetizasiya
- **Abunəlik Sistemi:** `FREE` və `PREMIUM` istifadəçi statusları və müvəqqəti premium (`premiumExpiresAt`) dəstəyi.
- **Pulsuz Sınaq:** Hər yeni istifadəçi üçün 3 günlük avtomatik premium sınaq müddəti.
- **Hazır Premium Funksiyalar:**
    - **Profilə Kim Baxıb:** İstifadəçinin profilini ziyarət edənlərin siyahısı.
    - **Limitsiz Siqnal:** Premium istifadəçilər üçün gündəlik siqnal limitinin olmaması.
    - **"Ayaq İzini" Gizlətmək:** Başqalarının profilinə baxdıqda iz buraxmamaq imkanı.
    - **Canlı Məkan Statistikası:** Məkana daxil olmadan oradakı insan sayı, cinsiyyət bölgüsü və yaş aralığı kimi anonim məlumatları görmək imkanı.

### Təhlükəsizlik və İdarəetmə
- **Təhlükəsiz Autentifikasiya:** JWT `accessToken` və `refreshToken` sistemi.
- **Hesab Nəzarəti:** E-poçt dəyişikliyi və hesabın silinməsi üçün OTP (e-poçta göndərilən kod) ilə təsdiqləmə.
- **Moderasiya:** Həm istifadəçilərin bir-birini şikayət etməsi, həm də Lyra Botu tərəfindən nalayiq ifadələrin avtomatik filtrasiyası.
- **Geniş Admin Paneli:** İstifadəçiləri, məkanları, şikayətləri, bildirişləri və digər məzmunu tam idarə etmək üçün API endpoint-ləri.

## 🛠️ Texnologiya Steki (Tech Stack)

- **Backend:** Node.js, Express.js
- **Verilənlər Bazası:** PostgreSQL
- **ORM:** Prisma
- **Real-time:** Socket.IO
- **Autentifikasiya:** JSON Web Token (jsonwebtoken), bcryptjs
- **Fayl Yaddaşı:** Cloudinary, Multer
- **Push Bildirişlər:** Firebase Admin SDK
- **Planlaşdırılmış Tapşırıqlar:** node-cron
- **API Sənədləri:** Swagger (swagger-ui-express, swagger-jsdoc)

## ⚙️ Qurulum və Başlatma (Setup and Run)

#### 1. Layihəni Klonlayın
```bash
git clone [https://github.com/TerlanAliyev/Lyra-Backend.git](https://github.com/TerlanAliyev/Lyra-Backend.git)
cd Lyra-Backend
```

#### 2. Asılılıqları Yükləyin
```bash
npm install
```

#### 3. Environment Faylını Hazırlayın
Layihənin ana qovluğunda `.env` adlı bir fayl yaradın və aşağıdakı dəyişənləri öz məlumatlarınızla doldurun:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
JWT_SECRET="çox_gizli_bir_söz_yazın"
REFRESH_TOKEN_SECRET="bu_daha_da_gizli_və_uzun_bir_söz_olsun"
ACCESS_TOKEN_EXPIRATION="15m"
REFRESH_TOKEN_EXPIRATION="30d"

# Cloudinary
CLOUDINARY_CLOUD_NAME="sizin_cloud_name"
CLOUDINARY_API_KEY="sizin_api_key"
CLOUDINARY_API_SECRET="sizin_api_secret"

# Nodemailer (Gmail üçün)
EMAIL_USER="sizin_gmail_adresiniz@gmail.com"
EMAIL_PASS="sizin_gmail_tətbiq_şifrəniz"

# Google Login
GOOGLE_ANDROID_CLIENT_ID="..."
GOOGLE_IOS_CLIENT_ID="..."
```

#### 4. Verilənlər Bazasını Qurma
Aşağıdakı əmr, `prisma/schema.prisma` faylına əsasən verilənlər bazanızda bütün cədvəlləri yaradacaq:
```bash
npx prisma migrate dev
```

#### 5. İlkin Məlumatları Yükləmə (Seeding)
Bu əmr, tətbiqin işləməsi üçün vacib olan ilkin məlumatları (məsələn, `USER`, `ADMIN`, `BOT` rolları və Lyra Bot hesabını) yaradır:
```bash
npm run prisma:seed
```

#### 6. Tətbiqi İşə Salma
İnkişaf (development) rejimində, kod dəyişikliklərini avtomatik izləməklə başlatmaq üçün:
```bash
npm run dev
```
Produksiya (production) rejimində başlatmaq üçün:
```bash
npm start
```

## 📚 API Sənədləri (API Documentation)

Tətbiq işə düşdükdən sonra, bütün API endpoint-lərinin tam sənədlərinə və onları test etmək üçün interfeysə aşağıdakı linkdən baxa bilərsiniz:

[http://localhost:3000/api-docs](http://localhost:3000/api-docs)

## 🔮 Gələcək Planlar (Future Plans)

- **Redis İnteqrasiyası:** Yüksək yüklənmə altında performansı artırmaq üçün Caching və Socket.IO Adapter-in tətbiqi.
- **"İstilik Xəritəsi":** Məkanlar xəritəsini, məkanların aktivliyinə görə rənglənən bir "istilik xəritəsinə" çevirmək.
- **Daha Çox Premium Funksiya:** "Səni Kim Bəyəndi?", "Profil Gücləndirmə (Boost)" kimi yeni gəlir modelləri.
