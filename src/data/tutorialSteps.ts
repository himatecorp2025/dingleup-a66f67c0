export interface TutorialStep {
  target: string;
  title: {
    hu: string;
    en: string;
  };
  description: {
    hu: string;
    en: string;
  };
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

export const tutorialSteps = {
  dashboard: [
    {
      target: '[data-tutorial="profile-header"]',
      title: {
        hu: 'Üdvözlünk a DingleUP!-ban! 👋',
        en: 'Welcome to DingleUP! 👋'
      },
      description: {
        hu: 'Ez a Dashboard-od, ahol minden fontos információt megtalálsz. Itt látod az életek és aranyérmék számát, valamint a daily ranglistahelyezésedet.',
        en: 'This is your Dashboard where you find all important information. Here you can see your lives and gold coins, as well as your daily leaderboard ranking.'
      },
      position: 'bottom' as const
    },
    {
      target: '[data-tutorial="profile-header"]',
      title: {
        hu: 'Életek rendszere ❤️',
        en: 'Lives System ❤️'
      },
      description: {
        hu: 'Minden játékhoz 1 élet kell. Az életek automatikusan újratöltődnek 12 percenként. Maximum 15 életed lehet egyszerre.',
        en: 'Each game requires 1 life. Lives automatically regenerate every 12 minutes. You can have a maximum of 15 lives at once.'
      },
      position: 'bottom' as const
    },
    {
      target: '[data-tutorial="profile-header"]',
      title: {
        hu: 'Aranyérmék 🪙',
        en: 'Gold Coins 🪙'
      },
      description: {
        hu: 'Helyes válaszokért aranyérméket kapsz. Ezekkel vásárolhatsz a boltban extra életeket és prémium boostereket.',
        en: 'You earn gold coins for correct answers. Use them to buy extra lives and premium boosters in the shop.'
      },
      position: 'bottom' as const
    },
    {
      target: '[data-tutorial="daily-gift"]',
      title: {
        hu: 'Napi belépési jutalom 🎁',
        en: 'Daily Login Reward 🎁'
      },
      description: {
        hu: 'Minden nap, amikor bejelentkezel, értékes ajándékokat kapsz! Minél több napot gyűjtesz egymás után, annál nagyobb jutalmak várnak rád.',
        en: 'Every day when you log in, you receive valuable gifts! The more consecutive days you collect, the bigger rewards await you.'
      },
      position: 'bottom' as const
    },
    {
      target: '[data-tutorial="play-button"]',
      title: {
        hu: 'PLAY NOW - Játék indítása 🎮',
        en: 'PLAY NOW - Start Game 🎮'
      },
      description: {
        hu: 'Ezzel a gombbal indíthatod el a játékot. A játék 15 kérdésből áll, minden kérdésre 10 másodperced van válaszolni!',
        en: 'Start the game with this button. The game consists of 15 questions, you have 10 seconds to answer each question!'
      },
      position: 'top' as const
    },
    {
      target: '[data-tutorial="booster-button"]',
      title: {
        hu: 'Speed Booster ⚡',
        en: 'Speed Booster ⚡'
      },
      description: {
        hu: 'A Speed Boosterek felgyorsítják az életek újratöltődését. Különböző booster csomagok közül választhatsz a boltban!',
        en: 'Speed Boosters accelerate life regeneration. Choose from various booster packages in the shop!'
      },
      position: 'top' as const
    },
    {
      target: '.leaderboard-carousel',
      title: {
        hu: 'Napi Ranglista 🏆',
        en: 'Daily Leaderboard 🏆'
      },
      description: {
        hu: 'Itt látod a napi TOP játékosokat az országodból. Minden helyes válasz számít! A legjobb játékosok értékes jutalmakat kapnak minden nap.',
        en: 'Here you see the daily TOP players from your country. Every correct answer counts! The best players receive valuable rewards every day.'
      },
      position: 'top' as const
    },
    {
      target: '[data-tutorial="bottom-nav"]',
      title: {
        hu: 'Navigációs menü',
        en: 'Navigation Menu'
      },
      description: {
        hu: 'Az alsó menüsávból érheted el a főbb funkciókat: Dashboard, Ranglista, Bolt, Megosztó és Profil.',
        en: 'Access main features from the bottom menu: Dashboard, Leaderboard, Shop, Share and Profile.'
      },
      position: 'top' as const
    },
    {
      target: '[data-tutorial="bottom-nav"]',
      title: {
        hu: 'Készen állsz! 🎉',
        en: 'You\'re Ready! 🎉'
      },
      description: {
        hu: 'Most már tudod, hogyan működik minden! Nyomd meg a PLAY NOW gombot, és kezdd el a játékot. Sok sikert! 🚀',
        en: 'Now you know how everything works! Press the PLAY NOW button and start the game. Good luck! 🚀'
      },
      position: 'top' as const
    }
  ],
  chat: [
    {
      target: '.chat-container',
      title: 'Chat és Barátok 💬',
      description: 'Itt tudsz csevegni más játékosokkal! Kereshetsz barátokat, küldhetsz üzeneteket, képeket és fájlokat is. Nézzük meg, hogyan működik!',
      position: 'center' as const
    },
    {
      target: '[data-tutorial="friends-menu"]',
      title: 'Barátok hexagon menü',
      description: 'Felül látod a barátaidat hexagon keretekben. Kattints egy hexagonra, és máris megnyílik a beszélgetés vele!',
      position: 'bottom' as const
    },
    {
      target: '[data-tutorial="search-friends"]',
      title: 'Új barátok keresése 🔍',
      description: 'A keresés gombbal új játékosokat találhatsz. Kereshetsz felhasználónév vagy e-mail cím alapján, és elküldhetsz nekik barátkérést.',
      position: 'bottom' as const
    },
    {
      target: '[data-tutorial="search-friends"]',
      title: 'Barátkérések kezelése',
      description: 'Ha valaki küldött neked barátkérést, itt fogadhatod el vagy utasíthatod el. Miután elfogadtad, azonnal írhattok egymásnak!',
      position: 'bottom' as const
    },
    {
      target: '[data-tutorial="threads-list"]',
      title: 'Beszélgetések listája',
      description: 'Itt látod az összes beszélgetésedet. A legfrissebb üzenetek felül jelennek meg. Kattints egy beszélgetésre a megnyitásához.',
      position: 'right' as const
    },
    {
      target: '[data-tutorial="threads-list"]',
      title: 'Üzenetek küldése 📨',
      description: 'Egy beszélgetésben írhatsz szöveges üzeneteket, küldhetsz képeket, emoji-kat és fájlokat is. Az üzenetek azonnal megjelennek mindkét félnél!',
      position: 'right' as const
    },
    {
      target: '[data-tutorial="threads-list"]',
      title: 'Online státusz 🟢',
      description: 'Látod, hogy barátaid éppen online vannak-e. A zöld pont azt jelenti, hogy aktív, míg a szürke pont azt, hogy offline.',
      position: 'right' as const
    },
    {
      target: '.chat-container',
      title: 'Kész vagy! 🎉',
      description: 'Most már tudod, hogyan használd a chatet! Keress barátokat, és kezdj el beszélgetni velük. Jó csevegést! 💬',
      position: 'center' as const
    }
  ],
  profile: [
    {
      target: '.profile-container',
      title: {
        hu: 'Profilod 👤',
        en: 'Your Profile 👤'
      },
      description: {
        hu: 'Ez a profiloldalad, ahol kezelheted a fiókodat, megtekintheted statisztikáidat, nyelveket és országot változtathatsz. Kezdjük!',
        en: 'This is your profile page where you can manage your account, view your statistics, change languages and country. Let\'s start!'
      },
      position: 'center' as const
    },
    {
      target: '[data-tutorial="profile-pic"]',
      title: {
        hu: 'Profilkép beállítása 📸',
        en: 'Set Profile Picture 📸'
      },
      description: {
        hu: 'Kattints a profilképedre, és tölts fel egy képet magadról! Ez segít, hogy könnyebben megismerjenek a játékban.',
        en: 'Click on your profile picture and upload a photo of yourself! This helps others recognize you in the game.'
      },
      position: 'bottom' as const
    },
    {
      target: '[data-tutorial="stats"]',
      title: {
        hu: 'Pénztárca és Statisztikák 📊',
        en: 'Wallet and Statistics 📊'
      },
      description: {
        hu: 'Itt látod az aranyérméidet, életeidet, napi helyes válaszaidat és a ranglistahelyezésedet.',
        en: 'Here you see your gold coins, lives, daily correct answers and leaderboard ranking.'
      },
      position: 'bottom' as const
    },
    {
      target: '[data-tutorial="settings"]',
      title: {
        hu: 'Nyelv és Ország ⚙️',
        en: 'Language and Country ⚙️'
      },
      description: {
        hu: 'Változtasd meg a nyelvet (magyar/angol) és az országodat. Az országod határozza meg, hogy melyik nemzeti ranglistán játszol.',
        en: 'Change your language (Hungarian/English) and country. Your country determines which national leaderboard you play on.'
      },
      position: 'bottom' as const
    },
    {
      target: '.background-music-control',
      title: {
        hu: 'Háttérzene beállítás 🎵',
        en: 'Background Music Settings 🎵'
      },
      description: {
        hu: 'Kapcsold ki/be a háttérzenét, és állítsd be a hangerőt a csúszkával. A beállításaid automatikusan mentésre kerülnek.',
        en: 'Turn background music on/off and adjust volume with the slider. Your settings are saved automatically.'
      },
      position: 'top' as const
    },
    {
      target: '[data-tutorial="logout"]',
      title: {
        hu: 'Kijelentkezés',
        en: 'Log Out'
      },
      description: {
        hu: 'Ha kilépnél a fiókodból, használd ezt a gombot. A haladásod és statisztikáid biztonságban elmentődnek.',
        en: 'Use this button to log out of your account. Your progress and statistics are safely saved.'
      },
      position: 'top' as const
    },
    {
      target: '.profile-container',
      title: {
        hu: 'Készen vagy! 🎉',
        en: 'You\'re Ready! 🎉'
      },
      description: {
        hu: 'Most már ismered a profiloldalad! Bármikor visszatérhetsz ide a beállítások módosításához. Jó játékot! 🚀',
        en: 'Now you know your profile page! You can return here anytime to modify settings. Have fun! 🚀'
      },
      position: 'center' as const
    }
  ],
  play: [
    {
      target: '[data-tutorial="question"]',
      title: {
        hu: 'Kérdés',
        en: 'Question'
      },
      description: {
        hu: 'Itt látod az aktuális kérdést. Olvasd el figyelmesen, mielőtt válaszolsz! 10 másodperced van.',
        en: 'Here you see the current question. Read it carefully before answering! You have 10 seconds.'
      },
      position: 'bottom' as const
    },
    {
      target: '[data-tutorial="answers"]',
      title: {
        hu: 'Válaszlehetőségek',
        en: 'Answer Options'
      },
      description: {
        hu: 'Válaszd ki a helyes választ! Minden helyes válaszért aranyérméket kapsz. A jutalmak a kérdés nehézségétől függenek.',
        en: 'Choose the correct answer! You earn gold coins for each correct answer. Rewards depend on question difficulty.'
      },
      position: 'top' as const
    },
    {
      target: '[data-tutorial="helpers"]',
      title: {
        hu: 'Segítségek (Lifeline-ok)',
        en: 'Helpers (Lifelines)'
      },
      description: {
        hu: 'Használd a segítségeket, ha elakadtál! 50/50, Közönség, Dupla Válasz és Kérdéscsere állnak rendelkezésedre. Mindegyik 1x használható játékonként.',
        en: 'Use helpers if you get stuck! 50/50, Audience, Double Answer and Question Swap are available. Each can be used once per game.'
      },
      position: 'bottom' as const
    },
    {
      target: '[data-tutorial="swipe-gesture"]',
      title: {
        hu: 'Navigáció (Swipe)',
        en: 'Navigation (Swipe)'
      },
      description: {
        hu: 'Felfelé görgetve (swipe up) továbblépés a következő kérdéshez. Ha mind a 15 kérdést megválaszoltad, újra swipe up-pal új játékot indíthatsz.',
        en: 'Swipe up to proceed to the next question. After answering all 15 questions, swipe up again to start a new game.'
      },
      position: 'center' as const
    }
  ],
  leaderboard: [
    {
      target: '.leaderboard-container',
      title: {
        hu: 'Napi Ranglista 🏆',
        en: 'Daily Leaderboard 🏆'
      },
      description: {
        hu: 'Ez a napi ranglista, ahol az országod legjobb játékosait látod. A helyezések minden éjfélkor frissülnek.',
        en: 'This is the daily leaderboard showing the best players from your country. Rankings refresh every midnight.'
      },
      position: 'center' as const
    },
    {
      target: '.leaderboard-container',
      title: {
        hu: 'Napi Jutalmak 💰',
        en: 'Daily Rewards 💰'
      },
      description: {
        hu: 'A TOP 10 játékos minden nap értékes jutalmakat kap! Vasárnap a legnagyobb jackpot: TOP 25 kap jutalmat. Minél jobb a helyezésed, annál több aranyat és életet nyersz.',
        en: 'The TOP 10 players receive valuable rewards every day! Sunday is the biggest jackpot: TOP 25 get rewards. The better your ranking, the more gold and lives you win.'
      },
      position: 'center' as const
    },
    {
      target: '.leaderboard-container',
      title: {
        hu: 'A Te Helyezésed 📊',
        en: 'Your Ranking 📊'
      },
      description: {
        hu: 'Lent látod a saját helyezésedet és helyes válaszaidat. Minden helyes válasz közelebb visz a TOP 10-hez!',
        en: 'Below you see your own ranking and correct answers. Every correct answer brings you closer to TOP 10!'
      },
      position: 'top' as const
    },
    {
      target: '.leaderboard-container',
      title: {
        hu: 'Készen állsz! 🎉',
        en: 'You\'re Ready! 🎉'
      },
      description: {
        hu: 'Most már ismered a ranglistát! Játssz minél többet, és kerülj be a TOP játékosok közé. Sok sikert! 🚀',
        en: 'Now you know the leaderboard! Play as much as you can and get into the TOP players. Good luck! 🚀'
      },
      position: 'center' as const
    }
  ],
};
