# منظومة الموارد — GitHub Pages
واجهة أمامية فقط (بدون خادم). تحفظ البيانات محليًا عبر LocalStorage مع أزرار استيراد/تصدير JSON.

## تشغيل محلي
```bash
npm i
npm run dev
```

## بناء ونشر
- للبناء:
```bash
npm run build
```
- ارفع محتوى `dist/` إلى GitHub Pages (Settings → Pages → Deploy from a branch) أو استخدم GitHub Actions.
> إذا كان الريبو على مسار فرعي `/USER/REPO/` اضبط `base` في `vite.config.ts` إلى `'/REPO/'`.

## حسابات تجريبية
- admin / admin — جميع الصلاحيات
- onlyeval / 123 — عرض التقييمات فقط
- onlyfine / 123 — عرض الغرامات فقط
