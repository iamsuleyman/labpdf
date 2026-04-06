**ТЗ: Генерация PDF-отчёта лабораторных результатов (браузер)**

---

**Стек**

`jsPDF 2.5+` + `jspdf-autotable 3.8+` — подключить через CDN или npm. Никаких серверных зависимостей.

---

**Входные данные**

Функция `generatePDF(report)` принимает объект data.json

---

**Структура каждой страницы и Визуальный эталон**
Look at labccorp.pdf and use it's style. Try 1 on 1

---

**Выходной файл**

```js
doc.save(`report_${report.patient.patientId}_${report.meta.dateReported}.pdf`)
```

Либо `doc.output('bloburl')` если нужен превью в `<iframe>`.

---
