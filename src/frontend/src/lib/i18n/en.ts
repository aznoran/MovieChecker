const en = {
  // Common
  cancel: "Cancel",
  save: "Save",
  delete: "Delete",
  add: "Add",
  clear: "Clear",
  loading: "Loading...",
  all: "All",
  logout: "Logout",
  pleaseWait: "Please wait...",

  // App
  appName: "MovieChecker",

  // Nav
  navDiary: "Diary",
  navStats: "Stats",

  // Auth
  signIn: "Sign In",
  register: "Register",
  signInDesc: "Sign in to your diary",
  createAccount: "Create your account",
  username: "Username",
  password: "Password",
  displayName: "Display Name",
  displayNamePlaceholder: "How should we call you?",
  alreadyHaveAccount: "Already have an account?",
  dontHaveAccount: "Don't have an account?",
  registrationFailed: "Registration failed. Username may already exist.",
  loginFailed: "Invalid username or password.",

  // Home
  movieDiary: "Movie Diary",
  addEntry: "Add Entry",
  addFirstEntry: "Add your first entry",
  noEntries: "No entries yet. Start tracking your movies!",
  deleteConfirm: "Delete this entry?",
  loadingEntries: "Loading entries...",

  // Add/Edit Dialog
  addNewEntry: "Add New Entry",
  editEntry: "Edit Entry",
  poster: "Poster",
  clickToUpload: "Click to upload poster",
  pasteFromClipboard: "Paste from clipboard",
  title: "Title",
  year: "Year",
  type: "Type",
  genre: "Genre",
  genrePlaceholder: "Add custom genre...",
  genreAction: "Action",
  genreComedy: "Comedy",
  genreDrama: "Drama",
  genreHorror: "Horror",
  genreThriller: "Thriller",
  genreRomance: "Romance",
  genreSciFi: "Sci-Fi",
  genreFantasy: "Fantasy",
  genreAnimation: "Animation",
  genreDocumentary: "Documentary",
  genreAdventure: "Adventure",
  genreMystery: "Mystery",
  genreCrime: "Crime",
  genreFamily: "Family",
  genreMusical: "Musical",
  description: "Description",
  status: "Status",
  watchedBy: "Watched By",
  watchingBy: "Watching By",
  myRating: "My Rating (1-10)",
  partnerRating: "Partner Rating (1-10)",
  emotion: "Emotion",
  comment: "Comment",
  commentPlaceholder: "Your impressions...",
  adding: "Adding...",
  saving: "Saving...",
  failedToAdd: "Failed to add entry",
  failedToUpdate: "Failed to update entry",
  titleRequired: "Title is required",
  clipboardNoImage: "No image found in clipboard",
  clipboardFailed: "Failed to read clipboard",

  // Content Types
  contentMovie: "Film",
  contentSeries: "Series",
  contentAnime: "Anime",
  contentCartoon: "Cartoon",
  contentShow: "Show",

  // Watch Status
  statusPlanned: "Planned",
  statusWatching: "Watching",
  statusCompleted: "Completed",
  statusDropped: "Dropped",

  // Watched By
  watchedByMe: "Me",
  watchedByPartner: "Partner",
  watchedByTogether: "Together",
  watchedBySeparately: "Separately",

  // Emotions
  emotionJoy: "Joy",
  emotionSadness: "Sadness",
  emotionExcitement: "Excitement",
  emotionCringe: "Cringe",
  emotionConfused: "Confused",
  emotionNeutral: "Neutral",

  // Stats
  statistics: "Statistics",
  noStats: "No data yet. Start adding movies to see stats!",
  completed: "Completed",
  watching: "Watching",
  planned: "Planned",
  dropped: "Dropped",
  myAvgRating: "My Average Rating",
  partnerAvgRating: "Partner Average Rating",
  watchedTogether: "Watched Together",
  byContentType: "By Content Type",
  emotionsAfterWatching: "Emotions After Watching",
} as const;

export type TranslationKeys = keyof typeof en;
export default en;
