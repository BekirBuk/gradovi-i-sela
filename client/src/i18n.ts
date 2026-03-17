export type Language = 'en' | 'bs';

const translations = {
  en: {
    // Lobby
    appTitle: 'Gradova i Sela',
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
    roundTime: 'Round Time',
    gameMode: 'Game Mode',
    gameModeTimer: 'Timer',
    gameModeStop: 'Stop',
    roundsTooltip: 'Number of rounds to play before the game ends.',
    roundTimeTooltip: 'How long each round lasts before time runs out.',
    gameModeTooltip: 'Stop: players can end the round early. Timer: round only ends when time runs out.',
    beginExpedition: 'Begin Expedition',
    waitingForLeader: 'Waiting for the expedition leader...',

    // Game Board
    round: 'Round',
    submitted: 'submitted',
    submitAnswers: 'Submit Answers',
    answersSubmitted: 'Answers submitted! Waiting for others...',
    cancelSubmission: 'Edit Answers',
    stop: 'STOP!',

    // Game hints
    spellingHint: 'Make sure your answers start with the letter "{letter}". You can challenge rejected answers after the round.',

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
    challengeHint: 'Our database cannot cover every valid answer. If your answer was wrongly rejected, click the ? to request approval from all players.',
    challengeTurn: '{name}\'s turn to challenge',
    challengeYourTurn: 'Your turn! Challenge any rejected answers or skip.',
    skipChallenges: 'Skip',
    noChallenges: 'No answers to challenge.',
    claims: 'claims',
    isAValid: 'is a valid',
    accept: 'Accept',
    reject: 'Reject',
    waitingForVotes: 'Waiting for votes...',
    accepted: 'Accepted',
    rejected: 'Rejected',

    // Footer pages
    aboutTitle: 'About Us',
    aboutContent: 'Gradova i Sela is a digital version of the beloved pen-and-paper geography game known across the Balkans. Players compete to fill in categories — countries, cities, rivers, mountains, animals, plants, and names — all starting with a randomly chosen letter. Built with love in Sarajevo.',
    rulesTitle: 'Rules',
    rulesContent: 'Each round, a random letter is chosen. Players must fill in a valid answer for each category starting with that letter. Points: 20 if you are the only one with a valid answer in a category, 10 for a unique valid answer, 5 if another player has the same answer. Empty or invalid answers score 0. In Stop mode, any player who fills all categories can press STOP to end the round early. In Timer mode, the round ends only when time runs out. The player with the most points at the end wins!',
    privacyTitle: 'Privacy',
    privacyContent: 'We do not collect or store any personal data. No accounts, no cookies, no tracking. Your game data exists only for the duration of the session and is deleted when the room closes. This game is open source and runs entirely in your browser and our server memory.',

    // Coordinates
    coordinates: '43.8563\u00B0N \u00B7 18.4131\u00B0E',
  },
  bs: {
    // Lobby
    appTitle: 'Gradova i Sela',
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
    roundTime: 'Vrijeme Runde',
    gameMode: 'Mod Igre',
    gameModeTimer: 'Tajmer',
    gameModeStop: 'Stop',
    roundsTooltip: 'Broj rundi prije kraja igre.',
    roundTimeTooltip: 'Koliko dugo traje svaka runda.',
    gameModeTooltip: 'Stop: igrači mogu završiti rundu ranije. Tajmer: runda završava samo kad istekne vrijeme.',
    beginExpedition: 'Započni Igru',
    waitingForLeader: 'Čekamo domaćina da započne igru...',

    // Game Board
    round: 'Runda',
    submitted: 'predalo',
    submitAnswers: 'Predaj Odgovore',
    answersSubmitted: 'Odgovori predani! Čekamo ostale...',
    cancelSubmission: 'Izmijeni Odgovore',
    stop: 'STOP!',

    // Game hints
    spellingHint: 'Pazite da odgovori počinju slovom "{letter}". Možete osporiti odbijene odgovore nakon runde.',

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
    challengeHint: 'Naša baza podataka ne pokriva sve moguće odgovore. Ako je vaš odgovor pogrešno odbijen, kliknite ? da zatražite odobrenje od svih igrača.',
    challengeTurn: '{name} na redu za izazov',
    challengeYourTurn: 'Vaš red! Osporite odbijene odgovore ili preskočite.',
    skipChallenges: 'Preskoči',
    noChallenges: 'Nema odgovora za osporiti.',
    claims: 'tvrdi da je',
    isAValid: 'validan odgovor za',
    accept: 'Prihvati',
    reject: 'Odbij',
    waitingForVotes: 'Čekamo glasove...',
    accepted: 'Prihvaćeno',
    rejected: 'Odbijeno',

    // Footer pages
    aboutTitle: 'O Nama',
    aboutContent: 'Gradova i Sela je digitalna verzija omiljene igre na papiru poznate širom Balkana. Igrači se takmiče da popune kategorije — države, gradovi, rijeke, planine, životinje, biljke i imena — sve počevši sa nasumično odabranim slovom. Napravljeno s ljubavlju u Sarajevu.',
    rulesTitle: 'Pravila',
    rulesContent: 'Svake runde bira se nasumično slovo. Igrači moraju upisati validan odgovor za svaku kategoriju koji počinje tim slovom. Bodovi: 20 ako ste jedini sa validnim odgovorom u kategoriji, 10 za jedinstven validan odgovor, 5 ako drugi igrač ima isti odgovor. Prazan ili nevalidan odgovor nosi 0 bodova. U Stop modu, svaki igrač koji popuni sve kategorije može pritisnuti STOP da završi rundu ranije. U Tajmer modu, runda završava samo kad istekne vrijeme. Igrač sa najviše bodova na kraju pobjeđuje!',
    privacyTitle: 'Privatnost',
    privacyContent: 'Ne prikupljamo niti čuvamo lične podatke. Nema naloga, kolačića, niti praćenja. Podaci o igri postoje samo tokom trajanja sesije i brišu se kada se soba zatvori. Ova igra je otvorenog koda i radi u potpunosti u vašem pregledniku i memoriji našeg servera.',

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
