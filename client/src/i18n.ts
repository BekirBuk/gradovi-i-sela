export type Language = 'en' | 'bs';

const translations = {
  en: {
    // Lobby
    appTitle: 'Gradovi i Sela',
    subtitle: 'A classic game with a new look',
    createRoom: 'Create Room',
    joinRoom: 'Join Room',
    create: 'Create',
    join: 'Join',
    back: '\u2190 Back',
    enterName: 'Enter your name',
    enterRoomCode: 'Enter room code',
    explorerName: 'Explorer name',
    roomCode: 'Room Code',
    explorers: 'Explorers',
    host: 'HOST',
    you: 'YOU',
    expeditionSettings: 'Expedition Settings',
    language: 'Language',
    rounds: 'Rounds',
    beginExpedition: 'Begin Expedition',
    waitingForLeader: 'Waiting for the expedition leader...',

    // Game Board
    round: 'Round',
    submitted: 'submitted',
    submitAnswers: 'Submit Answers',
    answersSubmitted: 'Answers submitted! Waiting for others...',
    stop: 'STOP!',

    // Timer
    lockingAnswers: 'STOP! Locking answers...',

    // Scoreboard
    finalResults: 'Final Results',
    roundResults: 'Round {round} Results \u2014 Letter "{letter}"',
    rankings: 'Rankings',
    pts: 'pts',
    nextRound: 'Next Round',
    playAgain: 'Play Again',
    waitingForHost: 'Waiting for host...',
    waitingForNextRound: 'Waiting for host to start next round...',

    // Challenge
    claims: 'claims',
    isAValid: 'is a valid',
    accept: 'Accept',
    reject: 'Reject',
    waitingForVotes: 'Waiting for votes...',
    accepted: 'Accepted',
    rejected: 'Rejected',

    // Coordinates
    coordinates: '43.8563\u00B0N \u00B7 18.4131\u00B0E',
  },
  bs: {
    // Lobby
    appTitle: 'Gradovi i Sela',
    subtitle: 'Poznata igra u novom ruhu',
    createRoom: 'Kreiraj Sobu',
    joinRoom: 'Pridruži se',
    create: 'Kreiraj',
    join: 'Pridruži se',
    back: '\u2190 Nazad',
    enterName: 'Unesite svoje ime',
    enterRoomCode: 'Unesite kod sobe',
    explorerName: 'Ime istraživača',
    roomCode: 'Kod Sobe',
    explorers: 'Istraživači',
    host: 'DOMAĆIN',
    you: 'TI',
    expeditionSettings: 'Postavke',
    language: 'Jezik',
    rounds: 'Runde',
    beginExpedition: 'Započni Igru',
    waitingForLeader: 'Čekamo domaćina da započne igru...',

    // Game Board
    round: 'Runda',
    submitted: 'predalo',
    submitAnswers: 'Predaj Odgovore',
    answersSubmitted: 'Odgovori predani! Čekamo ostale...',
    stop: 'STOP!',

    // Timer
    lockingAnswers: 'STOP! Zaključavanje odgovora...',

    // Scoreboard
    finalResults: 'Konačni Rezultati',
    roundResults: 'Runda {round} Rezultati \u2014 Slovo "{letter}"',
    rankings: 'Poredak',
    pts: 'bod.',
    nextRound: 'Sljedeća Runda',
    playAgain: 'Igraj Ponovo',
    waitingForHost: 'Čekamo domaćina...',
    waitingForNextRound: 'Čekamo domaćina za sljedeću rundu...',

    // Challenge
    claims: 'tvrdi da je',
    isAValid: 'validan odgovor za',
    accept: 'Prihvati',
    reject: 'Odbij',
    waitingForVotes: 'Čekamo glasove...',
    accepted: 'Prihvaćeno',
    rejected: 'Odbijeno',

    // Coordinates
    coordinates: '43.8563\u00B0N \u00B7 18.4131\u00B0E',
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

export function t(lang: Language, key: TranslationKey, params?: Record<string, string>): string {
  let text: string = translations[lang][key] || translations.en[key] || key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replaceAll(`{${k}}`, v);
    }
  }
  return text;
}
