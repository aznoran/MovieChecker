# Инструкция по просмотру новой Landing Page

## Проблема
Если у вас страница не выглядит так, как на скриншотах в PR, следуйте этим инструкциям.

## Решение

### 1. Убедитесь, что открываете правильный URL
**Важно:** Новая красивая landing page находится по адресу:
```
http://localhost:3000/landing
```

**НЕ** `http://localhost:3000/` (это главная страница приложения для авторизованных пользователей)

### 2. Запуск сервера разработки

```bash
cd src/frontend
npm install
npm run dev
```

Дождитесь сообщения:
```
✓ Ready in XXXms
- Local:   http://localhost:3000
```

### 3. Откройте браузер
Перейдите по адресу: `http://localhost:3000/landing`

### 4. Если страница не обновилась
**Жёсткая перезагрузка (очистка кэша):**
- **Windows/Linux:** `Ctrl + Shift + R`
- **Mac:** `Cmd + Shift + R`

Или откройте в режиме инкогнито:
- **Windows/Linux:** `Ctrl + Shift + N`
- **Mac:** `Cmd + Shift + N`

### 5. Переключение языка
В правом верхнем углу есть кнопка переключения языка:
- **EN** - English version
- **RU** - Русская версия

## Текущие скриншоты (проверено работает!)

### English Version
![English Landing Page](https://github.com/user-attachments/assets/543327d2-5a31-4312-a8f9-b93088c0cdc8)

### Russian Version  
![Russian Landing Page](https://github.com/user-attachments/assets/d0d0f726-5d70-4632-a1a0-ef65d6cab410)

## Что вы должны увидеть

✅ **Hero секция** с большим заголовком "Track Your Movie Journey" / "Отслеживайте свой киномаршрут"
✅ **6 карточек функций** с иконками
✅ **Секция "Why Choose MovieChecker?"** с 3 преимуществами
✅ **Финальный CTA** с большой кнопкой "Create Free Account"
✅ **Градиентные фоны** для визуальной глубины
✅ **Увеличенные отступы** (py-24 md:py-32)
✅ **Hover эффекты** на карточках
✅ **Тени** на кнопках и карточках

## Проверка работоспособности

1. Откройте DevTools (F12)
2. Во вкладке Console не должно быть критических ошибок
3. Во вкладке Network проверьте, что все файлы загружаются (статус 200)

## Если всё равно не работает

1. Удалите `node_modules` и `.next`:
```bash
cd src/frontend
rm -rf node_modules .next
npm install
npm run dev
```

2. Проверьте версию Node.js:
```bash
node --version
```
Требуется Node.js 18 или выше.

3. Проверьте, что нет конфликтующих процессов на порту 3000:
```bash
# Linux/Mac
lsof -i :3000

# Windows
netstat -ano | findstr :3000
```

## Контакты
Если проблема сохраняется, создайте issue с:
- Скриншотом того, что вы видите
- Версией Node.js (`node --version`)
- Операционной системой
- Сообщениями из консоли браузера (DevTools → Console)
