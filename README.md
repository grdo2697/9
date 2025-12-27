# Smart Era - Split Version

## Structure
public/
  index.html
  assets/css/app.css
  assets/js/app.js
  assets/js/firebase-config.sample.js

## Notes
- This is a direct split of your original single HTML file:
  - All CSS moved to assets/css/app.css
  - The big inline JS moved to assets/js/app.js
- External libraries (Bootstrap, Icons, AOS) remain linked from CDN inside index.html.

## Firebase Hosting
1) Install firebase tools:
   npm i -g firebase-tools
   firebase login

2) Init:
   firebase init hosting
   - public directory: public
   - single-page app: Yes

3) Deploy:
   firebase deploy

## Pages extracted
- HTML fragments for each page are in public/pages/ (for easier editing).
- Navbar/footer extracted to public/partials/.



## تشغيل محادثة AI الحقيقية (Backend)

> مهم: لا تضع API Key داخل المتصفح. الربط الحقيقي يكون عبر سيرفر.

1) افتح مجلد `server`
2) انسخ ملف البيئة:
- انسخ `.env.example` إلى `.env`
- ضع `OPENAI_API_KEY`

3) شغّل:
```bash
cd server
npm install
npm start
```

السيرفر راح يفتح على `http://localhost:8787` ويوفر هذا المسار:
- `POST /api/ai/chat`

الواجهة (Front-end) راح تحاول تلقائياً تستخدم `/api/ai/chat` وإذا ما متوفر ترجع لوضع تجريبي.


## رفع المشروع على Firebase Hosting (جاهز)

### 1) ثبّت Firebase CLI وسجّل دخول
```bash
npm i -g firebase-tools
firebase login
```

### 2) داخل فولدر المشروع
```bash
firebase use alasr-smart
firebase deploy
```

> تم إضافة ملفات: `firebase.json` و `.firebaserc` حتى يكون الرفع مباشر.
> مجلد الرفع هو: `public/`

### ملاحظة عن Firebase Config
ملف `public/assets/js/firebase.js` مضاف جاهز.
- بدّل قيم `REPLACE_ME` بالـ config مال مشروعك من Firebase Console.
- إذا ما تحتاج Firebase هسه، تقدر تتركه بدون ربط.

### تشغيل السيرفر (AI + مراسلة حيّة Socket.io)
```bash
cd server
npm install
npm start
```

> لا ترفع مفاتيح حساسة داخل الواجهة (Front-end).
