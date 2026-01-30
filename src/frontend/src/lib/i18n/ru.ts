import type {TranslationKeys} from "./en";

const ru: Record<TranslationKeys, string> = {
    // Common
    cancel: "Отмена", // Used in AlertDialog confirmations
    save: "Сохранить",
    delete: "Удалить", // Used in AlertDialog confirmations
    add: "Добавить",
    clear: "Очистить",
    loading: "Загрузка...",
    all: "Все",
    logout: "Выйти",
    pleaseWait: "Подождите...",

    // App
    appName: "MovieChecker",

    // Nav
    navDiary: "Дневник",
    navStats: "Статистика",

    // Auth
    signIn: "Войти",
    register: "Регистрация",
    signInDesc: "Войдите в свой кинодневник",
    createAccount: "Создайте аккаунт",
    username: "Логин",
    password: "Пароль",
    displayName: "Имя",
    displayNamePlaceholder: "Как вас называть?",
    alreadyHaveAccount: "Уже есть аккаунт?",
    dontHaveAccount: "Нет аккаунта?",
    registrationFailed: "Ошибка регистрации. Возможно, логин уже занят.",
    loginFailed: "Неверный логин или пароль.",

    // Home
    movieDiary: "Кинодневник",
    addEntry: "Добавить запись",
    addFirstEntry: "Добавьте первую запись",
    noEntries: "Записей пока нет. Начните отслеживать фильмы!",
    deleteConfirm: "Удалить эту запись?", // Used in AlertDialog confirmation
    loadingEntries: "Загрузка записей...",

    // Add/Edit Dialog
    addNewEntry: "Новая запись",
    editEntry: "Редактировать",
    poster: "Постер",
    clickToUpload: "Нажмите для загрузки постера",
    pasteFromClipboard: "Вставить из буфера",
    title: "Название",
    year: "Год",
    type: "Тип",
    genre: "Жанр",
    genrePlaceholder: "Добавить свой жанр...",
    genreAction: "Боевик",
    genreComedy: "Комедия",
    genreDrama: "Драма",
    genreHorror: "Ужасы",
    genreThriller: "Триллер",
    genreRomance: "Романтика",
    genreSciFi: "Фантастика",
    genreFantasy: "Фэнтези",
    genreAnimation: "Анимация",
    genreDocumentary: "Документальный",
    genreAdventure: "Приключения",
    genreMystery: "Детектив",
    genreCrime: "Криминал",
    genreFamily: "Семейный",
    genreMusical: "Мюзикл",
    description: "Описание",
    status: "Статус",
    watchedBy: "Кто смотрел",
    watchingBy: "Кто смотрит",
    myRating: "Моя оценка (1-10)",
    partnerRating: "Оценка партнёра (1-10)",
    emotion: "Эмоция",
    comment: "Комментарий",
    commentPlaceholder: "Ваши впечатления...",
    adding: "Добавление...",
    saving: "Сохранение...",
    failedToAdd: "Не удалось добавить запись",
    failedToUpdate: "Не удалось обновить запись",
    postAdded: "Пост успешно добавлен",
    postUpdated: "Пост успешно обновлен",
    deleteSucess: "Запись успешно удалена!",
    deleteError: "Ошибка при удалении записи",
    authError: "Ошибка аутентификации, войдите заново",
    titleRequired: "Название обязательно",
    clipboardNoImage: "В буфере нет изображения",
    clipboardFailed: "Не удалось прочитать буфер обмена",
    groupCreateSuccess: "Группа успешно создана",
    groupCreateError: "Не удалось создать группу",
    joinSuccess: "Вы успешно присоединились к группе",
    joinError: "Не удалось присоединиться к группе",
    leaveSuccess: "Вы успешно покинули группу",
    leaveError: "Не удалось покинуть группу",
    kickSuccess: "Участник успешно удалён",
    kickError: "Не удалось удалить участника",
    transferSuccess: "Права владельца успешно переданы",
    transferError: "Не удалось передать права владельца",

    // Content Types
    contentMovie: "Фильм",
    contentSeries: "Сериал",
    contentAnime: "Аниме",
    contentCartoon: "Мультфильм",
    contentShow: "Шоу",

    // Watch Status
    statusPlanned: "Запланировано",
    statusWatching: "Смотрим",
    statusCompleted: "Просмотрено",
    statusDropped: "Брошено",

    // Watched By
    watchedByMe: "Я",
    watchedByPartner: "Партнёр",
    watchedByTogether: "Вместе",
    watchedBySeparately: "По отдельности",

    // Emotions
    emotionJoy: "Радость",
    emotionSadness: "Грусть",
    emotionExcitement: "Восторг",
    emotionCringe: "Кринж",
    emotionConfused: "Что это было?",
    emotionNeutral: "Нейтрально",

    // Stats
    statistics: "Статистика",
    noStats: "Данных пока нет. Добавьте фильмы, чтобы увидеть статистику!",
    completed: "Просмотрено",
    watching: "Смотрим",
    planned: "Запланировано",
    dropped: "Брошено",
    myAvgRating: "Моя средняя оценка",
    partnerAvgRating: "Средняя оценка партнёра",
    watchedTogether: "Смотрели вместе",
    byContentType: "По типу контента",
    emotionsAfterWatching: "Эмоции после просмотра",
    totalEntries: "Всего записей",
    averageRating: "Средняя оценка",
    personalStats: "Ваша статистика",
    groupStatsTitle: "Статистика группы",
    ratingsComparison: "Оценки",
    noRated: "Нет оценок",
    statusBreakdown: "По статусу",
    memberCount: "участн.",

    // Groups
    personal: "Личное",
    groups: "Группы",
    createGroup: "Создать группу",
    joinGroup: "Присоединиться",
    leaveGroup: "Покинуть группу",
    groupName: "Название группы",
    inviteCode: "Код приглашения",
    enterInviteCode: "Введите код приглашения",
    members: "Участники",
    copied: "Скопировано!",
    copyCode: "Скопировать код",
    noGroups: "Групп пока нет",
    leaveGroupConfirm: "Покинуть эту группу?", // Used in AlertDialog confirmation
    groupCreated: "Группа создана!",
    joinedGroup: "Вы присоединились!",
    invalidCode: "Неверный код приглашения",
    alreadyMember: "Вы уже участник",
    myRatingLabel: "Моя оценка",
    allRatings: "Все оценки",
    noRatingsYet: "Оценок пока нет",
    ratingOf: " оценил(а)",
    memberAvgRatings: "Оценки участников",
    rated: "оценок",
    kickMember: "Удалить", // Used in AlertDialog confirmations
    kickConfirm: "Удалить этого участника из группы?", // Used in AlertDialog confirmation
    transferOwnership: "Передать права", // Used in AlertDialog confirmations
    transferConfirm: "Передать права владельца этому участнику? Вы потеряете права владельца.", // Used in AlertDialog confirmation
    owner: "Владелец",
    failedToKick: "Не удалось удалить участника",
    failedToTransfer: "Не удалось передать права",
    memberRemoved: "Участник удалён",
    ownershipTransferred: "Права переданы",
    season: "Сезон",
    episode: "Эпизод",
    totalEpisodes: "Общее кол-во эпизодов",
    watchingTime: "Время последнего просмотра",

    // Field Descriptions
    posterDescription: "Загрузите обложку или вставьте из буфера обмена",
    genreDescription: "Выберите один или несколько жанров",
    membersDescription: "Выберите участников просмотра",
    ratings: "Оценки",
    trackingInfo: "Информация о просмотре",
    watchingTimeDescription: "На какой минуте остановились",
    additionalInfo: "Дополнительная информация",
    emotionDescription: "Какие эмоции вызвал просмотр",
    commentDescription: "Поделитесь своими мыслями о просмотре",

    // Validation Errors
    titleTooLong: "Название слишком длинное (макс. 255 символов)",
    invalidYear: "Некорректный год (1900-2100)",
    descriptionTooLong: "Описание слишком длинное (макс. 1000 символов)",
    commentTooLong: "Комментарий слишком длинный (макс. 1000 символов)",
    invalidNumber: "Должно быть положительным числом",
    invalidTimeComponent: "Должно быть от 0 до 59",
    invalidRating: "Оценка должна быть от 1 до 10",
    fixValidationErrors: "Исправьте ошибки в форме"
};

export default ru;
