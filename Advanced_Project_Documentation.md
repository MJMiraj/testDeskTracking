# 🚀 Advanced MERN Project Documentation (Time Tracker & DeskTime Clone)

এই ডকুমেন্টেশনে ব্যাখ্যা করা হয়েছে কেন `test` ফোল্ডারের প্রোজেক্টটি একটি সাধারণ প্রোজেক্টের চেয়ে অনেক বেশি অ্যাডভান্সড। আমরা এই প্রোজেক্টটিকে একটি সম্পূর্ণ ফাংশনাল **Time Tracking (DeskTime Clone)** অ্যাপ্লিকেশনে রূপান্তর করেছি। 

## 🟢 Backend (Node.js, Express & MySQL) - Advanced Features

### 1. Relational Database Modeling (Module 4)
- `TimeEntry` এবং `User` মডেলের মাঝে One-to-Many রিলেশনশিপ তৈরি করা হয়েছে (`User.hasMany(TimeEntry)`). 
- ক্যাসকেড ডিলিট (Cascade Delete) ইমপ্লিমেন্ট করা হয়েছে যেন ইউজার ডিলিট হলে তার সব ടাইম রেকর্ড ডিলিট হয়ে যায়।

### 2. Protected Routes (Module 5)
- `authMiddleware.js` তৈরি করা হয়েছে যা ইউজারের পাঠানো JWT ভেরিফাই করে এবং ইনভ্যালিড টোকেন হলে অ্যাক্সেস ব্লক করে দেয়। শুধুমাত্র লগইন করা ইউজাররাই নিজেদের টাইম রেকর্ড এবং সেটিংস পরিবর্তন করতে পারে।

### 3. Dynamic JSON Columns
- ইউজারের `User` মডেলে `themePreferences` নামে একটি JSON কলাম অ্যাড করা হয়েছে। এর মাধ্যমে রিলেশনাল ডাটাবেসের ভেতরেই NoSQL এর মতো ফ্লেক্সিবিলিটি পাওয়া যায়।

## ⚛️ Frontend (React & Vite) - Advanced Features

### 1. Dynamic CSS & Theme Engine (Module 2)
- **Context API (`ThemeContext`)** ব্যবহার করে একটি ডায়নামিক থিম ইঞ্জিন বানানো হয়েছে। ডাটাবেস থেকে ইউজারের প্রিফারেন্স এনে ব্রাউজারের CSS Variables (`--primary-color`, `--bg-color`) রিয়েল টাইমে পরিবর্তন করা যায়।
- ইউজারের কাস্টম থিমগুলো ডাটাবেসে সেভ থাকার কারণে যেকোনো ডিভাইসে লগইন করলেই একই ডিজাইন পাওয়া যায়।

### 2. Real-Time Tracking UI
- `App.jsx` এ একটি লাইভ স্টপওয়াচ বানানো হয়েছে যা `setInterval` এবং `useEffect` ব্যবহার করে নিখুঁতভাবে সময় গণনা করে। 
- টাইমার চলাকালীন ডাটাবেসে `endTime` নাল (Null) থাকে। ইউজার Stop এ ক্লিক করলে ডাটাবেসে টাইম আপডেট হয়ে যায় এবং `durationSeconds` ক্যালকুলেট হয়ে সেভ হয়।

### 3. Advanced Axios Interceptors
- `axios.interceptors.request` ব্যবহার করে ফ্রন্টএন্ড থেকে সার্ভারে পাঠানো প্রতিটি রিকোয়েস্টে নিজে থেকেই `Authorization: Bearer <token>` অ্যাড করে দেওয়া হয়েছে। এর ফলে বারবার হেডারে টোকেন লেখার ঝামেলা দূর হয়েছে।

---
**উপসংহার:** এই প্রোজেক্টটি প্রমাণ করে যে, MERN স্ট্যাক ব্যবহার করে ক্রস-প্ল্যাটফর্ম স্কেলেবল অ্যাপ্লিকেশন তৈরি করা কতটা সহজ। API-First আর্কিটেকচারের কারণে এই ব্যাকএন্ডটিকে পরবর্তীতে কোনো চেঞ্জ ছাড়াই Windows (Electron), Mac, iOS, এবং Android (React Native) অ্যাপ্লিকেশনের সাথে অনায়াসেই যুক্ত করা যাবে।
